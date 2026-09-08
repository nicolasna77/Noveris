import { describe, expect, it } from "vitest";
import { isNotificationEnabled, parsePreferences } from "./preferences";

// La règle centrale : une clé absente vaut « activée ». Un compte créé
// avant l'ajout d'un type de notification doit continuer à le recevoir,
// sans quoi une nouvelle notification n'atteindrait aucun compte existant.
describe("isNotificationEnabled", () => {
  it("active par défaut un type jamais choisi", () => {
    expect(isNotificationEnabled({}, "SERVICE_ACTIVATED")).toBe(true);
  });

  it("respecte une désactivation explicite", () => {
    expect(isNotificationEnabled({ SERVICE_ACTIVATED: false }, "SERVICE_ACTIVATED")).toBe(false);
  });

  it("ne laisse pas la désactivation d'un type en couper un autre", () => {
    const preferences = { SERVICE_ACTIVATED: false };
    expect(isNotificationEnabled(preferences, "HELP_REQUEST_REPLY")).toBe(true);
  });

  // Le champ vient d'une colonne Json : il peut valoir null ou contenir
  // n'importe quoi si quelqu'un l'édite à la main.
  it("reste permissif face à une valeur inexploitable", () => {
    expect(isNotificationEnabled(null, "SERVICE_ACTIVATED")).toBe(true);
    expect(isNotificationEnabled("pas un objet", "SERVICE_ACTIVATED")).toBe(true);
    expect(isNotificationEnabled(undefined, "SERVICE_ACTIVATED")).toBe(true);
  });

  it("ne considère désactivé que le booléen false, pas une valeur falsy", () => {
    expect(isNotificationEnabled({ SERVICE_ACTIVATED: 0 }, "SERVICE_ACTIVATED")).toBe(true);
    expect(isNotificationEnabled({ SERVICE_ACTIVATED: null }, "SERVICE_ACTIVATED")).toBe(true);
  });
});

describe("parsePreferences", () => {
  it("ne retient que les désactivations", () => {
    expect(
      parsePreferences({ SERVICE_ACTIVATED: false, SERVICE_CANCELED: true })
    ).toEqual({ SERVICE_ACTIVATED: false });
  });

  it("ignore les clés qui ne sont pas des types connus", () => {
    expect(parsePreferences({ TYPE_INEXISTANT: false })).toEqual({});
  });

  it("renvoie un objet vide pour une valeur inexploitable", () => {
    expect(parsePreferences(null)).toEqual({});
    expect(parsePreferences("pas un objet")).toEqual({});
  });
});
