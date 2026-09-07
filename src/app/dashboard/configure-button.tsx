"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MyServiceDTO } from "@/lib/catalog";
import { ManageConfigurationDialog } from "./manage-configuration-dialog";

// Le bouton vit sur la carte Configuration, à côté des valeurs qu'il modifie,
// plutôt que dans la barre d'actions en haut de page — c'est là qu'on le
// cherche quand on lit un réglage qu'on veut changer.
export function ConfigureButton({ item }: { item: MyServiceDTO }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 aria-hidden="true" data-icon="inline-start" />
        Modifier
      </Button>
      <ManageConfigurationDialog
        item={open ? item : null}
        onOpenChange={(next) => !next && setOpen(false)}
      />
    </>
  );
}
