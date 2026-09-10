export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export class ActionFailure extends Error {}

export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new ActionFailure(result.error);
  return result.data;
}
