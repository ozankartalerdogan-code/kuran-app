export const dynamic = "force-dynamic";
import type { Metadata } from "next";
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
             COALESCE(r.meaning_tr, '') AS meaning_tr,
             COUNT(w.id)               AS frequency
      FROM   root_meanings r
      LEFT JOIN words w ON w.root = r.root
      GROUP BY r.root
      ORDER BY frequency DESC
      LIMIT  200
    `);
    roots = rows.map(r => ({ root: r.root, meaning_tr: r.meaning_tr, frequency: r.frequency }));
  } catch {
    // Keep empty list
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 night-mode:bg-stone-950">
      <h1 className="mb-1 text-center text-2xl font-semibold text-stone-900 night-mode:text-stone-100">
        Kelime Kökleri
      </h1>
      <p className="mb-6 text-center text-sm text-stone-500 night-mode:text-stone-400">
        En çok geçen 200 Arapça kök
      </p>
      <RootListClient roots={roots} />
    </main>
  );
}