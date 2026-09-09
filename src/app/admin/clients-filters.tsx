"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, type ClientServiceStatus } from "@/lib/catalog";
import { useQueryParamFilters } from "@/hooks/use-query-param-filters";

const STATUS_OPTIONS: ClientServiceStatus[] = [
  "PENDING_PAYMENT",
  "CONFIGURING",
  "ACTIVE",
  "CANCELED",
];

export function ClientsFilters() {
  const { searchParams, updateParams } = useQueryParamFilters();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          updateParams({ q: typeof value === "string" ? value.trim() : null });
        }}
        className="min-w-48 flex-1"
      >
        <label htmlFor="admin-client-search" className="sr-only">
          Rechercher un client
        </label>
        <Input
          id="admin-client-search"
          name="q"
          type="search"
          placeholder="Rechercher par nom, e-mail, entreprise…"
          defaultValue={searchParams.get("q") ?? ""}
        />
      </form>

      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(value) =>
          updateParams({ status: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-56" aria-label="Filtrer par statut">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* L'export ne suit pas les filtres affichés, et c'est voulu : on
          exporte pour sortir de l'outil — comptabilité, réconciliation,
          demande d'accès aux données — pas pour figer la page en cours. */}
      <Link
        href="/admin/export/clients"
        prefetch={false}
        className={buttonVariants({ variant: "ghost" })}
      >
        <Download data-icon="inline-start" />
        Exporter en CSV
      </Link>
    </div>
  );
}
