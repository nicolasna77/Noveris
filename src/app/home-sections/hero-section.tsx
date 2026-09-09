import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ServiceDTO } from "@/lib/catalog";
import { HeroNetworkVisual } from "./hero-network-visual";

// Les prestations de communication alimentent l'illustration, dans l'ordre
// du catalogue : leurs noms en viennent directement, pas d'une liste écrite
// dans le composant — celle-ci annonçait encore une prestation supprimée.
// Six emplacements disponibles, les suivantes ne seraient pas dessinées.
const VISUAL_NODE_COUNT = 6;

export function HeroSection({ services }: { services: ServiceDTO[] }) {
  const labels = services
    .filter((service) => service.category === "COMMUNICATION")
    .slice(0, VISUAL_NODE_COUNT)
    .map((service) => service.name);

  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-center">
        <div>
          <p className="mb-6 text-sm text-muted-foreground">
            Agence d&apos;automatisation pour indépendants et TPE/PME
          </p>
          {/* Le titre d'un seul tenant : en colorer la moitié coupait la
              phrase en deux et faisait porter à la couleur un sens
              qu'elle n'a pas. */}
          {/* Pas de text-6xl : à cette taille, la phrase tombait sur cinq
              lignes dont une dernière réduite à deux mots. Un titre long se
              lit mieux un cran en dessous. */}
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Votre entreprise tourne. Vos automatisations s&apos;occupent du
            reste.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-balance leading-relaxed text-muted-foreground">
            Notre équipe installe vos automatisations, les connecte à vos outils
            et les surveille chaque mois. Vous ne paramétrez rien, vous
            n&apos;ouvrez aucun logiciel technique.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
          <p className="mt-4 text-sm text-muted-foreground">
            Sans engagement, et remboursé si ça ne vous convient pas sous 30
            jours.
          </p>
        </div>
        <HeroNetworkVisual labels={labels} />
      </div>
    </section>
  );
}
