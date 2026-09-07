"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, LayoutList, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientServiceStatus, MyServiceDTO } from "@/lib/catalog";
import { ManageConfigurationDialog } from "./manage-configuration-dialog";
import { MyServiceRow } from "./my-service-row";

const STATUS_PRIORITY: Record<ClientServiceStatus, number> = {
  PENDING_PAYMENT: 0,
  CONFIGURING: 1,
  ACTIVE: 2,
  CANCELED: 3,
};

type ViewMode = "list" | "grid";
const VIEW_MODE_STORAGE_KEY = "noveris:my-services-view";

export function MyServices({ items }: { items: MyServiceDTO[] }) {
  const [managingItem, setManagingItem] = useState<MyServiceDTO | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // La préférence de vue n'existe que côté client (localStorage) — on
  // démarre en liste (le rendu serveur) puis on bascule après le montage
  // pour éviter un mismatch d'hydratation, comme dans ThemeToggle.
  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "grid" || stored === "list") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode(stored);
    }
  }, []);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }

  const ordered = [...items].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
  );

  return (
    <section aria-labelledby="my-services-heading" className="mb-14">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-1 h-6 w-1 shrink-0 rounded-full bg-primary"
          />
          <div>
            <h2
              id="my-services-heading"
              className="text-lg font-semibold text-foreground"
            >
              Mes solutions
            </h2>
            <p className="text-sm text-muted-foreground">
              Les automatisations que vous avez activées.
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(viewMode === "list" && "bg-muted text-foreground")}
              aria-pressed={viewMode === "list"}
              aria-label="Afficher en liste"
              onClick={() => handleViewModeChange("list")}
            >
              <LayoutList aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(viewMode === "grid" && "bg-muted text-foreground")}
              aria-pressed={viewMode === "grid"}
              aria-label="Afficher en grille"
              onClick={() => handleViewModeChange("grid")}
            >
              <LayoutGrid aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">
              Vous n&apos;avez encore activé aucune solution
            </p>
            <p className="text-sm text-muted-foreground">
              Parcourez le catalogue ci-dessus pour démarrer votre première
              automatisation.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {ordered.map((item) => (
            <MyServiceRow
              key={item.clientServiceId}
              item={item}
              onManage={() => setManagingItem(item)}
            />
          ))}
        </div>
      )}

      <ManageConfigurationDialog
        item={managingItem}
        onOpenChange={(open) => !open && setManagingItem(null)}
      />
    </section>
  );
}
