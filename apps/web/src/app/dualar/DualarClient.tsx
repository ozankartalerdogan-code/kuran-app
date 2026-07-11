"use client";

import { useState } from "react";
import dualarRaw from "../../data/dualar.json";
import { getDevotionalSourceLabel, getNarrationBadgeLabel } from "../../lib/sourceLabels";

interface Dua {
  baslik: string;
  arapca: string;
  okunus: string;
  anlam: string;
  kaynak: string;
  derece: string;
  tekrar: string;
  neZaman: string;
  aciklama: string;
  not: string;
}

interface Kategori {
  kod: string;
  isim: string;
  dualar: Dua[];
}

interface DualarData {
  baslik: string;
  aciklama: string;
  kategoriler: Kategori[];
}

const DATA = dualarRaw as DualarData;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function badgeClass(degree: string) {
  if (/kur'?an/i.test(degree)) return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/20 dark:text-indigo-300";
  if (/sahih/i.test(degree)) return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-300";
  if (/hasan/i.test(degree)) return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/20 dark:text-orange-300";
  return "border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300";
}

function DegreeBadge({ degree }: { degree: string }) {
  const label = getNarrationBadgeLabel(degree);
  if (!label) return null;
  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeClass(degree)}`}>{label}</span>;
}

function DuaCard({ dua }: { dua: Dua }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(dua.aciklama || dua.not || dua.tekrar);
  const sourceLabel = getDevotionalSourceLabel({
    title: dua.baslik,
    source: dua.kaynak,
    degree: dua.derece,
  });
  const hasArabic = Boolean(dua.arapca && /[\u0600-\u06ff]/.test(dua.arapca));

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-bold text-stone-900 dark:text-stone-100">{dua.baslik}</h3>
        <DegreeBadge degree={dua.derece} />
      </div>

      {dua.arapca ? (
        hasArabic ? (
          <p className="mb-3 text-right text-2xl leading-[2.4] text-stone-900 dark:text-stone-100" dir="rtl" lang="ar">
            {dua.arapca}
          </p>
        ) : (
          <p className="mb-3 rounded-lg bg-stone-50 px-3 py-2 text-sm leading-relaxed text-stone-600 dark:bg-stone-950/40 dark:text-stone-300">{dua.arapca}</p>
        )
      ) : null}

      {dua.okunus ? <p className="mb-2 text-sm italic leading-relaxed text-stone-700 dark:text-stone-200">{dua.okunus}</p> : null}
      {dua.anlam ? <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{dua.anlam}</p> : null}

      <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-500 dark:bg-stone-950/40 dark:text-stone-400">
        {dua.kaynak ? <p>{sourceLabel}</p> : null}
        {dua.neZaman ? <p>{dua.neZaman}</p> : null}
      </div>

      {hasDetail ? (
        <div className="mt-3">
          <button
            className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400"
            onClick={() => setOpen((current) => !current)}
            type="button"
            aria-expanded={open}
          >
            <Chevron open={open} />
            Açıklama ve fazileti
          </button>
          {open ? (
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {dua.aciklama ? <p>{dua.aciklama}</p> : null}
              {dua.tekrar ? <p className="text-stone-500 dark:text-stone-400">{dua.tekrar}</p> : null}
              {dua.not ? <p className="text-stone-500 dark:text-stone-400">{dua.not}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function KategoriAccordion({ kategori }: { kategori: Kategori }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
          {kategori.kod}
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold text-stone-900 dark:text-stone-100">{kategori.isim}</span>
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-300">{kategori.dualar.length}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-100 px-3 py-3 dark:border-stone-800">
          {kategori.dualar.map((dua, index) => <DuaCard key={`${dua.baslik}-${index}`} dua={dua} />)}
        </div>
      )}
    </div>
  );
}

export function DualarClient() {
  const total = DATA.kategoriler.reduce((sum, kategori) => sum + kategori.dualar.length, 0);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-stone-950 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {DATA.kategoriler.length} kategori · {total} dua
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{DATA.baslik}</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{DATA.aciklama}</p>
        </header>

        <section className="space-y-3">
          {DATA.kategoriler.map((kategori) => <KategoriAccordion key={kategori.kod} kategori={kategori} />)}
        </section>
      </div>
    </main>
  );
}
