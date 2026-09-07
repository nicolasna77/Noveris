import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type RecordUsageEventInput = {
  clientServiceId: string;
  // "call" par défaut (seul type existant jusqu'ici) — "whatsapp_message"
  // pour un message reçu sur /api/whatsapp/webhook. Ne change pas le calcul
  // de `count` ci-dessous (compteur mensuel d'appels affiché par
  // UsageCounter) : WhatsApp n'a pas de plafond d'usage au catalogue
  // (usageCapLabel: null pour "assistant-whatsapp"), donc rien n'en dépend
  // encore — juste une meilleure étiquette dans l'historique brut.
  type?: string;
  externalId?: string | null;
  status?: "in_progress" | "completed";
  occurredAt?: Date;
  durationSec?: number | null;
  metadata?: Prisma.InputJsonValue;
};

// Enregistre le cycle de vie d'un appel (ou autre événement d'usage
// facturable) : upsert par `externalId` quand fourni — le raccroché met à
// jour la même ligne que le décroché plutôt que d'en créer une seconde —
// sinon création directe. Partagé par POST /api/usage-events (système
// externe, via x-api-key) et par le webhook OpenAI
// (src/app/api/voice/openai-webhook/route.ts, appelé en process, sans
// repasser par HTTP) — un seul endroit pour cette logique d'upsert.
export async function recordUsageEvent(
  input: RecordUsageEventInput
): Promise<{ count: number }> {
  const clientService = await db.clientService.findUnique({
    where: { id: input.clientServiceId },
  });
  if (!clientService) {
    throw new Error("Unknown clientServiceId");
  }

  const { clientServiceId, externalId, durationSec, metadata } = input;
  const type = input.type ?? "call";
  const occurredAt = input.occurredAt ?? new Date();
  const status = input.status ?? "completed";

  if (externalId) {
    await db.usageEvent.upsert({
      where: { externalId },
      create: {
        clientServiceId,
        type,
        externalId,
        status,
        occurredAt,
        durationSec: durationSec ?? null,
        metadata,
        endedAt: status === "completed" ? new Date() : null,
      },
      update: {
        status,
        durationSec: durationSec ?? undefined,
        metadata,
        endedAt: status === "completed" ? new Date() : undefined,
      },
    });
  } else {
    await db.usageEvent.create({
      data: {
        clientServiceId,
        type,
        status: "completed",
        occurredAt,
        durationSec: durationSec ?? null,
        metadata,
      },
    });
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await db.usageEvent.count({
    where: {
      clientServiceId,
      type: "call",
      status: "completed",
      occurredAt: { gte: periodStart },
    },
  });

  return { count };
}
