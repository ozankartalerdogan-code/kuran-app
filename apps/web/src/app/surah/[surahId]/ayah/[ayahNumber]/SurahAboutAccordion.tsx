"use client";

import { useState } from "react";

interface SurahAboutAccordionProps {
  surahId:       number;
  revelationPlace: string | null;
  revelationOrder: number | null;
}

export function SurahAboutAccordion({
  surahId,
  revelationPlace,
  revelationOrder,
}: SurahAboutAccordionProps) {
  const [open, setOpen]     = useState(false);
  const [tafsir, setTafsir] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    // İlk açılışta lazy fetch — 1.5MB tefsir yüklenmesini açılana kadar erteler
    if (next && tafsir === null && !loading) {
      setLoading(true);
      try {
        const res  = await fetch(`/api/tafsir/${surahId}`);
        const data = await res.json() as { content: string | null };
        setTafsir(data.content ?? "");
      } catch {
        setTafsir("");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white shadow-sm">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        onClick={handleOpen}
        type="button"
      >
        <span className="text-sm font-semibold text-stone-900">Sure Tefsiri</span>
        <svg
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4">
          {(revelationPlace != null || revelationOrder != null) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {revelationPlace != null && (
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                  {revelationPlace}
                </span>
              )}
              {revelationOrder != null && (
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                  {revelationOrder}. nüzul sırası
                </span>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-stone-100" />
              ))}
            </div>
          )}

          {!loading && tafsir != null && tafsir.length > 0 && (
            <p className="whitespace-pre-line text-sm leading-7 text-stone-700">{tafsir}</p>
          )}

          {!loading && tafsir !== null && tafsir.length === 0 && (
            <p className="text-sm text-stone-400">Tefsir metni bulunamadı.</p>
          )}

          <p className="mt-4 text-xs text-stone-400">Kaynak: Elmalılı Hamdi Yazır Tefsiri</p>
        </div>
      )}
    </div>
  );
}
