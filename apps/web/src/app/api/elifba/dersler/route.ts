export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { dbAll } from "../../../../lib/dbUtils";

type DersRow = {
  id: number;
  baslik: string;
  konu_sirasi: number;
  seviye: string;
  harf_sayisi: number;
  icerik_json: string | null;
};

export async function GET() {
  try {
    return NextResponse.json(await dbAll<DersRow>(`
      SELECT d.id, d.baslik, d.konu_sirasi, d.seviye,
             COUNT(hd.harf_id) AS harf_sayisi,
             NULLIF(TRIM(d.icerik_json), '') AS icerik_json
      FROM   elifba_dersler d
      LEFT JOIN elifba_harf_ders hd ON hd.ders_id = d.id
      GROUP  BY d.id, d.baslik, d.konu_sirasi, d.seviye, d.icerik_json
      ORDER  BY d.konu_sirasi
    `), {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[elifba/dersler] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
