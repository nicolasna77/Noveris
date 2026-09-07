import type { HelpRequestStatus } from "@prisma/client";

export const HELP_REQUEST_STATUS_LABELS: Record<HelpRequestStatus, string> = {
  OPEN: "En attente",
  RESOLVED: "Traité",
};

// Prestation sélectionnable dans le formulaire du centre d'aide — le nom
// donné par le client à son activation, avec le nom de la prestation en
// complément quand il diffère (mêmes règles d'affichage que le reste du
// dashboard, voir my-service-row.tsx).
export type HelpRequestServiceOption = {
  clientServiceId: string;
  name: string;
  serviceName: string;
};

// Une réponse dans le fil d'une demande (voir HelpRequestMessage dans
// prisma/schema.prisma).
export type HelpRequestMessageDTO = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string;
  fromTeam: boolean;
};

export type HelpRequestDTO = {
  id: string;
  subject: string;
  message: string;
  status: HelpRequestStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  service: { clientServiceId: string; name: string } | null;
  messages: HelpRequestMessageDTO[];
};

// Mapping partagé par le centre d'aide client et l'espace admin — les deux
// affichent le même fil, seule la façon d'y répondre change.
export function toHelpRequestMessageDTOs(
  messages: {
    id: string;
    body: string;
    createdAt: Date;
    fromTeam: boolean;
    author: { name: string };
  }[]
): HelpRequestMessageDTO[] {
  return messages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt,
    authorName: m.author.name,
    fromTeam: m.fromTeam,
  }));
}
