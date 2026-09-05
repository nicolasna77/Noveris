import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import type { HelpRequestDTO, HelpRequestServiceOption } from "@/lib/help";
import { HelpRequestForm } from "./help-request-form";
import { HelpRequestHistory } from "./help-request-history";
import { HowItWorks } from "./how-it-works";

export const metadata: Metadata = { title: "Aide" };

export default async function AidePage() {
  const { active: organization } = await requireActiveOrganization();

  const [clientServices, helpRequests] = await Promise.all([
    db.clientService.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, service: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.helpRequest.findMany({
      where: { organizationId: organization.id },
      include: { clientService: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const serviceOptions: HelpRequestServiceOption[] = clientServices.map(
    (cs) => ({
      clientServiceId: cs.id,
      name: cs.name,
      serviceName: cs.service.name,
    })
  );

  const historyItems: HelpRequestDTO[] = helpRequests.map((r) => ({
    id: r.id,
    subject: r.subject,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    service: r.clientService
      ? { clientServiceId: r.clientService.id, name: r.clientService.name }
      : null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LifeBuoy className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Aide
          </h1>
          <p className="mt-1 text-muted-foreground">
            Une question sur une prestation, un souci technique ? Décrivez-le
            ci-dessous.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <HelpRequestForm services={serviceOptions} />
        <HowItWorks />
      </div>

      <HelpRequestHistory items={historyItems} />
    </div>
  );
}
