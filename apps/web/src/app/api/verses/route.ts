export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, dbRun } from "../../../lib/dbUtils";

export const revalidate = false; // Kuran metni değişmez — sonsuz cache

interface SurahRow {
  id: number;
  adi_turkce: string;
  adi_arapca: string;
  ayet_sayisi: number;
  tur: string;
}

interface VerseRow {
  ayah_number:         number;
  primary_translation: string | null;
  reading_tr:          string | null;
  literal_ceviri:      string | null;
}

export type VerseItem = {
  ayahNumber: number;
  meal:       string | null;
  reading:    string | null;
  literal:    string | null;
};

export type VerseListResponse = {
  surah: {
    id: number;
    name: string;
    arabicName: string;
    verseCount: number;
    revelationPlace: "Mekke" | "Medine";
  };
  verses: VerseItem[];
};

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("surah_id");
  const surahId = Number(raw);

  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    return NextResponse.json({ error: "Geçersiz surah_id (1-114)" }, { status: 400 });
  }


  const surah = await dbGet<SurahRow>(
    "SELECT id, adi_turkce, adi_arapca, ayet_sayisi, tur FROM sureler WHERE id = ?",
    surahId,
  );

  if (!surah) {
    return NextResponse.json({ error: "Sure bulunamadı" }, { status: 404 });
  }

  const verses = await dbAll<VerseRow>(
    "SELECT ayah_number, primary_translation, reading_tr, literal_ceviri FROM verses WHERE surah_id = ? ORDER BY ayah_number",
    surahId,
  );

  const body: VerseListResponse = {
    surah: {
      id:              surah.id,
      name:            surah.adi_turkce,
      arabicName:      surah.adi_arapca,
      verseCount:      surah.ayet_sayisi,
      revelationPlace: surah.tur === "medinan" ? "Medine" : "Mekke",
    },
    verses: verses.map((v) => ({
      ayahNumber: v.ayah_number,
      meal:       v.primary_translation,
      reading:    v.reading_tr,
      literal:    v.literal_ceviri,
    })),
  };

  return NextResponse.json(body);
}
