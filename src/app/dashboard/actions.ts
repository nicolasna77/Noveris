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

// Délègue à src/lib/session.ts (mémoïsé par requête) plutôt que de
// réappeler auth.api.getSession directement — une seconde implémentation
// indépendante de "qui est connecté" ne bénéficierait pas d'un futur
// changement apporté à getSession (ex. vérification bannissement, audit).
async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

// Une organisation est à usage unique pour l'instant (voir organizationClient
// dans src/lib/auth.ts) — pas d'invitation d'équipe — mais on vérifie quand
// même l'appartenance plutôt que de faire confiance à l'organizationId
// fourni par le client.
async function requireOrgMember(organizationId: string, userId: string) {
  const member = await db.member.findFirst({ where: { organizationId, userId } });
  if (!member) throw new Error("UNAUTHORIZED");
}

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Les pages qui affichent l'état d'une prestation (Vue d'ensemble, la liste
// des prestations, et le détail d'une prestation donnée) — regroupé ici pour
// que les actions ci-dessous n'aient pas chacune à retenir la liste complète
// des chemins concernés.
function revalidateDashboard(clientServiceId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/prestations");
  if (clientServiceId) revalidatePath(`/dashboard/services/${clientServiceId}`);
}

// Ouvre la Checkout Session Stripe d'une prestation (déjà créée en base, en
// attente de paiement) — couvre à la fois les frais de mise en place (ligne
// ponctuelle) et l'abonnement mensuel (ligne récurrente), selon ce que la
// prestation facture. Partagé par activateService (nouvelle activation) et
// resumeServiceCheckout (reprise de paiement) : les deux finissent par payer
// la même chose pour la même ligne, seule la façon d'arriver au
// ClientService diffère.
async function createCheckoutSession(
  clientServiceId: string,
  service: {
    id: string;
    name: string;
    setupFeeCents: number | null;
    monthlyPriceCents: number | null;
  },
  user: { stripeCustomerId: string | null; email: string },
  // Une remise déjà validée par validatePromoCodeForService, jamais un code
  // brut venu du navigateur : ce qu'on facture ne se décide pas côté client.
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

// Active une prestation pour une organisation — toujours une nouvelle ligne :
// un client peut activer plusieurs fois le même service (ex. deux boutiques),
// distinguées par `name`. Pour reprendre le paiement d'une activation
// existante (abandonnée ou résiliée), voir resumeServiceCheckout ci-dessous.
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

  // Revalidé ici même si le client vient de le vérifier : ce qu'on facture ne
  // se décide jamais dans le navigateur, et le code a pu expirer ou atteindre
  // son plafond entre-temps. Avant de créer l'activation, pour ne pas laisser
  // une ligne en attente de paiement derrière un code refusé.
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
    // Stripe peut refuser un code que nous avions accepté : un code réservé
    // aux nouveaux clients, pour un client qui a déjà payé. Vérifié sur
    // Stripe : le refus tombe dès la création de la session, avec le code
    // promotion_code_customer_not_first_time.
    //
    // L'activation vient d'être créée et n'a jamais été payée : on la retire
    // (son historique suit, en cascade), sans quoi retenter sans le code
    // buterait sur « vous avez déjà une solution nommée… ».
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

// Reprend le paiement d'une activation existante — bouton "Reprendre le
// paiement" (PENDING_PAYMENT abandonné) ou "Réactiver" (CANCELED) sur une
// ligne précise, plutôt que de retrouver/créer une ligne par service comme
// avant (impossible dès qu'un service peut être activé plusieurs fois).
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

  // Un client qui revient payer une activation abandonnée garde son code s'il
  // est encore valable ; sinon il paie le tarif normal, plutôt que d'être
  // bloqué par un code expiré entre-temps — la page Stripe affiche de toute
  // façon le vrai total avant qu'il paie. Une réactivation après résiliation,
  // elle, ne réutilise pas le code : la remise a déjà été consommée.
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
    // Même refus possible qu'à l'activation (code réservé aux nouveaux
    // clients) : on reprend au tarif normal plutôt que de bloquer la reprise.
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

// Vérifie un code avant le paiement, pour que le client voie sa remise avant
// d'être redirigé chez Stripe. Renvoie un résultat plutôt que de lever une
// erreur : un code refusé est une réponse attendue, pas une panne.
export async function previewPromoCode(serviceId: string, code: string): Promise<PromoPreview> {
  const userId = await requireUserId();
  // Chaque essai interroge Stripe, et le champ permettrait sinon de deviner
  // des codes à la chaîne.
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

// Met à jour la configuration d'une prestation déjà souscrite (ex. : contexte
// métier, objectif des appels…) sans repasser par un paiement.
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

// Déconnecte l'agenda Google d'une prestation (le client peut vouloir en
// reconnecter un autre, ou n'en veut plus) — suppression simple, pas de
// révocation côté Google (le client peut la faire lui-même depuis son
// compte Google si besoin).
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

// Termine le parcours d'auto-connexion WhatsApp (Embedded Signup — voir
// src/app/dashboard/whatsapp-connection.tsx) : échange le code renvoyé par
// FB.login contre un jeton propre à ce client, abonne notre app à son WABA
// (sinon on ne recevrait jamais ses messages), enregistre son numéro pour
// l'API Cloud, et va chercher le numéro lisible pour confirmation à
// l'écran.
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

// Déconnecte le compte WhatsApp d'une prestation — suppression simple, pas
// de révocation côté Meta (le client peut retirer l'accès de l'app Noveris
// lui-même depuis son Gestionnaire d'entreprise si besoin).
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

// Termine la connexion self-service de la Page Facebook (Facebook Login for
// Business, voir messenger-connection.tsx) : échange le code contre un
// jeton utilisateur, retrouve la Page gérée et son jeton propre (voir
// fetchManagedPage dans src/lib/messenger.ts), abonne notre app à ses
// webhooks, et stocke le tout sur le ClientService.
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

// Déconnecte la Page Facebook d'une prestation — suppression simple, pas de
// révocation côté Meta (le client peut retirer l'accès de l'app Noveris
// lui-même depuis son Gestionnaire d'entreprise si besoin).
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

// Déconnecte le compte Instagram d'une prestation — la connexion elle-même
// se fait par redirect (voir src/app/api/instagram/connect et callback,
// completeInstagramConnection dans src/lib/instagram.ts), pas par une
// action serveur invoquée depuis le client comme WhatsApp/Messenger.
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
  // Achat autorisé une fois le paiement confirmé (CONFIGURING) — pas besoin
  // d'attendre le passage à ACTIVE par l'équipe Noveris, le numéro fait
  // partie de la configuration que le client met en place lui-même.
  if (clientService.status !== "CONFIGURING" && clientService.status !== "ACTIVE") {
    throw new Error("La solution doit être payée avant de choisir un numéro.");
  }
  if (clientService.externalPhoneNumber) {
    throw new Error("Un numéro est déjà assigné à cette solution.");
  }
  return clientService;
}

// Recherche de numéros disponibles pour une prestation donnée — pas de
// paramètres exposés au client pour l'instant (voir searchAvailableNumbers).
export async function searchPhoneNumbers(
  clientServiceId: string
): Promise<AvailableNumber[]> {
  const userId = await requireUserId();
  await requireOwnedTelephonyService(clientServiceId, userId);
  return searchAvailableNumbers();
}

// Achète le numéro choisi et l'assigne à la prestation — le webhook voix est
// configuré automatiquement à l'achat (voir purchasePhoneNumber).
export async function purchasePhoneNumberForService(
  clientServiceId: string,
  phoneNumber: string
) {
  const userId = await requireUserId();
  await requireOwnedTelephonyService(clientServiceId, userId);

  const purchased = await purchasePhoneNumber(phoneNumber);

  // Deux appels concurrents (double clic, deux onglets) passeraient tous les
  // deux le contrôle "pas déjà de numéro" dans requireOwnedTelephonyService
  // avant qu'aucun des deux n'écrive — chacun achèterait alors un vrai numéro
  // chez Twilio, et le second `update` écraserait le SID du premier en base,
  // le laissant orphelin (jamais relâché). Le `where` ci-dessous ne réussit
  // que pour le premier arrivé ; le perdant relâche immédiatement le numéro
  // qu'il vient d'acheter au lieu de l'assigner.
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

// Résilie une prestation active ou en cours de configuration : annule
// l'abonnement Stripe sous-jacent (s'il existe — les frais de mise en place
// déjà payés ne sont pas remboursés) puis marque la prestation résiliée.
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
      // Déjà annulé côté Stripe (ex. webhook customer.subscription.deleted
      // déjà traité) — on continue pour refléter l'état côté application.
    }
  }

  // Relâche le numéro Twilio pour arrêter sa facturation (best-effort, voir
  // releasePhoneNumber) — sinon un numéro acheté en libre-service continuerait
  // à coûter de l'argent à Noveris après résiliation.
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
