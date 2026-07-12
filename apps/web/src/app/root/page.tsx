export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { suppressedVisibleRootsSql } from "../../lib/rootVisibility";
import type { RootItem } from "../../types/root";
import RootListClient from "./RootListClient";

export const metadata: Metadata = {
  title: "Kelime Kökleri — Kuran Yolu",
  description: "En çok geçen 200 Arapça kök ve anlamları",
};

export default async function RootIndexPage() {
  let roots: RootItem[] = [];

  try {
    // SSR: DB'den doğrudan oku — HTTP fetch'te port bağımlılığı yok
    const {dbAll } = await import("../../lib/dbUtils");
    interface DbRoot { root: string; meaning_tr: string; frequency: number }
    const rows = await dbAll<DbRoot>(`
      SELECT r.root,
             COALESCE(
               MAX(CASE WHEN r.source = 'root_explanations_seed' THEN r.meaning_tr END),
               MAX(r.meaning_tr),
               ''
             ) AS meaning_tr,
             (SELECT COUNT(*) FROM words w WHERE w.root = r.root) AS frequency
      FROM   root_meanings r
      WHERE  r.root IS NOT NULL
        AND  TRIM(r.root) <> ''
        AND  r.root NOT IN (${suppressedVisibleRootsSql})
      GROUP BY r.root
      ORDER BY frequency DESC
      LIMIT  200
    `);
    roots = rows.map(r => ({ root: r.root, meaning_tr: r.meaning_tr, frequency: r.frequency }));
  } catch {
    // Keep empty list
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-center text-2xl font-semibold text-stone-900 dark:text-stone-100">
        Kelime Kökleri
      </h1>
      <p className="mb-6 text-center text-sm text-stone-500 dark:text-stone-400">
        En çok geçen 200 Arapça kök
      </p>
      <RootListClient roots={roots} />
    </main>
  );
}