export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { dbAll } from "../../lib/dbUtils";
import { NUZUL } from "../../data/nuzul";
import { SurahListClient, type SurahItem } from "./SurahListClient";

export const metadata: Metadata = {
  title: "Sureler — Kuran Yolu"
};

interface SurahRow {
  id: number;
  adi_turkce: string;
  adi_arapca: string;
  translit: string;
  tur: string;
  ayet_sayisi: number;
}

export default async function SurahListPage() {
  const rows = await dbAll<SurahRow>(
    "SELECT id, adi_turkce, adi_arapca, translit, tur, ayet_sayisi FROM sureler ORDER BY id"
  );

  const items: SurahItem[] = rows.map((s) => ({
    id:                s.id,
    name:              s.adi_turkce ?? null,
    arabicName:        s.adi_arapca ?? null,
    verseCount:        s.ayet_sayisi ?? null,
    revelationOrder:   NUZUL[s.id] ?? null,
    revelationPlace:   s.tur === "medinan" ? "Medine" : "Mekke",
    shortIntroduction: null,
  }));

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-50">Sureler</h1>
        <SurahListClient surahs={items} />
      </div>
    </main>
  );
}
