// Types et libellés partagés du catalogue (utilisables côté client et serveur
// sans importer @prisma/client).

export type ServiceCategory =
  | "COMMUNICATION"
  | "ADMINISTRATION"
  | "INFORMATION"
  | "ABONNEMENT";

export type ClientServiceStatus =
  | "PENDING_PAYMENT"
  | "CONFIGURING"
  | "ACTIVE"
  | "CANCELED";

// Prestations qui reçoivent de vrais appels téléphoniques IA — la seule
// source de vérité pour ce qui est "une prestation de téléphonie" (achat de
// numéro, widget d'appels en direct, compteur d'usage, agenda). Auparavant
// dupliqué indépendamment dans 4 fichiers (dashboard/actions.ts,
// admin/clients-section.tsx, dashboard/my-services.tsx,
// dashboard/service-detail-table.tsx) — un nouveau service téléphonique
// n'aurait mis à jour que celui qu'on pensait à modifier.
export const TELEPHONY_SERVICE_SLUGS = new Set([
  "prise-rdv-telephone",
  "standard-telephonique-ia",
]);

// Même raison que TELEPHONY_SERVICE_SLUGS ci-dessus — utilisé partout où le
// code a besoin de savoir "est-ce la prestation WhatsApp/Facebook/Instagram"
// (admin, tableau de bord, prompt de l'agent). Trois prestations distinctes
// (pas une seule "réseaux sociaux") : un client peut vouloir l'une sans les
// autres, avec des tarifs et des connexions Meta indépendantes.
export const WHATSAPP_SERVICE_SLUG = "assistant-whatsapp";
export const FACEBOOK_SERVICE_SLUG = "assistant-facebook";
export const INSTAGRAM_SERVICE_SLUG = "assistant-instagram";

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEK_DAYS: WeekDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

export type WeeklyHours = Record<
  WeekDay,
  { closed: boolean; open: string; close: string }
>;

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = WEEK_DAYS.reduce(
  (acc, day) => {
    acc[day] = { closed: true, open: "09:00", close: "18:00" };
    return acc;
  },
  {} as WeeklyHours
);

export type RuleRow = { trigger: string; target: string };

// Valeur d'un champ de configuration : simple pour les champs classiques,
// structurée pour les sélecteurs d'horaires et listes de règles réutilisables
// (voir section 12 du cahier des charges).
export type ConfigValue = string | string[] | WeeklyHours | RuleRow[];
export type Configuration = Record<string, ConfigValue>;

export type ConfigField = {
  key: string;
  label: string;
  type:
    | "text"
    | "tel"
    | "email"
    | "url"
    | "textarea"
    | "select"
    | "tags"
    | "multiselect"
    | "date"
    | "weekly-hours"
    | "rules-list"
    | "file-link"
    | "consent"
    | "connection";
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  // "select" | "multiselect"
  options?: { value: string; label: string }[];
  // Regroupe visuellement les champs dans le formulaire (ex. "Entreprise").
  // Les champs sans section tombent dans un groupe générique commun.
  section?: string;
  // Affichage conditionnel : le champ n'apparaît que si le champ visé par
  // `key` vaut (ou contient, pour tags/multiselect) `includes`.
  showIf?: { key: string; includes: string };
};

export const CATEGORY_ORDER: ServiceCategory[] = [
  "COMMUNICATION",
  "ADMINISTRATION",
  "INFORMATION",
  "ABONNEMENT",
];

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  COMMUNICATION: "Communication client automatisée",
  ADMINISTRATION: "Administration automatisée",
  INFORMATION: "Traitement de l'information",
  ABONNEMENT: "Abonnement",
};

export const CATEGORY_DESCRIPTIONS: Record<ServiceCategory, string> = {
  COMMUNICATION:
    "Vos clients obtiennent une réponse immédiate, sur tous vos canaux, sans mobiliser votre temps.",
  ADMINISTRATION:
    "Devis, factures, contrats, relances : vos documents administratifs se génèrent et se suivent tout seuls.",
  INFORMATION:
    "Vos documents et réunions sont lus, résumés et classés automatiquement.",
  ABONNEMENT:
    "Un suivi continu pour que vos automatisations restent performantes dans la durée.",
};

export const STATUS_LABELS: Record<ClientServiceStatus, string> = {
  PENDING_PAYMENT: "Paiement en cours",
  CONFIGURING: "En configuration",
  ACTIVE: "Actif",
  CANCELED: "Résilié",
};

// Frais de mise en place (ponctuel) et/ou abonnement mensuel, indépendamment
// optionnels — au moins un des deux est renseigné.
export function formatPrice(
  setupFeeCents: number | null,
  monthlyPriceCents: number | null
): string {
  const parts: string[] = [];
  if (setupFeeCents !== null) parts.push(formatCents(setupFeeCents));
  if (monthlyPriceCents !== null) parts.push(`${formatCents(monthlyPriceCents)}/mois`);
  return parts.join(" + ") || "—";
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + " €";
}

// Forme sérialisable d'un Service pour les composants client.
export type ServiceDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ServiceCategory;
  setupFeeCents: number | null;
  monthlyPriceCents: number | null;
  usageCapLabel: string | null;
  configFields: ConfigField[];
  sortOrder: number;
};

// Rendez-vous ou commande pris par l'agent vocal IA — voir Booking dans
// prisma/schema.prisma.
export type BookingDTO = {
  id: string;
  kind: string;
  customerName: string;
  customerPhone: string;
  startAt: Date | null;
  endAt: Date | null;
  googleEventId: string | null;
  notes: string | null;
  createdAt: Date;
};

// Historique d'une prestation (voir ServiceEvent dans prisma/schema.prisma) —
// écrit à chaque transition plutôt que de ne garder que le dernier état, pour
// que le client voie ce qui s'est passé et pas seulement où il en est.
export type ServiceEventType =
  | "CREATED"
  | "PAYMENT_RECEIVED"
  | "ACTIVATED"
  | "NOTE_ADDED"
  | "PHONE_ASSIGNED"
  | "CALENDAR_CONNECTED"
  | "CALENDAR_DISCONNECTED"
  | "WHATSAPP_CONNECTED"
  | "WHATSAPP_DISCONNECTED"
  | "FACEBOOK_CONNECTED"
  | "FACEBOOK_DISCONNECTED"
  | "INSTAGRAM_CONNECTED"
  | "INSTAGRAM_DISCONNECTED"
  | "CONFIGURATION_UPDATED"
  | "CANCELED";

export const SERVICE_EVENT_LABELS: Record<ServiceEventType, string> = {
  CREATED: "Demande d'activation envoyée",
  PAYMENT_RECEIVED: "Paiement reçu",
  ACTIVATED: "Solution vérifiée et activée",
  NOTE_ADDED: "Note de l'équipe Noveris",
  PHONE_ASSIGNED: "Numéro de téléphone attribué",
  CALENDAR_CONNECTED: "Agenda Google connecté",
  CALENDAR_DISCONNECTED: "Agenda Google déconnecté",
  WHATSAPP_CONNECTED: "Compte WhatsApp connecté",
  WHATSAPP_DISCONNECTED: "Compte WhatsApp déconnecté",
  FACEBOOK_CONNECTED: "Page Facebook connectée",
  FACEBOOK_DISCONNECTED: "Page Facebook déconnectée",
  INSTAGRAM_CONNECTED: "Compte Instagram connecté",
  INSTAGRAM_DISCONNECTED: "Compte Instagram déconnecté",
  CONFIGURATION_UPDATED: "Configuration mise à jour",
  CANCELED: "Solution résiliée",
};

export type ServiceEventDTO = {
  id: string;
  type: ServiceEventType;
  message: string | null;
  createdAt: Date;
};

// Prestation souscrite par le client courant (jointure ClientService + Service),
// utilisée pour la section « Mes prestations » du tableau de bord.
export type MyServiceDTO = {
  clientServiceId: string;
  // Nom donné par le client à cette activation (distinct de service.name dès
  // qu'il active la même prestation plusieurs fois — ex. deux boutiques).
  name: string;
  status: ClientServiceStatus;
  configuration: Configuration;
  adminNote: string | null;
  createdAt: Date;
  activatedAt: Date | null;
  canceledAt: Date | null;
  externalPhoneNumber: string | null;
  calendarConnected: boolean;
  whatsappConnected: boolean;
  whatsappDisplayNumber: string | null;
  facebookConnected: boolean;
  facebookPageName: string | null;
  instagramConnected: boolean;
  instagramUsername: string | null;
  bookings: BookingDTO[];
  events: ServiceEventDTO[];
  service: ServiceDTO;
};

// Représentation textuelle d'une valeur de configuration, tous types
// confondus — utilisée pour l'affichage en lecture seule (le formulaire
// d'édition ne gère pour l'instant que les champs texte simples).
export function formatConfigValue(value: ConfigValue): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (typeof value[0] === "string") return (value as string[]).join(", ");
    return (value as RuleRow[])
      .map((rule) => `${rule.trigger} → ${rule.target}`)
      .join(" · ");
  }
  const openDays = WEEK_DAYS.filter((day) => !value[day].closed).map(
    (day) => `${WEEK_DAY_LABELS[day]} ${value[day].open}–${value[day].close}`
  );
  return openDays.length > 0 ? openDays.join(" · ") : "Fermé toute la semaine";
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Résume l'état courant d'une prestation en une phrase — partagé par la
// carte "Mes prestations" (my-service-row.tsx) et l'en-tête de sa page
// détail, pour ne pas maintenir deux fois le même embranchement par statut.
export function describeServiceStatus(item: {
  status: ClientServiceStatus;
  createdAt: Date;
  activatedAt: Date | null;
  canceledAt: Date | null;
}): string {
  switch (item.status) {
    case "ACTIVE":
      return item.activatedAt
        ? `Actif depuis le ${formatDate(item.activatedAt)}`
        : "Actif";
    case "PENDING_PAYMENT":
      return `En attente de paiement depuis le ${formatDate(item.createdAt)}`;
    case "CONFIGURING":
      return "Paiement confirmé — en cours de déploiement par l'équipe Noveris";
    case "CANCELED":
      return item.canceledAt ? `Résilié le ${formatDate(item.canceledAt)}` : "Résilié";
  }
}

// Étapes de mise en service encore à la charge du client. Une même source
// pour la carte de la liste (my-service-row.tsx), qui signale qu'il reste
// quelque chose à faire, et la carte « Mise en service » de la page détail
// (service-setup-card.tsx), qui porte l'action correspondante — sinon les
// deux finiraient par ne plus dire la même chose.
type SetupSubject = {
  status: ClientServiceStatus;
  externalPhoneNumber: string | null;
  calendarConnected: boolean;
  whatsappConnected: boolean;
  facebookConnected: boolean;
  instagramConnected: boolean;
  configuration: Configuration;
  service: { slug: string };
};

function isDeployable(status: ClientServiceStatus): boolean {
  return status === "ACTIVE" || status === "CONFIGURING";
}

// Une prestation de téléphonie sans numéro ne peut tout simplement pas
// décrocher : c'est bloquant, pas un réglage optionnel.
export function needsPhoneNumber(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    TELEPHONY_SERVICE_SLUGS.has(item.service.slug) &&
    !item.externalPhoneNumber
  );
}

export function needsCalendarConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    asStringArray(item.configuration.objectives).includes("appointment") &&
    !item.calendarConnected
  );
}

// Une prestation WhatsApp sans compte connecté ne peut recevoir ni répondre
// à aucun message — même statut "bloquant" que needsPhoneNumber ci-dessus.
export function needsWhatsAppConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    item.service.slug === WHATSAPP_SERVICE_SLUG &&
    !item.whatsappConnected
  );
}

export function needsFacebookConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    item.service.slug === FACEBOOK_SERVICE_SLUG &&
    !item.facebookConnected
  );
}

export function needsInstagramConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    item.service.slug === INSTAGRAM_SERVICE_SLUG &&
    !item.instagramConnected
  );
}

// Ramène une valeur de configuration à un tableau de chaînes (ex. un champ
// "multiselect" comme objectives/appointmentTypes) — [] pour toute autre
// forme. Partagé par src/lib/voice-agent/prompt.ts et tools.ts, qui lisent
// tous deux ce genre de champ depuis la même Configuration.
export function asStringArray(value: ConfigValue | undefined): string[] {
  return Array.isArray(value) && (value.length === 0 || typeof value[0] === "string")
    ? (value as string[])
    : [];
}

// Un champ ne s'affiche que si le champ visé par `showIf` contient (ou vaut)
// la valeur attendue — ex. les champs propres à la prise de rendez-vous ne
// s'affichent que si "objectives" contient "appointment". Partagé entre le
// formulaire client (config-fields.tsx) et la validation serveur
// (dashboard/actions.ts) : un champ masqué par showIf ne doit jamais être
// exigé côté serveur alors qu'il ne peut pas être rempli côté client.
export function isFieldVisible(field: ConfigField, values: Configuration): boolean {
  if (!field.showIf) return true;
  const target = values[field.showIf.key];
  if (Array.isArray(target)) {
    return (target as unknown[]).includes(field.showIf.includes);
  }
  return target === field.showIf.includes;
}

export function isFieldEmpty(field: ConfigField, values: Configuration): boolean {
  const value = values[field.key];
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return !value;
}

export function findMissingRequiredField(
  fields: ConfigField[],
  values: Configuration
) {
  return fields.find(
    (field) =>
      field.required &&
      isFieldVisible(field, values) &&
      isFieldEmpty(field, values)
  );
}
