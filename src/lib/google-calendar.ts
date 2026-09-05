import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { logServiceEvent } from "@/lib/service-events";

// Connexion agenda Google par ClientService (voir CalendarConnection dans
// prisma/schema.prisma) — appels REST directs plutôt que le SDK `googleapis`,
// suffisant pour les 3 opérations dont on a besoin (échange de code,
// rafraîchissement de token, création d'événement).
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant`);
  return value;
}

// `state` signé (HMAC) plutôt qu'un simple clientServiceId en clair — évite
// qu'un tiers déclenche le callback OAuth avec un clientServiceId arbitraire
// pour rattacher sa propre connexion Google au service d'un autre client.
function signState(clientServiceId: string): string {
  const secret = requireEnv("GOOGLE_OAUTH_STATE_SECRET");
  const signature = createHmac("sha256", secret).update(clientServiceId).digest("hex");
  return `${clientServiceId}.${signature}`;
}

export function verifyState(state: string): string | null {
  const [clientServiceId, signature] = state.split(".");
  if (!clientServiceId || !signature) return null;

  const secret = requireEnv("GOOGLE_OAUTH_STATE_SECRET");
  const expected = createHmac("sha256", secret).update(clientServiceId).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, signatureBuf)) return null;

  return clientServiceId;
}

export function buildGoogleAuthUrl(clientServiceId: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
    response_type: "code",
    scope: `${GOOGLE_CALENDAR_SCOPE} openid email`,
    access_type: "offline",
    // Force le renvoi d'un refresh_token même si le client a déjà autorisé
    // l'app par le passé (Google ne le renvoie sinon qu'à la première
    // autorisation).
    prompt: "consent",
    state: signState(clientServiceId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
};

// Échange de code et rafraîchissement partagent la même requête à l'endpoint
// token de Google, seuls les paramètres de grant changent — un seul endroit
// pour le body/en-têtes/vérification d'erreur communs.
async function requestGoogleToken(
  context: string,
  grantParams: Record<string, string>
): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      ...grantParams,
    }),
  });
  if (!res.ok) {
    throw new Error(`${context} : ${await res.text()}`);
  }
  return res.json();
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  return requestGoogleToken("Échange du code Google échoué", {
    redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
    grant_type: "authorization_code",
    code,
  });
}

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Récupération de l'e-mail Google échouée");
  const data = (await res.json()) as { email?: string };
  return data.email ?? "inconnu";
}

// Termine le flow OAuth : échange le code, récupère l'e-mail du compte
// connecté, et upsert la CalendarConnection du ClientService.
export async function completeGoogleCalendarConnection(
  clientServiceId: string,
  code: string
) {
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    // Arrive si le client avait déjà autorisé l'app sans passer par
    // prompt=consent (ne devrait pas se produire vu buildGoogleAuthUrl, mais
    // on préfère échouer explicitement plutôt que stocker une connexion
    // qu'on ne pourra jamais rafraîchir).
    throw new Error("Google n'a pas renvoyé de refresh_token");
  }
  const googleAccountEmail = await fetchGoogleEmail(tokens.access_token);

  const connectionData = {
    googleAccountEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope,
  };

  await db.calendarConnection.upsert({
    where: { clientServiceId },
    create: { clientServiceId, ...connectionData },
    update: connectionData,
  });
  await logServiceEvent(clientServiceId, "CALENDAR_CONNECTED", googleAccountEmail);
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  return requestGoogleToken("Rafraîchissement du token Google échoué", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

// Renvoie un access token valide pour ce ClientService, en le rafraîchissant
// d'abord si besoin — null si aucune connexion n'existe.
export async function getValidAccessToken(
  clientServiceId: string
): Promise<{ accessToken: string; calendarId: string } | null> {
  const connection = await db.calendarConnection.findUnique({
    where: { clientServiceId },
  });
  if (!connection) return null;

  // Marge de 60s pour éviter d'utiliser un token qui expire pendant l'appel.
  if (connection.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
    return { accessToken: connection.accessToken, calendarId: connection.calendarId };
  }

  const tokens = await refreshAccessToken(connection.refreshToken);
  await db.calendarConnection.update({
    where: { clientServiceId },
    data: {
      accessToken: tokens.access_token,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return { accessToken: tokens.access_token, calendarId: connection.calendarId };
}

// Vérifie qu'aucun événement n'occupe déjà ce créneau (API freeBusy) — false
// si la connexion est absente ou si l'appel échoue (on laisse alors l'agent
// proposer le créneau plutôt que de bloquer sur une erreur technique).
export async function isSlotFree(
  clientServiceId: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const auth = await getValidAccessToken(clientServiceId);
  if (!auth) return false;

  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: startAt.toISOString(),
        timeMax: endAt.toISOString(),
        items: [{ id: auth.calendarId }],
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      calendars: Record<string, { busy: unknown[] }>;
    };
    const busy = data.calendars[auth.calendarId]?.busy ?? [];
    return busy.length === 0;
  } catch {
    return false;
  }
}

export async function createCalendarEvent(
  clientServiceId: string,
  event: { summary: string; description?: string; startAt: Date; endAt: Date }
): Promise<string | null> {
  const auth = await getValidAccessToken(clientServiceId);
  if (!auth) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.startAt.toISOString() },
          end: { dateTime: event.endAt.toISOString() },
        }),
      }
    );
    if (!res.ok) return null;
    const created = (await res.json()) as { id: string };
    return created.id;
  } catch {
    // Best-effort : l'appelant (book_appointment) crée quand même la
    // Booking avec googleEventId: null pour ne jamais perdre une réservation.
    return null;
  }
}
