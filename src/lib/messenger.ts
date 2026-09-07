// API Graph Meta pour les Pages Facebook (Messenger Platform) — même app
// Meta et même mécanisme d'échange de code que WhatsApp (voir
// src/lib/meta.ts), mais l'actif connecté est une Page, pas un WABA.
const GRAPH_API_VERSION = "v21.0";

type ManagedPage = { id: string; name: string; access_token: string };

// Liste les Pages que l'utilisateur vient d'autoriser via Facebook Login for
// Business (voir messenger-connection.tsx) — contrairement au WhatsApp
// Embedded Signup, ce flow plus simple ne renvoie pas l'identifiant de la
// Page par postMessage : il faut la retrouver via /me/accounts, qui renvoie
// au passage un jeton propre à chaque Page (c'est lui qu'il faut utiliser
// pour envoyer et s'abonner, pas le jeton utilisateur de l'échange).
// Un client TPE/artisan ne gère en pratique qu'une seule Page — on prend la
// première renvoyée plutôt que de complexifier avec un sélecteur.
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

// Sans cet appel, notre webhook applicatif unique ne recevrait jamais les
// messages de la Page nouvellement connectée — même principe que
// subscribeAppToWaba dans src/lib/whatsapp.ts.
export async function subscribePageToApp(pageId: string, pageAccessToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps?subscribed_fields=messages`,
    { method: "POST", headers: { Authorization: `Bearer ${pageAccessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Échec d'abonnement à la Page : ${await res.text()}`);
  }
}

// Envoie un message texte depuis la Page du client (pageId =
// ClientService.facebookPageId) vers `to` (PSID de l'expéditeur du message
// reçu, tel que fourni dans le webhook entrant).
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
