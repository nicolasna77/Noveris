import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

// Le catalogue est interrogé directement plutôt que par generateStaticParams,
// qui n'existe plus sur /prestations/[slug] : cette page lit la session, elle
// ne peut donc pas être rendue à l'avance (voir le commentaire qui l'explique
// dans la page elle-même).
//
// Rendu à la demande, et non au build : le catalogue est modifiable depuis
// /admin/services, un sitemap figé à la compilation n'aurait jamais annoncé
// une solution ajoutée depuis. Un fichier consulté quelques fois par jour par
// des robots ne gagne rien à être mis en cache.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await db.service.findMany({
    where: { isActive: true },
    select: { slug: true },
    orderBy: { sortOrder: "asc" },
  });

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...services.map((service) => ({
      url: absoluteUrl(`/prestations/${service.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
