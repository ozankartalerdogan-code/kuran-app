import Link from "next/link";
import {dbAll } from "../../lib/dbUtils";
import { OgrenClient, type DersWithHarfler } from "./OgrenClient";

type DersRow = {
  id: number;
  baslik: string;
  konu_sirasi: number;
  seviye: string;
};

const CONTENT_LINKS = [
  {
    title: "Dersler",
    subtitle: "17 ders, kartlı okuma ve quizler",
    href: "/ogren/dersler",
  },
  {
    title: "Peygamber Kıssaları",
    subtitle: "25 peygamberin kıssası",
    href: "/peygamber-kissalari",
  },
  {
    title: "Siyer-i Nebî",
    subtitle: "Hz. Peygamber'in hayatı",
    href: "/siyer",
  },
  {
    title: "Mübarek Günler",
    subtitle: "Mübarek gün ve geceler",
    href: "/mubarek-gunler",
  },
  {
    title: "Hadisler",
    subtitle: "Seçme hadisler ve konu başlıkları",
    href: "/hadisler",
  },
];
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

export async function OgrenContent() {

  const dersler = await dbAll<DersRow>(
    "SELECT id, baslik, konu_sirasi, seviye FROM elifba_dersler ORDER BY konu_sirasi",
  );

  const allHarfler = await dbAll<HarfDersRow>(`
      SELECT hd.ders_id,
             h.harf_id, h.harf_adi, h.harf_sesi, h.tek_basina,
             h.basta, h.ortada, h.sonda, h.mahrec, h.kalin_ince, h.grup
      FROM   elifba_harfler h
      JOIN   elifba_harf_ders hd ON hd.harf_id = h.harf_id
      ORDER  BY hd.ders_id, h.harf_id
    `);

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

  return (
    <>
      <section className="mx-auto max-w-2xl px-4 pt-8">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 w-6 rounded-full bg-emerald-500" />
          <div>
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">Öğrenme İçerikleri</h2>
            <p className="text-xs text-stone-400">Mobildeki temel içerik ekranları</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTENT_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-800/60 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-800 group-hover:text-emerald-800 dark:text-stone-100 dark:group-hover:text-emerald-300">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
                </div>
                <span className="text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <OgrenClient dersler={derslerWithHarfler} />
    </>
  );
}
