"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MyServiceDTO } from "@/lib/catalog";
import { ManageConfigurationDialog } from "./manage-configuration-dialog";

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
