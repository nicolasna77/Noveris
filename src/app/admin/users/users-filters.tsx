"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParamFilters } from "@/hooks/use-query-param-filters";

export function UsersFilters() {
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
        <label htmlFor="admin-user-search" className="sr-only">
          Rechercher un utilisateur
        </label>
        <Input
          id="admin-user-search"
          name="q"
          type="search"
          placeholder="Rechercher par nom, e-mail, entreprise…"
          defaultValue={searchParams.get("q") ?? ""}
        />
      </form>

      <Select
        value={searchParams.get("role") ?? "all"}
        onValueChange={(value) =>
          updateParams({ role: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-48" aria-label="Filtrer par rôle">
          <SelectValue placeholder="Tous les rôles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les rôles</SelectItem>
          <SelectItem value="ADMIN">Administrateurs</SelectItem>
          <SelectItem value="CLIENT">Clients</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
