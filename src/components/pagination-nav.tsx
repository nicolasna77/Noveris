import Link from "next/link";

// Partagé par ClientsSection et UsersSection — construit les liens
// Précédent/Suivant en reportant les paramètres de recherche/filtre actifs,
// sans jamais les deux dupliquer avec un `buildPageHref` propre à chacun.
export function PaginationNav({
  page,
  totalPages,
  basePath,
  params,
  label,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
  label: string;
}) {
  if (totalPages <= 1) return null;

  function href(targetPage: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (targetPage > 1) search.set("page", String(targetPage));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <nav aria-label={label} className="mt-6 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="text-foreground underline-offset-4 hover:underline"
        >
          ← Précédent
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {page} sur {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="text-foreground underline-offset-4 hover:underline"
        >
          Suivant →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
