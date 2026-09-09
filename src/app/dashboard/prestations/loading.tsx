import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-label="Chargement des solutions…">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-5 w-72" />

      {/* Mes solutions : la barre de filtres, puis les cartes activées. */}
      <div className="mt-10 flex flex-wrap gap-2">
        <Skeleton className="h-9 min-w-48 flex-1" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-3xl" />
        ))}
      </div>

      {/* Le catalogue d'activation, en grille. */}
      <Skeleton className="mt-14 h-6 w-56" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
