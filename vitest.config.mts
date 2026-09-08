import { defineConfig } from "vitest/config";

// Tests unitaires de la logique pure (src/lib) — pas de base de données ni
// de rendu React ici : ce qui touche à Prisma, au navigateur ou à une
// session est couvert par les parcours Playwright (voir e2e/).
// Extension .mts : le fichier est en ESM, Vite le charge nativement.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
