import { StatusBadge } from "@/components/status-badge";
import { formatPrice, type ClientServiceStatus } from "@/lib/catalog";
import { MarkActiveButton } from "./client-service-actions";
import {
  ConnectionCell,
  NoteCell,
  configSummary,
  type ClientServiceCellData,
} from "./client-service-cells";

export function ClientServiceCard({
  cs,
}: {
  cs: ClientServiceCellData & {
    name: string;
    organization: { name: string };
    service: { slug: string; name: string; setupFeeCents: number | null; monthlyPriceCents: number | null };
  };
}) {
  return (
    <li className="rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{cs.name}</p>
          {cs.name !== cs.service.name && (
            <p className="text-xs text-muted-foreground">{cs.service.name}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {cs.organization.name}
          </p>
        </div>
        <StatusBadge status={cs.status as ClientServiceStatus} />
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">Prix</dt>
          <dd className="ml-auto text-foreground">
            {formatPrice(cs.service.setupFeeCents, cs.service.monthlyPriceCents)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">Configuration</dt>
          <dd className="ml-auto min-w-0 text-right break-words text-muted-foreground">
            {configSummary(cs)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3 border-t border-border pt-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Note pour le client</p>
          <NoteCell cs={cs} />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Connexion externe</p>
          <ConnectionCell cs={cs} />
        </div>
        {cs.status === "CONFIGURING" && <MarkActiveButton clientServiceId={cs.id} />}
      </div>
    </li>
  );
}
