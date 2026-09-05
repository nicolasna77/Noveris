import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Bot } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireUser } from "@/lib/session";
import { getMyService } from "@/app/dashboard/get-my-service";
import { describeServiceStatus, formatPrice } from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { SERVICE_ICONS } from "@/lib/service-icons";
import { ServiceProgress } from "@/app/dashboard/service-progress";
import { ServiceTimeline } from "@/app/dashboard/service-timeline";
import { ServiceDetailTable } from "@/app/dashboard/service-detail-table";

export const metadata: Metadata = { title: "Détail de la prestation" };

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientServiceId: string }>;
  searchParams: Promise<{ calendar?: string }>;
}) {
  const [{ clientServiceId }, { calendar }] = await Promise.all([
    params,
    searchParams,
  ]);
  const session = await requireUser();
  const item = await getMyService(clientServiceId, session.user.id);
  if (!item) notFound();

  const Icon = SERVICE_ICONS[item.service.slug] ?? Bot;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard/prestations"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux prestations
      </Link>

      {calendar === "error" && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Connexion à l&apos;agenda impossible</AlertTitle>
          <AlertDescription>
            Réessayez depuis la section Agenda ci-dessous, ou contactez-nous si
            le problème persiste.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-start gap-3">
        <Icon
          className="mt-1 size-6 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {item.name}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={item.status} />
              <span className="text-base tabular-nums text-foreground">
                {formatPrice(item.service.setupFeeCents, item.service.monthlyPriceCents)}
              </span>
            </div>
          </div>

          {item.name !== item.service.name && (
            <p className="text-sm text-muted-foreground">{item.service.name}</p>
          )}
          <p className="mt-2 max-w-xl text-muted-foreground">
            {item.service.description}
          </p>

          <p className="mt-4 text-sm font-medium text-foreground">
            {describeServiceStatus(item)}
          </p>
          <ServiceProgress status={item.status} />
        </div>
      </div>

      <div className="mt-10 space-y-10">
        <ServiceTimeline events={item.events} />
        <ServiceDetailTable item={item} />
      </div>
    </div>
  );
}
