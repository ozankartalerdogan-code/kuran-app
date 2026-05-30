import type {
  AyahDetailPayload,
  Ayah,
  Surah,
  Translation,
  WordAnalysis,
  TafsirSummary,
} from "@quran-app/types";
import { dbAll, dbGet } from "./dbUtils";

interface SurahRow {
  id: number;
  adi_turkce: string;
  adi_arapca: string | null;
  translit: string | null;
  tur: string;
  ayet_sayisi: number;
}

interface VerseRow {
  verse_key: string;
  arabic_text: string | null;
  primary_translation: string | null;
  literal_ceviri: string | null;
  reading_tr: string | null;
  fark_analizi: string | null;
}

interface FidelityRow {
  source_name: string;
  text: string | null;
  source_url: string | null;
  status: string;
  ayah_status: string | null;
}

interface TranslationRow {
  source: string | null;
  text: string | null;
}

interface WordRow {
  word_index: number;
  arabic: string | null;
  root: string | null;
  pos: string | null;
  morphology: string | null;
  meaning_tr: string | null;
  gloss_en: string | null;
  source: string | null;
}

interface RootRow {
  root: string;
  meaning_tr: string | null;
}

interface TagRow {
  ana_tema: string | null;
  alt_taglar: string | null;
}

interface TafsirRow {
  content: string | null;
  source: string | null;
}

interface ContextNoteRow {
  scope: string;
  type: string;
  source: string | null;
  text: string;
}

export async function getAyahDetailFromDb(
  surahId: number,
  ayahNumber: number
): Promise<AyahDetailPayload> {
  const verseKey = `${surahId}:${ayahNumber}`;

  const [surahRow, verseRow, translationRows, wordRows, tagRow, tafsirRow, contextNoteRows, fidelityRows] =
    await Promise.all([
      dbGet<SurahRow>(
        "SELECT id, adi_turkce, adi_arapca, translit, tur, ayet_sayisi FROM sureler WHERE id = ?",
        surahId
      ),
      dbGet<VerseRow>(
        "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, reading_tr, fark_analizi FROM verses WHERE verse_key = ?",
        verseKey
      ),
      dbAll<TranslationRow>(
        "SELECT source, text FROM translations WHERE verse_key = ? ORDER BY source ASC",
        verseKey
      ),
      dbAll<WordRow>(
        `SELECT word_index, MIN(arabic) AS arabic, MIN(root) AS root,
                MIN(pos) AS pos, MIN(morphology) AS morphology,
                MIN(meaning_tr) AS meaning_tr, MIN(gloss_en) AS gloss_en,
                MIN(source) AS source
         FROM words WHERE verse_key = ? GROUP BY word_index ORDER BY word_index`,
        verseKey
      ),
      dbGet<TagRow>(
        "SELECT ana_tema, alt_taglar FROM verse_tags WHERE verse_key = ?",
        verseKey
      ),
      dbGet<TafsirRow>(
        "SELECT content, source FROM surah_tafsir WHERE surah_id = ? AND source = 'elmalili' LIMIT 1",
        surahId
      ),
      dbAll<ContextNoteRow>(
        "SELECT scope, type, source, text FROM context_notes WHERE verse_key = ? ORDER BY type",
        verseKey
      ),
      dbAll<FidelityRow>(
        "SELECT source_name, text, source_url, status, ayah_status FROM fidelity_comparisons WHERE verse_key = ?",
        verseKey
      ),
    ]);

  // Kök anlamları
  const roots = [...new Set(wordRows.map((w) => w.root).filter(Boolean))] as string[];
  const rootMeanings = new Map<string, string>();
  if (roots.length > 0) {
    const placeholders = roots.map(() => "?").join(", ");
    const rootRows = await dbAll<RootRow>(
      `SELECT root, MIN(meaning_tr) AS meaning_tr FROM root_meanings WHERE root IN (${placeholders}) GROUP BY root`,
      ...roots
    );
    rootRows.forEach((r) => {
      if (r.root && r.meaning_tr) rootMeanings.set(r.root, r.meaning_tr);
    });
  }

  // Surah nesnesi
  const surah: Surah | null = surahRow
    ? {
        id: surahRow.id,
        arabicName: surahRow.adi_arapca,
        turkishName: { language: "tr", source: null, text: surahRow.adi_turkce, status: "available" },
        verseCount: surahRow.ayet_sayisi,
        revelationType: surahRow.tur === "medinan" ? "medeni" : "mekki",
        revelationPlace: surahRow.tur === "medinan" ? "Medine" : "Mekke",
        revelationOrder: null,
        shortIntroduction: null,
        status: "available",
      }
    : null;

  // Çeviriler listesi (translations tablosu)
  const translations: Translation[] = translationRows.map((row) => ({
    language: "tr" as const,
    source: row.source,
    text: row.text,
    status: row.text ? ("available" as const) : ("missing" as const),
  }));

  // translations tablosu boşsa primary_translation'ı fallback yap
  if (translations.length === 0 && verseRow?.primary_translation) {
    translations.push({
      language: "tr",
      source: "primary",
      text: verseRow.primary_translation,
      status: "available",
    });
  }

  // Etiketler
  let altTaglar: string[] | null = null;
  try {
    altTaglar = tagRow?.alt_taglar ? JSON.parse(tagRow.alt_taglar) : null;
  } catch {
    altTaglar = null;
  }

  // Ayah nesnesi
  const ayah: Ayah = {
    id: ayahNumber,
    surahId,
    verseNumber: ayahNumber,
    arabicText: verseRow?.arabic_text ?? null,
    transliteration: verseRow?.reading_tr ?? null,
    readingTr: verseRow?.reading_tr ?? null,
    farkAnalizi: verseRow?.fark_analizi ?? null,
    translations,
    literalCeviri: verseRow?.literal_ceviri ?? null,
    hamAnlamOzeti: null,
    temalar: null,
    anaTema: tagRow?.ana_tema ?? null,
    altTaglar,
    status: verseRow?.arabic_text ? "available" : "missing",
  };

  // Kelime analizleri
  const wordAnalyses: WordAnalysis[] = wordRows.map((row) => {
    const rootMeaning = row.root ? (rootMeanings.get(row.root) ?? null) : null;
    return {
      wordIndex: row.word_index,
      arabic: row.arabic,
      transliteration: null,
      root: row.root,
      rootExplanation: rootMeaning
        ? { language: "tr", source: null, text: rootMeaning, status: "available" }
        : null,
      rootExplanationStatus: rootMeaning ? "available" : "missing",
      rootExplanationMissingReason: null,
      morphology: (row.pos ?? null) as WordAnalysis["morphology"],
      meaning: row.meaning_tr
        ? { language: "tr", source: row.source ?? null, text: row.meaning_tr, status: "available" }
        : null,
      status: row.arabic ? "available" : "missing",
    };
  });

  // Tefsir özeti
  const tafsirSummary: TafsirSummary | null = tafsirRow?.content
    ? { source: tafsirRow.source, summary: tafsirRow.content, sources: [], status: "available" }
    : null;

  // Fidelity analizi
  const fidelityAnalysis = fidelityRows.length > 0
    ? {
        source: "fidelity_comparisons",
        level: ((fidelityRows[0].ayah_status ?? "available") === "available" ? "medium" : "unknown") as import("@quran-app/types").FidelityLevel,
        notes: [],
        comparisons: fidelityRows.map((row) => ({
          sourceName: row.source_name,
          text: row.text,
          sourceUrl: row.source_url,
          status: (row.status ?? "available") as import("@quran-app/types").AvailabilityStatus,
        })),
        sources: [],
        status: ((fidelityRows[0].ayah_status ?? "available")) as import("@quran-app/types").AvailabilityStatus,
      }
    : null;

  const contextNuzulNote = contextNoteRows.find((n) => n.type === "revelation_context");
  const revelationContext = contextNuzulNote
    ? {
        scope: "surah" as const,
        source: contextNuzulNote.source,
        summary: contextNuzulNote.text,
        relatedSurahId: surahId,
        relatedAyahId: null,
        methodology: [],
        sources: [],
        status: "available" as const,
      }
    : null;

  return {
    surah,
    ayah,
    translations,
    wordAnalyses,
    tafsirSummary,
    revelationContext,
    fidelityAnalysis,
    status: surah !== null && ayah.status === "available" ? "available" : "missing",
  };
}
