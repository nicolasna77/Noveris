import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-full bg-muted", className)}
    />
  );
}

export function StatsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement des statistiques…"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <Pulse className="h-4 w-24" />
              <Pulse className="size-4" />
            </div>
            <Pulse className="h-8 w-16 rounded-md" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function ClientsSectionSkeleton() {
  return (
    <div role="status" aria-label="Chargement des clients…" className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-2">
                <Pulse className="h-4 w-40 rounded-md" />
                <Pulse className="h-3 w-56 rounded-md" />
              </div>
              <Pulse className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function HelpRequestsSectionSkeleton() {
  return (
    <div role="status" aria-label="Chargement des demandes…" className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-2">
                <Pulse className="h-4 w-48 rounded-md" />
                <Pulse className="h-3 w-64 rounded-md" />
              </div>
              <Pulse className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
