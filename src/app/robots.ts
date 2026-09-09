import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Rien de ce qui vit derrière une authentification n'a de sens dans un
      // index : ces pages redirigent vers la connexion pour un robot, qui
      // n'y trouverait qu'un formulaire dupliqué en dizaines d'exemplaires.
      disallow: ["/dashboard/", "/admin/", "/api/", "/login", "/signup", "/forgot-password"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
