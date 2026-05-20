"use client";

import { useState } from "react";

interface SurahAboutAccordionProps {
  revelationPlace: string | null;
  revelationOrder: number | null;
  tafsir: string | null;
}

export function SurahAboutAccordion({
  revelationPlace,
  revelationOrder,
  tafsir
}: SurahAboutAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-stone-200 bg-white shadow-sm">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="text-sm font-semibold text-stone-900">Sure Hakkında</span>
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

      {open ? (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4">
          {(revelationPlace != null || revelationOrder != null) ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {revelationPlace != null ? (
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                  {revelationPlace}
                </span>
              ) : null}
              {revelationOrder != null ? (
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                  {revelationOrder}. nüzul sırası
                </span>
              ) : null}
            </div>
          ) : null}

          {tafsir != null ? (
            <p className="whitespace-pre-line text-sm leading-7 text-stone-700">{tafsir}</p>
          ) : (
            <p className="text-sm text-stone-400">Tefsir metni bulunamadı.</p>
          )}

          <p className="mt-4 text-xs text-stone-400">Kaynak: Elmalılı Hamdi Yazır Tefsiri</p>
        </div>
      ) : null}
    </div>
  );
}
