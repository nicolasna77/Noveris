import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/catalog";
import { OverviewStats } from "./overview-stats";
import { SpendChart } from "./spend-chart";
import { OverviewStatsSkeleton, SpendChartSkeleton } from "./overview-skeletons";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const [session, { active: organization }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const hasEverActivated =
    (await db.clientService.count({ where: { organizationId: organization.id } })) > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Bonjour {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
          {formatDate(new Date())}
        </p>
      </div>

      {!hasEverActivated && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                Aucune automatisation activée pour l&apos;instant
              </p>
              <p className="text-sm text-muted-foreground">
                Choisissez une solution dans le catalogue pour démarrer.
              </p>
            </div>
          </div>
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/prestations#prestations-disponibles" />}
          >
            Découvrir les solutions
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <Suspense fallback={<OverviewStatsSkeleton />}>
          <OverviewStats organizationId={organization.id} />
        </Suspense>
        <Suspense fallback={<SpendChartSkeleton />}>
          <SpendChart userId={session.user.id} organizationId={organization.id} />
        </Suspense>
      </div>
    </div>
  );
}
