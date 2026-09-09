// Description unique des variables d'environnement, et vérification au
// démarrage.
//
// Deux niveaux, volontairement distincts — c'est tout l'enjeu du ticket #7 :
//
// - Les variables *requises* sont celles sans lesquelles l'application ne
//   fonctionne pas du tout. Leur absence interrompt le démarrage avec un
//   message qui les nomme toutes d'un coup. C'est le cas de
//   BETTER_AUTH_SECRET, resté à sa valeur par défaut en production, qui ne se
//   manifestait qu'au premier appel authentifié.
//
// - Les variables *par fonctionnalité* ne concernent qu'une intégration. Leur
//   absence désactive cette intégration et rien d'autre : on l'annonce au
//   démarrage, sans interrompre quoi que ce soit. Faire échouer le démarrage
//   là-dessus reproduirait le plantage de build qu'OPENAI_API_KEY provoquait,
//   loin de sa cause.
//
// Le cas vraiment coûteux n'est ni l'un ni l'autre : c'est le groupe à moitié
// rempli. Une intégration dont il manque une variable sur quatre se croit
// active et échoue à l'usage, chez un client. inspectEnv le signale à part.

type Rule = {
  name: string;
  /** Message montré quand la valeur est présente mais inutilisable. */
  validate?: (value: string) => string | null;
};

// Requises dans tous les environnements : elles figurent aussi bien dans .env
// en local que dans la CI et sur Vercel. Une valeur manquante ici n'est jamais
// un choix, c'est un oubli.
export const REQUIRED: Rule[] = [
  {
    name: "DATABASE_URL",
    validate: (v) =>
      /^postgres(ql)?:\/\//.test(v)
        ? null
        : "doit être une URL PostgreSQL (postgres:// ou postgresql://)",
  },
  {
    name: "BETTER_AUTH_SECRET",
    validate: (v) =>
      v.length < 32
        ? `fait ${v.length} caractères, il en faut au moins 32 — une clé courte affaiblit la signature des sessions`
        : null,
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    // Le slash final a déjà cassé la validation de signature Twilio : l'URL
    // reconstruite ne correspondait plus à celle appelée (voir src/lib/twilio.ts).
    validate: (v) => {
      if (!/^https?:\/\//.test(v)) return "doit commencer par http:// ou https://";
      if (v.endsWith("/")) return "ne doit pas se terminer par un slash";
      return null;
    },
  },
  {
    name: "STRIPE_SECRET_KEY",
    validate: (v) => (v.startsWith("sk_") ? null : "doit commencer par sk_"),
  },
  { name: "STRIPE_WEBHOOK_SECRET" },
];

export type FeatureGroup = {
  /** Nom lisible, tel qu'il apparaît dans les messages de démarrage. */
  feature: string;
  vars: string[];
};

// Chaque groupe correspond à une intégration entière : ou bien on l'a
// configurée, ou bien on ne s'en sert pas encore.
export const FEATURES: FeatureGroup[] = [
  {
    feature: "Agent vocal IA (standard téléphonique)",
    vars: ["OPENAI_API_KEY", "OPENAI_SIP_URI", "OPENAI_WEBHOOK_SECRET"],
  },
  {
    feature: "Téléphonie Twilio (achat et routage des numéros)",
    vars: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_API_KEY_SID",
      "TWILIO_API_KEY_SECRET",
    ],
  },
  {
    feature: "Agenda Google (prise de rendez-vous)",
    vars: [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_OAUTH_REDIRECT_URI",
      "GOOGLE_OAUTH_STATE_SECRET",
    ],
  },
  {
    feature: "Messagerie Meta (WhatsApp et Messenger)",
    vars: [
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
      "NEXT_PUBLIC_META_APP_ID",
      "NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID",
      "NEXT_PUBLIC_META_MESSENGER_CONFIG_ID",
    ],
  },
  {
    feature: "Messagerie Instagram",
    vars: [
      "INSTAGRAM_APP_ID",
      "INSTAGRAM_APP_SECRET",
      "INSTAGRAM_OAUTH_REDIRECT_URI",
      "INSTAGRAM_OAUTH_STATE_SECRET",
    ],
  },
  {
    feature: "E-mails transactionnels (Resend)",
    vars: ["RESEND_API_KEY"],
  },
  {
    feature: "Limitation de débit répartie (Upstash Redis)",
    vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  },
  {
    feature: "Relevé d'usage des prestations",
    vars: ["USAGE_EVENTS_API_KEY"],
  },
];

export type EnvReport = {
  /** Requises absentes, ou présentes avec une valeur inutilisable. */
  problems: string[];
  /** Groupes entièrement configurés. */
  enabled: string[];
  /** Groupes entièrement vides — l'intégration n'est simplement pas branchée. */
  disabled: string[];
  /** Groupes partiellement remplis : la configuration a été commencée puis laissée en plan. */
  incomplete: { feature: string; missing: string[] }[];
};

type Source = Record<string, string | undefined>;

// Une variable vide vaut absente : sur Vercel comme dans un .env, une valeur
// effacée laisse souvent la clé derrière elle.
function read(source: Source, name: string): string | null {
  const value = source[name];
  return value && value.trim() !== "" ? value : null;
}

export function inspectEnv(source: Source): EnvReport {
  const problems: string[] = [];
  for (const rule of REQUIRED) {
    const value = read(source, rule.name);
    if (value === null) {
      problems.push(`${rule.name} est manquante`);
      continue;
    }
    const invalid = rule.validate?.(value);
    if (invalid) problems.push(`${rule.name} ${invalid}`);
  }

  const enabled: string[] = [];
  const disabled: string[] = [];
  const incomplete: { feature: string; missing: string[] }[] = [];

  for (const group of FEATURES) {
    const missing = group.vars.filter((name) => read(source, name) === null);
    if (missing.length === 0) enabled.push(group.feature);
    else if (missing.length === group.vars.length) disabled.push(group.feature);
    else incomplete.push({ feature: group.feature, missing });
  }

  return { problems, enabled, disabled, incomplete };
}

export function formatProblems(report: EnvReport): string {
  return [
    `Configuration incomplète : ${report.problems.length} variable(s) d'environnement requise(s) inutilisable(s).`,
    ...report.problems.map((p) => `  - ${p}`),
    "",
    "Renseignez-les dans .env en local, ou dans Settings > Environment Variables sur Vercel.",
  ].join("\n");
}

// Appelée une fois au démarrage du serveur (voir src/instrumentation.ts).
export function checkEnvAtBoot(source: Source = process.env): void {
  const report = inspectEnv(source);

  for (const { feature, missing } of report.incomplete) {
    console.warn(
      `[env] ${feature} : configuration incomplète, il manque ${missing.join(", ")}. ` +
        `L'intégration se croira active et échouera à l'usage.`
    );
  }

  if (report.disabled.length > 0) {
    console.info(`[env] Intégrations non configurées : ${report.disabled.join(" · ")}`);
  }

  if (report.problems.length > 0) {
    throw new Error(formatProblems(report));
  }
}

// Lecture ponctuelle, au moment où une intégration s'en sert — le seul endroit
// où l'on sait quelle fonctionnalité est concernée, et donc où l'on peut le
// dire. Remplace les copies locales qui vivaient dans google-calendar.ts et
// instagram.ts.
export function requireEnv(name: string, feature?: string): string {
  const value = read(process.env, name);
  if (value === null) {
    throw new Error(
      feature
        ? `${name} manquante — ${feature} ne peut pas fonctionner sans elle.`
        : `${name} manquante.`
    );
  }
  return value;
}
