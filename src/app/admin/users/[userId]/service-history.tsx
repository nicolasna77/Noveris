import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTimelineList } from "@/components/service-timeline-list";
import { formatDate, type ServiceEventDTO } from "@/lib/catalog";

type ServiceHistoryRow = {
  id: string;
  name: string;
  service: { name: string };
  events: ServiceEventDTO[];
};

// Ce que l'équipe a déjà dit à ce client, solution par solution : les
// ServiceEvent existaient déjà en base (voir logServiceEvent) mais n'étaient
// visibles que depuis le compte du client lui-même.
//
// <details> natif plutôt qu'un état React : la page reste un composant
// serveur, et le repli d'un historique long marche au clavier sans code.
// La première solution est ouverte — c'est la plus récente, celle qu'on
// vient généralement consulter.
export function ServiceHistory({ clientServices }: { clientServices: ServiceHistoryRow[] }) {
  const withEvents = clientServices.filter((cs) => cs.events.length > 0);
  if (withEvents.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-foreground">Historique</h2>
      <Card>
        <CardContent className="divide-y divide-border">
          {withEvents.map((cs, index) => (
            <details key={cs.id} open={index === 0} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground">{cs.name}</span>
                  {cs.name !== cs.service.name && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {cs.service.name}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {cs.events.length} événement{cs.events.length > 1 ? "s" : ""} · dernier le{" "}
                  {formatDate(cs.events[0].createdAt)}
                </span>
              </summary>
              <div className="mt-4 pl-6">
                <ServiceTimelineList events={cs.events} />
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
