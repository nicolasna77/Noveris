"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { HelpRequestStatus } from "@prisma/client";
import {
  sendHelpRequestReplyEmail,
  sendHelpRequestResolvedEmail,
} from "@/lib/email/notifications";

// Bascule une demande entre "En attente" et "Traité" — l'échange lui-même
// se fait dans le fil (voir replyToHelpRequest ci-dessous), ce bouton ne
// fait que clore ou rouvrir la demande. Un e-mail prévient le client au
// passage à "Traité" (pas à la réouverture).
export async function setHelpRequestStatus(
  helpRequestId: string,
  status: HelpRequestStatus
) {
  await requireAdmin();

  const updated = await db.helpRequest.update({
    where: { id: helpRequestId },
    data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
    include: { user: true },
  });

  if (status === "RESOLVED") {
    await sendHelpRequestResolvedEmail(
      {
        email: updated.user.email,
        name: updated.user.name,
        notificationPreferences: updated.user.notificationPreferences,
      },
      updated.subject
    );
  }

  revalidatePath("/admin/aide");
  revalidatePath("/dashboard/aide");
}

// Réponse de l'équipe Noveris dans le fil d'une demande — visible côté
// client dans son centre d'aide, et notifiée par e-mail (sans quoi il
// faudrait qu'il pense à rouvrir la page pour la découvrir).
export async function replyToHelpRequest(helpRequestId: string, body: string) {
  const session = await requireAdmin();

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Le message ne peut pas être vide.");

  const helpRequest = await db.helpRequest.findUniqueOrThrow({
    where: { id: helpRequestId },
    include: { user: true },
  });

  await db.helpRequestMessage.create({
    data: { helpRequestId, authorId: session.user.id, fromTeam: true, body: trimmed },
  });

  await sendHelpRequestReplyEmail(
    {
      email: helpRequest.user.email,
      name: helpRequest.user.name,
      notificationPreferences: helpRequest.user.notificationPreferences,
    },
    helpRequest.subject,
    trimmed
  );

  revalidatePath("/admin/aide");
  revalidatePath("/dashboard/aide");
}
