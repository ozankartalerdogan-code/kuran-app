export type DersIcerik = {
  aciklama: string | null;
  kelimeler: string[];
};

export const MAX_LESSON_TERMS = 12;

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const SEPARATOR_CELL_RE = /^:?-+:?$/;

const hasArabic = (value: string): boolean => ARABIC_RE.test(value);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLiteralNewlines(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
}

function tableText(text: string): string {
  const lines = normalizeLiteralNewlines(text).split("\n");
  const firstTable = lines.findIndex((line) => line.includes("|"));
  return firstTable === -1 ? "" : lines.slice(firstTable).join("\n");
}

function summarizeAciklama(text: string): string | null {
  const lines = normalizeLiteralNewlines(text).split("\n");
  const firstTable = lines.findIndex((line) => line.includes("|"));
  const summary = (firstTable === -1 ? lines : lines.slice(0, firstTable))
    .join("\n")
    .trim();
  return summary.length > 0 ? summary : null;
}

function splitCellTokens(cell: string): string[] {
  return cell
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && hasArabic(token));
}

export function extractArabicCells(text: string): string[] {
  if (typeof text !== "string" || text.length === 0) return [];

  const words: string[] = [];
  const seen = new Set<string>();
  const push = (token: string) => {
    if (seen.has(token)) return;
    seen.add(token);
    words.push(token);
  };

  let harfColumnIndex: number | null = null;

  for (const line of normalizeLiteralNewlines(text).split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      harfColumnIndex = null;
      continue;
    }

    if (!trimmed.includes("|")) {
      harfColumnIndex = null;
      for (const token of trimmed.split(/\s+/)) {
        if (token.length > 0 && hasArabic(token)) push(token);
      }
      continue;
    }

    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    if (cells.length === 0) continue;

    const nextHarfColumn = cells.indexOf("Harfler");
    if (nextHarfColumn !== -1) {
      harfColumnIndex = nextHarfColumn;
      continue;
    }

    if (cells.every((cell) => SEPARATOR_CELL_RE.test(cell))) continue;

    const kept = harfColumnIndex === null
      ? cells
      : cells.filter((_, index) => index !== harfColumnIndex);

    for (const cell of kept) {
      for (const token of splitCellTokens(cell)) push(token);
    }
  }

  return words;
}

export function parseDersIcerik(raw: string | null | undefined): DersIcerik {
  const result: DersIcerik = { aciklama: null, kelimeler: [] };
  if (typeof raw !== "string") return result;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return result;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return result;
  }

  if (!isPlainObject(parsed)) return result;

  const seen = new Set<string>();
  const addWords = (text: string | null | undefined) => {
    if (typeof text !== "string") return;
    for (const word of extractArabicCells(text)) {
      if (seen.has(word)) continue;
      seen.add(word);
      result.kelimeler.push(word);
    }
  };

  if (typeof parsed.aciklama === "string") {
    result.aciklama = summarizeAciklama(parsed.aciklama);
    addWords(tableText(parsed.aciklama));
  }

  if (typeof parsed.alistirma === "string") addWords(parsed.alistirma);

  if (Array.isArray(parsed.ek_tablolar)) {
    for (const table of parsed.ek_tablolar) {
      if (isPlainObject(table) && typeof table.icerik === "string") {
        addWords(table.icerik);
      }
    }
  }

  return result;
}
