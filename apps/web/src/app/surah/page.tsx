import { getSurahs } from "@quran-app/core";
import type { Surah } from "@quran-app/types";
import type { Metadata } from "next";
import { SurahListClient, type SurahItem } from "./SurahListClient";

export const metadata: Metadata = {
  title: "Sureler — Kuran Analiz"
};

// Runtime nesnesi @quran-app/types'taki Surah'dan fazla alan taşır
type SurahRuntime = Surah & {
  revelationOrder?: number | null;
  revelationPlace?: string | null;
  shortIntroduction?: string | null;
};

export default async function SurahListPage() {
  const surahs = await getSurahs() as SurahRuntime[];

  const items: SurahItem[] = surahs.map((s) => ({
    id:                s.id,
    name:              s.turkishName.text ?? null,
    arabicName:        s.arabicName ?? null,
    verseCount:        s.verseCount ?? null,
    revelationOrder:   s.revelationOrder ?? null,
    revelationPlace:   s.revelationPlace ?? null,
    shortIntroduction: s.shortIntroduction ?? null,
  }));

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-2xl font-semibold text-stone-900">Sureler</h1>
        <SurahListClient surahs={items} />
      </div>
    </main>
  );
}
