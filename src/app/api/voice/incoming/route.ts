import { NextResponse } from "next/server";
import { validateTwilioRequest } from "@/lib/twilio";

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
