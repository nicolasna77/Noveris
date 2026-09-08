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

// Ce qui a réellement changé, mis en forme pour le journal — sans ça, une
// ligne « Solution modifiée » n'apprendrait rien : c'est précisément le
// passage d'un prix mensuel de 79 à 89 € qu'on cherche à retrouver après
// coup. La description, potentiellement longue, est seulement signalée.
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
  // En euros (pas en centimes) — conversion faite ici, pas dans le
  // formulaire, pour que l'unité en base (centimes) reste un détail
  // d'implémentation invisible de l'admin.
  setupFeeEuros: number | null;
  monthlyPriceEuros: number | null;
  usageCapLabel: string | null;
  sortOrder: number;
};

// Le catalogue (nom, description, catégorie, prix, plafond d'usage, ordre)
// est éditable depuis /admin/services depuis cette fonctionnalité — voir
// prisma/seed.ts pour ce qui reste synchronisé depuis le code (uniquement
// configFields, pas encore d'éditeur générique pour ceux-ci).
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
  // Une soumission sans modification réelle ne laisse pas de trace : le
  // journal ne sert qu'à retrouver ce qui a changé.
  if (changes) {
    await logAdminAction({
      actor: session.user,
      action: "SERVICE_UPDATED",
      target: { type: "service", id: serviceId, label: before.name },
      detail: changes,
    });
  }

  // Le catalogue est affiché sur le site public (accueil, /prestations/[slug],
  // menus de navigation) et dans le tableau de bord client — on invalide
  // largement plutôt que d'énumérer chaque route, une édition de catalogue
  // restant rare (pas un chemin chaud).
  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
}

// Désactive/réactive une prestation sans la supprimer : une fois désactivée,
// elle disparaît du catalogue public et du catalogue d'activation (voir
// getCatalog/getServiceBySlug dans src/lib/get-catalog.ts) mais les clients
// qui l'ont déjà activée gardent leur prestation intacte — seules les
// nouvelles activations sont bloquées. Séparée de updateServiceAction : un
// aller-retour rapide en un clic depuis le tableau, pas besoin d'ouvrir le
// formulaire d'édition complet pour ça.
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
