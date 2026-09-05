// Même repli que appUrl() dans src/app/dashboard/actions.ts — dupliqué ici
// plutôt qu'importé pour ne pas faire dépendre le module e-mail (utilisable
// depuis n'importe quelle action) d'un fichier "use server" particulier.
export function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}
