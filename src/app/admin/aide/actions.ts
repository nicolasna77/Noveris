"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { HelpRequestStatus } from "@prisma/client";
import { sendHelpRequestResolvedEmail } from "@/lib/email/notifications";

// Bascule une demande entre "En attente" et "Traité" — pas de fil de
// discussion pour l'instant, l'équipe répond au client par un autre canal
// (téléphone, e-mail) et vient simplement marquer la demande traitée ici.
// Un e-mail prévient le client au passage à "Traité" (pas au réouverture).
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
