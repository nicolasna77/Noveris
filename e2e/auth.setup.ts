import { test as setup, expect } from "@playwright/test";
import { CLIENT, ADMIN, CLIENT_STATE, ADMIN_STATE } from "./roles";

// Se connecter une fois pour toutes, plutôt qu'au début de chaque test.
//
// Chaque connexion coûtait trois chargements de page, et la quinzaine de
// connexions redondantes saturait le serveur de test dès que Playwright
// lançait plusieurs workers : la suite échouait en timeout alors que chaque
// fichier passait isolément. L'état d'authentification est enregistré ici,
// et chaque test en reçoit une copie fraîche — un test peut donc se
// déconnecter sans gêner les autres.
//
// Le parcours de connexion lui-même reste exercé à travers l'interface, dans
// dashboard.spec.ts : c'est ici qu'il l'est, une fois, en conditions réelles.

setup("authentifier un client", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CLIENT.email);
  await page.getByLabel("Mot de passe").fill(CLIENT.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.context().storageState({ path: CLIENT_STATE });
});

setup("authentifier un admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Mot de passe").fill(ADMIN.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/admin");
  // Un compte sans le rôle ADMIN atterrirait sur /dashboard : la
  // redirection ci-dessus est déjà la preuve du rôle, on la rend explicite.
  await expect(page).toHaveURL(/\/admin/);
  await page.context().storageState({ path: ADMIN_STATE });
});
