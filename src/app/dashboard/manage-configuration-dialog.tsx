"use client";

import { useState, useTransition } from "react";
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
import {
  findMissingRequiredField,
  type Configuration,
  type MyServiceDTO,
} from "@/lib/catalog";
import { getErrorMessage } from "@/lib/utils";
import { updateServiceConfiguration } from "./actions";
import { ConfigFieldsForm } from "./config-fields";

export function ManageConfigurationDialog({
  item,
  onOpenChange,
}: {
  item: MyServiceDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {item && (
          <ManageConfigurationForm
            key={item.clientServiceId}
            item={item}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageConfigurationForm({
  item,
  onDone,
}: {
  item: MyServiceDTO;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Configuration>(item.configuration);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  function handleSave() {
    const missing = findMissingRequiredField(item.service.configFields, values);
    if (missing) {
      setSubmitAttempted(true);
      toast.error(`Le champ « ${missing.label} » est requis.`);
      document.getElementById(missing.key)?.focus();
      return;
    }

    startTransition(async () => {
      try {
        await updateServiceConfiguration(item.clientServiceId, values);
        toast.success("Configuration mise à jour.");
        onDone();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Gérer « {item.service.name} »
        </DialogTitle>
        <DialogDescription>
          Ajustez les informations utilisées par votre automatisation.
        </DialogDescription>
      </DialogHeader>

      <div className="-mr-1 max-h-[60vh] overflow-y-auto pr-1">
        <ConfigFieldsForm
          fields={item.service.configFields}
          values={values}
          onChange={(key, value) =>
            setValues((prev) => ({ ...prev, [key]: value }))
          }
          submitAttempted={submitAttempted}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={isPending}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </>
  );
}
