"use client";

import { useState } from "react";
import Link from "next/link";

interface VerseData {
  verseKey: string;
  sureAdi: string;
  isim: string | null;
  aciklama: string | null;
}

interface VakitMeta {
  id: string;
  ikon: string;
  ad: string;
  renk: { sol: string; bant: string; badge: string };
}

function verseHref(verseKey: string): string {
  const [s, a] = verseKey.split(":");
  return `/surah/${s}/ayah/${a?.split("-")[0]}`;
}

function VerseEntry({ verse }: { verse: VerseData }) {
  return (
    <Link
      href={verseHref(verse.verseKey)}
      className="group flex items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-all hover:border-stone-200 hover:bg-white hover:shadow-sm dark:hover:border-stone-600 dark:hover:bg-stone-800"
    >
      <span className="mt-0.5 shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-500 dark:bg-stone-700 dark:text-stone-400">
        {verse.verseKey}
      </span>
      <div className="min-w-0">
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
          {verse.sureAdi}
          {verse.isim ? " · " : ""}
        </span>
        {verse.isim && (
          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">
            {verse.isim}
          </span>
        )}
        {verse.aciklama && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-400 line-clamp-1 dark:text-stone-500">
            {verse.aciklama}
          </p>
        )}
      </div>
      <svg
        className="mt-1 h-3 w-3 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function VakitRow({ meta, verses }: { meta: VakitMeta; verses: VerseData[] }) {
  if (verses.length === 0) return null;

  return (
    <div className="flex gap-0 border-b border-stone-100 last:border-0 dark:border-stone-700/50">
      <div
        className={`flex w-28 shrink-0 flex-col items-start justify-start gap-1 border-l-4 ${meta.renk.bant} ${meta.renk.sol} px-3 py-3`}
      >
        <span className="text-xl leading-none">{meta.ikon}</span>
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${meta.renk.badge}`}>
          {meta.ad}
        </span>
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          {verses.length} ayet
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 py-2 pr-2">
        {verses.map((v) => (
          <VerseEntry key={v.verseKey} verse={v} />
        ))}
      </div>
    </div>
  );
}

export function NamazVakitAccordion({
  vakitMeta, vakitVerses, toplamAyet,
}: {
  vakitMeta: VakitMeta[];
  vakitVerses: Record<string, VerseData[]>;
  toplamAyet: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-10 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/60 shadow-sm dark:border-stone-700/60 dark:bg-stone-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border-b border-stone-200 bg-white px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:border-stone-700/60 dark:bg-stone-900 dark:hover:bg-stone-800"
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🕐</span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Namaz Vakitleri & Teheccüd
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {toplamAyet} ayet
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div>
          {vakitMeta.map((meta) => (
            <VakitRow key={meta.id} meta={meta} verses={vakitVerses[meta.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
