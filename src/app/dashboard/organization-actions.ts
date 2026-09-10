"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

const BLOCKING_STATUSES = ["PENDING_PAYMENT", "CONFIGURING", "ACTIVE"] as const;

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
      "Impossible de supprimer une organisation avec des solutions en cours. Résiliez-les d'abord."
    );
  }

  await db.clientService.deleteMany({
    where: { organizationId, status: "CANCELED" },
  });

  await auth.api.deleteOrganization({
    body: { organizationId },
    headers: await headers(),
  });

  revalidatePath("/dashboard", "layout");
}
