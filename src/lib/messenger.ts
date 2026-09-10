const GRAPH_API_VERSION = "v21.0";

type ManagedPage = { id: string; name: string; access_token: string };

export async function fetchManagedPage(
  userAccessToken: string
): Promise<ManagedPage | null> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`
  );
  if (!res.ok) {
    throw new Error(`Échec de récupération des Pages Facebook : ${await res.text()}`);
  }
  const data = (await res.json()) as { data: ManagedPage[] };
  return data.data[0] ?? null;
}

export async function subscribePageToApp(pageId: string, pageAccessToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps?subscribed_fields=messages`,
    { method: "POST", headers: { Authorization: `Bearer ${pageAccessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Échec d'abonnement à la Page : ${await res.text()}`);
  }
}

export async function sendMessengerMessage(
  pageId: string,
  to: string,
  body: string,
  pageAccessToken: string
): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: to },
        message: { text: body },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Échec d'envoi Messenger (${res.status}) : ${detail}`);
  }
}
