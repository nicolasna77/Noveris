import { describe, expect, it } from "vitest";
import { toOrigin, trustedOrigins } from "./trusted-origins";

describe("toOrigin", () => {
  it("garde le protocole d'une URL complète", () => {
    expect(toOrigin("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("considère un domaine nu, comme ceux fournis par Vercel, en https", () => {
    expect(toOrigin("noveris-abc123-equipe.vercel.app")).toBe(
      "https://noveris-abc123-equipe.vercel.app"
    );
  });

  it("ignore une valeur vide ou invalide", () => {
    expect(toOrigin("  ")).toBeNull();
    expect(toOrigin(undefined)).toBeNull();
    expect(toOrigin("http://")).toBeNull();
  });
});

describe("trustedOrigins", () => {
  it("accepte chaque domaine sous lequel Vercel sert le projet", () => {
    const origins = trustedOrigins({
      NEXT_PUBLIC_APP_URL: "https://noveris.fr",
      VERCEL_URL: "noveris-abc123-equipe.vercel.app",
      VERCEL_BRANCH_URL: "noveris-git-main-equipe.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "noveris.fr",
    });
    expect(origins).toEqual([
      "https://noveris.fr",
      "https://noveris-abc123-equipe.vercel.app",
      "https://noveris-git-main-equipe.vercel.app",
    ]);
  });

  it("ajoute les origines déclarées à la main", () => {
    expect(
      trustedOrigins({ BETTER_AUTH_TRUSTED_ORIGINS: "https://www.noveris.fr, https://app.noveris.fr" })
    ).toEqual(["https://www.noveris.fr", "https://app.noveris.fr"]);
  });

  it("ne renvoie rien sans configuration", () => {
    expect(trustedOrigins({})).toEqual([]);
  });
});
