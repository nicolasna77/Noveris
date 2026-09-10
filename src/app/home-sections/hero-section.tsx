import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatCents, type ServiceDTO } from "@/lib/catalog";
import { HeroNetworkVisual } from "./hero-network-visual";

// Les solutions de communication alimentent l'illustration, dans l'ordre du
// catalogue : leurs noms en viennent directement, pas d'une liste écrite dans
// le composant. Six emplacements, les suivantes ne seraient pas dessinées.
const VISUAL_NODE_COUNT = 6;

export function HeroSection({ services }: { services: ServiceDTO[] }) {
  const communication = services.filter((s) => s.category === "COMMUNICATION");
  const labels = communication.slice(0, VISUAL_NODE_COUNT).map((s) => s.name);

  // Le prix d'appel vient du catalogue, comme partout ailleurs : un tarif
  // modifié depuis l'admin se reporte ici sans que personne y pense.
  const monthlyPrices = communication
    .filter((s) => s.monthlyPriceCents !== null)
    .map((s) => s.monthlyPriceCents as number);
  const fromPrice = monthlyPrices.length > 0 ? Math.min(...monthlyPrices) : null;

  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_32rem]">
        <div>
          <p className="mb-6 text-sm text-muted-foreground">
            Agence d&apos;automatisation IA pour artisans, coachs et TPE/PME
          </p>
          {/* Deux temps, et c'est le saut d'échelle qui porte le propos : le
              constat, puis la promesse. Le point final après « tourne »
              sépare les deux temps pour qui lit à voix haute, le titre
              restant une seule phrase. */}
          <h1 className="max-w-2xl tracking-tight text-balance text-foreground">
            <span className="block text-2xl font-medium leading-snug sm:text-3xl">
              Votre entreprise tourne.
            </span>
            {/* L'axe de chasse de Bricolage, resserré à 88 % : la ligne gagne
                en densité, et « automatisations » tient avec « Vos » sur un
                écran de téléphone au lieu d'y laisser « Vos » seul. Plafonnée
                à text-6xl : l'illustration occupe une colonne large, et au-delà
                la phrase ne tiendrait plus en deux lignes. */}
            <span className="mt-2 block text-[2.6rem] font-bold leading-[0.98] tracking-[-0.03em] [font-stretch:88%] sm:text-6xl">
              Vos automatisations s&apos;occupent du reste.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-balance text-muted-foreground">
            Un assistant IA répond au téléphone et sur vos messageries, prend
            les rendez-vous et vous transmet l&apos;essentiel. Notre équipe
            l&apos;installe, le connecte à vos outils et le surveille chaque
            mois.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Créer mon compte
              <ArrowRight data-icon="inline-end" />
            </Link>
            <Link
              href="#prestations"
              className={buttonVariants({ size: "lg", variant: "secondary" })}
            >
              Voir les solutions
            </Link>
          </div>
          <p className="mt-4 max-w-md text-sm text-balance text-muted-foreground">
            {fromPrice !== null && (
              <>
                À partir de{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCents(fromPrice)} par mois
                </span>
                , sans engagement.{" "}
              </>
            )}
            Remboursé si ça ne vous convient pas sous 30 jours.
          </p>
        </div>
        {/* L'illustration sur mesure plutôt qu'un exemple d'appel en bulles de
            chat : essayé, ce motif faisait maquette de chatbot générique. Ici
            chaque nœud est une solution réelle du catalogue. */}
        <HeroNetworkVisual labels={labels} />
      </div>
    </section>
  );
}
