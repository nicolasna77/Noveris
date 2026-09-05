import { NextResponse } from "next/server";
import { validateTwilioRequest } from "@/lib/twilio";

// Webhook TwiML appelé par Twilio à chaque appel entrant sur un numéro
// Noveris (voir voiceWebhookUrl dans src/lib/twilio.ts, configuré au moment
// de l'achat du numéro). Réponse statique et identique pour tous les
// numéros : bascule l'appel vers OpenAI par SIP, qui décide ensuite (via
// /api/voice/openai-webhook, sur réception de realtime.call.incoming) quelle
// prestation et quel client répondent, selon le numéro appelé. Aucune
// session utilisateur ici — l'appelant est Twilio, pas un client connecté.
export async function POST(request: Request) {
  const signature = request.headers.get("X-Twilio-Signature");
  const formData = await request.formData();
  const params = Object.fromEntries(formData.entries()) as Record<string, string>;

  if (!validateTwilioRequest(signature, params)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sipUri = process.env.OPENAI_SIP_URI;
  const twiml = sipUri
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>${sipUri}</Sip></Dial></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fr-FR">Service momentanément indisponible, merci de rappeler plus tard.</Say><Hangup/></Response>`;

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
