import { db } from "@/lib/db";
import type { ServiceEventType } from "@/lib/catalog";

export async function logServiceEvent(
  clientServiceId: string,
  type: ServiceEventType,
  message?: string | null
) {
  await db.serviceEvent.create({
    data: { clientServiceId, type, message: message?.trim() || null },
  });
}
