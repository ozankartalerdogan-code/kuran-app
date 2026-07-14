export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { dbAll } from "../../../../../../lib/dbUtils";

type Harf = {
  harf_id: number;
  harf_adi: string;
  harf_sesi: string;
  tek_basina: string;
  basta: string;
  ortada: string;
  sonda: string;
  mahrec: string;
  kalin_ince: string;
  grup: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dersId = Number(id);
  if (!Number.isInteger(dersId) || dersId < 1) {
    return NextResponse.json({ error: "Geçersiz ders ID" }, { status: 400 });
  }

  try {
    return NextResponse.json(await dbAll<Harf>(`
      SELECT h.harf_id, h.harf_adi, h.harf_sesi, h.tek_basina,
             h.basta, h.ortada, h.sonda, h.mahrec, h.kalin_ince, h.grup
      FROM   elifba_harfler h
      JOIN   elifba_harf_ders hd ON hd.harf_id = h.harf_id
      WHERE  hd.ders_id = ?
      ORDER  BY h.harf_id
    `, dersId), {
      headers: { "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[elifba/harfler] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
