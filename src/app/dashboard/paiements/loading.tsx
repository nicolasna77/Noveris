import { Skeleton } from "@/components/ui/skeleton";

// La page la plus exposée à l'attente : les factures viennent de l'API
// Stripe, hors de notre contrôle. Sans ce fichier, un ralentissement de
// Stripe se traduisait par une navigation figée, sans le moindre signe que
// quelque chose se passait.
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" role="status" aria-label="Chargement des paiements…">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-5 w-56" />

      <div className="mt-8 rounded-3xl border border-border bg-card p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3.5 w-24" />
            </div>
            <Skeleton className="h-6 w-20 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
