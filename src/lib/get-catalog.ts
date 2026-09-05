import { cache } from "react";
import type { Service } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConfigField, ServiceDTO } from "@/lib/catalog";

// Jointure Service (Prisma) -> ServiceDTO (sérialisable, sans dépendance à
// @prisma/client) — partagée par le site public et le tableau de bord client
// pour ne pas dupliquer ce mapping des deux côtés.
export function toServiceDTO(service: Service): ServiceDTO {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    category: service.category,
    setupFeeCents: service.setupFeeCents,
    monthlyPriceCents: service.monthlyPriceCents,
    usageCapLabel: service.usageCapLabel,
    configFields: (service.configFields as ConfigField[]) ?? [],
    sortOrder: service.sortOrder,
  };
}

// Le catalogue des prestations ouvertes à la vente (isActive) — utilisé par
// le site public (accueil, menus de navigation, pages /prestations/[slug]) et
// par le catalogue d'activation du tableau de bord client (filtré à la
// catégorie ouverte à la vente). La base de données est la source de vérité
// depuis que le catalogue est éditable depuis /admin/services — voir
// prisma/seed.ts pour ce qui reste synchronisé depuis le code (uniquement
// configFields) vs. ce qui devient éditable par un admin (le reste).
//
// Une prestation désactivée (isActive: false) disparaît d'ici mais reste
// pleinement gérable par les clients qui l'ont déjà activée (voir
// MyServiceDTO, qui ne dépend pas de ce filtre) — /admin/services interroge
// `db.service` directement, sans ce filtre, pour pouvoir la réactiver.
//
// Mémoïsé par requête (comme getSession) : SiteHeader et la page qui le rend
// (accueil, détail d'une prestation) appellent tous deux cette fonction sans
// redéclencher la même requête.
export const getCatalog = cache(async (): Promise<ServiceDTO[]> => {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return services.map(toServiceDTO);
});

export async function getServiceBySlug(slug: string): Promise<ServiceDTO | null> {
  const service = await db.service.findFirst({ where: { slug, isActive: true } });
  return service ? toServiceDTO(service) : null;
}
