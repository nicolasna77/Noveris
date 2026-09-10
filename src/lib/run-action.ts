import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";

export class ActionError extends Error {}

export const GENERIC_ACTION_ERROR = "Une erreur est survenue. Réessayez dans un instant.";

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ActionError) return { ok: false, error: err.message };
    console.error("[server-action]", err);
    return { ok: false, error: GENERIC_ACTION_ERROR };
  }
}
