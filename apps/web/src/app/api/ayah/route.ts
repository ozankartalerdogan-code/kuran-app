export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet } from "../../../lib/dbUtils";
import { cleanMealText } from "../../../lib/cleanMeal";
import { normalizeVisibleRoot, suppressedVisibleRootsSql } from "../../../lib/rootVisibility";

interface SurahRow {
  adi_turkce: string;
  adi_arapca: string;
  ayet_sayisi: number;
}

interface VerseRow {
  verse_key: string;
  arabic_text: string | null;
  arabic_tajweed: string | null;
  primary_translation: string | null;
  reading_tr: string | null;
  literal_ceviri: string | null;
  fark_analizi: string | null;
}

interface WordRow {
  word_index: number;
  arabic: string | null;
  meaning_tr: string | null;
  pos: string | null;
  root: string | null;
  lemma: string | null;
  morphology: string | null;
  root_meaning: string | null;
}

interface TranslationRow {
  source: string;
  text: string | null;
}

interface SpanRow { start_cp: number; end_cp: number; rule: string; color: string }

// tajweed_spans tablosu migration'dan önce production'da YOK; route ondan önce
// deploy edilebilmeli. "no such table" hata değil, "henüz veri yok" demektir —
// tecvid renksiz kalır, ayet yine de servis edilir. Diğer hatalar fırlatılır.
// (Aynı yaklaşım /api/mushaf route'unda da var.)
async function tolerantAll<T>(query: Promise<T[]>): Promise<T[]> {
  try {
    return await query;
  } catch (err) {
    if (String(err instanceof Error ? err.message : err).includes("no such table")) return [];
    throw err;
  }
}

interface VerseTagRow {
  ana_tema:  string | null;
  alt_taglar: string | null; // JSON array
}

export type AyahDetailResponse = {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  arabicName: string;
  verseCount: number;
  arabicText: string | null;
  /** ESKİ yol: AlQuran markup'ı. Metni canonical'dan farklı; render'da kullanılmamalı. */
  arabicTajweed: string | null;
  /**
   * Tecvid renkleri, `arabicText` üzerinde KOD NOKTASI koordinatlarıyla.
   * İstemci canonical metni basıp rengi buradan uygulamalı — markup metnini
   * basmak canonical'dan sapar ve harf/hareke bölünmesi yüzünden ekranda
   * sahipsiz işaret (noktalı daire) üretir.
   */
  tajweedSpans: { startCp: number; endCp: number; rule: string; color: string }[];
  readingTr: string | null;
  meal: string | null;
  literalCeviri: string | null;
  farkAnalizi: string | null;
  anaTema: string | null;
  altTaglar: string[];
  translations: { source: string; text: string | null }[];
  rootMeanings: Record<string, string>;
  words: {
    wordIndex: number;
    arabic: string | null;
    meaningTr: string | null;
    pos: string | null;
    root: string | null;
    lemma: string | null;
    morphology: string | null;
  }[];
  prevAyah: { surahId: number; ayahNumber: number } | null;
  nextAyah: { surahId: number; ayahNumber: number } | null;
};

export async function GET(req: NextRequest) {
  const rawS = req.nextUrl.searchParams.get("surah_id");
  const rawA = req.nextUrl.searchParams.get("ayah_number");
  const surahId   = Number(rawS);
  const ayahNumber = Number(rawA);

  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    return NextResponse.json({ error: "Geçersiz surah_id (1-114)" }, { status: 400 });
  }
  if (!Number.isInteger(ayahNumber) || ayahNumber < 1) {
    return NextResponse.json({ error: "Geçersiz ayah_number" }, { status: 400 });
  }


  try {
    const surah = await dbGet<SurahRow>(
      "SELECT adi_turkce, adi_arapca, ayet_sayisi FROM sureler WHERE id = ?",
      surahId,
    );

    if (!surah) {
      return NextResponse.json({ error: "Sure bulunamadı" }, { status: 404 });
    }

    if (ayahNumber > surah.ayet_sayisi) {
      return NextResponse.json({ error: "Ayet numarası aşıldı" }, { status: 404 });
    }

    const verseKey = `${surahId}:${ayahNumber}`;

    const [verse, translations, tagRow, spans] = await Promise.all([
      dbGet<VerseRow>(
        "SELECT verse_key, arabic_text, arabic_tajweed, primary_translation, reading_tr, literal_ceviri, fark_analizi FROM verses WHERE verse_key = ?",
        verseKey,
      ),
      dbAll<TranslationRow>(
        "SELECT source, text FROM translations WHERE verse_key = ? AND source = 'yazir' ORDER BY source",
        verseKey,
      ),
      dbGet<VerseTagRow>(
        "SELECT ana_tema, alt_taglar FROM verse_tags WHERE verse_key = ?",
        verseKey,
      ),
      // Ham satırlar canonical koordinatlıdır; arabic_text ile birebir hizalanır.
      tolerantAll(dbAll<SpanRow>(
        "SELECT start_cp, end_cp, rule, color FROM tajweed_spans WHERE verse_key = ? ORDER BY start_cp",
        verseKey,
      )),
    ]);

    let altTaglar: string[] = [];
    try { altTaglar = tagRow?.alt_taglar ? JSON.parse(tagRow.alt_taglar) : []; } catch { altTaglar = []; }

    if (!verse) {
      return NextResponse.json({ error: "Ayet bulunamadı" }, { status: 404 });
    }

    const words = await dbAll<WordRow>(`
        SELECT w.word_index,
               MIN(w.arabic)      AS arabic,
               MIN(w.meaning_tr)  AS meaning_tr,
               MIN(w.pos)         AS pos,
               MIN(w.root)        AS root,
               MIN(w.lemma)       AS lemma,
               MIN(w.morphology)  AS morphology,
               -- kök anlamı liste/detay ile aynı önceliği kullansın (zengin seed),
               -- aksi halde tekrarlı root_meanings'te MIN farklı anlam getirebilir
               COALESCE(
                 MAX(CASE WHEN rm.source = 'root_explanations_seed' THEN rm.meaning_tr END),
                 MIN(rm.meaning_tr)
               ) AS root_meaning
        FROM   words w
        LEFT JOIN root_meanings rm
               ON rm.root = w.root
              AND rm.root NOT IN (${suppressedVisibleRootsSql})
        WHERE  w.verse_key = ?
        GROUP  BY w.word_index
        ORDER  BY w.word_index
      `, verseKey);

    const rootMeanings: Record<string, string> = {};
    for (const w of words) {
      const visibleRoot = normalizeVisibleRoot(w.root);
      if (visibleRoot && w.root_meaning) rootMeanings[visibleRoot] = w.root_meaning;
    }

    const prevAyah =
      ayahNumber > 1 ? { surahId, ayahNumber: ayahNumber - 1 } : null;
    const nextAyah =
      ayahNumber < surah.ayet_sayisi ? { surahId, ayahNumber: ayahNumber + 1 } : null;

    const body: AyahDetailResponse = {
      verseKey,
      surahId,
      ayahNumber,
      surahName:   surah.adi_turkce,
      arabicName:  surah.adi_arapca,
      verseCount:  surah.ayet_sayisi,
      arabicText:    verse.arabic_text,
      arabicTajweed: verse.arabic_tajweed ?? null,
      tajweedSpans:  spans.map((s) => ({
        startCp: s.start_cp, endCp: s.end_cp, rule: s.rule, color: s.color,
      })),
      readingTr:     verse.reading_tr ?? null,
      meal:          cleanMealText(
        translations.find(t => (t.source ?? "").split("#").at(-1) === "yazir")?.text
        ?? verse.primary_translation
      ),
      literalCeviri: cleanMealText(verse.literal_ceviri),
      farkAnalizi:   cleanMealText(verse.fark_analizi),
      anaTema:       tagRow?.ana_tema ?? null,
      altTaglar,
      translations:  translations
        .map(t => ({ source: t.source, text: cleanMealText(t.text) }))
        .filter(t => t.text !== null),
      rootMeanings,
      words: words.map((w) => ({
        wordIndex: w.word_index,
        arabic:    w.arabic,
        meaningTr: w.meaning_tr,
        pos:       w.pos,
        root:      normalizeVisibleRoot(w.root),
        lemma:     w.lemma,
        morphology: w.morphology,
      })),
      prevAyah,
      nextAyah,
    };

    return NextResponse.json(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[ayah] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
