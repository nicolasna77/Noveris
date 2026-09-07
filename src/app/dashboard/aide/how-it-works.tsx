const STEPS = [
  {
    title: "Décrivez votre demande",
    description:
      "Choisissez la solution concernée si besoin, puis expliquez votre problème ou votre question.",
  },
  {
    title: "L'équipe Noveris répond",
    description: "Nous traitons votre demande sous 24h ouvrées.",
  },
  {
    title: "Recevez la confirmation",
    description: "Un e-mail vous prévient dès que c'est traité.",
  },
];

// Rend visible un processus qui, jusqu'ici, n'était décrit nulle part : le
// client envoyait une demande sans savoir s'il devait attendre une réponse
// par e-mail, revenir voir cette page, ou les deux (les deux, en fait — voir
// sendHelpRequestResolvedEmail).
export function HowItWorks() {
  return (
    <aside aria-labelledby="help-process-heading" className="lg:sticky lg:top-8 lg:self-start">
      <h2
        id="help-process-heading"
        className="text-sm font-semibold text-foreground"
      >
        Comment ça marche
      </h2>
      <ol className="mt-4 space-y-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mt-1 w-px flex-1 bg-border"
                />
              )}
            </div>
            <div className={index < STEPS.length - 1 ? "pb-1" : undefined}>
              <p className="text-sm font-medium text-foreground">
                {step.title}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
