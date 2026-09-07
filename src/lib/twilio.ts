import twilioLib from "twilio";

// Client Twilio unique côté Noveris (pas de sous-compte par client) — les
// numéros achetés en libre-service par les clients sont tous rattachés à ce
// compte, facturés à Noveris et couverts par l'abonnement du client (voir
// section « Numéro de téléphone » du plan). Simplifie l'intégration au prix
// de devoir surveiller soi-même l'usage/l'abus (voir les garde-fous dans
// purchasePhoneNumberForService, src/app/dashboard/actions.ts).
//
// Authentifié par API Key (SID + Secret, Console > Account > API keys &
// tokens) plutôt que par l'Auth Token principal du compte — une clé API est
// révocable individuellement sans avoir à changer un secret utilisé partout
// ailleurs. Le SDK a quand même besoin du vrai Account SID à part, le
// premier argument devenant le SID de la clé API (préfixe "SK") et non plus
// celui du compte (préfixe "AC").
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  if (!accountSid || !apiKeySid || !apiKeySecret) {
    throw new Error(
      "TWILIO_ACCOUNT_SID / TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET manquants"
    );
  }
  return twilioLib(apiKeySid, apiKeySecret, { accountSid });
}

// NEXT_PUBLIC_APP_URL avec un slash final (ex. Vercel Settings > Environment
// Variables) produirait sinon une URL à double slash, différente de celle
// que Vercel normalise réellement à la réception — Twilio calculerait sa
// signature sur l'URL configurée (avec le double slash), la nôtre sur l'URL
// normalisée, et la validation échouerait systématiquement. Un vrai appel
// entrant se serait aussi heurté à la redirection 308 que Next.js renvoie
// pour ce chemin, que Twilio ne suit pas forcément sur un webhook vocal.
export function voiceWebhookUrl(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${appUrl}/api/voice/incoming`;
}

// Vérifie qu'une requête POST vers /api/voice/incoming vient bien de Twilio
// (signature HMAC calculée sur l'URL exacte du webhook + les paramètres du
// formulaire) — endpoint public, sans session utilisateur, donc c'est la
// seule protection contre un appelant qui forgerait la requête. Toujours
// signée avec l'Auth Token du compte côté Twilio, jamais avec une clé API —
// ça reste donc TWILIO_AUTH_TOKEN ici, même si getTwilioClient() ci-dessus
// est passé à l'authentification par clé API pour les appels REST.
export function validateTwilioRequest(
  signature: string | null,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;
  return twilioLib.validateRequest(authToken, signature, voiceWebhookUrl(), params);
}

export type AvailableNumber = {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
};

// Recherche de numéros locaux français disponibles à l'achat. Pas de filtre
// par indicatif (la numérotation française ne se prête pas au découpage par
// "area code" façon Amérique du Nord) — on affiche simplement les premiers
// résultats. Note pour plus tard : Twilio exige parfois un "Bundle" de
// conformité réglementaire pour activer des numéros locaux FR selon le type
// de compte — à vérifier une fois le compte Twilio créé, avant le premier
// achat réel.
export async function searchAvailableNumbers(limit = 10): Promise<AvailableNumber[]> {
  const numbers = await getTwilioClient()
    .availablePhoneNumbers("FR")
    .local.list({ limit });

  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality ?? null,
    region: n.region ?? null,
  }));
}

export async function purchasePhoneNumber(
  phoneNumber: string
): Promise<{ sid: string; phoneNumber: string }> {
  const purchased = await getTwilioClient().incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: voiceWebhookUrl(),
  });
  return { sid: purchased.sid, phoneNumber: purchased.phoneNumber };
}

// Relâche un numéro (arrête sa facturation Twilio) — best-effort, appelé
// depuis cancelService : un échec ne doit jamais bloquer la résiliation côté
// client, juste laisser un numéro orphelin que l'équipe Noveris devra
// libérer manuellement dans la console Twilio.
export async function releasePhoneNumber(sid: string): Promise<void> {
  try {
    await getTwilioClient().incomingPhoneNumbers(sid).remove();
  } catch {
    // best-effort, voir commentaire ci-dessus
  }
}
