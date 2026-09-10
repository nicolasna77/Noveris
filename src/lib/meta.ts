import crypto from "crypto";

const GRAPH_API_VERSION = "v21.0";

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

export function verifyMetaWebhookChallenge(
  mode: string | null,
  token: string | null
): boolean {
  return mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
}

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
