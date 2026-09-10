"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";
import type { ServiceCategory } from "@/lib/catalog";

function formatCents(cents: number | null): string {
  return cents === null
    ? "aucun"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
        cents / 100
      );
}

function describeServiceChanges(
  before: {
    name: string;
    description: string;
    category: ServiceCategory;
    setupFeeCents: number | null;
    monthlyPriceCents: number | null;
    usageCapLabel: string | null;
    sortOrder: number;
  },
  after: typeof before
): string {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`Nom : ${before.name} → ${after.name}`);
  if (before.category !== after.category) {
    changes.push(`Catégorie : ${before.category} → ${after.category}`);
  }
  if (before.setupFeeCents !== after.setupFeeCents) {
    changes.push(
      `Mise en place : ${formatCents(before.setupFeeCents)} → ${formatCents(after.setupFeeCents)}`
    );
  }
  if (before.monthlyPriceCents !== after.monthlyPriceCents) {
    changes.push(
      `Abonnement : ${formatCents(before.monthlyPriceCents)} → ${formatCents(after.monthlyPriceCents)}`
    );
  }
  if (before.usageCapLabel !== after.usageCapLabel) {
    changes.push(
      `Plafond d'usage : ${before.usageCapLabel ?? "aucun"} → ${after.usageCapLabel ?? "aucun"}`
    );
  }
  if (before.sortOrder !== after.sortOrder) {
    changes.push(`Ordre : ${before.sortOrder} → ${after.sortOrder}`);
  }
  if (before.description !== after.description) changes.push("Description modifiée");
  return changes.join(" · ");
}

export type ServiceUpdateInput = {
  name: string;
  description: string;
  category: ServiceCategory;
  setupFeeEuros: number | null;
  monthlyPriceEuros: number | null;
  usageCapLabel: string | null;
  sortOrder: number;
};

export async function updateServiceAction(
  serviceId: string,
  input: ServiceUpdateInput
) {
  const session = await requireAdmin();

  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new Error("Le nom est requis.");
  if (!description) throw new Error("La description est requise.");
  if (input.setupFeeEuros === null && input.monthlyPriceEuros === null) {
    throw new Error(
      "Au moins un prix (mise en place ou abonnement) est requis."
    );
  }

  const before = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
  const after = await db.service.update({
    where: { id: serviceId },
    data: {
      name,
      description,
      category: input.category,
      setupFeeCents:
        input.setupFeeEuros !== null ? Math.round(input.setupFeeEuros * 100) : null,
      monthlyPriceCents:
        input.monthlyPriceEuros !== null
          ? Math.round(input.monthlyPriceEuros * 100)
          : null,
      usageCapLabel: input.usageCapLabel?.trim() || null,
      sortOrder: input.sortOrder,
    },
  });

  const changes = describeServiceChanges(before, after);
  if (changes) {
    await logAdminAction({
      actor: session.user,
      action: "SERVICE_UPDATED",
      target: { type: "service", id: serviceId, label: before.name },
      detail: changes,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
}

export async function setServiceActiveAction(serviceId: string, isActive: boolean) {
  const session = await requireAdmin();

  const service = await db.service.update({
    where: { id: serviceId },
    data: { isActive },
  });

  await logAdminAction({
    actor: session.user,
    action: isActive ? "SERVICE_ACTIVATED" : "SERVICE_DEACTIVATED",
    target: { type: "service", id: serviceId, label: service.name },
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
}
