import { expect, test, type Page } from "@playwright/test";

// Compte admin de démonstration créé par prisma/seed.ts.
const ADMIN = { email: "equipe@noveris.test", password: "password123" };

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Mot de passe").fill(ADMIN.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/admin");
}

test("le studio marketing s'ouvre et annonce ses sections", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/marketing");

  await expect(page.getByRole("heading", { level: 1, name: "Marketing" })).toBeVisible();

  // Les quatre étapes du parcours éditorial doivent toutes être annoncées
  // comme des titres : c'est ce qui rend la page parcourable au clavier et
  // au lecteur d'écran.
  for (const section of ["À relire", "Validées", "Publiées", "Écartées"]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
});

// Le panneau de génération est un composant client avec deux Select Base UI :
// exactement le genre de montage qui ne casse qu'au clic (voir l'erreur de
// contexte du panneau de notifications, invisible au typecheck).
test("le panneau de génération se manipule", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/marketing");

  const reseau = page.getByLabel("Réseau");
  await expect(reseau).toBeVisible();
  await reseau.click();
  await page.getByRole("option", { name: "Instagram" }).click();

  // Le texte d'aide dépend du réseau choisi et signale la contrainte propre
  // à Instagram — s'il ne change pas, l'état n'a pas été pris en compte.
  await expect(page.getByText(/exige une image/)).toBeVisible();

  await expect(page.getByRole("button", { name: "Proposer" })).toBeEnabled();
});

test("un admin est le seul à entrer dans le studio", async ({ page }) => {
  const response = await page.goto("/admin/marketing");
  // Sans session, la page ne doit pas s'afficher : requireAdmin redirige.
  expect(response?.url()).not.toContain("/admin/marketing");
});
