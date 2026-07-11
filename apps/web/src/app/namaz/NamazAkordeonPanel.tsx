"use client";

import Link from "next/link";
import { useState } from "react";
import type { NamazKategoriData, NamazVerse } from "./NamazKategorileri";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const INITIAL_VISIBLE = 12;

// ── Kategori renk haritası ────────────────────────────────────────────────────

const KATEGORI_RENK: Record<
  string,
  { border: string; badge: string; iconBg: string; header: string; dot: string }
> = {
  "namaz-genel":    { border: "border-l-navy-400", badge: "bg-navy-50 text-navy-700 ring-navy-200 dark:bg-navy-900/30 dark:text-navy-300 dark:ring-navy-700",    iconBg: "bg-navy-100 dark:bg-navy-900/40",  header: "from-navy-50/70 dark:from-navy-900/20",  dot: "bg-navy-400"  },
  "namaz-vakit":    { border: "border-l-navy-400",    badge: "bg-navy-50 text-navy-700 ring-navy-200 dark:bg-navy-900/30 dark:text-navy-300 dark:ring-navy-700",                       iconBg: "bg-navy-100 dark:bg-navy-900/40",          header: "from-navy-50/70 dark:from-navy-900/20",        dot: "bg-navy-400"     },
  "namaz-husu":     { border: "border-l-navy-400",  badge: "bg-navy-50 text-navy-700 ring-navy-200 dark:bg-navy-900/30 dark:text-navy-300 dark:ring-navy-700",           iconBg: "bg-navy-100 dark:bg-navy-900/40",      header: "from-navy-50/70 dark:from-navy-900/20",    dot: "bg-navy-400"   },
  "namaz-teheccud": { border: "border-l-violet-400",  badge: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700",           iconBg: "bg-violet-100 dark:bg-violet-900/40",      header: "from-violet-50/70 dark:from-violet-900/20",    dot: "bg-violet-400"   },
  "namaz-cuma":     { border: "border-l-gold-400",   badge: "bg-gold-50 text-gold-700 ring-gold-200 dark:bg-gold-900/30 dark:text-gold-300 dark:ring-gold-700",                 iconBg: "bg-gold-100 dark:bg-gold-900/40",        header: "from-gold-50/70 dark:from-gold-900/20",      dot: "bg-gold-400"    },
  "namaz-abdest":   { border: "border-l-sky-400",     badge: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700",                             iconBg: "bg-sky-100 dark:bg-sky-900/40",            header: "from-sky-50/70 dark:from-sky-900/20",          dot: "bg-sky-400"      },
  "namaz-korku":    { border: "border-l-rose-400",    badge: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-700",                       iconBg: "bg-rose-100 dark:bg-rose-900/40",          header: "from-rose-50/70 dark:from-rose-900/20",        dot: "bg-rose-400"     },
  "namaz-sefer":    { border: "border-l-orange-400",  badge: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-700",           iconBg: "bg-orange-100 dark:bg-orange-900/40",      header: "from-orange-50/70 dark:from-orange-900/20",    dot: "bg-orange-400"   },
};

const DEFAULT_RENK = KATEGORI_RENK["namaz-genel"];

// ── verse_key → href ──────────────────────────────────────────────────────────

function verseHref(verseKey: string): string | null {
  const clean = verseKey.split(",")[0]?.trim() ?? "";
  const parts = clean.split(":");
  if (parts.length !== 2) return null;
  const surahId    = Number(parts[0]);
  const rawAyah    = parts[1]?.split("-")[0] ?? "";
  const ayahNumber = Number(rawAyah);
  if (!Number.isFinite(surahId) || !Number.isFinite(ayahNumber)) return null;
  if (surahId <= 0 || ayahNumber <= 0) return null;
  return `/surah/${surahId}/ayah/${ayahNumber}`;
}

// ── Tek ayet satırı ───────────────────────────────────────────────────────────

function VerseRow({ verse }: { verse: NamazVerse }) {
  const href = verseHref(verse.verseKey);

  const card = (
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

  if (!href) return <div>{card}</div>;
  return <Link href={href}>{card}</Link>;
}

// ── Tek kategori ──────────────────────────────────────────────────────────────

function KategoriItem({ kategori }: { kategori: NamazKategoriData }) {
  const [acik,      setAcik]      = useState(false);
  const [tumunuGor, setTumunuGor] = useState(false);

  const renk    = KATEGORI_RENK[kategori.id] ?? DEFAULT_RENK;
  const total   = kategori.verses.length;
  const visible = tumunuGor ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-shadow duration-200 dark:border-stone-700/60 dark:bg-stone-900 ${
        renk.border
      } border-l-4 ${acik ? "shadow-md dark:shadow-stone-900/50" : "shadow-sm hover:shadow dark:shadow-none"}`}
    >
      <button
        onClick={() => setAcik((p) => !p)}
        className={`flex w-full items-center gap-3 bg-gradient-to-r ${renk.header} to-transparent px-4 py-3.5 text-left`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${renk.iconBg} text-lg leading-none`}
        >
          {kategori.ikon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {kategori.baslik}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            {total} ayet
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 sm:inline ${renk.badge}`}
          >
            {total}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-300 dark:text-stone-500 ${acik ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          acik ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-stone-100 bg-stone-50/40 px-2.5 py-2.5 dark:border-stone-700/50 dark:bg-stone-800/30">
            <div className="flex flex-col gap-1">
              {kategori.verses.slice(0, visible).map((v) => (
                <VerseRow key={`${v.verseKey}::${v.tag}`} verse={v} />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setTumunuGor((p) => !p)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white py-2 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
              >
                {tumunuGor ? (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    Daralt
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {total - INITIAL_VISIBLE} ayet daha göster
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ana panel ─────────────────────────────────────────────────────────────────

export function NamazAkordeonPanel({
  kategoriler,
  totalVerses,
}: {
  kategoriler: NamazKategoriData[];
  totalVerses: number;
}) {
  if (kategoriler.length === 0) return null;

  return (
    <section>
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🕌</span>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Namaz Ayetleri
            </h2>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {totalVerses} ayet
          </span>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Kur&apos;an&apos;dan namaz emirleri ve namazla ilgili ayetler — konularına göre.
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
