import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessagingReply } from "@/lib/messaging-agent";
import { recordUsageEvent } from "@/lib/usage-events";
import { getValidInstagramToken, sendInstagramMessage } from "@/lib/instagram";
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

// Même forme que le payload Messenger (entry[].messaging[]) — la messagerie
// Instagram est bâtie sur la même infrastructure, avec des identifiants
// IGSID à la place des PSID.
type InstagramWebhookPayload = {
  entry?: {
    id?: string;
    messaging?: {
      sender?: { id?: string };
      recipient?: { id?: string };
      message?: { mid: string; text?: string; is_echo?: boolean };
    }[];
  }[];
};

// Reçoit chaque message Instagram entrant. `recipient.id` (l'id du compte
// Instagram qui a reçu le message) identifie le client (voir
// ClientService.instagramAccountId), exactement comme phone_number_id pour
// WhatsApp.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!validateMetaSignature(signature, rawBody)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  const event = payload.entry?.[0]?.messaging?.[0];
  const igUserId = event?.recipient?.id;
  const senderId = event?.sender?.id;
  const message = event?.message;

  if (!igUserId || !senderId || !message?.text || message.is_echo) {
    return NextResponse.json({ received: true });
  }

  const clientService = await db.clientService.findFirst({
    where: { instagramAccountId: igUserId },
    include: { service: true, organization: true },
  });
  if (!clientService) {
    return NextResponse.json({ received: true });
  }

  try {
    const replyText = await generateMessagingReply(clientService, message.text);
    if (replyText) {
      const accessToken = await getValidInstagramToken(clientService.id);
      if (accessToken) {
        await sendInstagramMessage(igUserId, senderId, replyText, accessToken);
      }
    }
  } catch (err) {
    console.error(`[instagram] échec de réponse au message ${message.mid} :`, err);
  }

  await recordUsageEvent({
    clientServiceId: clientService.id,
    type: "instagram_message",
    externalId: message.mid,
    metadata: { from: senderId },
  }).catch((err) => console.error(`[instagram] échec d'enregistrement du message ${message.mid} :`, err));

  return NextResponse.json({ received: true });
}
