import { notFound } from "next/navigation";
import Link from "next/link";
import { getApiDb, dbGet, dbAll } from "../../../lib/dbUtils";
import { RootDistribution } from "./RootDistribution";
import { RootDerivatives } from "./RootDerivatives";
import type { SurahBar } from "./RootDistribution";
import type { DerivativeGroup } from "./RootDerivatives";

interface PageProps {
  params: { root: string };
}

interface RootMeaningRow {
  root: string;
  meaning_tr: string;
  short_tr: string | null;
  summary_tr: string | null;
}

interface SurahCountRow {
  surah_no: number;
  count: number;
}

interface SurahNameRow {
  id: number;
  adi_turkce: string;
}

interface DerivativeRow {
  lemma: string;
  meaning_tr: string;
  pos: string;
  verse_key: string;
}

export async function generateMetadata({ params }: PageProps) {
  const root = decodeURIComponent(params.root);
  return { title: `${root} — Kelime Kökü · KuranApp` };
}

export default async function RootPage({ params }: PageProps) {
  const root = decodeURIComponent(params.root);
  const db = getApiDb();

  const rootMeaning = dbGet<RootMeaningRow>(
    db.prepare(`
      SELECT root, meaning_tr, short_tr, summary_tr
      FROM root_meanings
      WHERE root = ?
      ORDER BY CASE source WHEN 'root_explanations_seed' THEN 0 ELSE 1 END
      LIMIT 1
    `),
    root
  );

  if (!rootMeaning) {
    notFound();
  }

  const surahCountRows = dbAll<SurahCountRow>(
    db.prepare(`
      SELECT
        CAST(SUBSTR(verse_key, 1, INSTR(verse_key, ':')-1) AS INTEGER) AS surah_no,
        COUNT(DISTINCT verse_key) AS count
      FROM words
      WHERE root = ?
      GROUP BY surah_no
      ORDER BY surah_no
    `),
    root
  );

  const surahNameRows = dbAll<SurahNameRow>(
    db.prepare("SELECT id, adi_turkce FROM sureler ORDER BY id")
  );
  const surahNameMap = new Map(surahNameRows.map((r) => [r.id, r.adi_turkce]));

  const surahBars: SurahBar[] = Array.from({ length: 114 }, (_, i) => ({
    surahNo: i + 1,
    surahName: surahNameMap.get(i + 1) ?? String(i + 1),
    count: surahCountRows.find((s) => s.surah_no === i + 1)?.count ?? 0,
  }));

  const totalVerses = surahCountRows.reduce((sum, r) => sum + r.count, 0);

  const derivativeRows = dbAll<DerivativeRow>(
    db.prepare(`
      SELECT lemma, COALESCE(meaning_tr, '') AS meaning_tr, COALESCE(pos, '') AS pos, verse_key
      FROM words
      WHERE root = ?
      GROUP BY lemma, COALESCE(meaning_tr, ''), COALESCE(pos, ''), verse_key
      ORDER BY lemma
    `),
    root
  );

  const groupMap = new Map<string, DerivativeGroup>();
  for (const row of derivativeRows) {
    const key = `${row.lemma}||${row.meaning_tr}||${row.pos}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        lemma: row.lemma,
        meaning_tr: row.meaning_tr,
        pos: row.pos,
        verseKeys: [],
      });
    }
    groupMap.get(key)!.verseKeys.push(row.verse_key);
  }

  const derivativeGroups: DerivativeGroup[] = Array.from(groupMap.values()).sort(
    (a, b) => b.verseKeys.length - a.verseKeys.length
  );

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
          href="/discover"
        >
          ← Keşfet
        </Link>

        <header className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="text-4xl font-bold leading-tight text-stone-950"
                dir="rtl"
                lang="ar"
              >
                {rootMeaning.root}
              </h1>
              <p className="mt-2 text-xl font-semibold text-emerald-700">
                {rootMeaning.meaning_tr}
              </p>
              {rootMeaning.short_tr &&
              rootMeaning.short_tr !== rootMeaning.meaning_tr ? (
                <p className="mt-1 text-sm text-stone-500">{rootMeaning.short_tr}</p>
              ) : null}
              {rootMeaning.summary_tr ? (
                <p className="mt-3 max-w-prose text-sm leading-6 text-stone-600">
                  {rootMeaning.summary_tr}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 text-right">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {totalVerses} ayette geçiyor
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                {surahCountRows.length} sure
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                {derivativeGroups.length} türev form
              </span>
            </div>
          </div>
        </header>

        <RootDistribution surahBars={surahBars} />

        <RootDerivatives groups={derivativeGroups} />
      </div>
    </main>
  );
}
