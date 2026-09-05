import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Mémoïsé par requête (React cache()) — un layout et chacune de ses pages
// appellent typiquement tous requireUser()/requireAdmin() séparément ; sans
// ça, chaque appel redéclenche sa propre résolution de session.
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Un seul endroit pour "ce compte est-il admin ?" plutôt que
// `role === "ADMIN"` réévalué à la main dans chaque layout/page qui en a
// besoin (site-header, dashboard/layout, (auth)/layout…).
export function isAdmin(user: { role?: string | null }): boolean {
  return user.role === "ADMIN";
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user)) redirect("/dashboard");
  return session;
}
