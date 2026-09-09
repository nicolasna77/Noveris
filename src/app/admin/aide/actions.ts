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

// Clôt plusieurs demandes d'un coup. Reçoit un FormData plutôt que des
// arguments : les cases à cocher vivent dans les cartes et sont rattachées au
// formulaire par l'attribut `form` du HTML, ce qui évite d'imbriquer des
// formulaires (le formulaire de réponse occupe déjà chaque carte) et permet
// à la sélection de fonctionner sans JavaScript.
export async function bulkResolveHelpRequests(formData: FormData) {
  await requireAdmin();

  const ids = formData.getAll("helpRequestIds").filter((v): v is string => typeof v === "string");
  if (ids.length === 0) return;

  // Seules les demandes encore ouvertes sont concernées : reclôturer une
  // demande déjà traitée réécrirait sa date de résolution et renverrait un
  // e-mail au client pour rien.
  const toResolve = await db.helpRequest.findMany({
    where: { id: { in: ids }, status: "OPEN" },
    include: { user: true },
  });
  if (toResolve.length === 0) return;

  await db.helpRequest.updateMany({
    where: { id: { in: toResolve.map((r) => r.id) } },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  // Les e-mails sont au mieux : un envoi qui échoue ne doit pas annuler une
  // clôture déjà enregistrée, ni empêcher les suivants.
  await Promise.allSettled(
    toResolve.map((r) =>
      sendHelpRequestResolvedEmail(
        {
          email: r.user.email,
          name: r.user.name,
          notificationPreferences: r.user.notificationPreferences,
        },
        r.subject
      )
    )
  );

  revalidatePath("/admin/aide");
  revalidatePath("/dashboard/aide");
}
