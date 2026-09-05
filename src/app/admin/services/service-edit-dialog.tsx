"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS, CATEGORY_ORDER, type ServiceCategory } from "@/lib/catalog";
import { getErrorMessage } from "@/lib/utils";
import { updateServiceAction } from "./actions";

export type EditableService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ServiceCategory;
  setupFeeCents: number | null;
  monthlyPriceCents: number | null;
  usageCapLabel: string | null;
  sortOrder: number;
  isActive: boolean;
};

// Centimes -> euros pour l'affichage dans le formulaire, tronqué aux
// décimales utiles (evite "79.900000000001" sur certains flottants).
function centsToEurosInput(cents: number | null): string {
  return cents === null ? "" : String(Math.round(cents) / 100);
}

export function ServiceEditDialog({
  service,
  open,
  onOpenChange,
}: {
  service: EditableService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;

    const formData = new FormData(event.currentTarget);
    const setupFeeRaw = String(formData.get("setupFeeEuros") ?? "").trim();
    const monthlyPriceRaw = String(formData.get("monthlyPriceEuros") ?? "").trim();
    const usageCapLabel = String(formData.get("usageCapLabel") ?? "").trim();

    setIsSubmitting(true);
    try {
      await updateServiceAction(service.id, {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        category: String(formData.get("category") ?? service.category) as ServiceCategory,
        setupFeeEuros: setupFeeRaw ? Number(setupFeeRaw) : null,
        monthlyPriceEuros: monthlyPriceRaw ? Number(monthlyPriceRaw) : null,
        usageCapLabel: usageCapLabel || null,
        sortOrder: Number(formData.get("sortOrder") ?? service.sortOrder),
      });
      toast.success(`« ${service.name} » a été mise à jour.`);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Impossible de mettre à jour la prestation."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {service && (
          <>
            <DialogHeader>
              <DialogTitle>
                Modifier « {service.name} »
              </DialogTitle>
              <DialogDescription>
                Ces changements s&apos;appliquent au site public et au
                tableau de bord client.
              </DialogDescription>
            </DialogHeader>

            <form
              key={service.id}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="service-name">Nom</Label>
                <Input id="service-name" name="name" defaultValue={service.name} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  id="service-description"
                  name="description"
                  defaultValue={service.description}
                  rows={3}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-category">Catégorie</Label>
                  <Select name="category" defaultValue={service.category}>
                    <SelectTrigger id="service-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_ORDER.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-sort-order">Ordre d&apos;affichage</Label>
                  <Input
                    id="service-sort-order"
                    name="sortOrder"
                    type="number"
                    defaultValue={service.sortOrder}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-setup-fee">
                    Frais de mise en place (€)
                  </Label>
                  <Input
                    id="service-setup-fee"
                    name="setupFeeEuros"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Aucun"
                    defaultValue={centsToEurosInput(service.setupFeeCents)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-monthly-price">
                    Abonnement mensuel (€)
                  </Label>
                  <Input
                    id="service-monthly-price"
                    name="monthlyPriceEuros"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Aucun"
                    defaultValue={centsToEurosInput(service.monthlyPriceCents)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Laissez un champ de prix vide pour l&apos;omettre — au moins
                l&apos;un des deux est requis.
              </p>

              <div className="space-y-2">
                <Label htmlFor="service-usage-cap">
                  Plafond d&apos;usage{" "}
                  <span className="text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  id="service-usage-cap"
                  name="usageCapLabel"
                  placeholder="Ex. 150 min incluses, puis 0,30 €/min"
                  defaultValue={service.usageCapLabel ?? ""}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
