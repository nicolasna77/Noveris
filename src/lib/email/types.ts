// Types de notification que le client peut désactiver individuellement
// depuis /dashboard/profile — voir src/lib/email/preferences.ts et
// User.notificationPreferences dans prisma/schema.prisma. Les notifications
// internes à l'équipe Noveris (nouvelle demande d'aide, message de contact)
// n'en font pas partie : il n'y a pas de préférence client à vérifier.
export const NOTIFICATION_TYPES = [
  "HELP_REQUEST_RESOLVED",
  "SERVICE_ACTIVATED",
  "SERVICE_NOTE_ADDED",
  "SERVICE_CANCELED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  HELP_REQUEST_RESOLVED: "Réponse à une demande d'aide",
  SERVICE_ACTIVATED: "Activation d'une prestation",
  SERVICE_NOTE_ADDED: "Note ajoutée par l'équipe",
  SERVICE_CANCELED: "Confirmation de résiliation",
};

export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  HELP_REQUEST_RESOLVED:
    "Quand l'équipe Noveris marque votre demande d'aide comme traitée.",
  SERVICE_ACTIVATED: "Quand une prestation payée devient active.",
  SERVICE_NOTE_ADDED: "Quand l'équipe ajoute une note sur une de vos prestations.",
  SERVICE_CANCELED: "Confirmation quand vous résiliez vous-même une prestation.",
};
