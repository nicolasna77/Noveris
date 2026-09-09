// Sérialisation CSV pour les exports de l'admin.
//
// Le piège n'est pas la virgule, c'est tout le reste : un nom d'entreprise
// contenant un point-virgule, une note contenant un retour à la ligne ou un
// guillemet, et le fichier devient illisible — ou pire, décale silencieusement
// une colonne sur des milliers de lignes.
//
// Séparateur point-virgule et BOM UTF-8, parce que ces fichiers finissent
// dans Excel en configuration française : avec une virgule, Excel met toute
// la ligne dans une seule cellule ; sans BOM, il rend « é » en « Ã© ».

const SEPARATOR = ";";
const BOM = "﻿";

export type CsvValue = string | number | boolean | Date | null | undefined;

function serializeValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  // Un champ n'a besoin de guillemets que s'il contient le séparateur, un
  // guillemet ou un saut de ligne — les ajouter partout alourdit le fichier
  // sans rien apporter.
  if (
    text.includes(SEPARATOR) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv<T>(
  rows: T[],
  columns: { header: string; value: (row: T) => CsvValue }[]
): string {
  const lines = [
    columns.map((c) => serializeValue(c.header)).join(SEPARATOR),
    ...rows.map((row) =>
      columns.map((c) => serializeValue(c.value(row))).join(SEPARATOR)
    ),
  ];
  // CRLF : la fin de ligne que tous les tableurs acceptent, y compris les
  // plus anciens sous Windows.
  return BOM + lines.join("\r\n");
}

/** En-têtes d'une réponse de téléchargement, nom de fichier daté inclus. */
export function csvResponseHeaders(basename: string): HeadersInit {
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${basename}-${stamp}.csv"`,
    // Un export reflète l'état à l'instant du clic : jamais de cache.
    "Cache-Control": "no-store",
  };
}
