"use client";

import { useState } from "react";
import { Bot, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CATEGORY_LABELS,
  formatPrice,
  type ClientServiceStatus,
  type ServiceCategory,
  type ServiceDTO,
} from "@/lib/catalog";
import { SERVICE_ICONS } from "@/lib/service-icons";
import { ActivationDialog } from "./activation-dialog";

type StatusMap = Record<string, ClientServiceStatus>;

export function ServiceCatalog({
  services,
  statusByServiceId,
  categories,
  organizationId,
  open,
  onOpenChange,
}: {
  services: ServiceDTO[];
  statusByServiceId: StatusMap;
  categories: ServiceCategory[];
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeService, setActiveService] = useState<ServiceDTO | null>(null);
  const hasAnyService = categories.some(
    (category) => services.filter((s) => s.category === category).length > 0
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Solutions disponibles</SheetTitle>
            <SheetDescription>
              Activez une nouvelle automatisation pour votre entreprise.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-8">
            {hasAnyService ? (
              categories.map((category) => {
                const categoryServices = services.filter(
                  (s) => s.category === category
                );
                if (categoryServices.length === 0) return null;

                return (
                  <section key={category}>
                    <h3 className="mb-3 text-sm font-medium text-foreground">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <div className="flex flex-col gap-3">
                      {categoryServices.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          status={statusByServiceId[service.id]}
                          onActivate={() => setActiveService(service)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <PackageSearch className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-foreground">
                    Aucune solution disponible pour l&apos;instant
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Repassez bientôt, ou contactez-nous si vous cherchiez une
                    automatisation en particulier.
                  </p>
                </div>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ActivationDialog
        service={activeService}
        organizationId={organizationId}
        onOpenChange={(open) => !open && setActiveService(null)}
      />
    </>
  );
}

function ServiceCard({
  service,
  status,
  onActivate,
}: {
  service: ServiceDTO;
  status?: ClientServiceStatus;
  onActivate: () => void;
}) {
  const alreadyHasOne = status !== undefined;
  const Icon = SERVICE_ICONS[service.slug] ?? Bot;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-primary">{service.name}</h4>
              {status && <StatusBadge status={status} className="shrink-0" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {service.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
          <span className="font-medium tabular-nums text-foreground">
            {formatPrice(service.setupFeeCents, service.monthlyPriceCents)}
          </span>
          {service.usageCapLabel && (
            <span className="text-xs text-muted-foreground">
              {service.usageCapLabel}
            </span>
          )}
        </div>
        <Button
          className="mt-3 w-full"
          variant={alreadyHasOne ? "outline" : "default"}
          onClick={onActivate}
        >
          {alreadyHasOne ? "Activer à nouveau" : "Activer"}
        </Button>
      </CardContent>
    </Card>
  );
}
