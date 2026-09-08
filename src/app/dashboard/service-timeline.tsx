import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceTimelineList } from "@/components/service-timeline-list";
import type { ServiceEventDTO } from "@/lib/catalog";

// Historique de la prestation — événements les plus récents en premier
// (comme un suivi de colis) : c'est l'état actuel qui intéresse le plus.
// Contrairement à `adminNote` (un seul champ, remplacé à chaque mise à jour),
// chaque entrée est conservée : le client garde la trace des notes
// précédentes, pas seulement la dernière. La même liste est visible côté
// équipe sur la fiche du client (voir ServiceHistory dans admin/users).
export function ServiceTimeline({ events }: { events: ServiceEventDTO[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historique</CardTitle>
      </CardHeader>
      <CardContent>
        <ServiceTimelineList events={events} />
      </CardContent>
    </Card>
  );
}
