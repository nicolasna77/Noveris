import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function isAdmin(user: { role?: string | null }): boolean {
  return user.role === "ADMIN";
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user)) redirect("/dashboard");
  return session;
}
