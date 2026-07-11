"use client";

import { useState } from "react";
import Link from "next/link";
import { ExpandableText } from "./ExpandableText";

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
          ? "bg-navy-100 text-navy-700 dark:bg-navy-950/40 dark:text-navy-400"
          : "bg-gold-100 text-gold-800 dark:bg-gold-950/40 dark:text-gold-400")
      }
    >
      {place}
    </span>
  );
}

export function SurahListClient({ surahs }: { surahs: SurahItem[] }) {
  const [order, setOrder] = useState<"mushaf" | "nuzul">("mushaf");
  const [place, setPlace] = useState<"all" | "Mekke" | "Medine">("all");

  const filtered =
    place === "all" ? surahs : surahs.filter((s) => s.revelationPlace === place);

  const sorted =
    order === "mushaf"
      ? [...filtered].sort((a, b) => a.id - b.id)
      : [...filtered].sort((a, b) => {
          if (a.revelationOrder == null && b.revelationOrder == null) return a.id - b.id;
          if (a.revelationOrder == null) return 1;
          if (b.revelationOrder == null) return -1;
          return a.revelationOrder - b.revelationOrder;
        });

  const PLACE_CHIPS: { value: typeof place; label: string; active: string }[] = [
    { value: "all",    label: "Tümü",   active: "border-stone-400 bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900" },
    { value: "Mekke",  label: "Mekki",  active: "border-navy-300 bg-navy-800 text-white dark:bg-navy-700" },
    { value: "Medine", label: "Medeni", active: "border-gold-300 bg-gold-600 text-white dark:bg-gold-700" },
  ];

  return (
    <>
      {/* Toggle */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <button
            className={`px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
              order === "mushaf"
                ? "bg-navy-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
            onClick={() => setOrder("mushaf")}
            type="button"
          >
            Mushaf Sırası
          </button>
          <button
            className={`border-l border-stone-200 px-4 py-2 text-sm font-medium transition-all active:scale-95 dark:border-stone-700 ${
              order === "nuzul"
                ? "bg-navy-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
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

      {/* Mekki / Medeni filtresi */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PLACE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={place === chip.value}
            onClick={() => setPlace(chip.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
              place === chip.value
                ? chip.active + " shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
          >
            {chip.label}
          </button>
        ))}
        <span className="text-xs text-stone-400" aria-live="polite">
          {sorted.length} sure
        </span>
      </div>

      {/* Liste */}
      <div className="rounded-2xl border border-stone-300 bg-white shadow-md dark:border-stone-700 dark:bg-stone-900">
        <ul role="list">
          {sorted.map((surah, index) => {
            const leftNo =
              order === "mushaf"
                ? surah.id
                : (surah.revelationOrder ?? "?");

            return (
              <li
                key={surah.id}
                className={index > 0 ? "border-t border-stone-200 dark:border-stone-700" : ""}
              >
                <div className="flex items-stretch transition-colors duration-100 hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <Link
                    href={`/surah/${surah.id}/ayah/1`}
                    className="flex min-h-[52px] flex-1 items-center gap-4 px-4 py-3"
                  >
                    {/* Sol numara */}
                    <span className="w-9 shrink-0 text-right text-base font-semibold text-stone-400">
                      {leftNo}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        {surah.name ?? "—"}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {surah.verseCount != null && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                            {surah.verseCount} ayet
                          </span>
                        )}
                        {/* Nüzul modundayken Mushaf numarasını göster, Mushaf modundayken nüzul sırasını */}
                        {order === "nuzul" && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-700 dark:text-stone-400">
                            Mushaf: {surah.id}
                          </span>
                        )}
                        {order === "mushaf" && surah.revelationOrder != null && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-700 dark:text-stone-300">
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
                        className="shrink-0 self-center text-xl text-stone-700 dark:text-stone-200 sm:text-3xl"
                        dir="rtl"
                        lang="ar"
                      >
                        {surah.arabicName}
                      </span>
                    )}
                  </Link>

                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
