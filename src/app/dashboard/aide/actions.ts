"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { sendNewHelpRequestInternalEmail } from "@/lib/email/notifications";

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
      throw new Error("Prestation introuvable.");
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
