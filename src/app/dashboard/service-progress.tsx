import { cn } from "@/lib/utils";
import type { ClientServiceStatus } from "@/lib/catalog";

const PROGRESS_STEPS = [
  { status: "PENDING_PAYMENT", label: "Payé" },
  { status: "CONFIGURING", label: "En configuration" },
  { status: "ACTIVE", label: "Actif" },
] as const;

// Repère visuel du cycle de vie d'une prestation (voir section 2 du cahier
// des charges) — n'a de sens que pour les statuts non terminaux. L'étape en
// cours est signalée à la fois par `aria-current="step"` (lecteurs d'écran)
// et par un contour propre au pastille (pas seulement une couleur, pour les
// utilisateurs malvoyants ou daltoniens — WCAG 1.4.1).
export function ServiceProgress({ status }: { status: ClientServiceStatus }) {
  if (status === "CANCELED") return null;
  const currentIndex = PROGRESS_STEPS.findIndex((s) => s.status === status);

  return (
    <ol aria-label="Étapes de la prestation" className="mt-3 flex items-center">
      {PROGRESS_STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step.status}
            aria-current={current ? "step" : undefined}
            className="flex flex-1 items-center last:flex-none"
          >
            <div className="flex flex-col items-start gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full border",
                  done
                    ? "border-primary bg-primary"
                    : "border-border bg-transparent",
                  current && "ring-2 ring-primary/25"
                )}
              />
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  current
                    ? "font-medium text-foreground"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < PROGRESS_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-1.5 mb-4 h-px flex-1",
                  index < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
