"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, PhoneForwarded } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findMissingRequiredField,
  formatCents,
  formatPrice,
  TELEPHONY_SERVICE_SLUGS,
  type Configuration,
  type ServiceDTO,
} from "@/lib/catalog";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { activateService, previewPromoCode, type PromoPreview } from "./actions";
import { ConfigFieldsForm } from "./config-fields";

type AppliedPreview = Extract<PromoPreview, { ok: true }>;

type PromoState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "applied"; preview: AppliedPreview }
  | { status: "error"; reason: string };

export function ActivationDialog({
  service,
  organizationId,
  onOpenChange,
}: {
  service: ServiceDTO | null;
  organizationId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const nameFieldId = useId();
  const promoFieldId = useId();
  const promoMessageId = useId();
  const [isPending, startTransition] = useTransition();
  const [shownServiceId, setShownServiceId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [values, setValues] = useState<Configuration>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });

  const serviceId = service?.id ?? null;
  if (serviceId !== shownServiceId) {
    setShownServiceId(serviceId);
    setName(service?.name ?? "");
    setValues({});
    setSubmitAttempted(false);
    setPromoInput("");
    setPromo({ status: "idle" });
  }

  async function checkPromo(): Promise<PromoPreview | null> {
    if (!service) return null;
    const code = promoInput.trim();
    if (!code) return null;

    setPromo({ status: "checking" });
    try {
      const result = await previewPromoCode(service.id, code);
      setPromo(
        result.ok
          ? { status: "applied", preview: result }
          : { status: "error", reason: result.reason }
      );
      return result;
    } catch {
      const reason = "La vérification du code a échoué. Réessayez.";
      setPromo({ status: "error", reason });
      return { ok: false, reason };
    }
  }

  function handleConfirm() {
    if (!service) return;

    const trimmedName = name.trim();
    const missing = findMissingRequiredField(service.configFields, values);
    if (!trimmedName || missing) {
      setSubmitAttempted(true);
      if (!trimmedName) {
        toast.error("Merci de donner un nom à cette activation.");
        document.getElementById(nameFieldId)?.focus();
      } else if (missing) {
        toast.error(`Le champ « ${missing.label} » est requis.`);
        document.getElementById(missing.key)?.focus();
      }
      return;
    }

    startTransition(async () => {
      let code: string | null = null;
      if (promoInput.trim()) {
        const preview = promo.status === "applied" ? promo.preview : await checkPromo();
        if (!preview?.ok) {
          document.getElementById(promoFieldId)?.focus();
          return;
        }
        code = preview.code;
      }

      try {
        const { checkoutUrl } = unwrap(
          await activateService(service.id, organizationId, trimmedName, values, code)
        );
        window.location.href = checkoutUrl;
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Dialog open={!!service} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {service && (
          <>
            <DialogHeader>
              <DialogTitle>
                Activer « {service.name} »
              </DialogTitle>
              <DialogDescription>
                {service.configFields.length > 0
                  ? "Renseignez les informations nécessaires puis validez le paiement."
                  : "Vous allez être redirigé vers le paiement sécurisé Stripe."}
              </DialogDescription>
            </DialogHeader>

            {TELEPHONY_SERVICE_SLUGS.has(service.slug) && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted/50 p-3 text-sm">
                <PhoneForwarded
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Vous gardez votre numéro actuel.
                  </span>{" "}
                  Un numéro dédié à l&apos;IA vous sera attribué ; vos clients
                  continueront d&apos;appeler celui qu&apos;ils connaissent déjà
                  grâce à un simple renvoi d&apos;appel, gratuit et réversible,
                  à activer une fois la solution active.
                </p>
              </div>
            )}

            <div className="-mr-1 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-2 pb-6">
                <Label htmlFor={nameFieldId}>Nom de cette activation</Label>
                <Input
                  id={nameFieldId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={submitAttempted && !name.trim()}
                />
                <p className="text-xs text-muted-foreground">
                  Utile si vous activez la même solution plusieurs fois
                  (plusieurs boutiques, par exemple).
                </p>
              </div>

              <ConfigFieldsForm
                fields={service.configFields}
                values={values}
                onChange={(key, value) =>
                  setValues((prev) => ({ ...prev, [key]: value }))
                }
                submitAttempted={submitAttempted}
              />

              <div className="mt-6 space-y-2 border-t border-border pt-5">
                <Label htmlFor={promoFieldId}>
                  Code promo{" "}
                  <span className="font-normal text-muted-foreground">(facultatif)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={promoFieldId}
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      if (promo.status !== "idle") setPromo({ status: "idle" });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void checkPromo();
                      }
                    }}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="uppercase"
                    aria-invalid={promo.status === "error"}
                    aria-describedby={promoMessageId}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void checkPromo()}
                    disabled={!promoInput.trim() || promo.status === "checking" || isPending}
                  >
                    {promo.status === "checking" ? "Vérification…" : "Appliquer"}
                  </Button>
                </div>
                <div id={promoMessageId} aria-live="polite">
                  {promo.status === "applied" && (
                    <p className="flex items-start gap-1.5 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        {promo.preview.description}. Premier paiement :{" "}
                        <span className="font-medium tabular-nums">
                          {formatCents(promo.preview.discountedFirstPaymentCents)}
                        </span>{" "}
                        au lieu de{" "}
                        <span className="tabular-nums text-muted-foreground line-through">
                          {formatCents(promo.preview.firstPaymentCents)}
                        </span>
                        .
                      </span>
                    </p>
                  )}
                  {promo.status === "error" && (
                    <p className="text-sm text-destructive">{promo.reason}</p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Prix TTC. En payant, vous acceptez nos{" "}
              <Link href="/cgv" target="_blank" className="underline underline-offset-4 hover:text-foreground">
                conditions générales de vente
              </Link>
              .
            </p>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending
                  ? "Redirection…"
                  : `Payer ${formatPrice(service.setupFeeCents, service.monthlyPriceCents)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
