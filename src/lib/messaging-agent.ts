import OpenAI from "openai";
import type { Configuration } from "@/lib/catalog";
import { buildSystemPrompt } from "@/lib/voice-agent/prompt";
import { getToolDefinitions, runTool } from "@/lib/voice-agent/tools";

// Construit à la demande, pas au chargement du module — voir la même raison
// dans src/lib/voice-agent/tools.ts et src/lib/twilio.ts.
function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const CHAT_MODEL = "gpt-5-mini";

// Génère la réponse d'un agent de messagerie (WhatsApp, Messenger,
// Instagram — voir buildMessagingPrompt dans voice-agent/prompt.ts)  à un
// message entrant. Un seul tour de conversation à la fois (Chat
// Completions, pas de session à tenir ouverte contrairement à l'agent vocal
// en Realtime) — extrait ici pour ne pas tripler cette logique dans les 3
// routes de webhook, qui ne diffèrent que par la façon dont elles
// retrouvent le ClientService et envoient la réponse.
export async function generateMessagingReply(
  clientService: {
    id: string;
    configuration: unknown;
    service: { slug: string };
    organization: { name: string };
  },
  incomingText: string
): Promise<string> {
  const configuration = (clientService.configuration ?? {}) as Configuration;
  const systemPrompt = buildSystemPrompt(clientService.service.slug, configuration, {
    calendarConnected: false,
    companyName: clientService.organization.name,
  });
  const tools = getToolDefinitions(clientService.service.slug, configuration, false);

  const completion = await getOpenAIClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: incomingText },
    ],
    tools: tools.length > 0 ? tools : undefined,
  });

  const choice = completion.choices[0];
  const toolCalls = choice.message.tool_calls ?? [];

  // Le modèle appelle un outil (ex. take_message) plutôt que de répondre
  // directement au premier tour — on l'exécute puis on redemande une
  // réponse en langage naturel avec le résultat, comme un second tour de
  // conversation classique.
  const functionCalls = toolCalls.filter((call) => call.type === "function");
  if (functionCalls.length === 0) {
    return choice.message.content ?? "";
  }

  const toolResults = await Promise.all(
    functionCalls.map(async (call) => ({
      tool_call_id: call.id,
      output: await runTool(
        call.function.name,
        JSON.parse(call.function.arguments || "{}"),
        { clientServiceId: clientService.id, callId: null, configuration }
      ),
    }))
  );

  const followUp = await getOpenAIClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: incomingText },
      choice.message,
      ...toolResults.map((r) => ({
        role: "tool" as const,
        tool_call_id: r.tool_call_id,
        content: r.output,
      })),
    ],
  });
  return followUp.choices[0].message.content ?? "";
}
