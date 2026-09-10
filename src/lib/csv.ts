const SEPARATOR = ";";
const BOM = "﻿";

export type CsvValue = string | number | boolean | Date | null | undefined;

function serializeValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
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
  return BOM + lines.join("\r\n");
}

export function csvResponseHeaders(basename: string): HeadersInit {
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${basename}-${stamp}.csv"`,
    "Cache-Control": "no-store",
  };
}
