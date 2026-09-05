import { NextResponse } from "next/server";
import OpenAI from "openai";
import WebSocket from "ws";
import { db } from "@/lib/db";
import type { Configuration } from "@/lib/catalog";
import { buildSystemPrompt } from "@/lib/voice-agent/prompt";
import { getToolDefinitions, runTool, toRealtimeTools } from "@/lib/voice-agent/tools";
import { recordUsageEvent } from "@/lib/usage-events";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const REALTIME_MODEL = "gpt-realtime";

// "sip:+33612345678@sip.example.com" / "tel:+33612345678" -> "+33612345678"
function extractE164(sipHeaderValue: string): string | null {
  const match = sipHeaderValue.match(/(?:sip|tel):([+0-9]+)/i);
  return match ? match[1] : null;
}

function findSipHeader(
  headers: { name: string; value: string }[],
  name: string
): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

// Webhook OpenAI (voir platform : projet → Realtime → SIP) — reçoit
// realtime.call.incoming à chaque appel basculé vers OpenAI par TwiML (voir
// /api/voice/incoming). Identifie la prestation via le numéro appelé,
// construit le prompt/les tools déjà écrits (src/lib/voice-agent) à partir
// de sa configuration, puis accepte l'appel. Aucune session utilisateur ici
// — l'appelant est OpenAI, authentifié par la signature du webhook.
export async function POST(request: Request) {
  const payload = await request.text();

  let event;
  try {
    event = await openai.webhooks.unwrap(payload, request.headers, process.env.OPENAI_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "realtime.call.incoming") {
    // Autres types de webhook (batch, fine-tuning...) : pas notre affaire ici.
    return NextResponse.json({ received: true });
  }

  const callId = event.data.call_id;
  const toHeader = findSipHeader(event.data.sip_headers, "To");
  const calledNumber = toHeader ? extractE164(toHeader) : null;

  const clientService = calledNumber
    ? await db.clientService.findFirst({
        where: { externalPhoneNumber: calledNumber },
        include: { service: true, organization: true, calendarConnection: true },
      })
    : null;

  if (!clientService) {
    // Numéro Noveris inconnu (mal configuré, ou prestation résiliée depuis) :
    // on n'accepte pas l'appel, il raccroche naturellement côté appelant.
    return NextResponse.json({ received: true });
  }

  const configuration = (clientService.configuration ?? {}) as Configuration;
  const calendarConnected = !!clientService.calendarConnection;
  const systemPrompt = buildSystemPrompt(clientService.service.slug, configuration, {
    calendarConnected,
    companyName: clientService.organization.name,
  });
  const tools = getToolDefinitions(clientService.service.slug, configuration, calendarConnected);

  try {
    await openai.realtime.calls.accept(callId, {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: systemPrompt,
      tools: toRealtimeTools(tools),
      audio: {
        input: { format: { type: "audio/pcmu" } },
        output: { format: { type: "audio/pcmu" } },
      },
    });
  } catch (err) {
    console.error(`[voice] échec de l'acceptation de l'appel ${callId} :`, err);
    return NextResponse.json({ received: true });
  }

  const fromHeader = findSipHeader(event.data.sip_headers, "From");
  await recordUsageEvent({
    clientServiceId: clientService.id,
    externalId: callId,
    status: "in_progress",
    metadata: { fromNumber: fromHeader ? extractE164(fromHeader) : null },
  }).catch((err) => console.error(`[voice] échec d'enregistrement de l'appel ${callId} :`, err));

  // Écoute les tool-calls et la fin d'appel en tâche de fond — la réponse au
  // webhook ne doit pas attendre la fin de l'appel (peut durer plusieurs
  // minutes). Le process Node reste vivant le temps de l'appel (voir le plan
  // : pas de déploiement serverless ici, donc pas de timeout à ce niveau).
  listenToCall(callId, clientService.id, configuration).catch((err) => {
    console.error(`[voice] erreur sur la connexion d'événements de l'appel ${callId} :`, err);
  });

  return NextResponse.json({ received: true });
}

// Tient une connexion WebSocket ouverte vers l'appel en cours pour exécuter
// les tools appelés par le modèle (voir runTool) et détecter la fin de
// l'appel (pour clôturer le UsageEvent avec sa durée).
function listenToCall(
  sipCallId: string,
  clientServiceId: string,
  configuration: Configuration
): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${sipCallId}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      let realtimeEvent: { type?: string; name?: string; arguments?: string; call_id?: string };
      try {
        realtimeEvent = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (realtimeEvent.type !== "response.function_call_arguments.done") return;

      const toolCallId = realtimeEvent.call_id;
      const toolName = realtimeEvent.name;
      if (!toolCallId || !toolName) return;

      (async () => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(realtimeEvent.arguments || "{}");
        } catch {
          // Arguments malformés : on laisse runTool échouer proprement sur un objet vide.
        }

        const result = await runTool(toolName, args, {
          clientServiceId,
          callId: sipCallId,
          configuration,
        });

        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "function_call_output", call_id: toolCallId, output: result },
          })
        );
        ws.send(JSON.stringify({ type: "response.create" }));
      })();
    });

    const finish = () => {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      recordUsageEvent({
        clientServiceId,
        externalId: sipCallId,
        status: "completed",
        durationSec,
      })
        .catch((err) => console.error(`[voice] échec de clôture de l'appel ${sipCallId} :`, err))
        .finally(resolve);
    };

    ws.on("close", finish);
    ws.on("error", finish);
  });
}
