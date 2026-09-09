import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

// Le catalogue est interrogé directement plutôt que par generateStaticParams,
// qui n'existe plus sur /prestations/[slug] : cette page lit la session, elle
// ne peut donc pas être rendue à l'avance (voir le commentaire qui l'explique
// dans la page elle-même).
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
