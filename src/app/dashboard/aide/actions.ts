"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import {
  sendHelpRequestClientReplyInternalEmail,
  sendNewHelpRequestInternalEmail,
} from "@/lib/email/notifications";

// Envoie une demande depuis le centre d'aide du dashboard client. Le profil
// (userId) et l'entreprise (organizationId, l'organisation active) sont
// déduits de la session plutôt que saisis par le client — seule la
// prestation concernée, optionnelle, vient du formulaire, et sa
// correspondance avec l'organisation active est revérifiée côté serveur
// plutôt que de faire confiance à l'id transmis.
export async function submitHelpRequest(input: {
  subject: string;
  message: string;
  clientServiceId: string | null;
}) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  const { active } = await requireActiveOrganization();

  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!subject || !message) {
    throw new Error("Merci de renseigner un objet et un message.");
  }

  let clientService: { organizationId: string; name: string } | null = null;
  if (input.clientServiceId) {
    clientService = await db.clientService.findUnique({
      where: { id: input.clientServiceId },
      select: { organizationId: true, name: true },
    });
    if (!clientService || clientService.organizationId !== active.id) {
      throw new Error("Solution introuvable.");
    }
  }

  await db.helpRequest.create({
    data: {
      userId: session.user.id,
      organizationId: active.id,
      clientServiceId: input.clientServiceId,
      subject,
      message,
    },
  });
  await sendNewHelpRequestInternalEmail({
    clientName: session.user.name,
    clientEmail: session.user.email,
    organizationName: active.name,
    subject,
    message,
    serviceName: clientService?.name ?? null,
  });

  revalidatePath("/dashboard/aide");
  revalidatePath("/admin/aide");
}

// Réponse du client dans le fil d'une de ses demandes (relance, précision,
// réponse à l'équipe). La demande est rattachée à l'organisation active et
// revérifiée ici plutôt que de faire confiance à l'id transmis.
export async function replyToHelpRequest(helpRequestId: string, body: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  const { active } = await requireActiveOrganization();

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Le message ne peut pas être vide.");

  const helpRequest = await db.helpRequest.findUnique({
    where: { id: helpRequestId },
    select: { id: true, subject: true, status: true, organizationId: true },
  });
  if (!helpRequest || helpRequest.organizationId !== active.id) {
    throw new Error("Demande introuvable.");
  }

  await db.helpRequestMessage.create({
    data: { helpRequestId, authorId: session.user.id, fromTeam: false, body: trimmed },
  });

  // Une relance sur une demande déjà close doit la faire remonter : la liste
  // admin ne montre que les demandes "En attente" par défaut, la réponse
  // resterait invisible sinon.
  if (helpRequest.status === "RESOLVED") {
    await db.helpRequest.update({
      where: { id: helpRequestId },
      data: { status: "OPEN", resolvedAt: null },
    });
  }

  await sendHelpRequestClientReplyInternalEmail({
    clientName: session.user.name,
    clientEmail: session.user.email,
    organizationName: active.name,
    subject: helpRequest.subject,
    body: trimmed,
  });

  revalidatePath("/dashboard/aide");
  revalidatePath("/admin/aide");
}
