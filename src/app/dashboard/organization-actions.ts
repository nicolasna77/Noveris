"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

// Statuts qui empêchent la suppression d'une organisation — seules des
// prestations résiliées (ou aucune) peuvent être nettoyées automatiquement,
// vu la FK ClientService.organizationId en onDelete: Restrict.
const BLOCKING_STATUSES = ["PENDING_PAYMENT", "CONFIGURING", "ACTIVE"] as const;

// Suppression via une action serveur dédiée (plutôt que
// authClient.organization.delete() directement côté client) car elle doit
// appliquer des règles métier que better-auth ne connaît pas : un client
// garde toujours au moins une organisation, et une organisation avec des
// prestations en cours ne se supprime pas silencieusement.
export async function deleteOrganizationAction(organizationId: string) {
  const session = await requireUser();

  const [membership, organizationCount, blockingCount] = await Promise.all([
    db.member.findFirst({ where: { organizationId, userId: session.user.id } }),
    db.member.count({ where: { userId: session.user.id } }),
    db.clientService.count({
      where: { organizationId, status: { in: [...BLOCKING_STATUSES] } },
    }),
  ]);

  if (!membership) throw new Error("UNAUTHORIZED");
  if (organizationCount <= 1) {
    throw new Error("Vous devez conserver au moins une organisation.");
  }
  if (blockingCount > 0) {
    throw new Error(
      "Impossible de supprimer une organisation avec des prestations en cours. Résiliez-les d'abord."
    );
  }

  // Les prestations résiliées bloqueraient la suppression (FK Restrict) sans
  // apporter d'information utile une fois l'organisation elle-même partie.
  await db.clientService.deleteMany({
    where: { organizationId, status: "CANCELED" },
  });

  await auth.api.deleteOrganization({
    body: { organizationId },
    headers: await headers(),
  });

  revalidatePath("/dashboard", "layout");
}
