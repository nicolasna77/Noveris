import { expect, test, type Page } from "@playwright/test";

// Compte de démonstration créé par prisma/seed.ts.
const CLIENT = { email: "marc.lefevre@example.com", password: "password123" };

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CLIENT.email);
  await page.getByLabel("Mot de passe").fill(CLIENT.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

test("un client se connecte et atterrit sur son tableau de bord", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

// Ce parcours existe pour une raison précise : le panneau de notifications
// ne se monte qu'au clic, dans un portail. Il a été livré cassé — une
// erreur de contexte Base UI — sans que le typecheck, le lint ni le rendu
// serveur puissent le voir.
test("le panneau de notifications s'ouvre", async ({ page }) => {
  await signIn(page);

  await page.getByRole("button", { name: /^Notifications/ }).click();

  const panel = page.getByRole("menu");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Notifications")).toBeVisible();
});

test("un client se déconnecte et retrouve le site public", async ({ page }) => {
  await signIn(page);

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();

  await page.waitForURL("/");
  // Le point sensible du passage à une navigation côté client : l'écran
  // d'arrivée ne doit pas rester sur l'état connecté.
  await expect(page.getByRole("link", { name: "Créer mon compte" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu utilisateur" })).toHaveCount(0);
});
