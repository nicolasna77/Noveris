"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Partagé par ClientsFilters et UsersFilters — patch un ou plusieurs
// paramètres de l'URL (navigation SPA) et réinitialise toujours la
// pagination, puisqu'une nouvelle recherche/filtre invalide la page en
// cours.
export function useQueryParamFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return { searchParams, updateParams };
}
