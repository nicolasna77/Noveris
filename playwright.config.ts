import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Parcours de bout en bout, sur l'application réellement construite et une
// base réelle : ils couvrent ce que les tests unitaires ne peuvent pas voir
// — les interactions client (menus, panneaux, formulaires), là où une
// erreur de rendu ne se manifeste qu'au clic.
//
// Un port dédié pour ne pas entrer en conflit avec le serveur de
// développement laissé ouvert sur 3000.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `next start` et non `next dev` : c'est le build de production qu'on
    // veut valider, et le premier rendu n'est pas ralenti par la
    // compilation à la demande.
    command: `npx next start --port ${PORT}`,
    url: BASE_URL,
    // better-auth refuse toute requête dont l'origine ne correspond pas à sa
    // baseURL (« Invalid origin »). Celle-ci vaut NEXT_PUBLIC_APP_URL, donc
    // l'origine de développement : sans cette variable, la connexion échoue
    // en 403 sur le port dédié aux tests.
    env: { BETTER_AUTH_URL: BASE_URL },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
