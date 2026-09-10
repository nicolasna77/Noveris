"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bot, ChevronRight, Loader2, Phone, Settings2, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import {
  describeServiceStatus,
  formatPrice,
  needsCalendarConnection,
  needsFacebookConnection,
  needsInstagramConnection,
  needsPhoneNumber,
  needsWhatsAppConnection,
  TELEPHONY_SERVICE_SLUGS,
  type MyServiceDTO,
} from "@/lib/catalog";
import { getErrorMessage } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { SERVICE_ICONS } from "@/lib/service-icons";
import { cancelService, resumeServiceCheckout } from "./actions";
import { ServiceProgress } from "./service-progress";
import { UsageCounter } from "./usage-counter";

export function MyServiceRow({
  item,
  onManage,
}: {
  item: MyServiceDTO;
  onManage: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isCanceling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { service, status } = item;
  const Icon = SERVICE_ICONS[service.slug] ?? Bot;
  const canManageConfig =
    (status === "ACTIVE" || status === "CONFIGURING") &&
    service.configFields.length > 0;
  const canUnsubscribe = status === "ACTIVE" || status === "CONFIGURING";
  const setupHint = needsPhoneNumber(item)
    ? "Choisissez un numéro pour que l'IA puisse décrocher"
    : needsWhatsAppConnection(item)
      ? "Connectez votre compte WhatsApp pour que l'IA puisse répondre"
      : needsFacebookConnection(item)
        ? "Connectez votre Page Facebook pour que l'IA puisse répondre"
        : needsInstagramConnection(item)
          ? "Connectez votre compte Instagram pour que l'IA puisse répondre"
          : needsCalendarConnection(item)
            ? "Connectez votre agenda pour recevoir les rendez-vous"
            : null;

  function handleResume() {
    startTransition(async () => {
      try {
        const { checkoutUrl } = await resumeServiceCheckout(
          item.clientServiceId
        );
        window.location.href = checkoutUrl;
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleUnsubscribe() {
    startCancelTransition(async () => {
      try {
        await cancelService(item.clientServiceId);
        toast.success(`« ${item.name} » a été résiliée.`);
        setConfirmCancel(false);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <Card className="relative shadow-sm transition-shadow has-[a:hover]:shadow-md has-[a:focus-visible]:shadow-md has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/30">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Icon
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-base font-semibold text-foreground">
                  <Link
                    href={`/dashboard/services/${item.clientServiceId}`}
                    className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
                  >
                    {item.name}
                    <span className="sr-only"> — voir le détail</span>
                  </Link>
                </h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  <StatusBadge status={status} />
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {item.name !== service.name && (
                <p className="truncate text-xs text-muted-foreground">
                  {service.name}
                </p>
              )}

              <CardDescription className="mt-1">
                {describeServiceStatus(item)}
              </CardDescription>

              {status !== "ACTIVE" && <ServiceProgress status={status} />}

              {setupHint && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-foreground">{setupHint}</p>
                </div>
              )}

              {item.adminNote && (
                <div className="mt-3 rounded-2xl bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Note de l&apos;équipe Noveris
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">{item.adminNote}</p>
                </div>
              )}

              {status === "ACTIVE" && TELEPHONY_SERVICE_SLUGS.has(service.slug) && (
                <UsageCounter clientServiceId={item.clientServiceId} />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
            {item.externalPhoneNumber && (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Phone
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="tabular-nums">{item.externalPhoneNumber}</span>
              </span>
            )}
            <span className="tabular-nums text-muted-foreground">
              {formatPrice(service.setupFeeCents, service.monthlyPriceCents)}
            </span>
          </div>
        </CardContent>

        {(status === "PENDING_PAYMENT" || status === "CANCELED") && (
          <CardFooter className="relative z-10 mt-auto">
            <Button
              className="w-full"
              variant={status === "CANCELED" ? "outline" : "default"}
              onClick={handleResume}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? (
                <>
                  <Loader2
                    className="animate-spin"
                    aria-hidden="true"
                    data-icon="inline-start"
                  />
                  Redirection…
                </>
              ) : status === "CANCELED" ? (
                "Réactiver"
              ) : (
                "Reprendre le paiement"
              )}
            </Button>
          </CardFooter>
        )}

        {(canManageConfig || canUnsubscribe) && (
          <CardFooter className="relative z-10 mt-auto flex-col gap-2">
            {canManageConfig && (
              <Button className="w-full" variant="outline" onClick={onManage}>
                <Settings2 aria-hidden="true" data-icon="inline-start" />
                Gérer la configuration
              </Button>
            )}
            {canUnsubscribe && (
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => setConfirmCancel(true)}
              >
                Se désabonner
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Résilier « {item.name} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;abonnement mensuel sera annulé immédiatement. Les frais de
              mise en place déjà réglés ne sont pas remboursés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleUnsubscribe}
              disabled={isCanceling}
              aria-busy={isCanceling}
            >
              {isCanceling ? "Résiliation…" : "Se désabonner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
