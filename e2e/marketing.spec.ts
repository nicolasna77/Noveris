import { expect, test } from "@playwright/test";
import { ADMIN_STATE, ANONYMOUS } from "./roles";

test.use({ storageState: ADMIN_STATE });

test("le studio marketing s'ouvre et annonce ses sections", async ({ page }) => {
  await page.goto("/admin/marketing");

  await expect(page.getByRole("heading", { level: 1, name: "Marketing" })).toBeVisible();

  for (const section of ["À relire", "Validées", "Publiées", "Écartées"]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
});

test("le panneau de génération se manipule", async ({ page }) => {
  await page.goto("/admin/marketing");

  const reseau = page.getByLabel("Réseau");
  await expect(reseau).toBeVisible();
  await reseau.click();
  await page.getByRole("option", { name: "Instagram" }).click();

  await expect(page.getByText(/exige une image/)).toBeVisible();

  await expect(page.getByRole("button", { name: "Proposer" })).toBeEnabled();
});

test.describe("sans session", () => {
  test.use({ storageState: ANONYMOUS });

  test("un admin est le seul à entrer dans le studio", async ({ page }) => {
    const response = await page.goto("/admin/marketing");
    expect(response?.url()).not.toContain("/admin/marketing");
  });
});
