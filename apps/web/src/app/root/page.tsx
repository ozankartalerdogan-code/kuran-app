import Link from "next/link";
import { getApiDb, dbAll } from "../../lib/dbUtils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelime Kökleri — Kuran Analiz",
};

interface RootRow {
  root: string;
  meaning_tr: string;
  verse_count: number;
}

export default function RootIndexPage() {
  const db = getApiDb();

  const roots = dbAll<RootRow>(
    db.prepare(`
      SELECT rm.root, rm.meaning_tr,
             COUNT(DISTINCT w.verse_key) AS verse_count
      FROM root_meanings rm
      LEFT JOIN words w ON w.root = rm.root
      WHERE rm.source = 'root_explanations_seed'
      GROUP BY rm.root
      ORDER BY verse_count DESC
      LIMIT 200
    `)
  );

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 dark:bg-stone-950">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Kelime Kökleri
        </h1>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          En çok geçen 200 Arapça kök — kök adına tıklayarak dağılım ve türevleri görün
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {roots.map((r) => (
            <Link
              key={r.root}
              href={`/root/${encodeURIComponent(r.root)}`}
              className="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
            >
              <span
                className="text-xl font-semibold text-stone-900 dark:text-stone-100"
                dir="rtl"
                lang="ar"
              >
                {r.root}
              </span>
              <span className="text-xs text-stone-600 dark:text-stone-400">{r.meaning_tr}</span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {r.verse_count} ayet
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
