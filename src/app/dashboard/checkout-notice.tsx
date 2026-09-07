"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, Loader2, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientServiceStatus } from "@/lib/catalog";

const MAX_POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 3000;

export function CheckoutNotice({
  status,
  serviceName,
  initialStatus,
}: {
  status: "success" | "canceled";
  serviceName?: string;
  initialStatus?: ClientServiceStatus;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);

  const isActivating = status === "success" && initialStatus !== "ACTIVE";
  const timedOut = attempts >= MAX_POLL_ATTEMPTS;

  useEffect(() => {
    if (!isActivating || timedOut || dismissed) return;
    const id = setTimeout(() => {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [isActivating, timedOut, dismissed, attempts, router]);

  if (dismissed) return null;

  return (
    <Alert
      className={cn(
        "mb-8",
        status === "success" && "border-primary/30 bg-primary/5"
      )}
    >
      {status === "canceled" ? (
        <Info aria-hidden="true" />
      ) : isActivating ? (
        <Loader2 className="animate-spin text-primary" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="text-primary" aria-hidden="true" />
      )}
      <AlertTitle>
        {status === "canceled"
          ? "Paiement annulé"
          : isActivating
            ? `Paiement reçu${serviceName ? ` pour « ${serviceName} »` : ""}`
            : `Paiement confirmé${serviceName ? ` pour « ${serviceName} »` : ""}`}
      </AlertTitle>
      <AlertDescription>
        {status === "canceled" &&
          "Aucun paiement n'a été effectué. Vous pouvez réessayer quand vous le souhaitez depuis le catalogue ci-dessous."}
        {status === "success" &&
          isActivating &&
          !timedOut &&
          "Votre solution est en cours d'activation, cela ne prend généralement que quelques secondes…"}
        {status === "success" &&
          isActivating &&
          timedOut &&
          "L'activation prend plus de temps que prévu. Actualisez la page dans un instant, ou contactez-nous si le problème persiste."}
        {status === "success" &&
          !isActivating &&
          "Votre solution est active. Retrouvez-la dans « Mes solutions » ci-dessous."}
      </AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDismissed(true)}
          aria-label="Fermer ce message"
        >
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
