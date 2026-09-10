import { describe, expect, it } from "vitest";
import {
  findMissingRequiredField,
  formatCents,
  formatPrice,
  isFieldVisible,
  needsCalendarConnection,
  needsFacebookConnection,
  needsInstagramConnection,
  needsPhoneNumber,
  needsWhatsAppConnection,
  type ConfigField,
} from "./catalog";

describe("formatCents", () => {
  it("n'affiche pas de décimales inutiles", () => {
    expect(formatCents(9000)).toBe("90 €");
  });

  it("garde les centimes quand il y en a", () => {
    expect(formatCents(7950)).toBe("79,50 €");
  });

  it("gère la gratuité", () => {
    expect(formatCents(0)).toBe("0 €");
  });
});

describe("formatPrice", () => {
  it("compose les deux lignes du modèle hybride", () => {
    expect(formatPrice(90000, 7900)).toBe("900 € + 79 €/mois");
  });

  it("n'affiche que l'abonnement quand il n'y a pas de frais de mise en place", () => {
    expect(formatPrice(null, 5900)).toBe("59 €/mois");
  });

  it("n'affiche que la mise en place quand il n'y a pas d'abonnement", () => {
    expect(formatPrice(45000, null)).toBe("450 €");
  });

  it("renvoie un tiret quand aucun prix n'est défini", () => {
    expect(formatPrice(null, null)).toBe("—");
  });
});

const deployable = {
  status: "ACTIVE" as const,
  externalPhoneNumber: null,
  calendarConnected: false,
  whatsappConnected: false,
  facebookConnected: false,
  instagramConnected: false,
  configuration: {},
  service: { slug: "standard-telephonique-ia" },
};

describe("étapes de mise en service restantes", () => {
  it("réclame un numéro pour une prestation de téléphonie sans numéro", () => {
    expect(needsPhoneNumber(deployable)).toBe(true);
  });

  it("ne réclame plus rien une fois le numéro attribué", () => {
    expect(
      needsPhoneNumber({ ...deployable, externalPhoneNumber: "+33123456789" })
    ).toBe(false);
  });

  it("ne réclame pas de numéro pour une prestation qui n'est pas téléphonique", () => {
    expect(
      needsPhoneNumber({ ...deployable, service: { slug: "assistant-whatsapp" } })
    ).toBe(false);
  });

  it("ne réclame rien tant que la prestation n'est pas payée", () => {
    expect(needsPhoneNumber({ ...deployable, status: "PENDING_PAYMENT" })).toBe(false);
  });

  it("ne réclame rien sur une prestation résiliée", () => {
    expect(needsPhoneNumber({ ...deployable, status: "CANCELED" })).toBe(false);
  });

  it("réclame l'agenda uniquement si la prise de rendez-vous est un objectif", () => {
    const withAppointments = {
      ...deployable,
      service: { slug: "prise-rdv-telephone" },
      configuration: { objectives: ["appointment"] },
    };
    expect(needsCalendarConnection(withAppointments)).toBe(true);
    expect(
      needsCalendarConnection({ ...withAppointments, configuration: { objectives: ["order"] } })
    ).toBe(false);
  });

  it("réclame la connexion du canal correspondant, et d'aucun autre", () => {
    const whatsapp = { ...deployable, service: { slug: "assistant-whatsapp" } };
    expect(needsWhatsAppConnection(whatsapp)).toBe(true);
    expect(needsFacebookConnection(whatsapp)).toBe(false);
    expect(needsInstagramConnection(whatsapp)).toBe(false);

    const instagram = { ...deployable, service: { slug: "assistant-instagram" } };
    expect(needsInstagramConnection(instagram)).toBe(true);
    expect(needsInstagramConnection({ ...instagram, instagramConnected: true })).toBe(false);
  });
});

describe("visibilité conditionnelle d'un champ", () => {
  const field: ConfigField = {
    key: "deliveryZone",
    label: "Zone de livraison",
    type: "text",
    showIf: { key: "objectives", includes: "order" },
  };

  it("est visible quand la valeur attendue est présente dans une liste", () => {
    expect(isFieldVisible(field, { objectives: ["appointment", "order"] })).toBe(true);
  });

  it("est masqué quand la liste ne contient pas la valeur", () => {
    expect(isFieldVisible(field, { objectives: ["appointment"] })).toBe(false);
  });

  it("accepte aussi une valeur simple, pas seulement une liste", () => {
    expect(isFieldVisible(field, { objectives: "order" })).toBe(true);
  });

  it("est toujours visible sans condition", () => {
    expect(isFieldVisible({ key: "faq", label: "FAQ", type: "textarea" }, {})).toBe(true);
  });
});

describe("champs obligatoires manquants", () => {
  const fields: ConfigField[] = [
    { key: "phoneLine", label: "Ligne", type: "tel", required: true },
    {
      key: "deliveryZone",
      label: "Zone de livraison",
      type: "text",
      required: true,
      showIf: { key: "objectives", includes: "order" },
    },
  ];

  it("signale un champ requis vide", () => {
    expect(findMissingRequiredField(fields, {})?.key).toBe("phoneLine");
  });

  it("traite une chaîne d'espaces comme vide", () => {
    expect(findMissingRequiredField(fields, { phoneLine: "   " })?.key).toBe("phoneLine");
  });

  it("ignore un champ requis que sa condition rend invisible", () => {
    expect(findMissingRequiredField(fields, { phoneLine: "+33123456789" })).toBeUndefined();
  });

  it("le réclame dès que sa condition est remplie", () => {
    expect(
      findMissingRequiredField(fields, {
        phoneLine: "+33123456789",
        objectives: ["order"],
      })?.key
    ).toBe("deliveryZone");
  });
});
