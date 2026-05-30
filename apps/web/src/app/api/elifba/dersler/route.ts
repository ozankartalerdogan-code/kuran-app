import { NextResponse } from "next/server";
import { dbAll, dbGet, dbRun } from "../../../../lib/dbUtils";

export const revalidate = false; // Diyanet müfredatı statik — sonsuz cache

type DersRow = {
  id: number;
  baslik: string;
  konu_sirasi: number;
  seviye: string;
  harf_sayisi: number;
};

export async function GET() {
  return NextResponse.json(await dbAll<DersRow>(`
    SELECT d.id, d.baslik, d.konu_sirasi, d.seviye,
           COUNT(hd.harf_id) AS harf_sayisi
    FROM   elifba_dersler d
    LEFT JOIN elifba_harf_ders hd ON hd.ders_id = d.id
    GROUP  BY d.id
    ORDER  BY d.konu_sirasi
  `));
}
