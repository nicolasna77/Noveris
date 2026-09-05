import OpenAI from "openai";
import { db } from "@/lib/db";
import { createCalendarEvent, isSlotFree } from "@/lib/google-calendar";
import { asStringArray, type Configuration, type RuleRow } from "@/lib/catalog";

// Construit à la demande plutôt qu'au chargement du module : le SDK OpenAI
// lève une exception dès la construction si aucune clé n'est disponible, ce
// qui ferait planter le build Next.js (exécuté sans OPENAI_API_KEY tant que
// l'agent vocal n'est pas configuré) — voir getTwilioClient() dans
// src/lib/twilio.ts pour le même principe.
function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Schéma de tool au format Chat Completions (utilisé par
// scripts/test-voice-agent.ts) — voir buildSystemPrompt pour le prompt
// système correspondant. La Realtime API attend une forme "aplatie" (name/
// description/parameters directement sur l'objet, pas nichés sous
// `function`) : voir toRealtimeTools ci-dessous pour la conversion, utilisée
// par src/app/api/voice/openai-webhook/route.ts.
export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type RealtimeToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export function toRealtimeTools(tools: ToolDefinition[]): RealtimeToolDefinition[] {
  return tools.map((tool) => ({
    type: "function",
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));
}

function objectivesOf(configuration: Configuration): string[] {
  return asStringArray(configuration.objectives);
}

function asRuleRows(value: Configuration[string] | undefined): RuleRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is RuleRow =>
      typeof row === "object" && row !== null && "trigger" in row && "target" in row
  );
}

const CHECK_AVAILABILITY: ToolDefinition = {
  type: "function",
  function: {
    name: "check_availability",
    description:
      "Vérifie si un créneau est libre dans l'agenda avant de proposer un rendez-vous.",
    parameters: {
      type: "object",
      properties: {
        startAt: {
          type: "string",
          description: "Début du créneau, au format ISO 8601 (ex. 2026-09-15T14:00:00+02:00).",
        },
        durationMinutes: { type: "number", description: "Durée du créneau en minutes." },
      },
      required: ["startAt", "durationMinutes"],
    },
  },
};

const BOOK_APPOINTMENT: ToolDefinition = {
  type: "function",
  function: {
    name: "book_appointment",
    description:
      "Réserve un rendez-vous dans l'agenda une fois le créneau confirmé libre et les informations de l'appelant recueillies.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        startAt: { type: "string", description: "Format ISO 8601." },
        durationMinutes: { type: "number" },
        notes: { type: "string", description: "Motif du rendez-vous." },
      },
      required: ["customerName", "customerPhone", "startAt", "durationMinutes"],
    },
  },
};

const TAKE_ORDER: ToolDefinition = {
  type: "function",
  function: {
    name: "take_order",
    description: "Enregistre une commande une fois les articles et le mode de retrait confirmés.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["name", "quantity"],
          },
        },
        fulfillment: { type: "string", enum: ["pickup", "delivery"] },
        address: { type: "string", description: "Requis si fulfillment = delivery." },
        notes: { type: "string" },
      },
      required: ["customerName", "customerPhone", "items", "fulfillment"],
    },
  },
};

// L'enum est limité aux motifs réellement configurés par le client
// (callRouting) — le modèle ne peut ni inventer un motif, ni un numéro : le
// numéro cible est résolu côté serveur dans runTool à partir du motif choisi.
function buildTransferCallTool(triggers: string[]): ToolDefinition {
  return {
    type: "function",
    function: {
      name: "transfer_call",
      description: "Transfère l'appel en cours vers le bon interlocuteur selon le motif de l'appel.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", enum: triggers, description: "Motif du transfert." },
        },
        required: ["reason"],
      },
    },
  };
}

const TAKE_MESSAGE: ToolDefinition = {
  type: "function",
  function: {
    name: "take_message",
    description:
      "Note un message pour l'entreprise quand l'appel ne correspond à aucun motif de transfert connu, ou en dehors des horaires d'ouverture.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        reason: { type: "string", description: "Motif de l'appel, en une phrase." },
      },
      required: ["customerName", "customerPhone", "reason"],
    },
  },
};

// Les tools exposés dépendent du service et de ce que le client a configuré
// (`objectives`/`callRouting`) et, pour les rendez-vous, de la connexion
// effective d'un agenda — sans quoi l'agent promettrait une réservation
// qu'il ne peut pas tenir.
export function getToolDefinitions(
  serviceSlug: string,
  configuration: Configuration,
  calendarConnected: boolean
): ToolDefinition[] {
  if (serviceSlug === "standard-telephonique-ia") {
    const tools: ToolDefinition[] = [];
    const triggers = asRuleRows(configuration.callRouting).map((r) => r.trigger);
    if (triggers.length > 0) tools.push(buildTransferCallTool(triggers));
    tools.push(TAKE_MESSAGE);
    return tools;
  }

  const objectives = objectivesOf(configuration);
  const tools: ToolDefinition[] = [];
  if (objectives.includes("appointment") && calendarConnected) {
    tools.push(CHECK_AVAILABILITY, BOOK_APPOINTMENT);
  }
  if (objectives.includes("order")) {
    tools.push(TAKE_ORDER);
  }
  return tools;
}

type OrderItem = { name: string; quantity: number };

// Contexte partagé par tous les tools d'un même appel — `callId` est le
// `call_id` OpenAI de l'appel réel (null en mode texte, voir
// scripts/test-voice-agent.ts, ce qui fait de transfer_call un transfert
// simulé plutôt qu'un vrai appel à l'API Realtime).
export type ToolContext = {
  clientServiceId: string;
  callId: string | null;
  configuration: Configuration;
};

// Exécute un appel de tool émis par le modèle et renvoie une chaîne à
// repasser au modèle comme résultat (`tool` message) — jamais d'exception
// non gérée : un échec renvoie un message que l'agent peut reformuler à
// l'appelant plutôt que de casser la conversation.
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<string> {
  switch (name) {
    case "check_availability": {
      const startAt = new Date(args.startAt as string);
      const durationMinutes = Number(args.durationMinutes);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      const free = await isSlotFree(context.clientServiceId, startAt, endAt);
      return free
        ? "Le créneau est libre."
        : "Le créneau n'est pas disponible (ou l'agenda n'a pas pu être consulté) — propose un autre horaire.";
    }

    case "book_appointment": {
      const customerName = String(args.customerName ?? "");
      const customerPhone = String(args.customerPhone ?? "");
      const startAt = new Date(args.startAt as string);
      const durationMinutes = Number(args.durationMinutes);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      const notes = typeof args.notes === "string" ? args.notes : null;

      const googleEventId = await createCalendarEvent(context.clientServiceId, {
        summary: `RDV — ${customerName}`,
        description: notes ?? undefined,
        startAt,
        endAt,
      });

      await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "appointment",
          customerName,
          customerPhone,
          startAt,
          endAt,
          googleEventId,
          notes,
        },
      });

      return googleEventId
        ? "Rendez-vous confirmé et ajouté à l'agenda."
        : "Rendez-vous enregistré, mais l'ajout à l'agenda a échoué — l'équipe le synchronisera manuellement.";
    }

    case "take_order": {
      const customerName = String(args.customerName ?? "");
      const customerPhone = String(args.customerPhone ?? "");
      const items = (Array.isArray(args.items) ? args.items : []) as OrderItem[];
      const fulfillment = args.fulfillment === "delivery" ? "delivery" : "pickup";
      const address = typeof args.address === "string" ? args.address : null;
      const notes = typeof args.notes === "string" ? args.notes : null;

      await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "order",
          customerName,
          customerPhone,
          notes,
          metadata: { items, fulfillment, address },
        },
      });

      return "Commande enregistrée.";
    }

    case "transfer_call": {
      const reason = String(args.reason ?? "");
      const rules = asRuleRows(context.configuration.callRouting);
      const target = rules.find((r) => r.trigger === reason)?.target;
      if (!target) {
        return "Aucun numéro de transfert n'est configuré pour ce motif — propose de prendre un message à la place.";
      }
      if (!context.callId) {
        // Mode texte (scripts/test-voice-agent.ts) : pas d'appel réel à
        // transférer, on se contente de confirmer la résolution du motif.
        return `Transfert simulé vers ${target} (motif : « ${reason} »).`;
      }
      try {
        await getOpenAIClient().realtime.calls.refer(context.callId, { target_uri: `tel:${target}` });
        return `Appel transféré vers ${target}.`;
      } catch {
        return "Le transfert a échoué — propose de prendre un message à la place.";
      }
    }

    case "take_message": {
      const customerName = String(args.customerName ?? "");
      const customerPhone = String(args.customerPhone ?? "");
      const reason = typeof args.reason === "string" ? args.reason : null;

      await db.booking.create({
        data: {
          clientServiceId: context.clientServiceId,
          kind: "message",
          customerName,
          customerPhone,
          notes: reason,
        },
      });

      return "Message enregistré, l'entreprise rappellera.";
    }

    default:
      return `Tool inconnu : ${name}.`;
  }
}
