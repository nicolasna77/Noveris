import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessagingReply } from "@/lib/messaging-agent";
import { recordUsageEvent } from "@/lib/usage-events";
import { sendMessengerMessage } from "@/lib/messenger";
import { validateMetaSignature, verifyMetaWebhookChallenge } from "@/lib/meta";

// Même handshake que le webhook WhatsApp (src/app/api/whatsapp/webhook) —
// un seul verify_token partagé pour les 3 canaux Meta.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (verifyMetaWebhookChallenge(mode, token) && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Forme du payload Messenger — différente de WhatsApp (entry[].messaging[]
// plutôt que entry[].changes[].value), voir
// https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages.
type MessengerWebhookPayload = {
  entry?: {
    id?: string;
    messaging?: {
      sender?: { id?: string };
      recipient?: { id?: string };
      message?: { mid: string; text?: string; is_echo?: boolean };
    }[];
  }[];
};

// Reçoit chaque message Messenger entrant. Une seule app Meta partagée par
// tous les clients Noveris : `recipient.id` (l'id de la Page qui a reçu le
// message) identifie lequel (voir ClientService.facebookPageId), exactement
// comme phone_number_id pour WhatsApp.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!validateMetaSignature(signature, rawBody)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as MessengerWebhookPayload;
  const event = payload.entry?.[0]?.messaging?.[0];
  const pageId = event?.recipient?.id;
  const senderId = event?.sender?.id;
  const message = event?.message;

  // "Echos" (nos propres messages envoyés renvoyés en écho par Meta),
  // accusés de lecture et messages non-texte arrivent sur la même route
  // sans texte exploitable — on accuse simplement réception.
  if (!pageId || !senderId || !message?.text || message.is_echo) {
    return NextResponse.json({ received: true });
  }

  const clientService = await db.clientService.findFirst({
    where: { facebookPageId: pageId },
    include: { service: true, organization: true },
  });
  if (!clientService) {
    return NextResponse.json({ received: true });
  }

  try {
    const replyText = await generateMessagingReply(clientService, message.text);
    if (replyText && clientService.facebookPageAccessToken) {
      await sendMessengerMessage(pageId, senderId, replyText, clientService.facebookPageAccessToken);
    }
  } catch (err) {
    console.error(`[messenger] échec de réponse au message ${message.mid} :`, err);
  }

  await recordUsageEvent({
    clientServiceId: clientService.id,
    type: "messenger_message",
    externalId: message.mid,
    metadata: { from: senderId },
  }).catch((err) => console.error(`[messenger] échec d'enregistrement du message ${message.mid} :`, err));

  return NextResponse.json({ received: true });
}
