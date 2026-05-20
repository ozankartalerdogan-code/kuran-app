import { DatabaseSync } from "node:sqlite";
import type { Metadata } from "next";
import Link from "next/link";
import path from "path";

interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export function generateMetadata({ searchParams }: PageProps): Metadata {
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  return { title: q ? `"${q}" — Arama` : "Arama" };
}

interface SurahRow {
  id: number;
  adi_turkce: string;
  adi_arapca: string;
}

interface FtsRow {
  sure: number;
  ayet: number;
  diyanet: string;
}

interface ResultItem {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  excerpt: string;
}

interface PageData {
  surahMatch: SurahRow | null;
  results: ResultItem[];
}

function normalizeTurkish(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/ı/gu, "i")
    .trim();
}

function findSurahMatch(q: string, surahs: SurahRow[]): SurahRow | null {
  const norm = normalizeTurkish(q);

  for (const s of surahs) {
    if (normalizeTurkish(s.adi_turkce) === norm) return s;
  }
  for (const s of surahs) {
    if (normalizeTurkish(s.adi_turkce).startsWith(norm)) return s;
  }
  for (const s of surahs) {
    if (s.adi_arapca.includes(q)) return s;
  }

  return null;
}

function runQuery(q: string): PageData {
  const dbPath = path.join(process.cwd(), "..", "..", "data", "app.db");
  const ftsQuery = `"${q.replace(/"/gu, '""')}"*`;

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    db.exec("PRAGMA cache_size=-32768; PRAGMA mmap_size=268435456; PRAGMA temp_store=MEMORY; PRAGMA busy_timeout=5000;");

    const allSurahs = db
      .prepare("SELECT id, adi_turkce, adi_arapca FROM sureler ORDER BY id")
      .all() as unknown as SurahRow[];

    const surahMatch = findSurahMatch(q, allSurahs);

    const surahMap = new Map(allSurahs.map((s) => [s.id, s.adi_turkce]));

    // ayet_fts already stores sure, ayet and diyanet — no join needed
    const ftsRows = db
      .prepare(
        `SELECT sure, ayet, diyanet
         FROM ayet_fts
         WHERE ayet_fts MATCH ?
         LIMIT 20`
      )
      .all(ftsQuery) as unknown as FtsRow[];

    db.close();

    const results = ftsRows.map((row) => ({
      verseKey: `${row.sure}:${row.ayet}`,
      surahId: row.sure,
      ayahNumber: row.ayet,
      surahName: surahMap.get(row.sure) ?? `Sure ${row.sure}`,
      excerpt: row.diyanet.length > 80 ? row.diyanet.slice(0, 80) + "…" : row.diyanet
    }));

    return { surahMatch, results };
  } catch {
    return { surahMatch: null, results: [] };
  }
}

export default function AramaPage({ searchParams }: PageProps) {
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const { surahMatch, results } = q.length >= 2 ? runQuery(q) : { surahMatch: null, results: [] };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <header>
          <h1 className="text-xl font-semibold text-stone-900">
            {q ? (
              <>
                <span className="text-stone-500">Arama: </span>
                {q}
              </>
            ) : (
              "Arama"
            )}
          </h1>
        </header>

        {!q && (
          <p className="text-sm text-stone-500">
            Arama yapmak için üst kısımdaki arama kutusuna kelime yazın ve Enter'a basın.
          </p>
        )}

        {/* Sure eşleşmesi */}
        {surahMatch && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Sure eşleşmesi
            </h2>
            <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
              <Link
                href={`/surah/${surahMatch.id}/ayah/1`}
                className="flex items-center justify-between px-5 py-4 hover:bg-stone-50"
              >
                <span className="font-medium text-stone-900">{surahMatch.adi_turkce}</span>
                <span className="text-sm text-stone-400">Sure {surahMatch.id} →</span>
              </Link>
            </div>
          </section>
        )}

        {/* Ayet sonuçları */}
        {q && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              {results.length > 0
                ? `Ayet sonuçları (${results.length})`
                : "Ayet sonuçları"}
            </h2>

            {results.length === 0 ? (
              <div className="rounded-md border border-stone-200 bg-white p-6">
                <p className="text-sm text-stone-600">
                  <span className="font-medium">"{q}"</span> için meal içinde sonuç bulunamadı.
                </p>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
                {results.map((item, index) => (
                  <li key={item.verseKey} className={index > 0 ? "border-t border-stone-100" : ""}>
                    <Link
                      href={`/surah/${item.surahId}/ayah/${item.ayahNumber}`}
                      className="flex flex-col px-5 py-4 hover:bg-stone-50"
                    >
                      <span className="text-sm font-medium text-stone-800">
                        {item.surahName}
                        <span className="mx-1.5 text-stone-400">·</span>
                        Ayet {item.ayahNumber}
                        <span className="ml-2 font-mono text-xs font-normal text-stone-400">{item.verseKey}</span>
                      </span>
                      <span className="mt-1 text-sm leading-6 text-stone-600">{item.excerpt}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

      </div>
    </main>
  );
}
