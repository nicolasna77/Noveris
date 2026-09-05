import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Message d'erreur à afficher (toast.error) suite à l'échec d'une server
// action — un `throw new Error(...)` explicite (ex. validation métier)
// donne un message utile, tout le reste retombe sur un message générique.
export function getErrorMessage(err: unknown, fallback = "Une erreur est survenue."): string {
  return err instanceof Error ? err.message : fallback
}

// Un slug d'organisation reste un identifiant technique (better-auth exige
// l'unicité) — jamais montré au client, donc pas besoin d'être joli, juste
// stable et quasi-certain de ne pas entrer en collision. Utilisé par
// prisma/seed.ts et par le dialog de création d'organisation.
export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || "organisation"}-${suffix}`
}
