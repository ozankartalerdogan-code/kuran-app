import { getSurahs } from "@quran-app/core";
import type { Metadata } from "next";
import Link from "next/link";
import { ExpandableText } from "./ExpandableText";

export const metadata: Metadata = {
  title: "Sureler — Kuran Analiz"
};

function RevelationBadge({ place }: { place: string }) {
  const isMekki = place === "Mekke";
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-xs font-medium " +
        (isMekki
          ? "bg-emerald-100 text-emerald-700"
          : "bg-orange-100 text-orange-700")
      }
    >
      {place}
    </span>
  );
}

export default async function SurahListPage() {
  const surahs = await getSurahs();

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-2xl font-semibold text-stone-900">Sureler</h1>
        {/* 1. Belirgin border + shadow */}
        <div className="rounded-lg border border-stone-300 bg-white shadow-md">
          <ul role="list">
            {surahs.map((surah, index) => (
              // 6. Daha ince divider → kompakt görünüm
              <li key={surah.id} className={index > 0 ? "border-t border-stone-200" : ""}>
                <Link
                  href={`/surah/${surah.id}/ayah/1`}
                  className="flex items-center gap-4 px-4 py-2.5 transition-colors duration-100 hover:bg-stone-100"
                >
                  {/* 2. Sure numarası daha büyük ve gri */}
                  <span className="w-9 shrink-0 text-right text-base font-semibold text-stone-400">
                    {surah.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-stone-900">
                      {surah.turkishName.text ?? "—"}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {surah.verseCount != null && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                          {surah.verseCount} ayet
                        </span>
                      )}
                      {surah.revelationOrder != null && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                          {surah.revelationOrder}. nüzul
                        </span>
                      )}
                      {surah.revelationPlace != null && (
                        <RevelationBadge place={surah.revelationPlace} />
                      )}
                    </span>
                    {surah.shortIntroduction != null && (
                      <ExpandableText text={surah.shortIntroduction} />
                    )}
                  </span>
                  {/* 3. Dikey ortalama (self-center), 4. Responsive font-size */}
                  {surah.arabicName != null && (
                    <span
                      className="shrink-0 self-center text-xl sm:text-3xl text-stone-700"
                      dir="rtl"
                      lang="ar"
                    >
                      {surah.arabicName}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
