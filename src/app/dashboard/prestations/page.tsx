import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import { getCatalog } from "@/lib/get-catalog";
import { type MyServiceDTO } from "@/lib/catalog";
import { toMyServiceDTO } from "../get-my-service";
import { PrestationsView } from "./prestations-view";

export const metadata: Metadata = { title: "Prestations" };

export default async function PrestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; clientServiceId?: string }>;
}) {
  const [{ active: organization }, params, services] = await Promise.all([
    requireActiveOrganization(),
    searchParams,
    getCatalog(),
  ]);

  const clientServices = await db.clientService.findMany({
    where: { organizationId: organization.id },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  // Indique juste si une prestation a déjà été activée au moins une fois
  // (badge "Activer à nouveau" dans le catalogue) — un service peut
  // désormais être activé plusieurs fois, ce n'est plus un état unique par
  // service.
  const statusByServiceId = new Map(
    clientServices.map((cs) => [cs.serviceId, cs.status])
  );

  // Catalogue d'activation limité à la communication client automatisée pour
  // l'instant (les autres catégories ne sont pas encore ouvertes à la vente).
  const serviceDTOs = services.filter((s) => s.category === "COMMUNICATION");

  const myServices: MyServiceDTO[] = clientServices.map(toMyServiceDTO);

  const checkoutStatus =
    params.checkout === "success" || params.checkout === "canceled"
      ? params.checkout
      : null;
  const checkoutTarget = params.clientServiceId
    ? myServices.find((m) => m.clientServiceId === params.clientServiceId)
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PrestationsView
        serviceDTOs={serviceDTOs}
        statusByServiceId={Object.fromEntries(statusByServiceId)}
        myServices={myServices}
        organizationId={organization.id}
        checkoutStatus={checkoutStatus}
        checkoutServiceName={checkoutTarget?.name}
        checkoutInitialStatus={checkoutTarget?.status}
      />
    </div>
  );
}
