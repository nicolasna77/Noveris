import type { Metadata } from "next";
import { Suspense } from "react";
import { HelpRequestsSectionSkeleton } from "../admin-skeletons";
import { LiveRefreshToggle } from "../live-refresh-toggle";
import { HelpRequestsFilters } from "./help-requests-filters";
import { HelpRequestsSection } from "./help-requests-section";

export const metadata: Metadata = { title: "Centre d'aide" };

export default async function AdminAidePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Centre d&apos;aide
          </h1>
          <p className="mt-1 text-muted-foreground">
            Demandes envoyées par les clients depuis leur tableau de bord.
          </p>
        </div>
        <LiveRefreshToggle />
      </div>

      <div className="mt-6">
        <HelpRequestsFilters />
        <Suspense
          key={`${params.status ?? ""}:${params.page ?? ""}`}
          fallback={<HelpRequestsSectionSkeleton />}
        >
          <HelpRequestsSection status={params.status} page={params.page} />
        </Suspense>
      </div>
    </div>
  );
}
