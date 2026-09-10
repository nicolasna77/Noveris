import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateMetaSignature, verifyMetaWebhookChallenge } from "./meta";

const APP_SECRET = "un-secret-d-application-meta";

function sign(body: string, secret = APP_SECRET): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf-8").digest("hex");
}

describe("validateMetaSignature", () => {
  const body = JSON.stringify({ entry: [{ id: "123" }] });

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
  });

  afterEach(() => {
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it("accepte une signature calculée avec le bon secret", () => {
    expect(validateMetaSignature(sign(body), body)).toBe(true);
  });

  it("rejette une signature calculée avec un autre secret", () => {
    expect(validateMetaSignature(sign(body, "mauvais-secret"), body)).toBe(false);
  });

  it("rejette un corps altéré après signature", () => {
    const signature = sign(body);
    expect(validateMetaSignature(signature, body.replace("123", "456"))).toBe(false);
  });

  it("rejette une signature sans son préfixe d'algorithme", () => {
    const hex = sign(body).slice("sha256=".length);
    expect(validateMetaSignature(hex, body)).toBe(false);
  });

  it("rejette un algorithme différent de sha256", () => {
    const hex = sign(body).slice("sha256=".length);
    expect(validateMetaSignature(`sha1=${hex}`, body)).toBe(false);
  });

  it("rejette une signature tronquée", () => {
    expect(validateMetaSignature(sign(body).slice(0, 20), body)).toBe(false);
  });

  it("rejette une requête sans en-tête de signature", () => {
    expect(validateMetaSignature(null, body)).toBe(false);
  });

  it("rejette tout quand le secret n'est pas configuré", () => {
    delete process.env.WHATSAPP_APP_SECRET;
    expect(validateMetaSignature(sign(body), body)).toBe(false);
  });
});

describe("verifyMetaWebhookChallenge", () => {
  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "jeton-de-verification";
  });

  afterEach(() => {
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  });

  it("accepte le bon mode et le bon jeton", () => {
    expect(verifyMetaWebhookChallenge("subscribe", "jeton-de-verification")).toBe(true);
  });

  it("refuse un jeton qui ne correspond pas", () => {
    expect(verifyMetaWebhookChallenge("subscribe", "autre-jeton")).toBe(false);
  });

  it("refuse un mode différent de subscribe", () => {
    expect(verifyMetaWebhookChallenge("unsubscribe", "jeton-de-verification")).toBe(false);
  });

  it("refuse une requête sans jeton", () => {
    expect(verifyMetaWebhookChallenge("subscribe", null)).toBe(false);
  });

  it("refuse quand le jeton n'est pas configuré", () => {
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    expect(verifyMetaWebhookChallenge("subscribe", null)).toBe(false);
  });
});
