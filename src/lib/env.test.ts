import { describe, expect, it } from "vitest";
import { checkEnvAtBoot, inspectEnv } from "./env";

// Un environnement minimal valide, dont chaque test ne casse qu'une pièce.
function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: "postgresql://noveris:secret@localhost:5432/noveris",
    BETTER_AUTH_SECRET: "x".repeat(32),
    NEXT_PUBLIC_APP_URL: "https://noveris.fr",
    STRIPE_SECRET_KEY: "sk_test_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_abc",
    ...overrides,
  };
}

describe("variables requises", () => {
  it("ne signale rien quand tout est en place", () => {
    expect(inspectEnv(validEnv()).problems).toEqual([]);
  });

  it("signale une variable absente", () => {
    const { problems } = inspectEnv(validEnv({ DATABASE_URL: undefined }));
    expect(problems).toEqual(["DATABASE_URL est manquante"]);
  });

  // Sur Vercel comme dans un .env, effacer une valeur laisse souvent la clé.
  it("traite une valeur vide comme absente", () => {
    expect(inspectEnv(validEnv({ DATABASE_URL: "   " })).problems).toEqual([
      "DATABASE_URL est manquante",
    ]);
  });

  it("refuse une URL de base de données qui n'est pas PostgreSQL", () => {
    const { problems } = inspectEnv(validEnv({ DATABASE_URL: "mysql://localhost/db" }));
    expect(problems[0]).toContain("DATABASE_URL");
    expect(problems[0]).toContain("PostgreSQL");
  });

  // L'incident à l'origine du ticket : un secret laissé à sa valeur par
  // défaut ne se manifestait qu'au premier appel authentifié, en production.
  it("refuse un secret d'authentification trop court", () => {
    const { problems } = inspectEnv(validEnv({ BETTER_AUTH_SECRET: "trop-court" }));
    expect(problems[0]).toContain("BETTER_AUTH_SECRET");
    expect(problems[0]).toContain("10 caractères");
  });

  // Ce slash a déjà cassé la validation de signature Twilio en production.
  it("refuse une URL d'application terminée par un slash", () => {
    const { problems } = inspectEnv(validEnv({ NEXT_PUBLIC_APP_URL: "https://noveris.fr/" }));
    expect(problems).toEqual(["NEXT_PUBLIC_APP_URL ne doit pas se terminer par un slash"]);
  });

  it("refuse une URL d'application sans protocole", () => {
    const { problems } = inspectEnv(validEnv({ NEXT_PUBLIC_APP_URL: "noveris.fr" }));
    expect(problems[0]).toContain("http://");
  });

  it("refuse une clé Stripe qui n'en est pas une", () => {
    const { problems } = inspectEnv(validEnv({ STRIPE_SECRET_KEY: "pk_test_abc" }));
    expect(problems).toEqual(["STRIPE_SECRET_KEY doit commencer par sk_"]);
  });

  // Le point de la vérification groupée : corriger une variable, redéployer,
  // découvrir la suivante, recommencer — c'est ce qu'on veut éviter.
  it("rapporte tous les problèmes d'un coup, pas seulement le premier", () => {
    const { problems } = inspectEnv({});
    expect(problems).toHaveLength(5);
  });
});

describe("groupes par fonctionnalité", () => {
  const messagerie = "Messagerie Instagram";
  const instagram = {
    INSTAGRAM_APP_ID: "id",
    INSTAGRAM_APP_SECRET: "secret",
    INSTAGRAM_OAUTH_REDIRECT_URI: "https://noveris.fr/api/instagram/callback",
    INSTAGRAM_OAUTH_STATE_SECRET: "state",
  };

  it("considère active une intégration entièrement configurée", () => {
    const report = inspectEnv(validEnv(instagram));
    expect(report.enabled).toContain(messagerie);
    expect(report.disabled).not.toContain(messagerie);
  });

  it("considère simplement non branchée une intégration entièrement vide", () => {
    const report = inspectEnv(validEnv());
    expect(report.disabled).toContain(messagerie);
    expect(report.incomplete).toEqual([]);
  });

  // Le cas coûteux : l'intégration se croit active et échoue chez un client.
  it("distingue une configuration commencée puis laissée en plan", () => {
    const report = inspectEnv(
      validEnv({ ...instagram, INSTAGRAM_APP_SECRET: undefined })
    );
    expect(report.enabled).not.toContain(messagerie);
    expect(report.disabled).not.toContain(messagerie);
    expect(report.incomplete).toEqual([
      { feature: messagerie, missing: ["INSTAGRAM_APP_SECRET"] },
    ]);
  });

  it("n'interrompt jamais le démarrage sur une intégration absente", () => {
    expect(() => checkEnvAtBoot(validEnv())).not.toThrow();
  });
});

describe("checkEnvAtBoot", () => {
  it("interrompt le démarrage en nommant chaque variable fautive", () => {
    expect(() => checkEnvAtBoot({ DATABASE_URL: "postgresql://localhost/db" })).toThrow(
      /BETTER_AUTH_SECRET[\s\S]*NEXT_PUBLIC_APP_URL[\s\S]*STRIPE_SECRET_KEY/
    );
  });

  it("indique où corriger", () => {
    expect(() => checkEnvAtBoot({})).toThrow(/\.env|Vercel/);
  });
});
