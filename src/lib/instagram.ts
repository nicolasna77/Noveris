import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { logServiceEvent } from "@/lib/service-events";

// Connexion Instagram par ClientService — "Business Login for Instagram"
// (OAuth classique, comme Google Agenda dans src/lib/google-calendar.ts),
// pas Facebook Login for Business : Instagram utilise sa propre app
// (INSTAGRAM_APP_ID/SECRET, distincts du Meta App ID partagé par
// WhatsApp/Messenger — voir App Dashboard > Instagram > API setup with
// Instagram Login) et son propre domaine OAuth, sans lien obligatoire avec
// une Page Facebook.
const INSTAGRAM_AUTH_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";
const INSTAGRAM_SCOPE = "instagram_business_basic,instagram_business_manage_messages";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant`);
  return value;
}

// Même raison que signState/verifyState dans google-calendar.ts — évite
// qu'un tiers déclenche le callback avec un clientServiceId arbitraire.
function signState(clientServiceId: string): string {
  const secret = requireEnv("INSTAGRAM_OAUTH_STATE_SECRET");
  const signature = createHmac("sha256", secret).update(clientServiceId).digest("hex");
  return `${clientServiceId}.${signature}`;
}

export function verifyInstagramState(state: string): string | null {
  const [clientServiceId, signature] = state.split(".");
  if (!clientServiceId || !signature) return null;

  const secret = requireEnv("INSTAGRAM_OAUTH_STATE_SECRET");
  const expected = createHmac("sha256", secret).update(clientServiceId).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, signatureBuf)) return null;

  return clientServiceId;
}

export function buildInstagramAuthUrl(clientServiceId: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("INSTAGRAM_APP_ID"),
    redirect_uri: requireEnv("INSTAGRAM_OAUTH_REDIRECT_URI"),
    response_type: "code",
    scope: INSTAGRAM_SCOPE,
    state: signState(clientServiceId),
  });
  return `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
}

type ShortLivedTokenResponse = { access_token: string; user_id: string };
type LongLivedTokenResponse = { access_token: string; expires_in: number };

async function exchangeShortLivedToken(code: string): Promise<ShortLivedTokenResponse> {
  const res = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("INSTAGRAM_APP_ID"),
      client_secret: requireEnv("INSTAGRAM_APP_SECRET"),
      grant_type: "authorization_code",
      redirect_uri: requireEnv("INSTAGRAM_OAUTH_REDIRECT_URI"),
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Échec de l'échange du code Instagram : ${await res.text()}`);
  }
  return res.json();
}

// Le jeton court obtenu ci-dessus n'est valable qu'une heure — on l'échange
// tout de suite contre un jeton longue durée (60 jours), qu'il faudra
// ensuite rafraîchir avant expiration (voir getValidInstagramToken).
async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: requireEnv("INSTAGRAM_APP_SECRET"),
    access_token: shortLivedToken,
  });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Échec de l'obtention d'un jeton Instagram longue durée : ${await res.text()}`);
  }
  return res.json();
}

async function fetchInstagramUsername(userId: string, accessToken: string): Promise<string | null> {
  const res = await fetch(
    `${INSTAGRAM_GRAPH_URL}/${userId}?fields=username&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { username?: string };
  return data.username ?? null;
}

// Termine le flow OAuth : échange le code, l'étend en jeton longue durée,
// récupère le nom d'utilisateur pour confirmation à l'écran, et upsert les
// champs Instagram du ClientService.
export async function completeInstagramConnection(clientServiceId: string, code: string) {
  const shortLived = await exchangeShortLivedToken(code);
  const longLived = await exchangeForLongLivedToken(shortLived.access_token);
  const username = await fetchInstagramUsername(shortLived.user_id, longLived.access_token);

  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      instagramAccountId: shortLived.user_id,
      instagramAccessToken: longLived.access_token,
      instagramTokenExpiresAt: new Date(Date.now() + longLived.expires_in * 1000),
      instagramUsername: username,
    },
  });
  await logServiceEvent(clientServiceId, "INSTAGRAM_CONNECTED", username);
}

async function refreshLongLivedToken(accessToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: accessToken });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/refresh_access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Échec du rafraîchissement du jeton Instagram : ${await res.text()}`);
  }
  return res.json();
}

// Renvoie un jeton valide pour ce ClientService, en le rafraîchissant
// d'abord si besoin — même principe que getValidAccessToken dans
// google-calendar.ts. Un jeton longue durée ne peut être rafraîchi qu'après
// 24h d'existence, d'où la marge large (7 jours) plutôt que les 60 secondes
// utilisées pour Google (un webhook manqué ferait perdre un message client,
// pas juste retarder un appel API).
export async function getValidInstagramToken(clientServiceId: string): Promise<string | null> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { instagramAccessToken: true, instagramTokenExpiresAt: true },
  });
  if (!clientService?.instagramAccessToken || !clientService.instagramTokenExpiresAt) return null;

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (clientService.instagramTokenExpiresAt.getTime() - Date.now() > sevenDaysMs) {
    return clientService.instagramAccessToken;
  }

  const refreshed = await refreshLongLivedToken(clientService.instagramAccessToken);
  await db.clientService.update({
    where: { id: clientServiceId },
    data: {
      instagramAccessToken: refreshed.access_token,
      instagramTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}

// Envoie un message texte depuis le compte Instagram du client (igUserId =
// ClientService.instagramAccountId) vers `to` (IGSID de l'expéditeur du
// message reçu, tel que fourni dans le webhook entrant).
export async function sendInstagramMessage(igUserId: string, to: string, body: string, accessToken: string): Promise<void> {
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/${igUserId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient: { id: to }, message: { text: body } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Échec d'envoi Instagram (${res.status}) : ${detail}`);
  }
}
