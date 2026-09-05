"use client";

import { useEffect, useState } from "react";
import { PhoneCall, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 5_000;

type InProgressCall = {
  id: string;
  startedAt: string;
  fromNumber: string | null;
};

type RecentCall = {
  id: string;
  occurredAt: string;
  durationSec: number | null;
  fromNumber: string | null;
  outcome: string | null;
  endedReason: string | null;
};

type CallsResponse = { inProgress: InProgressCall[]; recent: RecentCall[] };

const OUTCOME_LABELS: Record<string, string> = {
  appointment_booked: "Rendez-vous pris",
  order_taken: "Commande enregistrée",
  message_taken: "Message pris",
  no_action: "Sans suite",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")}`;
}

function formatElapsed(startedAt: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return formatDuration(seconds);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Appels en cours (voyant vert clignotant, comme le standard téléphonique) +
// récapitulatif des derniers appels terminés — alimenté par le webhook
// POST /api/usage-events (statut in_progress puis completed, voir la route)
// et interrogé ici en polling, comme usage-counter.tsx.
export function CallActivity({ clientServiceId }: { clientServiceId: string }) {
  const [data, setData] = useState<CallsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/client-services/${clientServiceId}/calls`);
        if (!res.ok) return;
        const json: CallsResponse = await res.json();
        if (!cancelled) setData(json);
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

  if (!data) return null;

  return (
    <div className="space-y-6">
      {data.inProgress.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
            />
            Appel{data.inProgress.length > 1 ? "s" : ""} en cours
          </h3>
          <ul className="space-y-1.5">
            {data.inProgress.map((call) => (
              <li
                key={call.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <PhoneCall
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {call.fromNumber ?? "Numéro masqué"}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatElapsed(call.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">
          Récapitulatif des appels
        </h3>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun appel terminé pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {data.recent.map((call) => (
              <li
                key={call.id}
                className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-3 text-sm"
              >
                <PhoneOff
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="font-medium text-foreground">
                      {call.fromNumber ?? "Numéro masqué"}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatDateTime(call.occurredAt)} · {formatDuration(call.durationSec)}
                    </span>
                  </div>
                  {call.outcome && (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        call.outcome === "no_action"
                          ? "text-muted-foreground"
                          : "text-primary"
                      )}
                    >
                      {OUTCOME_LABELS[call.outcome] ?? call.outcome}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
