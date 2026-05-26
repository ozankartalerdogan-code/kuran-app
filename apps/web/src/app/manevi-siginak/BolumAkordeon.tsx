"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type Score = "10/10" | "8/10" | "0/10";

const SCORE_CFG: Record<Score, { emoji: string; cls: string }> = {
  "10/10": { emoji: "🟢", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  "8/10":  { emoji: "🟡", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  "0/10":  { emoji: "🔴", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export function BolumAkordeon({
  ikon,
  baslik,
  score,
  scoreLabel,
  borderCls,
  headerCls,
  iconBgCls,
  children,
}: {
  ikon:       string;
  baslik:     string;
  score:      Score;
  scoreLabel?: string;
  borderCls:  string;
  headerCls:  string;
  iconBgCls:  string;
  children:   ReactNode;
}) {
  const [acik, setAcik] = useState(false);
  const { emoji, cls } = SCORE_CFG[score];

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-shadow duration-200 dark:border-stone-700/60 dark:bg-stone-900 ${borderCls} border-l-4 ${
        acik ? "shadow-md dark:shadow-stone-900/50" : "shadow-sm hover:shadow dark:shadow-none"
      }`}
    >
      {/* Header — tıklanabilir */}
      <button
        onClick={() => setAcik((p) => !p)}
        className={`flex w-full items-center gap-3 bg-gradient-to-r ${headerCls} to-transparent px-4 py-3.5 text-left`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgCls} text-xl leading-none`}
        >
          {ikon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {baslik}
          </p>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}
          >
            {emoji} {score}{scoreLabel ? ` — ${scoreLabel}` : ""}
          </span>
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-300 dark:text-stone-500 ${acik ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* İçerik — CSS grid animasyonu */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          acik ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-stone-100 px-4 py-5 dark:border-stone-700/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
