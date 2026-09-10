import type { NotificationType } from "./types";
import { NOTIFICATION_TYPES } from "./types";

export type NotificationPreferences = Partial<Record<NotificationType, boolean>>;

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
