"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";

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

// Libellé figé de la cible pour le journal (voir AuditLog) : lu avant
// l'action, pour que la ligne reste lisible même si le compte change de nom
// ou disparaît ensuite.
async function targetUserLabel(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user ? `${user.name} (${user.email})` : userId;
}

// Change le rôle d'un utilisateur — délégué au plugin `admin` de better-auth
// (auth.api.setRole) plutôt qu'un simple db.user.update, pour que ses effets
// de bord internes (invalidation du cache de session, etc.) s'appliquent.
export async function setUserRoleAction(
  userId: string,
  role: "ADMIN" | "CLIENT"
) {
  const session = await requireAdminActingOnOther(
    userId,
    "Vous ne pouvez pas modifier votre propre rôle."
  );
  const label = await targetUserLabel(userId);

  await auth.api.setRole({
    body: { userId, role },
    headers: await headers(),
  });

  await logAdminAction({
    actor: session.user,
    action: "USER_ROLE_CHANGED",
    target: { type: "user", id: userId, label },
    detail: `Nouveau rôle : ${role}`,
  });

  revalidateUserPaths(userId);
}

export async function banUserAction(userId: string, banReason: string) {
  const session = await requireAdminActingOnOther(
    userId,
    "Vous ne pouvez pas vous bannir vous-même."
  );
  const label = await targetUserLabel(userId);
  const reason = banReason.trim();

  await auth.api.banUser({
    body: { userId, banReason: reason || undefined },
    headers: await headers(),
  });

  await logAdminAction({
    actor: session.user,
    action: "USER_BANNED",
    target: { type: "user", id: userId, label },
    detail: reason ? `Motif : ${reason}` : "Sans motif renseigné",
  });

  revalidateUserPaths(userId);
}

export async function unbanUserAction(userId: string) {
  const session = await requireAdmin();
  const label = await targetUserLabel(userId);

  await auth.api.unbanUser({
    body: { userId },
    headers: await headers(),
  });

  await logAdminAction({
    actor: session.user,
    action: "USER_UNBANNED",
    target: { type: "user", id: userId, label },
  });

  revalidateUserPaths(userId);
}

// Réinitialise le mot de passe d'un utilisateur — délégué à
// auth.api.setUserPassword (plugin `admin`), qui hash le mot de passe et
// crée le compte "credential" s'il n'existait pas encore (ex. utilisateur
// arrivé par un autre moyen). Les sessions existantes sont ensuite révoquées
// pour forcer une reconnexion avec le nouveau mot de passe.
export async function setUserPasswordAction(userId: string, newPassword: string) {
  const session = await requireAdminActingOnOther(
    userId,
    "Vous ne pouvez pas réinitialiser votre propre mot de passe ici."
  );
  const label = await targetUserLabel(userId);

  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: await headers(),
  });

  await auth.api.revokeUserSessions({
    body: { userId },
    headers: await headers(),
  });

  // Le mot de passe lui-même n'a évidemment rien à faire dans le journal —
  // seul le fait qu'il ait été réinitialisé, et par qui, est consigné.
  await logAdminAction({
    actor: session.user,
    action: "USER_PASSWORD_RESET",
    target: { type: "user", id: userId, label },
    detail: "Sessions existantes révoquées",
  });
}

// Révoque une session précise (ex. déconnexion forcée depuis un appareil
// suspect) sans bannir le compte entier.
export async function revokeUserSessionAction(
  userId: string,
  sessionToken: string
) {
  const session = await requireAdmin();
  const label = await targetUserLabel(userId);

  await auth.api.revokeUserSession({
    body: { sessionToken },
    headers: await headers(),
  });

  // Le jeton de session est un identifiant d'authentification : il n'est pas
  // consigné, seul l'utilisateur visé l'est.
  await logAdminAction({
    actor: session.user,
    action: "USER_SESSION_REVOKED",
    target: { type: "user", id: userId, label },
  });

  revalidatePath(`/admin/users/${userId}`);
}
