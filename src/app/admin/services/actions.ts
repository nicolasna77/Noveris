"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { ServiceCategory } from "@/lib/catalog";

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
  await requireAdmin();

  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new Error("Le nom est requis.");
  if (!description) throw new Error("La description est requise.");
  if (input.setupFeeEuros === null && input.monthlyPriceEuros === null) {
    throw new Error(
      "Au moins un prix (mise en place ou abonnement) est requis."
    );
  }

  await db.service.update({
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
  await requireAdmin();

  await db.service.update({
    where: { id: serviceId },
    data: { isActive },
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
}
