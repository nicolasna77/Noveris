import crypto from "crypto";

// API Graph Meta — voir https://developers.facebook.com/docs/whatsapp/cloud-api
// pour la référence complète. Version fixée explicitement (Meta déprécie les
// anciennes versions après un délai, mais ne bascule jamais une intégration
// existante toute seule).
const GRAPH_API_VERSION = "v21.0";

// Vérifie la signature d'un webhook entrant (voir
// src/app/api/whatsapp/webhook/route.ts) — HMAC-SHA256 du corps brut de la
// requête avec le App Secret Meta, transmis dans l'en-tête
// "X-Hub-Signature-256" au format "sha256=<hex>". Même principe que
// validateTwilioRequest dans src/lib/twilio.ts, mais l'algorithme et le
// format d'en-tête sont propres à Meta.
export function validateWhatsAppSignature(
  signatureHeader: string | null,
  rawBody: string
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const [scheme, receivedHex] = signatureHeader.split("=");
  if (scheme !== "sha256" || !receivedHex) return false;

  const expectedHex = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf-8")
    .digest("hex");

  const received = Buffer.from(receivedHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

// Répond à la vérification du webhook faite une fois par Meta à sa
// configuration (GET avec hub.mode=subscribe) — le verify_token est une
// chaîne arbitraire choisie par nous (WHATSAPP_WEBHOOK_VERIFY_TOKEN),
// renseignée à l'identique côté Meta.
export function verifyWebhookChallenge(
  mode: string | null,
  token: string | null
): boolean {
  return mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
}

// Envoie un message texte depuis le numéro WhatsApp Business du client
// (phoneNumberId = ClientService.whatsappPhoneNumberId, l'identifiant Meta —
// pas le numéro humainement lisible) vers `to` (identifiant Meta de
// l'expéditeur du message reçu, tel que fourni dans le webhook entrant).
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  body: string
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN manquant");
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Échec d'envoi WhatsApp (${res.status}) : ${detail}`);
  }
}
