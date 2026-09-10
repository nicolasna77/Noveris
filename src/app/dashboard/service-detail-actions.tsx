"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { getErrorMessage } from "@/lib/utils";
import type { MyServiceDTO } from "@/lib/catalog";
import { cancelService, resumeServiceCheckout } from "./actions";

export function ServiceDetailActions({ item }: { item: MyServiceDTO }) {
  const router = useRouter();
  const [isResuming, startResumeTransition] = useTransition();
  const [isCanceling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { status } = item;

  const canResume = status === "PENDING_PAYMENT" || status === "CANCELED";
  const canUnsubscribe = status === "ACTIVE" || status === "CONFIGURING";

  if (!canResume && !canUnsubscribe) return null;

  function handleResume() {
    startResumeTransition(async () => {
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
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canResume && (
          <Button
            onClick={handleResume}
            disabled={isResuming}
            aria-busy={isResuming}
          >
            {isResuming ? (
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
        )}
        {canUnsubscribe && (
          <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
            Se désabonner
          </Button>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résilier « {item.name} » ?</AlertDialogTitle>
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
