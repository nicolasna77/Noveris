import type { NotificationType } from "./types";
import { NOTIFICATION_TYPES } from "./types";

export type NotificationPreferences = Partial<Record<NotificationType, boolean>>;

// Une clé absente vaut "activée" (opt-out plutôt qu'opt-in) — voir le
// commentaire sur User.notificationPreferences dans prisma/schema.prisma :
// un compte créé avant l'ajout d'un type continue de le recevoir tant qu'il
// ne l'a pas explicitement désactivé.
export function isNotificationEnabled(
  preferences: unknown,
  type: NotificationType
): boolean {
  if (typeof preferences !== "object" || preferences === null) return true;
  const value = (preferences as Record<string, unknown>)[type];
  return value !== false;
}

export function parsePreferences(preferences: unknown): NotificationPreferences {
  const result: NotificationPreferences = {};
  if (typeof preferences !== "object" || preferences === null) return result;
  const record = preferences as Record<string, unknown>;
  for (const type of NOTIFICATION_TYPES) {
    if (record[type] === false) result[type] = false;
  }
  return result;
}
