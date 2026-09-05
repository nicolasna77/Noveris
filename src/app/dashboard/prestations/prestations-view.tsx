"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ClientServiceStatus,
  MyServiceDTO,
  ServiceDTO,
} from "@/lib/catalog";
import { CheckoutNotice } from "../checkout-notice";
import { MyServices } from "../my-services";
import { ServiceCatalog } from "../service-catalog";

type StatusMap = Record<string, ClientServiceStatus>;

// Regroupe le titre de page, "Mes prestations" et le catalogue dans un seul
// composant client : le bouton "Découvrir les prestations" vit maintenant
// dans l'en-tête (en haut à droite) mais doit contrôler le même Sheet que
// ServiceCatalog plus bas dans l'arbre — cet état ne peut être partagé qu'en
// remontant les deux dans un ancêtre commun.
export function PrestationsView({
  serviceDTOs,
  statusByServiceId,
  myServices,
  organizationId,
  checkoutStatus,
  checkoutServiceName,
  checkoutInitialStatus,
}: {
  serviceDTOs: ServiceDTO[];
  statusByServiceId: StatusMap;
  myServices: MyServiceDTO[];
  organizationId: string;
  checkoutStatus: "success" | "canceled" | null;
  checkoutServiceName?: string;
  checkoutInitialStatus?: ClientServiceStatus;
}) {
  const [catalogOpen, setCatalogOpen] = useState(false);

  return (
    <>
      <div
        id="prestations-disponibles"
        className="mb-8 flex scroll-mt-20 flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Prestations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Vos automatisations activées et le catalogue disponible.
          </p>
        </div>
        <Button onClick={() => setCatalogOpen(true)} className="shrink-0">
          <Sparkles aria-hidden="true" data-icon="inline-start" />
          Découvrir les prestations
        </Button>
      </div>

      {checkoutStatus && (
        <CheckoutNotice
          status={checkoutStatus}
          serviceName={checkoutServiceName}
          initialStatus={checkoutInitialStatus}
        />
      )}

      <MyServices items={myServices} />

      <ServiceCatalog
        services={serviceDTOs}
        statusByServiceId={statusByServiceId}
        categories={["COMMUNICATION"]}
        organizationId={organizationId}
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
      />
    </>
  );
}
