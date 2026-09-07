import crypto from "crypto";

// Primitives Graph API partagées par les 3 canaux Meta (WhatsApp, Facebook
// Messenger, Instagram) — une seule app Meta signe tous ses webhooks avec le
// même App Secret quel que soit le produit, et Facebook Login for Business
// (WhatsApp Embedded Signup et connexion de Page Messenger) échange son code
// contre un jeton de la même façon. Instagram utilise sa propre app
// (INSTAGRAM_APP_ID/SECRET, voir src/lib/instagram.ts) et n'a donc pas sa
// place ici.
const GRAPH_API_VERSION = "v21.0";

// Vérifie la signature d'un webhook entrant — HMAC-SHA256 du corps brut de
// la requête avec l'App Secret Meta, transmis dans l'en-tête
// "X-Hub-Signature-256" au format "sha256=<hex>". Même algorithme pour
// WhatsApp, Messenger et Instagram (une seule app Meta, un seul App Secret).
// Le nom de la variable (WHATSAPP_APP_SECRET) date de la première intégration
// mais désigne bien le secret de l'app entière.
export function validateMetaSignature(
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

// Répond à la vérification de webhook faite une fois par Meta à sa
// configuration (GET avec hub.mode=subscribe) — même verify_token partagé
// pour les 3 canaux (WHATSAPP_WEBHOOK_VERIFY_TOKEN), une chaîne arbitraire
// choisie par nous et renseignée à l'identique côté Meta pour chaque
// abonnement webhook créé (WhatsApp, Messenger, Instagram).
export function verifyMetaWebhookChallenge(
  mode: string | null,
  token: string | null
): boolean {
  return mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
}

// Échange un code d'autorisation renvoyé par Facebook Login for Business
// (WhatsApp Embedded Signup ou connexion de Page Messenger, voir
// whatsapp-connection.tsx / messenger-connection.tsx) contre un jeton
// d'accès — même endpoint et mêmes identifiants pour les deux, seul le
// config_id utilisé côté client change ce à quoi le jeton donne accès.
export async function exchangeMetaEmbeddedSignupCode(code: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appId) throw new Error("NEXT_PUBLIC_META_APP_ID manquant");
  if (!appSecret) throw new Error("WHATSAPP_APP_SECRET manquant");

  const params = new URLSearchParams({ client_id: appId, client_secret: appSecret, code });
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Échec de l'échange du code Meta : ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
