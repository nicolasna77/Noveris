// Une page de réglages parle d'une seule personne : ses trois sections sont
// séparées par un filet plutôt qu'isolées dans trois cartes de même poids,
// qui donnaient au mot de passe (rare, sensible) exactement la même
// importance qu'à une case à cocher de notification.
export function ProfileSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  // Ce qui pilote l'enregistrement de la section — bouton explicite ou
  // simple mention "enregistré automatiquement" : le modèle diffère d'une
  // section à l'autre et n'était jusqu'ici indiqué nulle part.
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="max-w-md">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
