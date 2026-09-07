import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import type { Configuration } from "@/lib/catalog";
import { buildSystemPrompt } from "@/lib/voice-agent/prompt";
import { getToolDefinitions, runTool } from "@/lib/voice-agent/tools";
import { recordUsageEvent } from "@/lib/usage-events";
import { sendWhatsAppMessage, validateWhatsAppSignature, verifyWebhookChallenge } from "@/lib/whatsapp";

// Construit à la demande, pas au chargement du module — voir la même raison
// dans src/lib/voice-agent/tools.ts et src/lib/twilio.ts.
function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const CHAT_MODEL = "gpt-5-mini";

// Vérification du webhook faite une fois par Meta à sa configuration —
// https://developers.facebook.com/docs/graph-api/webhooks/getting-started.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (verifyWebhookChallenge(mode, token) && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body: string };
        }[];
      };
    }[];
  }[];
};

// Reçoit chaque message WhatsApp entrant (voir src/lib/whatsapp.ts pour la
// vérification de signature et l'envoi de réponse). Un seul numéro Meta
// partagé par tous les clients Noveris : `phone_number_id` identifie lequel
// a reçu le message (voir ClientService.whatsappPhoneNumberId), exactement
// comme le `To` Twilio identifie la prestation téléphonique appelée.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!validateWhatsAppSignature(signature, rawBody)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const value = payload.entry?.[0]?.changes?.[0]?.value;
  const phoneNumberId = value?.metadata?.phone_number_id;
  const message = value?.messages?.[0];

  // Statuts de livraison ("delivered", "read"...) et messages non-texte
  // (image, audio...) arrivent sur la même route sans `message.text` — on
  // accuse simplement réception, rien à répondre pour l'instant.
  if (!phoneNumberId || !message || message.type !== "text" || !message.text) {
    return NextResponse.json({ received: true });
  }

  const clientService = await db.clientService.findFirst({
    where: { whatsappPhoneNumberId: phoneNumberId },
    include: { service: true, organization: true },
  });
  if (!clientService) {
    // Numéro Meta connu de Meta mais pas encore rattaché à une prestation
    // côté Noveris (configuration en cours) — on ne répond pas.
    return NextResponse.json({ received: true });
  }

  const configuration = (clientService.configuration ?? {}) as Configuration;
  const systemPrompt = buildSystemPrompt(clientService.service.slug, configuration, {
    calendarConnected: false,
    companyName: clientService.organization.name,
  });
  const tools = getToolDefinitions(clientService.service.slug, configuration, false);

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message.text.body },
      ],
      tools: tools.length > 0 ? tools : undefined,
    });

    const choice = completion.choices[0];
    const toolCalls = choice.message.tool_calls ?? [];

    let replyText = choice.message.content ?? "";

    // Le modèle appelle un outil (ex. take_message) plutôt que de répondre
    // directement au premier tour — on l'exécute puis on redemande une
    // réponse en langage naturel avec le résultat, comme un second tour de
    // conversation classique (Chat Completions, pas de session à tenir
    // ouverte contrairement à l'agent vocal en Realtime).
    const functionCalls = toolCalls.filter((call) => call.type === "function");
    if (functionCalls.length > 0) {
      const toolResults = await Promise.all(
        functionCalls.map(async (call) => ({
          tool_call_id: call.id,
          output: await runTool(
            call.function.name,
            JSON.parse(call.function.arguments || "{}"),
            { clientServiceId: clientService.id, callId: null, configuration }
          ),
        }))
      );

      const followUp = await getOpenAIClient().chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message.text.body },
          choice.message,
          ...toolResults.map((r) => ({
            role: "tool" as const,
            tool_call_id: r.tool_call_id,
            content: r.output,
          })),
        ],
      });
      replyText = followUp.choices[0].message.content ?? "";
    }

    if (replyText) {
      await sendWhatsAppMessage(
        phoneNumberId,
        message.from,
        replyText,
        clientService.whatsappAccessToken
      );
    }
  } catch (err) {
    console.error(`[whatsapp] échec de réponse au message ${message.id} :`, err);
  }

  await recordUsageEvent({
    clientServiceId: clientService.id,
    type: "whatsapp_message",
    externalId: message.id,
    metadata: { from: message.from },
  }).catch((err) => console.error(`[whatsapp] échec d'enregistrement du message ${message.id} :`, err));

  return NextResponse.json({ received: true });
}
