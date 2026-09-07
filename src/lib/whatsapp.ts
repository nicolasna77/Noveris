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
// clientAccessToken vient de ClientService.whatsappAccessToken quand le
// client s'est connecté lui-même (voir exchangeEmbeddedSignupCode
// ci-dessous) — à défaut (connexion manuelle par l'admin, ou notre propre
// numéro de test) on retombe sur le jeton partagé WHATSAPP_ACCESS_TOKEN.
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  body: string,
  clientAccessToken?: string | null
): Promise<void> {
  const accessToken = clientAccessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Aucun jeton d'accès WhatsApp disponible pour ce client");
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant`);
  return value;
}

// Connexion self-service du compte WhatsApp d'un client ("Embedded Signup",
// voir src/app/dashboard/whatsapp-connection.tsx) — Noveris agit comme "Tech
// Provider" Meta : un seul app Meta partagé, mais un jeton propre à chaque
// client obtenu ici. Le `code` vient du callback FB.login côté navigateur,
// à usage unique et expirant en 30 secondes — l'échange doit suivre tout de
// suite l'événement de fin de parcours (postMessage "WA_EMBEDDED_SIGNUP").
export async function exchangeEmbeddedSignupCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: requireEnv("NEXT_PUBLIC_META_APP_ID"),
    // Le App Secret sert ici d'authentification client_secret OAuth — même
    // valeur que celle qui signe les webhooks entrants (WHATSAPP_APP_SECRET),
    // Meta n'en distribue qu'une seule par app.
    client_secret: requireEnv("WHATSAPP_APP_SECRET"),
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Échec de l'échange du code Meta : ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Sans cet appel, notre webhook applicatif unique ne recevrait jamais les
// messages du WABA nouvellement connecté — Meta ne les envoie qu'aux apps
// explicitement abonnées à CE WABA, pas seulement à celles ayant un jeton
// valide dessus.
export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Échec d'abonnement au WABA : ${await res.text()}`);
  }
}

// Un numéro fraîchement rattaché via Embedded Signup n'est pas encore
// enregistré pour l'API Cloud — cet appel l'active et fixe au passage son
// code de vérification en deux étapes (choisi arbitrairement ici, jamais
// redemandé ensuite par un usage normal de l'API).
export async function registerPhoneNumber(phoneNumberId: string, accessToken: string): Promise<void> {
  const pin = crypto.randomInt(100000, 1000000).toString();
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/register`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    }
  );
  if (!res.ok) {
    throw new Error(`Échec d'enregistrement du numéro : ${await res.text()}`);
  }
}

// Numéro humainement lisible, uniquement pour confirmer à l'écran au client
// quel numéro vient d'être connecté — jamais utilisé pour router quoi que ce
// soit (voir ClientService.whatsappDisplayNumber). null si l'appel échoue :
// la connexion elle-même a déjà réussi à ce stade, pas la peine de la faire
// échouer pour un simple affichage.
export async function fetchDisplayPhoneNumber(
  phoneNumberId: string,
  accessToken: string
): Promise<string | null> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { display_phone_number?: string };
  return data.display_phone_number ?? null;
}
