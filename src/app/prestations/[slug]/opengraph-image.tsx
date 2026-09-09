import { ImageResponse } from "next/og";
import { OgFrame, OG_SIZE } from "@/components/og-frame";
import { priceSummary } from "@/components/json-ld";
import { getServiceBySlug } from "@/lib/get-catalog";
import { CATEGORY_LABELS } from "@/lib/catalog";

// Un aperçu par solution plutôt que celui de l'accueil pour toutes : le lien
// partagé annonce alors ce qu'il ouvre, prix compris.
export const alt = "Une solution Noveris";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  // Une solution retirée du catalogue peut encore être partagée quelque
  // part : l'image reste alors celle de la marque, plutôt qu'une erreur.
  if (!service) {
    return new ImageResponse(
      (
        <OgFrame
          lines={["Noveris"]}
          subtitle="Des automatisations installées, connectées et surveillées par notre équipe."
          footer="noveris.fr"
        />
      ),
      size
    );
  }

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={CATEGORY_LABELS[service.category]}
        lines={[service.name]}
        subtitle={service.description}
        footer={`${priceSummary(service)} Sans engagement.`}
      />
    ),
    size
  );
}
