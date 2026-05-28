"use client";

import { useState } from "react";
import Link from "next/link";
import { ExpandableText } from "./ExpandableText";
import { AudioPlayer } from "../../components/AudioPlayer";

export interface SurahItem {
  id: number;
  name: string | null;
  arabicName: string | null;
  verseCount: number | null;
  revelationOrder: number | null;
  revelationPlace: string | null;
  shortIntroduction: string | null;
}

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

export function SurahListClient({ surahs }: { surahs: SurahItem[] }) {
  const [order, setOrder] = useState<"mushaf" | "nuzul">("mushaf");

  const sorted =
    order === "mushaf"
      ? [...surahs].sort((a, b) => a.id - b.id)
      : [...surahs].sort((a, b) => {
          if (a.revelationOrder == null && b.revelationOrder == null) return a.id - b.id;
          if (a.revelationOrder == null) return 1;
          if (b.revelationOrder == null) return -1;
          return a.revelationOrder - b.revelationOrder;
        });

  return (
    <>
      {/* Toggle */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              order === "mushaf"
                ? "bg-stone-900 text-white"
                : "text-stone-700 hover:bg-stone-50"
            }`}
            onClick={() => setOrder("mushaf")}
            type="button"
          >
            Mushaf Sırası
          </button>
          <button
            className={`border-l border-stone-200 px-4 py-2 text-sm font-medium transition-colors ${
              order === "nuzul"
                ? "bg-stone-900 text-white"
                : "text-stone-700 hover:bg-stone-50"
            }`}
            onClick={() => setOrder("nuzul")}
            type="button"
          >
            Nüzul Sırası
          </button>
        </div>
        <span className="text-xs text-stone-400">
          {order === "mushaf"
            ? "Kur'an'daki sıra (1–114)"
            : "Vahiy geliş sırası"}
        </span>
      </div>

      {/* Liste */}
      <div className="rounded-lg border border-stone-300 bg-white shadow-md">
        <ul role="list">
          {sorted.map((surah, index) => {
            const leftNo =
              order === "mushaf"
                ? surah.id
                : (surah.revelationOrder ?? "?");

            return (
              <li
                key={surah.id}
                className={index > 0 ? "border-t border-stone-200" : ""}
              >
                <div className="flex items-stretch transition-colors duration-100 hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <Link
                    href={`/surah/${surah.id}/ayah/1`}
                    className="flex flex-1 items-center gap-4 px-4 py-2.5"
                  >
                    {/* Sol numara */}
                    <span className="w-9 shrink-0 text-right text-base font-semibold text-stone-400">
                      {leftNo}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-stone-900">
                        {surah.name ?? "—"}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {surah.verseCount != null && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                            {surah.verseCount} ayet
                          </span>
                        )}
                        {/* Nüzul modundayken Mushaf numarasını göster, Mushaf modundayken nüzul sırasını */}
                        {order === "nuzul" && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                            Mushaf: {surah.id}
                          </span>
                        )}
                        {order === "mushaf" && surah.revelationOrder != null && (
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

                    {surah.arabicName != null && (
                      <span
                        className="shrink-0 self-center text-xl text-stone-700 sm:text-3xl"
                        dir="rtl"
                        lang="ar"
                      >
                        {surah.arabicName}
                      </span>
                    )}
                  </Link>

                  <div className="flex shrink-0 items-center border-l border-stone-100 px-3 dark:border-stone-800">
                    <AudioPlayer surahId={surah.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
