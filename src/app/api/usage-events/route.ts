import { NextResponse } from "next/server";
import { recordUsageEvent } from "@/lib/usage-events";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Webhook appelé par le système externe qui gère réellement la prestation
// pour reporter le cycle de vie d'un appel : un premier appel au décroché
// ("in_progress"), puis un second au raccroché ("completed", avec
// durée/récapitulatif) — les deux identifiés par le même `externalId` (ex.
// CallSid Twilio, ou call_id OpenAI) pour que le second mette à jour la
// même ligne plutôt que d'en créer une autre. Un appel sans externalId
// reste possible (compat. usage ponctuel) : il crée directement une ligne
// "completed". Pas de session utilisateur ici, l'appelant est un système,
// pas un client connecté. Voir src/lib/usage-events.ts pour la logique
// d'upsert elle-même (partagée avec le webhook OpenAI de l'agent vocal).
//
// Décroché :
// curl -X POST http://localhost:3000/api/usage-events \
//   -H "x-api-key: $USAGE_EVENTS_API_KEY" -H "Content-Type: application/json" \
//   -d '{"clientServiceId":"...","externalId":"CA123","status":"in_progress","metadata":{"fromNumber":"+33612345678"}}'
//
// Raccroché :
// curl -X POST http://localhost:3000/api/usage-events \
//   -H "x-api-key: $USAGE_EVENTS_API_KEY" -H "Content-Type: application/json" \
//   -d '{"clientServiceId":"...","externalId":"CA123","status":"completed","durationSec":42,"metadata":{"outcome":"appointment_booked"}}'
export async function POST(request: Request) {
  // Protégée par x-api-key, pas par une signature cryptographique — un
  // rate limit par IP en défense supplémentaire contre le bourrage.
  const allowed = await checkRateLimit("usage-events", await getClientIp(), "1 m", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.USAGE_EVENTS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clientServiceId =
    body && typeof body.clientServiceId === "string"
      ? body.clientServiceId
      : null;
  if (!clientServiceId) {
    return NextResponse.json(
      { error: "clientServiceId is required" },
      { status: 400 }
    );
  }

  const occurredAt =
    body && typeof body.occurredAt === "string"
      ? new Date(body.occurredAt)
      : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Invalid occurredAt" }, { status: 400 });
  }

  const externalId =
    body && typeof body.externalId === "string" ? body.externalId : null;
  const status: "in_progress" | "completed" =
    body?.status === "in_progress" ? "in_progress" : "completed";
  const durationSec =
    body && typeof body.durationSec === "number" ? body.durationSec : null;
  const metadata =
    body && typeof body.metadata === "object" && body.metadata !== null
      ? body.metadata
      : undefined;

  try {
    const { count } = await recordUsageEvent({
      clientServiceId,
      externalId,
      status,
      occurredAt,
      durationSec,
      metadata,
    });
    return NextResponse.json({ count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unknown clientServiceId" }, { status: 404 });
  }
}
