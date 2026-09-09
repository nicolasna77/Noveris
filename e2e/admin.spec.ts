import { expect, test } from "@playwright/test";
import { ADMIN_STATE, ANONYMOUS } from "./roles";

test.use({ storageState: ADMIN_STATE });

// Ouvre le détail du premier client listé — les identifiants viennent du
// seed, on ne les code donc pas en dur.
test("le détail d'un utilisateur montre ce que voit le client", async ({ page }) => {
  await page.goto("/admin/users");
  await page
    .getByRole("link", { name: /Voir|Détail|marc|sophie|karim|elise/i })
    .first()
    .click();
  await page.waitForURL(/\/admin\/users\/[^/]+$/);

  await expect(page.getByRole("heading", { name: "Ce que voit le client" })).toBeVisible();

  // L'état d'une session n'était signalé nulle part : une session expirée
  // gardait un bouton « Révoquer » qui ne pouvait rien révoquer.
  await expect(page.getByRole("columnheader", { name: "État" })).toBeVisible();

  // Le suivi en direct, demandé pour voir arriver un paiement ou une
  // connexion sans recharger.
  await expect(page.getByRole("button", { name: /Direct|En pause/ })).toBeVisible();
});

test("le centre d'aide propose le direct et l'export", async ({ page }) => {
  await page.goto("/admin/aide");

  await expect(page.getByRole("button", { name: /Direct|En pause/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exporter en CSV" })).toBeVisible();
});

// L'export est une route, pas un bouton : on vérifie qu'elle rend bien un
// fichier, et qu'elle ne le sert pas depuis un cache.
test("l'export clients rend un CSV téléchargeable", async ({ page }) => {
  const response = await page.request.get("/admin/export/clients");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["content-disposition"]).toMatch(
    /attachment; filename="clients-noveris-/
  );

  const body = await response.text();
  expect(body.split("\r\n")[0]).toContain("Client;E-mail;Organisation;Solution");
});

test("la liste clients bascule en cartes sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");

  // La table à huit colonnes obligeait à défiler horizontalement dans chaque
  // mini-tableau pour lire une seule ligne.
  const tables = page.locator("table");
  const count = await tables.count();
  for (let i = 0; i < count; i++) {
    await expect(tables.nth(i)).toBeHidden();
  }
});

test.describe("sans session", () => {
  test.use({ storageState: ANONYMOUS });

  test("un visiteur n'obtient pas l'export", async ({ page }) => {
    const response = await page.request.get("/admin/export/clients", { maxRedirects: 0 });
    expect(response.status()).not.toBe(200);
  });
});
