"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RootDetail } from "../../../types/rootDetail";

function heatColor(freq: number): string {
  if (freq === 0) return "#f0f0f0";
  const intensity = Math.min(255, Math.round(Math.log2(freq + 1) * 35 + 120));
  return `rgb(${100 + Math.round(intensity * 0.15)}, ${130 + Math.round(intensity * 0.15)}, ${220 + Math.round(intensity * 0.05)})`;
}

function heatColorNight(freq: number): string {
  if (freq === 0) return "#1a1a1a";
  const intensity = Math.min(255, Math.round(Math.log2(freq + 1) * 35 + 60));
  return `rgb(${30 + Math.round(intensity * 0.1)}, ${50 + Math.round(intensity * 0.15)}, ${100 + Math.round(intensity * 0.4)})`;
}

function textColor(freq: number): string {
  if (freq === 0) return "#999";
  const intensity = Math.min(255, Math.round(Math.log2(freq + 1) * 35 + 120));
  return intensity > 160 ? "#fff" : "#222";
}

const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

interface Props {
  root: string;
  data: RootDetail | null;
  error: string | null;
}

export default function RootDetailContent({ root: _root, data, error }: Props) {
  const router = useRouter();
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-600 dark:text-stone-400">
            {error ?? "Veri bulunamadı."}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg bg-navy-600 px-4 py-2 text-sm text-white hover:bg-navy-700"
          >
            Geri Dön
          </button>
        </div>
      </main>
    );
  }

  const maxFreq = Math.max(...Object.values(data.distribution), 1);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      {/* Root Header */}
      <div className="mb-6 text-center">
        <p
          className="text-3xl font-bold text-stone-900 dark:text-stone-100"
          dir="rtl"
          lang="ar"
        >
          {data.root}
        </p>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">
          {data.meaningTr}
        </p>
        <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
          Toplam{" "}
          {Object.values(data.distribution).reduce((s, c) => s + c, 0)} geçiş
          — {Object.values(data.distribution).filter((c) => c > 0).length}{" "}
          surede
        </p>
      </div>

      {/* Heatmap */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Sure Dağılımı (Isı Haritası)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
          <div className="mx-auto grid w-fit grid-cols-12 gap-px bg-stone-300 p-px dark:bg-stone-600">
            {SURAHS.map((surahId) => {
              const freq = data.distribution[surahId] ?? 0;
              const isNight =
                typeof document !== "undefined" &&
                document.documentElement.classList.contains("night-mode");
              const bg = isNight ? heatColorNight(freq) : heatColor(freq);
              const fg = isNight
                ? freq === 0
                  ? "#666"
                  : freq / maxFreq > 0.6
                    ? "#eee"
                    : "#ccc"
                : textColor(freq);

              return (
                <div
                  key={surahId}
                  title={`Sure ${surahId} — Geçiş sayısı: ${freq}`}
                  className="flex h-10 w-10 items-center justify-center text-[10px] font-medium transition-colors hover:ring-2 hover:ring-navy-400 sm:h-11 sm:w-11 sm:text-xs"
                  style={{
                    backgroundColor: bg,
                    color: fg,
                    opacity: freq === 0 ? 0.5 : 1,
                  }}
                >
                  {surahId}
                </div>
              );
            })}
          </div>
        </div>
        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: "#f0f0f0" }}
          />{" "}
          0
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: heatColor(1) }}
          />{" "}
          Düşük
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: heatColor(maxFreq) }}
          />{" "}
          Yüksek ({maxFreq})
        </div>
      </section>

      {/* Derived Words — anlama göre gruplandırılmış */}
      <section>
        {data.derivedWords.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
            Henüz türev kelime bulunamadı.
          </p>
        ) : (
          <>
            {(() => {
              // word bazında grupla — her benzersiz Arapça form = 1 accordion
              type Occurrence = { meaning: string; surahId: number; ayahNumber: number };
              type WordGroup = { word: string; occurrences: Occurrence[] };
              const wordMap = new Map<string, WordGroup>();
              for (const dw of data.derivedWords) {
                if (!wordMap.has(dw.word)) {
                  wordMap.set(dw.word, { word: dw.word, occurrences: [] });
                }
                wordMap.get(dw.word)!.occurrences.push({
                  meaning: dw.meaning,
                  surahId: dw.surahId,
                  ayahNumber: dw.ayahNumber,
                });
              }
              const groups = Array.from(wordMap.values());

              // Her formun en sık anlamını başlıkta göster
              function primaryMeaning(occs: Occurrence[]): string {
                const freq = new Map<string, number>();
                for (const o of occs) freq.set(o.meaning, (freq.get(o.meaning) ?? 0) + 1);
                return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
              }

              return (
                <>
                  <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Türev Kelimeler
                    <span className="ml-2 text-sm font-normal text-stone-500">
                      ({groups.length} form)
                    </span>
                  </h2>
                  <div className="flex flex-col gap-2">
                    {groups.map((group) => {
                      const isOpen = expandedWord === group.word;
                      const mainMeaning = primaryMeaning(group.occurrences);
                      return (
                        <div
                          key={group.word}
                          className="rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
                        >
                          <button
                            onClick={() => setExpandedWord(isOpen ? null : group.word)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <span className="text-lg font-semibold text-stone-900 dark:text-stone-100" dir="rtl" lang="ar">
                                {group.word}
                              </span>
                              <span className="truncate text-sm text-stone-600 dark:text-stone-400">
                                {mainMeaning}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700 dark:bg-navy-900 dark:text-navy-300">
                                {group.occurrences.length} ayet
                              </span>
                              <svg
                                className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="flex flex-wrap gap-1.5 border-t border-stone-100 px-4 py-3 dark:border-stone-700">
                              {group.occurrences.map((o, i) => (
                                <button
                                  key={i}
                                  onClick={() => router.push(`/surah/${o.surahId}/ayah/${o.ayahNumber}`)}
                                  title={o.meaning}
                                  className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300"
                                >
                                  {o.surahId}:{o.ayahNumber}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </section>
    </main>
  );
}