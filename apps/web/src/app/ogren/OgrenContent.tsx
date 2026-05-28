import { getApiDb, dbAll } from "../../lib/dbUtils";
import { OgrenClient, type DersWithHarfler } from "./OgrenClient";

type DersRow = {
  id: number;
  baslik: string;
  konu_sirasi: number;
  seviye: string;
};

type HarfDersRow = {
  ders_id: number;
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

export function OgrenContent() {
  const db = getApiDb();

  const dersler = dbAll<DersRow>(
    db.prepare(
      "SELECT id, baslik, konu_sirasi, seviye FROM elifba_dersler ORDER BY konu_sirasi",
    ),
  );

  const allHarfler = dbAll<HarfDersRow>(
    db.prepare(`
      SELECT hd.ders_id,
             h.harf_id, h.harf_adi, h.harf_sesi, h.tek_basina,
             h.basta, h.ortada, h.sonda, h.mahrec, h.kalin_ince, h.grup
      FROM   elifba_harfler h
      JOIN   elifba_harf_ders hd ON hd.harf_id = h.harf_id
      ORDER  BY hd.ders_id, h.harf_id
    `),
  );

  // Harfleri ders_id'ye göre grupla
  const harflerByDers = new Map<number, HarfDersRow[]>();
  for (const row of allHarfler) {
    if (!harflerByDers.has(row.ders_id)) harflerByDers.set(row.ders_id, []);
    harflerByDers.get(row.ders_id)!.push(row);
  }

  const derslerWithHarfler: DersWithHarfler[] = dersler.map((ders) => ({
    ...ders,
    harfler: (harflerByDers.get(ders.id) ?? []).map(
      ({ ders_id: _d, ...harf }) => harf,
    ),
  }));

  return <OgrenClient dersler={derslerWithHarfler} />;
}
