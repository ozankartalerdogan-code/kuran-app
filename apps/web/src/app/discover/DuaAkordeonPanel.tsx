"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Shield, User, HandHeart, HeartPulse, Anchor, Repeat, HandHelping,
  type LucideIcon,
} from "lucide-react";
import type { DuaKategoriData, DuaVerse } from "./DuaKategorileri";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const INITIAL_VISIBLE = 12;

// Kategori ikonları — emoji yerine marka diline uygun çizgi ikonlar.
// (İkon bileşeni server→client sınırından geçemediği için eşleme burada, id üzerinden.)
const KATEGORI_IKON: Record<string, LucideIcon> = {
  korunma:   Shield,
  peygamber: User,
  rabbena:   HandHeart,
  sifa:      HeartPulse,
  tevekkul:  Anchor,
  zikir:     Repeat,
};

// ── Kategori renk haritası ────────────────────────────────────────────────────

const KATEGORI_RENK: Record<
  string,
  { border: string; badge: string; iconBg: string; header: string; dot: string }
> = {
  korunma:   { border: "border-l-sky-400",     badge: "bg-sky-50 text-sky-700 ring-sky-200",        iconBg: "bg-sky-100",     header: "from-sky-50/70",     dot: "bg-sky-400"     },
  peygamber: { border: "border-l-gold-400",   badge: "bg-gold-50 text-gold-700 ring-gold-200",  iconBg: "bg-gold-100",   header: "from-gold-50/70",   dot: "bg-gold-400"   },
  rabbena:   { border: "border-l-navy-400", badge: "bg-navy-50 text-navy-700 ring-navy-200", iconBg: "bg-navy-100", header: "from-navy-50/70", dot: "bg-navy-400" },
  sifa:      { border: "border-l-rose-400",    badge: "bg-rose-50 text-rose-700 ring-rose-200",     iconBg: "bg-rose-100",    header: "from-rose-50/70",    dot: "bg-rose-400"    },
  tevekkul:  { border: "border-l-navy-400",  badge: "bg-navy-50 text-navy-700 ring-navy-200",iconBg: "bg-navy-100",  header: "from-navy-50/70",  dot: "bg-navy-400"  },
  zikir:     { border: "border-l-violet-400",  badge: "bg-violet-50 text-violet-700 ring-violet-200",iconBg: "bg-violet-100",  header: "from-violet-50/70",  dot: "bg-violet-400"  },
};
const DEFAULT_RENK = KATEGORI_RENK.rabbena;

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

function VerseRow({ verse, dotColor: _dotColor }: { verse: DuaVerse; dotColor: string }) {
  const href = verseHref(verse.verseKey);

  const card = (
    <div className="group flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white px-3.5 py-2.5 transition-all duration-150 hover:border-stone-200 hover:shadow-sm">
      {/* Verse key badge */}
      <span className="mt-0.5 shrink-0 rounded-md bg-stone-100 px-2 py-1 font-mono text-[11px] font-bold leading-none text-stone-500 transition-colors group-hover:bg-stone-200">
        {verse.verseKey}
      </span>

      {/* İçerik */}
      <div className="min-w-0 flex-1">
        {verse.isim && (
          <p className="mb-0.5 truncate text-xs font-semibold text-stone-700">
            {verse.isim}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-stone-500 line-clamp-2">
          {verse.aciklama ?? verse.tag}
        </p>
      </div>

      {/* Ok */}
      {href && (
        <svg
          className="mt-1 h-3 w-3 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500"
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

function KategoriItem({ kategori }: { kategori: DuaKategoriData }) {
  const [acik,      setAcik]      = useState(false);
  const [tumunuGor, setTumunuGor] = useState(false);

  const renk    = KATEGORI_RENK[kategori.id] ?? DEFAULT_RENK;
  const total   = kategori.verses.length;
  const visible = tumunuGor ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-shadow duration-200 ${
        renk.border
      } border-l-4 ${acik ? "shadow-md" : "shadow-sm hover:shadow"}`}
    >
      {/* ── Başlık butonu ── */}
      <button
        onClick={() => setAcik((p) => !p)}
        className={`flex w-full items-center gap-3 bg-gradient-to-r ${renk.header} to-transparent px-4 py-3.5 text-left`}
      >
        {/* İkon */}
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${renk.iconBg}`}
        >
          {(() => {
            const Ikon = KATEGORI_IKON[kategori.id] ?? HandHeart;
            return <Ikon aria-hidden="true" className="h-5 w-5 text-stone-700" strokeWidth={1.75} />;
          })()}
        </span>

        {/* Başlık */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800">
            {kategori.baslik}
          </p>
          <p className="text-[11px] text-stone-400">
            {total} ayet
          </p>
        </div>

        {/* Rozet + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 sm:inline ${renk.badge}`}
          >
            {total}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-300 ${acik ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── İçerik (smooth grid animasyonu) ── */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          acik ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-stone-100 bg-stone-50/40 px-2.5 py-2.5">

            {/* Ayet listesi */}
            <div className="flex flex-col gap-1">
              {kategori.verses.slice(0, visible).map((v) => (
                <VerseRow
                  key={`${v.verseKey}::${v.tag}`}
                  verse={v}
                  dotColor={renk.dot}
                />
              ))}
            </div>

            {/* Devamını Göster / Daralt */}
            {hasMore && (
              <button
                onClick={() => setTumunuGor((p) => !p)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white py-2 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700"
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

export function DuaAkordeonPanel({
  kategoriler,
  totalVerses,
}: {
  kategoriler: DuaKategoriData[];
  totalVerses: number;
}) {
  if (kategoriler.length === 0) return null;

  return (
    <section>

      {/* Bölüm başlığı */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HandHelping aria-hidden="true" className="h-4 w-4 text-stone-400" strokeWidth={2} />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Dualar & Tesbih
            </h2>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
            {totalVerses} ayet
          </span>
        </div>
        <p className="text-sm leading-relaxed text-stone-500">
          Kur&apos;an&apos;dan dua, tevekkül ve tesbih ayetleri — manevi kategorilere göre.
        </p>
      </div>

      {/* Kategori akordeonları */}
      <div className="space-y-2.5">
        {kategoriler.map((k) => (
          <KategoriItem key={k.id} kategori={k} />
        ))}
      </div>

    </section>
  );
}
