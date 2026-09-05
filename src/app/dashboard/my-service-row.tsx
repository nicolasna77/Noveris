"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bot, ChevronRight, Loader2, Settings2 } from "lucide-react";
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
  formatConfigValue,
  formatPrice,
  TELEPHONY_SERVICE_SLUGS,
  type MyServiceDTO,
} from "@/lib/catalog";
import { getErrorMessage } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { SERVICE_ICONS } from "@/lib/service-icons";
import { cancelService, resumeServiceCheckout } from "./actions";
import { ServiceProgress } from "./service-progress";
import { UsageCounter } from "./usage-counter";

// Au-delà de ce nombre, le reste des champs de configuration n'est plus
// listé sur la ligne (résumé) — le détail complet reste à un clic, sur la
// page /dashboard/services/[clientServiceId].
const MAX_CONFIG_ENTRIES_SHOWN = 4;

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
  const configEntries = Object.entries(item.configuration).filter(
    ([, value]) => value
  );
  const shownConfigEntries = configEntries.slice(0, MAX_CONFIG_ENTRIES_SHOWN);
  const hiddenConfigCount = configEntries.length - shownConfigEntries.length;
  const canManageConfig =
    (status === "ACTIVE" || status === "CONFIGURING") &&
    service.configFields.length > 0;
  const canUnsubscribe = status === "ACTIVE" || status === "CONFIGURING";
  const hasFacts = item.externalPhoneNumber || shownConfigEntries.length > 0;

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
      {/* Toute la carte est cliquable vers le détail via un "stretched
          link" (l'ancre ne porte que le nom, mais s'étend visuellement à
          la carte entière via after:inset-0) plutôt qu'un <Link> englobant
          tout le contenu : englober badge/prix/description dans le lien
          les aurait rendus muets pour un lecteur d'écran qui tabule
          directement sur le lien (son nom accessible aurait tout
          "avalé"). Les boutons du footer restent cliquables au-dessus
          grâce à `relative z-10`. */}
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

              <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
                {formatPrice(service.setupFeeCents, service.monthlyPriceCents)}
              </p>

              <CardDescription className="mt-1">
                {describeServiceStatus(item)}
              </CardDescription>

              <ServiceProgress status={status} />

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

        {hasFacts && (
          <CardContent>
            <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
              {item.externalPhoneNumber && (
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Numéro</dt>
                  <dd className="tabular-nums text-foreground">
                    {item.externalPhoneNumber}
                  </dd>
                </div>
              )}
              {shownConfigEntries.map(([key, value]) => {
                const field = service.configFields.find((f) => f.key === key);
                const displayValue =
                  field?.type === "select" && typeof value === "string"
                    ? (field.options?.find((o) => o.value === value)?.label ??
                      value)
                    : formatConfigValue(value);
                return (
                  <div key={key} className="flex justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">
                      {field?.label ?? key}
                    </dt>
                    <dd
                      className="truncate text-right text-foreground"
                      title={displayValue}
                    >
                      {displayValue}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {hiddenConfigCount > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                +{hiddenConfigCount} autre{hiddenConfigCount > 1 ? "s" : ""}{" "}
                information{hiddenConfigCount > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        )}

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
          <CardFooter className="relative z-10 mt-auto flex-col gap-2 sm:flex-row">
            {canManageConfig && (
              <Button className="w-full" variant="outline" onClick={onManage}>
                <Settings2 aria-hidden="true" data-icon="inline-start" />
                Gérer la configuration
              </Button>
            )}
            {canUnsubscribe && (
              <Button
                className="w-full sm:w-auto"
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
