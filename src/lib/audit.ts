import type { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";

// Un seul point d'écriture du journal d'administration (voir AuditLog dans
// prisma/schema.prisma), appelé depuis les actions sensibles de
// /admin/users et /admin/services. Distinct de logServiceEvent, qui écrit
// l'historique montré au client : celui-ci retient l'auteur de l'action et
// n'est visible que de l'équipe.
export async function logAdminAction(input: {
  actor: { id: string; name: string; email: string };
  action: AuditAction;
  target: { type: "user" | "service"; id: string; label: string };
  detail?: string | null;
}) {
  await db.auditLog.create({
    data: {
      actorId: input.actor.id,
      actorLabel: `${input.actor.name} (${input.actor.email})`,
      action: input.action,
      targetType: input.target.type,
      targetId: input.target.id,
      targetLabel: input.target.label,
      detail: input.detail?.trim() || null,
    },
  });
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  USER_ROLE_CHANGED: "Rôle modifié",
  USER_BANNED: "Compte banni",
  USER_UNBANNED: "Compte débanni",
  USER_PASSWORD_RESET: "Mot de passe réinitialisé",
  USER_SESSION_REVOKED: "Session révoquée",
  SERVICE_UPDATED: "Solution modifiée",
  SERVICE_ACTIVATED: "Solution réactivée",
  SERVICE_DEACTIVATED: "Solution désactivée",
};

// Les actions qui retirent un accès ou touchent à l'authentification sont
// signalées à part dans le journal : ce sont celles qu'on relit après coup
// quand quelque chose s'est mal passé.
export const SENSITIVE_AUDIT_ACTIONS = new Set<AuditAction>([
  "USER_ROLE_CHANGED",
  "USER_BANNED",
  "USER_PASSWORD_RESET",
  "USER_SESSION_REVOKED",
]);
