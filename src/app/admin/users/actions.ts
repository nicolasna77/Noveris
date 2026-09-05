"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

// Un admin ne peut pas s'appliquer à lui-même les actions ci-dessous (rôle,
// bannissement, mot de passe) — regroupé ici plutôt que répété à chaque
// action, avec un message spécifique à l'action en cours.
async function requireAdminActingOnOther(userId: string, message: string) {
  const session = await requireAdmin();
  if (userId === session.user.id) throw new Error(message);
  return session;
}

function revalidateUserPaths(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

// Change le rôle d'un utilisateur — délégué au plugin `admin` de better-auth
// (auth.api.setRole) plutôt qu'un simple db.user.update, pour que ses effets
// de bord internes (invalidation du cache de session, etc.) s'appliquent.
export async function setUserRoleAction(
  userId: string,
  role: "ADMIN" | "CLIENT"
) {
  await requireAdminActingOnOther(userId, "Vous ne pouvez pas modifier votre propre rôle.");

  await auth.api.setRole({
    body: { userId, role },
    headers: await headers(),
  });

  revalidateUserPaths(userId);
}

export async function banUserAction(userId: string, banReason: string) {
  await requireAdminActingOnOther(userId, "Vous ne pouvez pas vous bannir vous-même.");

  await auth.api.banUser({
    body: { userId, banReason: banReason.trim() || undefined },
    headers: await headers(),
  });

  revalidateUserPaths(userId);
}

export async function unbanUserAction(userId: string) {
  await requireAdmin();

  await auth.api.unbanUser({
    body: { userId },
    headers: await headers(),
  });

  revalidateUserPaths(userId);
}

// Réinitialise le mot de passe d'un utilisateur — délégué à
// auth.api.setUserPassword (plugin `admin`), qui hash le mot de passe et
// crée le compte "credential" s'il n'existait pas encore (ex. utilisateur
// arrivé par un autre moyen). Les sessions existantes sont ensuite révoquées
// pour forcer une reconnexion avec le nouveau mot de passe.
export async function setUserPasswordAction(userId: string, newPassword: string) {
  await requireAdminActingOnOther(
    userId,
    "Vous ne pouvez pas réinitialiser votre propre mot de passe ici."
  );

  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: await headers(),
  });

  await auth.api.revokeUserSessions({
    body: { userId },
    headers: await headers(),
  });
}

// Révoque une session précise (ex. déconnexion forcée depuis un appareil
// suspect) sans bannir le compte entier.
export async function revokeUserSessionAction(
  userId: string,
  sessionToken: string
) {
  await requireAdmin();

  await auth.api.revokeUserSession({
    body: { sessionToken },
    headers: await headers(),
  });

  revalidatePath(`/admin/users/${userId}`);
}
