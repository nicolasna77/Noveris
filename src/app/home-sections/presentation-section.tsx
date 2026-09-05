export function PresentationSection() {
  return (
    <section className="bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <span className="text-xs tracking-widest text-primary uppercase">
            Qui nous sommes
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Une agence, pas un logiciel à configurer
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Noveris installe des automatisations pour les artisans, coachs,
            indépendants et TPE/PME. Nous ne vendons pas un accès à
            paramétrer vous-même : chaque prestation est installée, connectée
            à vos outils existants et vérifiée par notre équipe avant
            d&apos;être activée. Vous n&apos;avez rien à programmer, rien à
            apprendre.
          </p>
        </div>
        <dl className="space-y-6 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <div>
            <dt className="font-medium text-foreground">Client</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Active et suit ses prestations depuis un tableau de bord
              simple, sans réglage technique.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Équipe Noveris</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Installe, connecte et supervise chaque automatisation
              commandée, du premier jour au suivi mensuel.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
