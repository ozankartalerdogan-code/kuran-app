"use client";

import Link from "next/link";
import { useState } from "react";
import type { KorunmaKategoriData, KorunmaVerse } from "./KorunmaKategorileri";

const KATEGORI_RENK: Record<
  string,
  { border: string; badge: string; iconBg: string; header: string }
> = {
  "korunma-genel":   { border: "border-l-emerald-400", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700",  iconBg: "bg-emerald-100 dark:bg-emerald-900/40",  header: "from-emerald-50/70 dark:from-emerald-900/20"  },
  "korunma-sihir":   { border: "border-l-violet-400",  badge: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700",       iconBg: "bg-violet-100 dark:bg-violet-900/40",    header: "from-violet-50/70 dark:from-violet-900/20"    },
  "korunma-nazar":   { border: "border-l-sky-400",     badge: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700",                         iconBg: "bg-sky-100 dark:bg-sky-900/40",           header: "from-sky-50/70 dark:from-sky-900/20"          },
  "korunma-hased":   { border: "border-l-teal-400",    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-700",                   iconBg: "bg-teal-100 dark:bg-teal-900/40",         header: "from-teal-50/70 dark:from-teal-900/20"        },
  "korunma-siginma": { border: "border-l-indigo-400",  badge: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700",       iconBg: "bg-indigo-100 dark:bg-indigo-900/40",    header: "from-indigo-50/70 dark:from-indigo-900/20"    },
  "korunma-sifa":    { border: "border-l-rose-400",    badge: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-700",                   iconBg: "bg-rose-100 dark:bg-rose-900/40",         header: "from-rose-50/70 dark:from-rose-900/20"        },
};

const DEFAULT_RENK = KATEGORI_RENK["korunma-genel"];

function verseHref(verseKey: string): string | null {
  const parts = verseKey.split(":");
  if (parts.length !== 2) return null;
  const surahId    = Number(parts[0]);
  const ayahNumber = Number(parts[1]?.split("-")[0]);
  if (!surahId || !ayahNumber) return null;
  return `/surah/${surahId}/ayah/${ayahNumber}`;
}

function VerseRow({ verse }: { verse: KorunmaVerse }) {
  const href = verseHref(verse.verseKey);

  const inner = (
    <div className="group flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white px-3.5 py-2.5 transition-all duration-150 hover:border-stone-200 hover:shadow-sm dark:bg-stone-800/60 dark:hover:border-stone-600 dark:hover:bg-stone-800">
      <span className="mt-0.5 shrink-0 rounded-md bg-stone-100 px-2 py-1 font-mono text-[11px] font-bold leading-none text-stone-500 transition-colors group-hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-400 dark:group-hover:bg-stone-600">
        {verse.verseKey}
      </span>
      <div className="min-w-0 flex-1">
        {verse.isim && (
          <p className="mb-0.5 truncate text-xs font-semibold text-stone-700 dark:text-stone-200">
            {verse.isim}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-stone-500 line-clamp-2 dark:text-stone-400">
          {verse.aciklama ?? verse.tag}
        </p>
      </div>
      {href && (
        <svg
          className="mt-1 h-3 w-3 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (!href) return <div>{inner}</div>;
  return <Link href={href}>{inner}</Link>;
}

function KategoriItem({ kategori }: { kategori: KorunmaKategoriData }) {
  const [acik, setAcik] = useState(false);
  const renk = KATEGORI_RENK[kategori.id] ?? DEFAULT_RENK;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-shadow duration-200 dark:border-stone-700/60 dark:bg-stone-900 ${renk.border} border-l-4 ${
        acik ? "shadow-md dark:shadow-stone-900/50" : "shadow-sm hover:shadow dark:shadow-none"
      }`}
    >
      <button
        onClick={() => setAcik((p) => !p)}
        className={`flex w-full items-center gap-3 bg-gradient-to-r ${renk.header} to-transparent px-4 py-3.5 text-left`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${renk.iconBg} text-lg leading-none`}>
          {kategori.ikon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {kategori.baslik}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">{kategori.aciklama}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 sm:inline ${renk.badge}`}>
            {kategori.verses.length}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-300 dark:text-stone-500 ${acik ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${acik ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-stone-100 bg-stone-50/40 px-2.5 py-2.5 dark:border-stone-700/50 dark:bg-stone-800/30">
            <div className="flex flex-col gap-1">
              {kategori.verses.map((v) => (
                <VerseRow key={`${v.verseKey}::${v.tag}`} verse={v} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KorunmaAkordeonPanel({
  kategoriler,
  totalVerses,
}: {
  kategoriler: KorunmaKategoriData[];
  totalVerses: number;
}) {
  if (kategoriler.length === 0) return null;

  return (
    <section>
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🛡️</span>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Koruyucu Ayetler
            </h2>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {totalVerses} ayet
          </span>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Kur&apos;an&apos;dan korunma, şifa ve sığınma ayetleri — konularına göre.
        </p>
      </div>

      <div className="space-y-2.5">
        {kategoriler.map((k) => (
          <KategoriItem key={k.id} kategori={k} />
        ))}
      </div>
    </section>
  );
}
