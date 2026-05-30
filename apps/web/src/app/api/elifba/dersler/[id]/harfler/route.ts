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
  { params }: { params: { id: string } },
) {
  const dersId = Number(params.id);
  if (!Number.isInteger(dersId) || dersId < 1) {
    return NextResponse.json({ error: "Geçersiz ders ID" }, { status: 400 });
  }

  return NextResponse.json(await dbAll<Harf>(`
    SELECT h.harf_id, h.harf_adi, h.harf_sesi, h.tek_basina,
           h.basta, h.ortada, h.sonda, h.mahrec, h.kalin_ince, h.grup
    FROM   elifba_harfler h
    JOIN   elifba_harf_ders hd ON hd.harf_id = h.harf_id
    WHERE  hd.ders_id = ?
    ORDER  BY h.harf_id
  `, dersId));
}
