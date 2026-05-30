import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, dbRun } from "../../../lib/dbUtils";

interface SurahRow {
  adi_turkce: string;
  adi_arapca: string;
  ayet_sayisi: number;
}

interface VerseRow {
  verse_key: string;
  arabic_text: string | null;
  primary_translation: string | null;
}

interface WordRow {
  word_index: number;
  arabic: string | null;
  meaning_tr: string | null;
  pos: string | null;
  root: string | null;
}

export type AyahDetailResponse = {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  arabicName: string;
  verseCount: number;
  arabicText: string | null;
  meal: string | null;
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

  const verse = await dbGet<VerseRow>(
    "SELECT verse_key, arabic_text, primary_translation FROM verses WHERE verse_key = ?",
    verseKey,
  );

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
    arabicText:  verse.arabic_text,
    meal:        verse.primary_translation,
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

  return NextResponse.json(body);
}
