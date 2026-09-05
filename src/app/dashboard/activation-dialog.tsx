"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
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
  formatPrice,
  type Configuration,
  type ServiceDTO,
} from "@/lib/catalog";
import { getErrorMessage } from "@/lib/utils";
import { activateService } from "./actions";
import { ConfigFieldsForm } from "./config-fields";

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
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [values, setValues] = useState<Configuration>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  function handleOpenChange(open: boolean) {
    if (open && service) {
      // Pré-rempli avec le nom de la prestation — le client n'a besoin de le
      // changer que s'il active la même prestation plusieurs fois (ex. deux
      // boutiques) et veut les distinguer.
      setName(service.name);
    }
    if (!open) {
      setValues({});
      setSubmitAttempted(false);
    }
    onOpenChange(open);
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
      try {
        const { checkoutUrl } = await activateService(
          service.id,
          organizationId,
          trimmedName,
          values
        );
        window.location.href = checkoutUrl;
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Dialog open={!!service} onOpenChange={handleOpenChange}>
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
                  Utile si vous activez la même prestation plusieurs fois
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
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
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
