const METHOD_STEPS = [
  {
    step: "01",
    title: "Audit",
    description:
      "En 30 minutes, nous identifions les tâches qui vous coûtent le plus de temps chaque semaine.",
  },
  {
    step: "02",
    title: "Priorisation",
    description:
      "Ensemble, nous choisissons les automatisations au meilleur retour sur investissement pour votre activité.",
  },
  {
    step: "03",
    title: "Déploiement",
    description:
      "Notre équipe installe et connecte vos automatisations à vos outils existants — vous n'installez rien.",
  },
  {
    step: "04",
    title: "Formation",
    description:
      "Vous et votre équipe prenez la main en quelques minutes, sans aucune compétence technique.",
  },
  {
    step: "05",
    title: "Suivi mensuel",
    description:
      "Nous surveillons, ajustons et améliorons vos automatisations en continu, inclus dans l'abonnement.",
  },
];

export function MethodSection() {
  return (
    <section id="methode" className="bg-muted py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-xs tracking-widest text-primary uppercase">
            Notre méthode
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Une méthode de déploiement éprouvée
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            De l&apos;audit initial au suivi mensuel, nous vous accompagnons à
            chaque étape pour que vos automatisations produisent des résultats
            concrets.
          </p>
        </div>
        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {METHOD_STEPS.map((step, index) => (
            <li key={step.step} className="relative">
              {index < METHOD_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-4 left-8 hidden h-px w-[calc(100%-2rem)] bg-border lg:block"
                />
              )}
              <span className="relative flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                {step.step}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
