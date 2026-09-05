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

export const stripeClient = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder",
  { apiVersion: "2026-06-24.dahlia" }
);

// Le plugin `admin` résout les permissions d'un rôle via une map interne
// dont les clés par défaut sont "admin"/"user" (minuscules) — nos valeurs de
// rôle sont "ADMIN"/"CLIENT" (voir user.additionalFields.role plus bas), donc
// on remappe les permissions par défaut (adminAc/userAc, inchangées) sur nos
// propres noms de rôle plutôt que de renommer nos rôles.
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
      // Aucun compte de l'app n'a jamais d'e-mail vérifié
      // (requireEmailVerification: false ci-dessus, pas de flux de
      // vérification) — la protection par défaut de Better Auth contre le
      // vol de compte via un e-mail non vérifié n'apporte donc rien ici :
      // elle bloquerait la connexion Google de tout client déjà inscrit par
      // e-mail/mot de passe pour rien.
      requireLocalEmailVerified: false,
    },
  },
  user: {
    additionalFields: {
      // input: false — le rôle ne peut jamais être fourni par le client à
      // l'inscription ; seul un accès direct à la base peut le modifier.
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
    // Gestion des comptes depuis /admin/users (rôles, bannissement, sessions)
    // — nos valeurs de rôle sont "ADMIN"/"CLIENT" (voir user.additionalFields
    // .role ci-dessus), pas les "admin"/"user" par défaut du plugin.
    admin({
      defaultRole: "CLIENT",
      adminRoles: ["ADMIN"],
      ac: accessControl,
      roles: {
        ADMIN: adminRole,
        CLIENT: clientRole,
      },
    }),
    // Une "organisation" = une entreprise du client (il peut en avoir
    // plusieurs). Équipes et contrôle d'accès dynamique désactivés (défaut) :
    // un client est seul propriétaire de ses organisations pour l'instant,
    // pas de collaborateurs à inviter — juste Organization/Member/Invitation,
    // sans la complexité des équipes.
    organization({
      organizationLimit: 20,
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      // Chaque prestation ouvre sa propre Checkout Session (voir
      // activateService dans src/app/dashboard/actions.ts), qui peut mélanger
      // une ligne ponctuelle (frais de mise en place) et une ligne récurrente
      // (abonnement mensuel) selon le modèle tarifaire hybride du service —
      // il n'y a donc plus de plan d'abonnement unique à déclarer ici.
      onEvent: async (event) => {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            if (session.metadata?.clientServiceId) {
              const { count } = await db.clientService.updateMany({
                where: {
                  id: session.metadata.clientServiceId,
                  // Idempotence : Stripe peut redélivrer cet événement
                  // (timeout, retry) — sans ce garde-fou, une redélivrance
                  // tardive ferait régresser une prestation déjà validée
                  // ACTIVE par un admin vers CONFIGURING.
                  status: { not: "ACTIVE" },
                },
                data: {
                  // Paiement confirmé — l'équipe Noveris déploie la
                  // prestation ; un admin la bascule ensuite en ACTIVE.
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
              // count === 0 sur une redélivrance déjà traitée (voir garde-fou
              // ci-dessus) — ne pas dupliquer l'entrée d'historique.
              if (count > 0) {
                await logServiceEvent(session.metadata.clientServiceId, "PAYMENT_RECEIVED");
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            // Une résiliation peut arriver ici plutôt que par cancelService
            // (portail client Stripe, annulation directe dans le dashboard
            // Stripe) — sans relâcher le numéro Twilio ici aussi, il restait
            // facturé à Noveris indéfiniment après une résiliation qui ne
            // passe pas par le tableau de bord.
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
