import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function HeroSection({ serviceCount }: { serviceCount: number }) {
  const heroStats = [
    { label: "Prestations au catalogue", value: `${serviceCount}` },
    { label: "Disponibilité des assistants", value: "24/7" },
    { label: "Activation en ligne", value: "100 %" },
    { label: "Garantie satisfait ou remboursé", value: "30 jours" },
  ];

  return (
    <section className="relative overflow-hidden bg-muted">
      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
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
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Noveris installe et connecte des automatisations prêtes à
            l&apos;emploi pour les artisans, coachs, indépendants et TPE/PME :
            standard téléphonique qui répond à votre place, messages clients
            traités en continu, devis et factures générés automatiquement. Vous
            n&apos;ouvrez aucun logiciel technique — notre équipe s&apos;occupe
            de tout, de l&apos;installation au suivi mensuel.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Activer mes automatisations
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="#prestations" />}
            >
              Découvrir les prestations
            </Button>
          </div>
          <dl className="mt-12 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="bg-card px-4 py-3.5">
                <dt className="min-h-8 text-xs leading-4 text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-primary">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <Image
          src="/undraw_building-websites_k2zp.svg"
          alt=""
          width={500}
          height={500}
          priority
          quality={100}
          aria-hidden="true"
          className="w-full"
        />
      </div>
    </section>
  );
}
