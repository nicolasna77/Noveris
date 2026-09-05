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
