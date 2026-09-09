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
      "Notre équipe installe et connecte vos automatisations à vos outils existants, puis les teste sur vos vrais cas.",
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
    <section id="methode" className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
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
            <li key={step.step} className="border-t border-border pt-4">
              <span className="text-sm tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <h3 className="mt-2 font-medium text-foreground">{step.title}</h3>
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
