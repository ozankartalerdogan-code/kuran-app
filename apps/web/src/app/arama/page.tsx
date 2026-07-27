export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { dbAll } from "../../lib/dbUtils";
import { PageHeader } from "../../components/PageHeader";

interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export function generateMetadata({ searchParams }: PageProps): Metadata {
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  return { title: q ? `"${q}" — Arama` : "Arama" };
}

interface SurahRow { id: number; adi_turkce: string; adi_arapca: string }
interface FtsRow   { verse_key: string; surah_id: number; ayah_number: number; meal: string }

interface ResultItem {
  verseKey:   string;
  surahId:    number;
  ayahNumber: number;
  surahName:  string;
  excerpt:    string;
}

function normalizeTurkish(text: string): string {
  return text.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/gu, "").replace(/ı/gu, "i").trim();
}

function findSurahMatch(q: string, surahs: SurahRow[]): SurahRow | null {
  const norm = normalizeTurkish(q);
  for (const s of surahs) if (normalizeTurkish(s.adi_turkce) === norm) return s;
  for (const s of surahs) if (normalizeTurkish(s.adi_turkce).startsWith(norm)) return s;
  for (const s of surahs) if (s.adi_arapca.includes(q)) return s;
  return null;
}

async function runQuery(q: string): Promise<{ surahMatch: SurahRow | null; results: ResultItem[] }> {
  const ftsQuery = `"${q.replace(/"/g, '""')}"*`;
  try {
    const allSurahs  = await dbAll<SurahRow>("SELECT id, adi_turkce, adi_arapca FROM sureler ORDER BY id");
    const surahMatch = findSurahMatch(q, allSurahs);
    const surahMap   = new Map(allSurahs.map(s => [s.id, s.adi_turkce]));
    const ftsRows    = await dbAll<FtsRow>(
      "SELECT verse_key, surah_id, ayah_number, meal FROM ayet_fts WHERE ayet_fts MATCH ? LIMIT 20",
      ftsQuery
    );
    const results = ftsRows.map(row => ({
      verseKey:   row.verse_key,
      surahId:    row.surah_id,
      ayahNumber: row.ayah_number,
      surahName:  surahMap.get(row.surah_id) ?? `Sure ${row.surah_id}`,
      excerpt:    row.meal.length > 80 ? row.meal.slice(0, 80) + "…" : row.meal,
    }));
    return { surahMatch, results };
  } catch {
    return { surahMatch: null, results: [] };
  }
}

export default async function AramaPage({ searchParams }: PageProps) {
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  redirect(q ? `/search?q=${encodeURIComponent(q)}` : "/search");

  const { surahMatch, results } = q.length >= 2
    ? await runQuery(q)
    : { surahMatch: null, results: [] };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          icon={Search}
          title={q ? `Arama: ${q}` : "Arama"}
          description={q ? undefined : "Arama yapmak için arama kutusuna kelime yazın ve Enter'a basın."}
        />
        {surahMatch && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Sure</h2>
            <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
              <Link href={`/surah/${surahMatch!.id}/ayah/1`} className="flex items-center justify-between px-5 py-4 hover:bg-stone-50">
                <span className="font-medium text-stone-900">{surahMatch!.adi_turkce}</span>
                <span className="text-sm text-stone-400">Sure {surahMatch!.id} →</span>
              </Link>
            </div>
          </section>
        )}
        {q && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              {results.length > 0 ? `Ayet sonuçları (${results.length})` : "Ayet sonuçları"}
            </h2>
            {results.length === 0 ? (
              <div className="rounded-md border border-stone-200 bg-white p-6">
                <p className="text-sm text-stone-600">{q} için sonuç bulunamadı.</p>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
                {results.map((item, idx) => (
                  <li key={item.verseKey} className={idx > 0 ? "border-t border-stone-100" : ""}>
                    <Link href={`/surah/${item.surahId}/ayah/${item.ayahNumber}`} className="flex flex-col px-5 py-4 hover:bg-stone-50">
                      <span className="text-sm font-medium text-stone-800">{item.surahName} · Ayet {item.ayahNumber}</span>
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
