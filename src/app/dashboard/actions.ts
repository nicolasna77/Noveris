"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/auth";
import { getSession } from "@/lib/session";
import {
  findMissingRequiredField,
  TELEPHONY_SERVICE_SLUGS,
  type ConfigField,
  type Configuration,
} from "@/lib/catalog";
import { logServiceEvent } from "@/lib/service-events";
import {
  purchasePhoneNumber,
  releasePhoneNumber,
  searchAvailableNumbers,
  type AvailableNumber,
} from "@/lib/twilio";
import {
  fetchDisplayPhoneNumber,
  registerPhoneNumber,
  subscribeAppToWaba,
} from "@/lib/whatsapp";
import { exchangeMetaEmbeddedSignupCode } from "@/lib/meta";
import { fetchManagedPage, subscribePageToApp } from "@/lib/messenger";
import { sendServiceCanceledEmail } from "@/lib/email/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { validatePromoCodeForService } from "@/lib/stripe-promo-codes";
import { applyDiscount, describeDiscount, firstPaymentCents } from "@/lib/promo-codes";

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

async function requireOrgMember(organizationId: string, userId: string) {
  const member = await db.member.findFirst({ where: { organizationId, userId } });
  if (!member) throw new Error("UNAUTHORIZED");
}

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function revalidateDashboard(clientServiceId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/prestations");
  if (clientServiceId) revalidatePath(`/dashboard/services/${clientServiceId}`);
}

async function createCheckoutSession(
  clientServiceId: string,
  service: {
    id: string;
    name: string;
    setupFeeCents: number | null;
    monthlyPriceCents: number | null;
  },
  user: { stripeCustomerId: string | null; email: string },
  promotionCodeId: string | null = null
): Promise<string> {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (service.setupFeeCents !== null) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: service.setupFeeCents,
        product_data: { name: `${service.name} — mise en place` },
      },
      quantity: 1,
    });
  }
  if (service.monthlyPriceCents !== null) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: service.monthlyPriceCents,
        recurring: { interval: "month" },
        product_data: { name: service.name },
      },
      quantity: 1,
    });
  }

  const checkoutSession = await stripeClient.checkout.sessions.create({
    mode: service.monthlyPriceCents !== null ? "subscription" : "payment",
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    line_items: lineItems,
    ...(promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
    metadata: { clientServiceId, serviceId: service.id },
    success_url: `${appUrl()}/dashboard/prestations?checkout=success&clientServiceId=${clientServiceId}`,
    cancel_url: `${appUrl()}/dashboard/prestations?checkout=canceled&clientServiceId=${clientServiceId}`,
  });

  await db.clientService.update({
    where: { id: clientServiceId },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  return checkoutSession.url!;
}

export async function activateService(
  serviceId: string,
  organizationId: string,
  name: string,
  configuration: Configuration,
  promoCode: string | null = null
) {
  const servicePromise = db.service.findUniqueOrThrow({ where: { id: serviceId } });
  const userId = await requireUserId();
  const [service, user] = await Promise.all([
    servicePromise,
    db.user.findUniqueOrThrow({ where: { id: userId } }),
  ]);
  await requireOrgMember(organizationId, userId);

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Merci de donner un nom à cette activation.");
  }

  const configFields = (service.configFields as ConfigField[]) ?? [];
  const missing = findMissingRequiredField(configFields, configuration);
  if (missing) {
    throw new Error(`Le champ « ${missing.label} » est requis.`);
  }

  let promotion: { promotionCodeId: string; code: string } | null = null;
  if (promoCode?.trim()) {
    const result = await validatePromoCodeForService(promoCode, service.slug);
    if (!result.ok) throw new Error(result.reason);
    promotion = { promotionCodeId: result.promotionCodeId, code: result.code };
  }

  let clientService;
  try {
    clientService = await db.clientService.create({
      data: {
        userId,
        organizationId,
        serviceId,
        name: trimmedName,
        status: "PENDING_PAYMENT",
        configuration,
        promoCode: promotion?.code ?? null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(
        `Vous avez déjà une solution nommée « ${trimmedName} » pour ce service dans cette organisation.`
      );
    }
    throw err;
  }

  await logServiceEvent(clientService.id, "CREATED");

  let checkoutUrl: string;
  try {
    checkoutUrl = await createCheckoutSession(
      clientService.id,
      service,
      user,
      promotion?.promotionCodeId ?? null
    );
  } catch (err) {
    if (!promotion) throw err;
    await db.clientService.delete({ where: { id: clientService.id } });
    if ((err as { code?: string }).code === "promotion_code_customer_not_first_time") {
      throw new Error(
        "Ce code est réservé aux nouveaux clients. Retirez-le pour payer au tarif normal."
      );
    }
    console.error("[codes-promo] Stripe a refusé la remise :", err);
    throw new Error(
      "Ce code ne peut pas être utilisé avec votre compte. Retirez-le pour payer au tarif normal."
    );
  }
  revalidateDashboard(clientService.id);
  return { checkoutUrl };
}

export async function resumeServiceCheckout(clientServiceId: string) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({
      where: { id: clientServiceId },
      include: { service: true },
    }),
  ]);

  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }
  if (clientService.status !== "PENDING_PAYMENT" && clientService.status !== "CANCELED") {
    throw new Error("Cette solution est déjà active.");
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  let promotionCodeId: string | null = null;
  let promoCode: string | null = null;
  if (clientService.status === "PENDING_PAYMENT" && clientService.promoCode) {
    const result = await validatePromoCodeForService(
      clientService.promoCode,
      clientService.service.slug
    );
    if (result.ok) {
      promotionCodeId = result.promotionCodeId;
      promoCode = result.code;
    }
  }

  await db.clientService.update({
    where: { id: clientServiceId },
    data: { status: "PENDING_PAYMENT", canceledAt: null, promoCode },
  });

  let checkoutUrl: string;
  try {
    checkoutUrl = await createCheckoutSession(
      clientService.id,
      clientService.service,
      user,
      promotionCodeId
    );
  } catch (err) {
    if (!promotionCodeId) throw err;
    await db.clientService.update({ where: { id: clientServiceId }, data: { promoCode: null } });
    checkoutUrl = await createCheckoutSession(clientService.id, clientService.service, user);
  }
  revalidateDashboard(clientService.id);
  return { checkoutUrl };
}

export type PromoPreview =
  | {
      ok: true;
      code: string;
      description: string;
      firstPaymentCents: number;
      discountedFirstPaymentCents: number;
    }
  | { ok: false; reason: string };

export async function previewPromoCode(serviceId: string, code: string): Promise<PromoPreview> {
  const userId = await requireUserId();
  if (!(await checkRateLimit("promo-code-preview", userId, "10 m", 20))) {
    return { ok: false, reason: "Trop d'essais. Réessayez dans quelques minutes." };
  }

  const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
  const result = await validatePromoCodeForService(code, service.slug);
  if (!result.ok) return result;

  const first = firstPaymentCents(service);
  return {
    ok: true,
    code: result.code,
    description: describeDiscount(result.rule, {
      hasSetupFee: service.setupFeeCents !== null,
      hasSubscription: service.monthlyPriceCents !== null,
    }),
    firstPaymentCents: first,
    discountedFirstPaymentCents: applyDiscount(first, result.rule),
  };
}

export async function updateServiceConfiguration(
  clientServiceId: string,
  configuration: Configuration
) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({
      where: { id: clientServiceId },
      include: { service: true },
    }),
  ]);

  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  const configFields =
    (clientService.service.configFields as ConfigField[]) ?? [];
  const missing = findMissingRequiredField(configFields, configuration);
  if (missing) {
    throw new Error(`Le champ « ${missing.label} » est requis.`);
  }

  await db.clientService.update({
    where: { id: clientServiceId },
    data: { configuration },
  });
  await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED");

  revalidateDashboard(clientServiceId);
}

export async function disconnectGoogleCalendar(clientServiceId: string) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
  ]);

  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  const { count } = await db.calendarConnection.deleteMany({ where: { clientServiceId } });
  if (count > 0) await logServiceEvent(clientServiceId, "CALENDAR_DISCONNECTED");
  revalidateDashboard(clientServiceId);
}

export async function completeWhatsAppEmbeddedSignup(
  clientServiceId: string,
  code: string,
  wabaId: string,
  phoneNumberId: string
) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
  ]);
  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  const accessToken = await exchangeMetaEmbeddedSignupCode(code);
  await subscribeAppToWaba(wabaId, accessToken);
  await registerPhoneNumber(phoneNumberId, accessToken);
  const displayNumber = await fetchDisplayPhoneNumber(phoneNumberId, accessToken);

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: wabaId,
      whatsappAccessToken: accessToken,
      whatsappDisplayNumber: displayNumber,
    },
  });
  await logServiceEvent(clientServiceId, "WHATSAPP_CONNECTED", displayNumber);
  revalidateDashboard(clientServiceId);
}

export async function disconnectWhatsApp(clientServiceId: string) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
  ]);
  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      whatsappPhoneNumberId: null,
      whatsappBusinessAccountId: null,
      whatsappAccessToken: null,
      whatsappDisplayNumber: null,
    },
  });
  await logServiceEvent(clientServiceId, "WHATSAPP_DISCONNECTED");
  revalidateDashboard(clientServiceId);
}

export async function completeMessengerConnection(clientServiceId: string, code: string) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
  ]);
  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  const userAccessToken = await exchangeMetaEmbeddedSignupCode(code);
  const page = await fetchManagedPage(userAccessToken);
  if (!page) {
    throw new Error("Aucune Page Facebook trouvée — vérifiez que vous en gérez au moins une.");
  }
  await subscribePageToApp(page.id, page.access_token);

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      facebookPageId: page.id,
      facebookPageAccessToken: page.access_token,
      facebookPageName: page.name,
    },
  });
  await logServiceEvent(clientServiceId, "FACEBOOK_CONNECTED", page.name);
  revalidateDashboard(clientServiceId);
}

export async function disconnectMessenger(clientServiceId: string) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
  ]);
  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      facebookPageId: null,
      facebookPageAccessToken: null,
      facebookPageName: null,
    },
  });
  await logServiceEvent(clientServiceId, "FACEBOOK_DISCONNECTED");
  revalidateDashboard(clientServiceId);
}

export async function disconnectInstagram(clientServiceId: string) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({ where: { id: clientServiceId } }),
  ]);
  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      instagramAccountId: null,
      instagramAccessToken: null,
      instagramTokenExpiresAt: null,
      instagramUsername: null,
    },
  });
  await logServiceEvent(clientServiceId, "INSTAGRAM_DISCONNECTED");
  revalidateDashboard(clientServiceId);
}

async function requireOwnedTelephonyService(
  clientServiceId: string,
  userId: string
) {
  const clientService = await db.clientService.findUniqueOrThrow({
    where: { id: clientServiceId },
    include: { service: true },
  });
  if (clientService.userId !== userId) throw new Error("UNAUTHORIZED");
  if (!TELEPHONY_SERVICE_SLUGS.has(clientService.service.slug)) {
    throw new Error("Cette solution ne prend pas de numéro de téléphone.");
  }
  if (clientService.status !== "CONFIGURING" && clientService.status !== "ACTIVE") {
    throw new Error("La solution doit être payée avant de choisir un numéro.");
  }
  if (clientService.externalPhoneNumber) {
    throw new Error("Un numéro est déjà assigné à cette solution.");
  }
  return clientService;
}

export async function searchPhoneNumbers(
  clientServiceId: string
): Promise<AvailableNumber[]> {
  const userId = await requireUserId();
  await requireOwnedTelephonyService(clientServiceId, userId);
  return searchAvailableNumbers();
}

export async function purchasePhoneNumberForService(
  clientServiceId: string,
  phoneNumber: string
) {
  const userId = await requireUserId();
  await requireOwnedTelephonyService(clientServiceId, userId);

  const purchased = await purchasePhoneNumber(phoneNumber);

  const { count } = await db.clientService.updateMany({
    where: { id: clientServiceId, externalPhoneNumber: null },
    data: {
      externalPhoneNumber: purchased.phoneNumber,
      externalPhoneNumberSid: purchased.sid,
    },
  });
  if (count === 0) {
    await releasePhoneNumber(purchased.sid);
    throw new Error("Un numéro a déjà été assigné à cette solution entre-temps.");
  }
  await logServiceEvent(clientServiceId, "PHONE_ASSIGNED", purchased.phoneNumber);

  revalidateDashboard(clientServiceId);
}

export async function cancelService(clientServiceId: string) {
  const [userId, clientService] = await Promise.all([
    requireUserId(),
    db.clientService.findUniqueOrThrow({
      where: { id: clientServiceId },
      include: { user: true },
    }),
  ]);

  if (clientService.userId !== userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (clientService.stripeSubscriptionId) {
    try {
      await stripeClient.subscriptions.cancel(clientService.stripeSubscriptionId);
    } catch {
    }
  }

  if (clientService.externalPhoneNumberSid) {
    await releasePhoneNumber(clientService.externalPhoneNumberSid);
  }

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      externalPhoneNumber: null,
      externalPhoneNumberSid: null,
    },
  });
  await logServiceEvent(clientServiceId, "CANCELED");
  await sendServiceCanceledEmail(
    {
      email: clientService.user.email,
      name: clientService.user.name,
      notificationPreferences: clientService.user.notificationPreferences,
    },
    clientService.name
  );

  revalidateDashboard(clientServiceId);
}
