export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { dbAll, dbGet, dbRun } from "../../../lib/dbUtils";

export const revalidate = false; // 114 sure hiç değişmez — sonsuz cache

interface SurahRow {
  id: number;
  adi_turkce: string;
  adi_arapca: string;
  translit: string;
  tur: string;
  ayet_sayisi: number;
}

export type SurahListItem = {
  id: number;
  name: string;
  arabicName: string;
  translit: string;
  verseCount: number;
  revelationPlace: "Mekke" | "Medine";
};

export async function GET() {
  const rows = await dbAll<SurahRow>(
    "SELECT id, adi_turkce, adi_arapca, translit, tur, ayet_sayisi FROM sureler ORDER BY id",
  );

  const surahs: SurahListItem[] = rows.map((r) => ({
    id:             r.id,
    name:           r.adi_turkce,
    arabicName:     r.adi_arapca,
    translit:       r.translit,
    verseCount:     r.ayet_sayisi,
    revelationPlace: r.tur === "medinan" ? "Medine" : "Mekke",
  }));

  return NextResponse.json(surahs);
}
