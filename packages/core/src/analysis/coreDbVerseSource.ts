import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

export interface CoreDbVerseTranslation {
  source: string;
  text: string;
}

export interface CoreDbVerseWord {
  wordIndex: number;
  segmentIndex: number;
  arabic: string | null;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology: string | null;
  meaningTr: string | null;
  glossEn: string | null;
  confidence: string | null;
  source: string | null;
}

export interface CoreDbRootMeaning {
  root: string;
  meaningTr: string;
  source: string | null;
}

export interface CoreDbTranslationComparison {
  source: string | null;
  normalizedText: string | null;
  rawJson: string | null;
}

export interface CoreDbFidelitySignal {
  wordIndex: number | null;
  root: string | null;
  lemma: string | null;
  signalType: string;
  labelTr: string | null;
  confidence: string | null;
  note: string | null;
  rawJson: string | null;
}

export interface CoreDbContextNote {
  scope: string;
  type: string;
  source: string | null;
  text: string;
}

export interface CoreDbVerseSourceResult {
  verseKey: string;
  arabicText: string | null;
  primaryTranslation: string | null;
  translations: CoreDbVerseTranslation[];
  words: CoreDbVerseWord[];
  roots: string[];
  lemmas: string[];
  morphology: string[];
  rootMeanings: CoreDbRootMeaning[];
  translationComparison: CoreDbTranslationComparison[];
  fidelitySignals: CoreDbFidelitySignal[];
  contextNotes: CoreDbContextNote[];
  sourceStatus: {
    available: string[];
    missing: string[];
    dbPath: string;
  };
}

interface VerseRow {
  verse_key: string;
  arabic_text: string | null;
  primary_translation: string | null;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0)
    )
  );
}

function defaultDbPath(): string {
  return fileURLToPath(new URL("../../../../data/app.db", import.meta.url));
}

export function readVerseAnalysisContextFromCoreDb(
  verseKey: string,
  dbPath = defaultDbPath()
): CoreDbVerseSourceResult | null {
  const database = new DatabaseSync(dbPath, { readOnly: true });
  database.exec("PRAGMA cache_size=-32768; PRAGMA mmap_size=268435456; PRAGMA temp_store=MEMORY; PRAGMA busy_timeout=5000;");

  try {
    const verse = database
      .prepare(
        `
        SELECT verse_key, arabic_text, primary_translation
        FROM verses
        WHERE verse_key = ?
        `
      )
      .get(verseKey) as unknown as VerseRow | undefined;

    if (!verse) {
      return null;
    }

    const translations = database
      .prepare(
        `
        SELECT source, text
        FROM translations
        WHERE verse_key = ?
        ORDER BY source ASC, id ASC
        `
      )
      .all(verseKey) as unknown as CoreDbVerseTranslation[];

    const words = database
      .prepare(
        `
        SELECT
          word_index AS wordIndex,
          segment_index AS segmentIndex,
          arabic,
          root,
          lemma,
          pos,
          morphology,
          meaning_tr AS meaningTr,
          gloss_en AS glossEn,
          confidence,
          source
        FROM words
        WHERE verse_key = ?
        ORDER BY word_index ASC, segment_index ASC, id ASC
        `
      )
      .all(verseKey) as unknown as CoreDbVerseWord[];

    const roots = uniqueNonEmpty(words.map((word) => word.root));
    const lemmas = uniqueNonEmpty(words.map((word) => word.lemma));
    const morphology = uniqueNonEmpty(words.map((word) => word.morphology));

    let rootMeanings: CoreDbRootMeaning[] = [];
    if (roots.length > 0) {
      const placeholders = roots.map(() => "?").join(", ");
      rootMeanings = database
        .prepare(
          `
          SELECT DISTINCT
            root,
            meaning_tr AS meaningTr,
            source
          FROM root_meanings
          WHERE root IN (${placeholders})
          ORDER BY root ASC, source ASC, id ASC
          `
        )
        .all(...roots) as unknown as CoreDbRootMeaning[];
    }

    const translationComparison = database
      .prepare(
        `
        SELECT
          source,
          normalized_text AS normalizedText,
          raw_json AS rawJson
        FROM translation_comparison
        WHERE verse_key = ?
        ORDER BY source ASC, id ASC
        `
      )
      .all(verseKey) as unknown as CoreDbTranslationComparison[];

    const fidelitySignals = database
      .prepare(
        `
        SELECT
          word_index AS wordIndex,
          root,
          lemma,
          signal_type AS signalType,
          label_tr AS labelTr,
          confidence,
          note,
          raw_json AS rawJson
        FROM fidelity_signals
        WHERE verse_key = ?
        ORDER BY
          CASE WHEN word_index IS NULL THEN 9999 ELSE word_index END ASC,
          id ASC
        `
      )
      .all(verseKey) as unknown as CoreDbFidelitySignal[];

    const contextNotes = database
      .prepare(
        `
        SELECT
          scope,
          type,
          source,
          text
        FROM context_notes
        WHERE verse_key = ?
        ORDER BY scope ASC, type ASC, id ASC
        `
      )
      .all(verseKey) as unknown as CoreDbContextNote[];

    const available: string[] = [];
    const missing: string[] = [];

    if (verse.arabic_text) {
      available.push("verse");
    } else {
      missing.push("verse");
    }

    if (translations.length > 0) {
      available.push("translations");
    } else {
      missing.push("translations");
    }

    if (words.length > 0) {
      available.push("words");
    } else {
      missing.push("words");
    }

    if (translationComparison.length > 0) {
      available.push("translation_comparison");
    } else {
      missing.push("translation_comparison");
    }

    if (fidelitySignals.length > 0) {
      available.push("fidelity_signals");
    } else {
      missing.push("fidelity_signals");
    }

    if (contextNotes.length > 0) {
      available.push("context_notes");
    } else {
      missing.push("context_notes");
    }

    return {
      verseKey: verse.verse_key,
      arabicText: verse.arabic_text,
      primaryTranslation: verse.primary_translation,
      translations,
      words,
      roots,
      lemmas,
      morphology,
      rootMeanings,
      translationComparison,
      fidelitySignals,
      contextNotes,
      sourceStatus: {
        available,
        missing,
        dbPath
      }
    };
  } finally {
    database.close();
  }
}
