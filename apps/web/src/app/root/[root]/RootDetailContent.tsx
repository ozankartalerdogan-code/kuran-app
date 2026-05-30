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
      <main className="flex min-h-screen items-center justify-center bg-stone-50 night-mode:bg-stone-950">
        <div className="text-center">
          <p className="text-lg text-stone-600 night-mode:text-stone-400">
            {error ?? "Veri bulunamadı."}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
          >
            Geri Dön
          </button>
        </div>
      </main>
    );
  }

  const maxFreq = Math.max(...Object.values(data.distribution), 1);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 night-mode:bg-stone-950">
      {/* Root Header */}
      <div className="mb-6 text-center">
        <p
          className="text-3xl font-bold text-stone-900 night-mode:text-stone-100"
          dir="rtl"
          lang="ar"
        >
          {data.root}
        </p>
        <p className="mt-2 text-lg text-stone-600 night-mode:text-stone-400">
          {data.meaningTr}
        </p>
        <p className="mt-1 text-sm text-stone-400 night-mode:text-stone-500">
          Toplam{" "}
          {Object.values(data.distribution).reduce((s, c) => s + c, 0)} geçiş
          — {Object.values(data.distribution).filter((c) => c > 0).length}{" "}
          surede
        </p>
      </div>

      {/* Heatmap */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-stone-800 night-mode:text-stone-200">
          Sure Dağılımı (Isı Haritası)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-stone-200 night-mode:border-stone-700">
          <div className="mx-auto grid w-fit grid-cols-12 gap-px bg-stone-300 p-px night-mode:bg-stone-600">
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
                  className="flex h-10 w-10 items-center justify-center text-[10px] font-medium transition-colors hover:ring-2 hover:ring-emerald-400 sm:h-11 sm:w-11 sm:text-xs"
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
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-stone-500 night-mode:text-stone-400">
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
          <p className="py-6 text-center text-sm text-stone-400 night-mode:text-stone-500">
            Henüz türev kelime bulunamadı.
          </p>
        ) : (
          <>
            {(() => {
              // 1. Önce word+meaning bazında benzersiz formları bul, verse listelerini topla
              type FormEntry = { word: string; verses: { surahId: number; ayahNumber: number }[] };
              const formMap = new Map<string, FormEntry>();
              for (const dw of data.derivedWords) {
                const formKey = `${dw.word}|||${dw.meaning}`;
                if (!formMap.has(formKey)) {
                  formMap.set(formKey, { word: dw.word, verses: [] });
                }
                formMap.get(formKey)!.verses.push({ surahId: dw.surahId, ayahNumber: dw.ayahNumber });
              }

              // 2. meaning'e göre form gruplarını topla
              type MeaningGroup = { meaning: string; forms: FormEntry[] };
              const meaningMap = new Map<string, MeaningGroup>();
              for (const [formKey, form] of formMap.entries()) {
                const meaning = formKey.split("|||")[1] || "—";
                if (!meaningMap.has(meaning)) {
                  meaningMap.set(meaning, { meaning, forms: [] });
                }
                meaningMap.get(meaning)!.forms.push(form);
              }

              const groups = Array.from(meaningMap.values());

              return (
                <>
                  <h2 className="mb-3 text-lg font-semibold text-stone-800 night-mode:text-stone-200">
                    Türev Kelimeler
                    <span className="ml-2 text-sm font-normal text-stone-500">
                      ({groups.length} anlam, {formMap.size} form)
                    </span>
                  </h2>
                  <div className="flex flex-col gap-2">
                    {groups.map((group) => {
                      const isOpen = expandedWord === group.meaning;
                      const totalVerses = group.forms.reduce((s, f) => s + f.verses.length, 0);
                      return (
                        <div
                          key={group.meaning}
                          className="rounded-lg border border-stone-200 bg-white night-mode:border-stone-700 night-mode:bg-stone-800"
                        >
                          <button
                            onClick={() => setExpandedWord(isOpen ? null : group.meaning)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <span className="flex flex-wrap gap-1.5" dir="rtl" lang="ar">
                                {group.forms.map((f) => (
                                  <span key={f.word} className="text-lg font-semibold text-stone-900 night-mode:text-stone-100">
                                    {f.word}
                                  </span>
                                ))}
                              </span>
                              <span className="truncate text-sm text-stone-600 night-mode:text-stone-400">
                                {group.meaning}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 night-mode:bg-emerald-900 night-mode:text-emerald-300">
                                {totalVerses} ayet
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
                            <div className="divide-y divide-stone-100 border-t border-stone-100 night-mode:divide-stone-700 night-mode:border-stone-700">
                              {group.forms.map((form) => (
                                <div key={form.word} className="px-4 py-2.5">
                                  <div className="mb-1.5 flex items-center gap-2">
                                    <span className="text-base font-medium text-stone-900 night-mode:text-stone-100" dir="rtl" lang="ar">
                                      {form.word}
                                    </span>
                                    <span className="text-xs text-stone-400">
                                      {form.verses.length} ayette
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {form.verses.map((v, i) => (
                                      <button
                                        key={i}
                                        onClick={() => router.push(`/surah/${v.surahId}/ayah/${v.ayahNumber}`)}
                                        className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 night-mode:border-stone-600 night-mode:bg-stone-700 night-mode:text-stone-300"
                                      >
                                        {v.surahId}:{v.ayahNumber}
                                      </button>
                                    ))}
                                  </div>
                                </div>
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