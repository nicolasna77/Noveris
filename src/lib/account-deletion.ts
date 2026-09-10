import { APIError } from "better-auth/api";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { releasePhoneNumber } from "@/lib/twilio";

const organizationsByDeletedUser = new Map<string, string[]>();

export async function prepareAccountDeletion(userId: string): Promise<void> {
  const [auditEntries, services, memberships] = await Promise.all([
    db.auditLog.count({ where: { actorId: userId } }),
    db.clientService.findMany({
      where: { userId, status: { not: "CANCELED" } },
      select: { stripeSubscriptionId: true, externalPhoneNumberSid: true },
    }),
    db.member.findMany({ where: { userId }, select: { organizationId: true } }),
  ]);

  if (auditEntries > 0) {
    throw new APIError("FORBIDDEN", {
      message:
        "Ce compte a effectué des actions d'administration : il ne peut pas être supprimé depuis le profil. Contactez l'équipe.",
    });
  }

  for (const service of services) {
    if (service.stripeSubscriptionId) {
      await stripeClient.subscriptions
        .cancel(service.stripeSubscriptionId)
        .catch((err) => console.error("[suppression] résiliation Stripe impossible :", err));
    }
    if (service.externalPhoneNumberSid) {
      await releasePhoneNumber(service.externalPhoneNumberSid).catch((err) =>
        console.error("[suppression] libération du numéro impossible :", err)
      );
    }
  }

  organizationsByDeletedUser.set(
    userId,
    memberships.map((m) => m.organizationId)
  );
}

export async function removeOrphanOrganizations(userId: string): Promise<void> {
  const organizationIds = organizationsByDeletedUser.get(userId) ?? [];
  organizationsByDeletedUser.delete(userId);
  if (organizationIds.length === 0) return;

  await db.organization.deleteMany({
    where: {
      id: { in: organizationIds },
      members: { none: {} },
      clientServices: { none: {} },
    },
  });
}
