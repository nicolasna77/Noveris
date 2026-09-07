"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logServiceEvent } from "@/lib/service-events";
import {
  sendServiceActivatedEmail,
  sendServiceNoteAddedEmail,
} from "@/lib/email/notifications";

// Bascule une prestation payée (CONFIGURING) vers ACTIVE une fois le
// déploiement vérifié par l'équipe Noveris.
export async function markServiceActive(clientServiceId: string) {
  await requireAdmin();

  const clientService = await db.clientService.update({
    where: { id: clientServiceId },
    data: { status: "ACTIVE", activatedAt: new Date() },
    include: { user: true },
  });
  await logServiceEvent(clientServiceId, "ACTIVATED");
  await sendServiceActivatedEmail(
    {
      email: clientService.user.email,
      name: clientService.user.name,
      notificationPreferences: clientService.user.notificationPreferences,
    },
    clientService.name,
    clientService.id
  );

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Met à jour la note visible par le client sur sa prestation (ex. « Connexion
// de votre agenda en cours ») — c'est le principal moyen pour l'équipe
// Noveris de faire savoir au client où en est le déploiement.
export async function updateServiceNote(clientServiceId: string, note: string) {
  await requireAdmin();

  const trimmed = note.trim();
  const clientService = await db.clientService.update({
    where: { id: clientServiceId },
    data: { adminNote: trimmed || null },
    include: { user: true },
  });
  // Une note effacée n'a rien à raconter dans l'historique — seule une note
  // renseignée (même en remplacement d'une précédente) y va, avec son texte
  // en message pour ne pas perdre la version précédente au prochain remplacement.
  if (trimmed) {
    await logServiceEvent(clientServiceId, "NOTE_ADDED", trimmed);
    await sendServiceNoteAddedEmail(
      {
        email: clientService.user.email,
        name: clientService.user.name,
        notificationPreferences: clientService.user.notificationPreferences,
      },
      clientService.name,
      clientService.id,
      trimmed
    );
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Renseigne manuellement le numéro Twilio d'une prestation — le client
// achète normalement son numéro lui-même depuis son tableau de bord (voir
// purchasePhoneNumberForService dans dashboard/actions.ts) ; ceci reste un
// filet de sécurité pour l'équipe support (achat échoué, migration d'un
// numéro existant…).
export async function setExternalPhoneNumber(
  clientServiceId: string,
  phoneNumber: string
) {
  await requireAdmin();

  const trimmed = phoneNumber.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { externalPhoneNumber: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "PHONE_ASSIGNED", trimmed);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Renseigne l'identifiant Meta ("Phone Number ID") du numéro WhatsApp
// Business du client — pas de connexion en libre-service pour l'instant
// (contrairement au numéro Twilio), donc entièrement manuel : le client
// communique son numéro à l'équipe, qui le connecte à l'app Meta de Noveris
// (Embedded Signup) et reporte ici l'identifiant obtenu. Pas de type
// ServiceEventType dédié pour éviter une migration d'enum pour un seul
// champ admin — CONFIGURATION_UPDATED reste sémantiquement correct.
export async function setWhatsAppPhoneNumberId(
  clientServiceId: string,
  phoneNumberId: string
) {
  await requireAdmin();

  const trimmed = phoneNumberId.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { whatsappPhoneNumberId: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", "Numéro WhatsApp connecté");

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Même repli manuel que setWhatsAppPhoneNumberId ci-dessus, pour la Page
// Facebook (Messenger) d'un client — utile si la connexion self-service
// échoue ou pour notre propre Page de test.
export async function setFacebookPageId(clientServiceId: string, pageId: string) {
  await requireAdmin();

  const trimmed = pageId.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { facebookPageId: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", "Page Facebook connectée");

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Même repli manuel, pour le compte Instagram d'un client.
export async function setInstagramAccountId(clientServiceId: string, accountId: string) {
  await requireAdmin();

  const trimmed = accountId.trim();
  await db.clientService.update({
    where: { id: clientServiceId },
    data: { instagramAccountId: trimmed || null },
  });
  if (trimmed) await logServiceEvent(clientServiceId, "CONFIGURATION_UPDATED", "Compte Instagram connecté");

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
