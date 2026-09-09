import { describe, expect, it } from "vitest";
import { csvResponseHeaders, toCsv } from "./csv";

type Row = { name: string; amount: number; date: Date; note: string | null };

const columns = [
  { header: "Nom", value: (r: Row) => r.name },
  { header: "Montant", value: (r: Row) => r.amount },
  { header: "Date", value: (r: Row) => r.date },
  { header: "Note", value: (r: Row) => r.note },
];

function row(overrides: Partial<Row> = {}): Row {
  return {
    name: "Plomberie Lefèvre",
    amount: 79,
    date: new Date("2026-09-08T10:00:00Z"),
    note: null,
    ...overrides,
  };
}

// Le BOM et le point-virgule ne sont pas des détails : sans eux, le fichier
// s'ouvre en une seule colonne et les accents sont illisibles dans Excel en
// configuration française — c'est-à-dire chez tous les destinataires.
const BOM = "﻿";

describe("toCsv", () => {
  it("ouvre par un BOM et sépare par des points-virgules", () => {
    const csv = toCsv([row()], columns);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.split("\r\n")[0]).toBe(`${BOM}Nom;Montant;Date;Note`);
  });

  it("écrit une ligne par enregistrement, en CRLF", () => {
    const csv = toCsv([row(), row({ name: "Atelier Dubreuil" })], columns);
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  // Le vrai danger : un champ qui contient le séparateur décale toutes les
  // colonnes suivantes, silencieusement.
  it("protège un champ contenant le séparateur", () => {
    const csv = toCsv([row({ name: "Dupont; et fils" })], columns);
    expect(csv).toContain('"Dupont; et fils"');
  });

  it("double les guillemets d'un champ cité", () => {
    const csv = toCsv([row({ note: 'Il a dit "oui"' })], columns);
    expect(csv).toContain('"Il a dit ""oui"""');
  });

  it("protège un champ contenant un saut de ligne", () => {
    const csv = toCsv([row({ note: "ligne 1\nligne 2" })], columns);
    expect(csv).toContain('"ligne 1\nligne 2"');
  });

  // Inversement : citer ce qui n'en a pas besoin alourdit le fichier.
  it("ne cite pas un champ ordinaire", () => {
    expect(toCsv([row()], columns)).toContain("Plomberie Lefèvre;79;");
  });

  it("rend une valeur absente par une cellule vide", () => {
    const csv = toCsv([row({ note: null })], columns);
    expect(csv.split("\r\n")[1].endsWith(";")).toBe(true);
  });

  it("écrit les dates en ISO, non ambiguës", () => {
    expect(toCsv([row()], columns)).toContain("2026-09-08T10:00:00.000Z");
  });

  it("produit un fichier réduit à ses en-têtes quand il n'y a rien à exporter", () => {
    expect(toCsv([], columns)).toBe(`${BOM}Nom;Montant;Date;Note`);
  });
});

describe("csvResponseHeaders", () => {
  it("déclenche un téléchargement, sous un nom daté", () => {
    const headers = csvResponseHeaders("clients") as Record<string, string>;
    expect(headers["Content-Disposition"]).toMatch(
      /^attachment; filename="clients-\d{4}-\d{2}-\d{2}\.csv"$/
    );
  });

  // Un export est une photographie : la remettre depuis un cache tromperait.
  it("interdit la mise en cache", () => {
    const headers = csvResponseHeaders("clients") as Record<string, string>;
    expect(headers["Cache-Control"]).toBe("no-store");
  });
});
