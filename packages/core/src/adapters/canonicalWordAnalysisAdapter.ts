import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MissingReason, Translation, WordAnalysis, WordRole } from "@quran-app/types";


const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const data2Directory = path.resolve(currentDirectory, "../../../../data2");
const dbPath = path.resolve(currentDirectory, "../../../../data/app.db");

// DB source label used in Translation objects
const dbWordsSource = "app.db/words";
const rootExplanationsV2Source = "root_explanations_tr_v2_easy_only";

// ────────────────────────────────────────────────────────────────────────────
// Root explanations v2 (still loaded from JSON — small file, 200 KB)
// ────────────────────────────────────────────────────────────────────────────

const rootExplanationsV2Path = path.join(
  data2Directory,
  "processed",
  "root_explanations_tr_v2_easy_only.json"
);

interface RootExplanationV2Entry {
  root: string;
  short_tr: string;
  summary_tr: string;
}

const rootExplanationsV2Promise: Promise<Map<string, string>> = readFile(
  rootExplanationsV2Path,
  "utf8"
).then((content) => {
  const entries = JSON.parse(content) as RootExplanationV2Entry[];
  const map = new Map<string, string>();

  for (const entry of entries) {
    if (entry.root) {
      const text = entry.short_tr?.trim() || entry.summary_tr?.trim() || "";

      if (text) {
        map.set(entry.root, text);
      }
    }
  }

  return map;
});

export async function loadRootExplanationsV2Map(): Promise<Map<string, string>> {
  return rootExplanationsV2Promise;
}

// ────────────────────────────────────────────────────────────────────────────
// Singleton DB connection
// ────────────────────────────────────────────────────────────────────────────

let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (_db === null) {
    _db = new DatabaseSync(dbPath, { readOnly: true });
    _db.exec(`
      PRAGMA cache_size   = -32768;
      PRAGMA mmap_size    = 268435456;
      PRAGMA temp_store   = MEMORY;
      PRAGMA busy_timeout = 5000;
    `);
  }

  return _db;
}

// ────────────────────────────────────────────────────────────────────────────
// DB row type
// ────────────────────────────────────────────────────────────────────────────

interface WordRow {
  word_index: number;
  arabic: string | null;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology: string | null;
  meaning_tr: string | null;
  gloss_en: string | null;
  confidence: string | null;
  source: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const wordRoles = new Set<WordRole>([
  "noun",
  "verb",
  "particle",
  "pronoun",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "other",
  "unknown"
]);

function asWordRole(value: string | null | undefined): WordRole | null {
  if (value && wordRoles.has(value as WordRole)) {
    return value as WordRole;
  }

  return null;
}

function posToRole(pos: string | null, morphology: string | null): WordRole | null {
  if (!pos) return null;

  const hasPron = morphology?.includes("PRON") ?? false;

  if (hasPron) return "pronoun";

  const base = pos.split("+").at(-1) ?? pos;

  if (base === "V") return "verb";
  if (base === "P") return "particle";
  if (base === "N") {
    const isAdj = morphology?.includes("|ADJ") ?? false;
    return isAdj ? "adjective" : "noun";
  }

  return null;
}

function asNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function toTranslation(
  text: string | null,
  source: string | null | undefined
): Translation | null {
  if (text === null) return null;

  return {
    language: "tr",
    source: source?.trim() || dbWordsSource,
    text,
    status: "available"
  };
}

function getRootExplanationMissingReason(root: string | null): MissingReason {
  return root === null ? "source_unavailable" : "matching_gap";
}

// ────────────────────────────────────────────────────────────────────────────
// DB → WordAnalysis mapping
// ────────────────────────────────────────────────────────────────────────────

function mapDbWordToLegacy(row: WordRow, rootExplanationsV2: Map<string, string>): WordAnalysis {
  const arabic = asNullableText(row.arabic);
  const root = asNullableText(row.root);
  const meaningText = asNullableText(row.meaning_tr);
  const v2Text = root ? (rootExplanationsV2.get(root) ?? null) : null;
  const rootExplanation = toTranslation(v2Text, rootExplanationsV2Source);

  return {
    wordIndex: row.word_index,
    arabic,
    transliteration: null,
    root,
    rootExplanation,
    rootExplanationStatus: rootExplanation !== null ? "available" : "missing",
    rootExplanationMissingReason:
      rootExplanation !== null ? null : getRootExplanationMissingReason(root),
    morphology: posToRole(row.pos, row.morphology),
    meaning: toTranslation(meaningText, row.source),
    status: arabic !== null ? "available" : "missing"
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

export async function getCanonicalWordAnalysesAsLegacy(
  surahId: number,
  ayahNumber: number
): Promise<WordAnalysis[]> {
  const rootExplanationsV2 = await loadRootExplanationsV2Map();
  const verseKey = `${surahId}:${ayahNumber}`;

  try {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT word_index, arabic, root, lemma, pos, morphology, meaning_tr, gloss_en, confidence, source " +
        "FROM words WHERE verse_key = ? ORDER BY word_index"
      )
      .all(verseKey) as unknown as WordRow[];

    return rows.map((row) => mapDbWordToLegacy(row, rootExplanationsV2));
  } catch {
    _db = null;
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Legacy-compatibility exports kept for external callers (index.ts re-exports)
// ────────────────────────────────────────────────────────────────────────────

// Kept as a named export — external code may import it for mapping JSON words.
// The CanonicalWordAnalysis type is defined inline here to avoid circular deps.
interface CanonicalWordAnalysis {
  position: number;
  arabic: string;
  lemma: string;
  root: string;
  pos: string;
  role: string;
  morphology: string;
  meaning_tr: string;
  root_explanation_tr: string;
  gloss_en: string;
  sources: Partial<Record<string, string>>;
  missing_fields: string[];
}

export function mapCanonicalWordAnalysisToLegacy(
  word: CanonicalWordAnalysis,
  rootExplanationsV2?: Map<string, string>
): WordAnalysis {
  const arabic = asNullableText(word.arabic);
  const root = asNullableText(word.root);
  const meaningText = asNullableText(word.meaning_tr);
  const canonicalRootExplanationText = asNullableText(word.root_explanation_tr);
  const v2Text =
    canonicalRootExplanationText === null && rootExplanationsV2 && root
      ? (rootExplanationsV2.get(root) ?? null)
      : null;
  const rootExplanationText = canonicalRootExplanationText ?? v2Text;
  const rootExplanation = toTranslation(
    rootExplanationText,
    canonicalRootExplanationText !== null
      ? word.sources.root_explanation_tr
      : v2Text !== null
        ? rootExplanationsV2Source
        : null
  );

  return {
    wordIndex: word.position,
    arabic,
    transliteration: null,
    root,
    rootExplanation,
    rootExplanationStatus: rootExplanation !== null ? "available" : "missing",
    rootExplanationMissingReason:
      rootExplanation !== null ? null : getRootExplanationMissingReason(root),
    morphology: asWordRole(word.role),
    meaning: toTranslation(meaningText, word.sources.meaning_tr),
    status: arabic !== null ? "available" : "missing"
  };
}

export const canonicalWordAnalysisDataSources = {
  canonicalWordAnalysisSource: dbWordsSource
} as const;
