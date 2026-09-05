"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 15_000;

// Interroge périodiquement l'usage du mois en cours (alimenté par le webhook
// POST /api/usage-events côté système externe) pour donner au client un
// compteur qui bouge tout seul, sans qu'il ait besoin de recharger la page.
export function UsageCounter({ clientServiceId }: { clientServiceId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/client-services/${clientServiceId}/usage`
        );
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        if (!cancelled) setCount(data.count);
      } catch {
        // Un raté de polling ne doit pas casser l'affichage existant.
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [clientServiceId]);

  if (count === null) return null;

  return (
    <div
      aria-live="polite"
      className="mt-3 flex items-center gap-2 rounded-2xl bg-muted p-3 text-sm"
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
      />
      <span>
        <span className="font-mono font-medium tabular-nums text-foreground">
          {count}
        </span>{" "}
        appel{count === 1 ? "" : "s"} reçu{count === 1 ? "" : "s"} ce mois-ci
      </span>
    </div>
  );
}
