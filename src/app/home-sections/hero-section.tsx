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
          {/* Le titre est en deux temps, et c'est le saut d'échelle qui porte
              le propos : le constat d'abord, à voix basse, puis la promesse.
              Colorer la seconde moitié — l'état précédent — coupait la phrase
              en deux et faisait porter à la couleur un sens qu'elle n'a pas ;
              le contraste de taille, lui, dit exactement ce qu'on veut dire.
              Le point final après « tourne » sépare les deux temps pour qui
              lit à voix haute ou au lecteur d'écran, le titre restant une
              seule phrase. */}
          {/* Les deux temps restent dans l'encre du texte : seule l'échelle
              les distingue. Les mettre en gris aurait fait un troisième
              niveau de gris sous la ligne de positionnement, et affaibli le
              constat au lieu de le poser.

              La grande ligne s'arrête à text-5xl : au-dessus, « automatisations »
              remplit à lui seul la colonne, text-balance n'a plus aucune marge
              et la phrase tombe sur quatre lignes bancales. */}
          <h1 className="max-w-2xl tracking-tight text-balance text-foreground">
            <span className="block text-2xl font-medium leading-snug sm:text-3xl">
              Votre entreprise tourne.
            </span>
            <span className="mt-1.5 block text-4xl font-semibold leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              Vos automatisations s&apos;occupent du reste.
            </span>
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
