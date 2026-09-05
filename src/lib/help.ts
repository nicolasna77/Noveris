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

export type HelpRequestDTO = {
  id: string;
  subject: string;
  message: string;
  status: HelpRequestStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  service: { clientServiceId: string; name: string } | null;
};
