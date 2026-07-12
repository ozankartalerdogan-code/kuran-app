"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  Shield, Sparkles, Eye, HandHeart, Star, CircleDot, Flame, HeartPulse,
  type LucideIcon,
} from "lucide-react";

type Score = "10/10" | "8/10" | "0/10";

const SCORE_CFG: Record<Score, { dot: string; cls: string }> = {
  "10/10": { dot: "bg-navy-500",  cls: "bg-navy-100 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300" },
  "8/10":  { dot: "bg-gold-500",  cls: "bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300" },
  "0/10":  { dot: "bg-red-500",   cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

// ikon prop'u string anahtar — sunucu bileşeninden fonksiyon geçirilemediği için
// eşleme burada yapılır (emoji tutarsız render ediliyordu)
const IKON_MAP: Record<string, LucideIcon> = {
  shield: Shield, sparkles: Sparkles, eye: Eye, hands: HandHeart, star: Star,
  flame: Flame, heartpulse: HeartPulse,
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
  const { dot, cls } = SCORE_CFG[score];
  const Ikon = IKON_MAP[ikon] ?? CircleDot;

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
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgCls}`}
        >
          <Ikon aria-hidden="true" className="h-5 w-5 text-stone-600 dark:text-stone-300" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {baslik}
          </p>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {score}{scoreLabel ? ` — ${scoreLabel}` : ""}
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
