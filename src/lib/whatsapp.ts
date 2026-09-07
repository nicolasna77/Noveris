import crypto from "crypto";

// API Graph Meta — voir https://developers.facebook.com/docs/whatsapp/cloud-api
// pour la référence complète. Version fixée explicitement (Meta déprécie les
// anciennes versions après un délai, mais ne bascule jamais une intégration
// existante toute seule). La validation de signature et l'échange de code
// Embedded Signup sont partagés avec Messenger — voir src/lib/meta.ts.
const GRAPH_API_VERSION = "v21.0";

// Envoie un message texte depuis le numéro WhatsApp Business du client
// (phoneNumberId = ClientService.whatsappPhoneNumberId, l'identifiant Meta —
// pas le numéro humainement lisible) vers `to` (identifiant Meta de
// l'expéditeur du message reçu, tel que fourni dans le webhook entrant).
// clientAccessToken vient de ClientService.whatsappAccessToken quand le
// client s'est connecté lui-même (voir exchangeMetaEmbeddedSignupCode dans
// src/lib/meta.ts) — à défaut (connexion manuelle par l'admin, ou notre
// propre numéro de test) on retombe sur le jeton partagé WHATSAPP_ACCESS_TOKEN.
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
