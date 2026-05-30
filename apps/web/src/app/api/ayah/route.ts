export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet } from "../../../lib/dbUtils";

interface SurahRow {
  adi_turkce: string;
  adi_arapca: string;
  ayet_sayisi: number;
}

interface VerseRow {
  verse_key: string;
  arabic_text: string | null;
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
}

interface TranslationRow {
  source: string;
  text: string | null;
}

export type AyahDetailResponse = {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  arabicName: string;
  verseCount: number;
  arabicText: string | null;
  readingTr: string | null;
  meal: string | null;
  literalCeviri: string | null;
  farkAnalizi: string | null;
  translations: { source: string; text: string | null }[];
  rootMeanings: Record<string, string>;
  words: {
    wordIndex: number;
    arabic: string | null;
    meaningTr: string | null;
    pos: string | null;
    root: string | null;
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

  const [verse, translations] = await Promise.all([
    dbGet<VerseRow>(
      "SELECT verse_key, arabic_text, primary_translation, reading_tr, literal_ceviri, fark_analizi FROM verses WHERE verse_key = ?",
      verseKey,
    ),
    dbAll<TranslationRow>(
      "SELECT source, text FROM translations WHERE verse_key = ? ORDER BY source",
      verseKey,
    ),
  ]);

  if (!verse) {
    return NextResponse.json({ error: "Ayet bulunamadı" }, { status: 404 });
  }

  const words = await dbAll<WordRow>(`
      SELECT word_index,
             MIN(arabic)     AS arabic,
             MIN(meaning_tr) AS meaning_tr,
             MIN(pos)        AS pos,
             MIN(root)       AS root
      FROM words
      WHERE verse_key = ?
      GROUP BY word_index
      ORDER BY word_index
    `, verseKey,);

  // Kök anlamları
  const uniqueRoots = [...new Set(words.map(w => w.root).filter(Boolean))] as string[];
  const rootMeanings: Record<string, string> = {};
  if (uniqueRoots.length > 0) {
    const placeholders = uniqueRoots.map(() => "?").join(",");
    const rmRows = await dbAll<{ root: string; meaning_tr: string }>(
      `SELECT root, MIN(meaning_tr) AS meaning_tr FROM root_meanings WHERE root IN (${placeholders}) GROUP BY root`,
      ...uniqueRoots
    );
    rmRows.forEach(r => { if (r.root && r.meaning_tr) rootMeanings[r.root] = r.meaning_tr; });
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
    readingTr:     verse.reading_tr ?? null,
    meal:          verse.primary_translation,
    literalCeviri: verse.literal_ceviri ?? null,
    farkAnalizi:   verse.fark_analizi ?? null,
    translations:  translations.map(t => ({ source: t.source, text: t.text })),
    rootMeanings,
    words: words.map((w) => ({
      wordIndex:  w.word_index,
      arabic:     w.arabic,
      meaningTr:  w.meaning_tr,
      pos:        w.pos,
      root:       w.root,
    })),
    prevAyah,
    nextAyah,
  };

  return NextResponse.json(body, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
