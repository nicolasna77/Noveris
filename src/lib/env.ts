type Rule = {
  name: string;
  validate?: (value: string) => string | null;
};

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
  feature: string;
  vars: string[];
};

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
  problems: string[];
  enabled: string[];
  disabled: string[];
  incomplete: { feature: string; missing: string[] }[];
};

type Source = Record<string, string | undefined>;

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
