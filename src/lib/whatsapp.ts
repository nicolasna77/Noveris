import crypto from "crypto";

const GRAPH_API_VERSION = "v21.0";

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

export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Échec d'abonnement au WABA : ${await res.text()}`);
  }
}

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
