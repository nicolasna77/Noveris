import { db } from "@/lib/db";
import type { ServiceEventType } from "@/lib/catalog";

// Un seul point d'écriture pour l'historique d'une prestation (voir
// ServiceEvent dans prisma/schema.prisma) — appelé depuis chaque endroit qui
// fait déjà avancer une prestation (actions du client, actions admin, webhook
// Stripe, callback Google Calendar) plutôt que de dupliquer l'appel Prisma.
export async function logServiceEvent(
  clientServiceId: string,
  type: ServiceEventType,
  message?: string | null
) {
  await db.serviceEvent.create({
    data: { clientServiceId, type, message: message?.trim() || null },
  });
}
