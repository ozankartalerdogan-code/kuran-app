import { getSurahs } from "@quran-app/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sureler — Kuran Analiz"
};

export default async function SurahListPage() {
  const surahs = await getSurahs();

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-stone-900">Sureler</h1>
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
          <ul role="list">
            {surahs.map((surah, index) => (
              <li key={surah.id} className={index > 0 ? "border-t border-stone-100" : ""}>
                <Link
                  href={`/surah/${surah.id}/ayah/1`}
                  className="flex items-start gap-4 px-5 py-3 hover:bg-stone-50"
                >
                  <span className="mt-0.5 w-8 shrink-0 text-right font-mono text-sm text-stone-500">
                    {surah.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-stone-900">
                        {surah.turkishName.text ?? "—"}
                      </span>
                      <span className="text-sm text-stone-500">
                        {surah.verseCount != null ? `${surah.verseCount} ayet` : "—"}
                      </span>
                      {(surah.revelationPlace != null || surah.revelationOrder != null) ? (
                        <span className="text-xs text-stone-400">
                          {[
                            surah.revelationPlace,
                            surah.revelationOrder != null ? `${surah.revelationOrder}. nüzul` : null
                          ].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    {surah.shortIntroduction != null ? (
                      <span className="mt-0.5 block text-xs leading-5 text-stone-500">
                        {surah.shortIntroduction}
                      </span>
                    ) : null}
                  </span>
                  {surah.arabicName != null ? (
                    <span className="mt-0.5 shrink-0 text-xl text-stone-700" dir="rtl" lang="ar">
                      {surah.arabicName}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
