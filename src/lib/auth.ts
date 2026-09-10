import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { releasePhoneNumber } from "@/lib/twilio";
import { logServiceEvent } from "@/lib/service-events";
import { sendPasswordResetEmail } from "@/lib/email/notifications";
import { redisRateLimitStorage } from "@/lib/rate-limit";

export const stripeClient = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder",
  { apiVersion: "2026-06-24.dahlia" }
);

const accessControl = createAccessControl(defaultStatements);
const adminRole = accessControl.newRole(adminAc.statements);
const clientRole = accessControl.newRole(userAc.statements);

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  rateLimit: {
    enabled: true,
    customStorage: redisRateLimitStorage,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ email: user.email, name: user.name }, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      requireLocalEmailVerified: false,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CLIENT",
        input: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    admin({
      defaultRole: "CLIENT",
      adminRoles: ["ADMIN"],
      ac: accessControl,
      roles: {
        ADMIN: adminRole,
        CLIENT: clientRole,
      },
    }),
    organization({
      organizationLimit: 20,
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      onEvent: async (event) => {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            if (session.metadata?.clientServiceId) {
              const { count } = await db.clientService.updateMany({
                where: {
                  id: session.metadata.clientServiceId,
                  status: { not: "ACTIVE" },
                },
                data: {
                  status: "CONFIGURING",
                  stripePaymentIntentId:
                    typeof session.payment_intent === "string"
                      ? session.payment_intent
                      : session.payment_intent?.id,
                  stripeSubscriptionId:
                    typeof session.subscription === "string"
                      ? session.subscription
                      : session.subscription?.id,
                },
              });
              if (count > 0) {
                await logServiceEvent(session.metadata.clientServiceId, "PAYMENT_RECEIVED");
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const affected = await db.clientService.findMany({
              where: { stripeSubscriptionId: subscription.id },
              select: { id: true, externalPhoneNumberSid: true },
            });
            await Promise.all(
              affected
                .filter((cs) => cs.externalPhoneNumberSid)
                .map((cs) => releasePhoneNumber(cs.externalPhoneNumberSid!))
            );
            await db.clientService.updateMany({
              where: { stripeSubscriptionId: subscription.id },
              data: {
                status: "CANCELED",
                canceledAt: new Date(),
                externalPhoneNumber: null,
                externalPhoneNumberSid: null,
              },
            });
            await Promise.all(
              affected.map((cs) => logServiceEvent(cs.id, "CANCELED"))
            );
            break;
          }
        }
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
