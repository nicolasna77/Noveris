import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroNetworkVisual } from "./hero-network-visual";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-muted">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 65% 65% at 50% 50%, black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 65% 65% at 50% 50%, black 0%, transparent 100%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-center">
        <div>
          <Badge variant="secondary" className="mb-6">
            Agence d&apos;automatisation pour indépendants et TPE/PME
          </Badge>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Votre entreprise tourne.{" "}
            <span className="text-primary">
              Vos automatisations s&apos;occupent du reste.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-balance leading-relaxed text-muted-foreground">
            Notre équipe installe vos automatisations, les connecte à vos outils
            et les surveille chaque mois. Vous ne paramétrez rien, vous
            n&apos;ouvrez aucun logiciel technique.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Créer mon compte
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="#prestations" />}
            >
              Voir les solutions
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sans engagement, et remboursé si ça ne vous convient pas sous 30
            jours.
          </p>
        </div>
        <HeroNetworkVisual />
      </div>
    </section>
  );
}
