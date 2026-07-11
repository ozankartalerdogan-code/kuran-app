"use client";

import Link from "next/link";
import { useState } from "react";
import peygamberRaw from "../../data/peygamber_kissalari.json";

interface Kissa {
  baslik: string;
  metin: string;
  kuran_referanslari?: string[];
  not?: string;
}

interface Peygamber {
  id: string;
  isim: string;
  unvan?: string;
  kuranda_gecme_sayisi?: number;
  gondirildigi_yer?: string;
  donem?: string;
  kisa_ozet?: string;
  kissa: Kissa[];
  mucizeler?: string[];
  dersler?: string[];
  ana_sure?: string;
  kuran_referanslari_ozet?: string[];
  ozel_notlar?: string[];
}

interface PeygamberKissalariMeta {
  baslik: string;
  aciklama: string;
  toplam_peygamber: number;
  genel_dersler?: string[];
  kaynak_not: string;
  peygamberler: Peygamber[];
}

const META = (peygamberRaw as { peygamber_kissalari: PeygamberKissalariMeta }).peygamber_kissalari;
const PEYGAMBERLER = META.peygamberler;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function RefChip({ refKey }: { refKey: string }) {
  const parts = refKey.split(":");
  const surah = Number(parts[0]);
  const ayah = Number(parts[1]?.split("-")[0]);

  if (!surah || !ayah) {
    return <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-300">{refKey}</span>;
  }

  return (
    <Link
      href={`/surah/${surah}/ayah/${ayah}`}
      className="rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700 hover:border-navy-300 dark:border-navy-800/50 dark:bg-navy-950/20 dark:text-navy-300"
    >
      {refKey}
    </Link>
  );
}

function KissaCard({ kissa }: { kissa: Kissa }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-950/40">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-stone-800 dark:text-stone-100">{kissa.baslik}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-200 px-4 py-3 dark:border-stone-700">
          <p className="text-sm leading-7 text-stone-600 dark:text-stone-300">{kissa.metin}</p>
          {kissa.kuran_referanslari && kissa.kuran_referanslari.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {kissa.kuran_referanslari.map((ref) => <RefChip key={ref} refKey={ref} />)}
            </div>
          ) : null}
          {kissa.not ? (
            <div className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs leading-relaxed text-gold-800 dark:border-gold-800/50 dark:bg-gold-950/20 dark:text-gold-300">
              {kissa.not}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TextList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function PeygamberCard({ peygamber }: { peygamber: Peygamber }) {
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <button
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-stone-900 dark:text-stone-100">{peygamber.isim}</span>
            {peygamber.kuranda_gecme_sayisi != null ? (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                {peygamber.kuranda_gecme_sayisi}×
              </span>
            ) : null}
          </span>
          {peygamber.unvan ? <span className="mt-1 block text-xs font-semibold text-navy-700 dark:text-navy-400">{peygamber.unvan}</span> : null}
          {peygamber.kisa_ozet ? <span className={`mt-2 block text-sm leading-relaxed text-stone-500 dark:text-stone-400 ${open ? "" : "line-clamp-2"}`}>{peygamber.kisa_ozet}</span> : null}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-stone-100 px-4 py-4 dark:border-stone-800">
          {(peygamber.gondirildigi_yer || peygamber.donem || peygamber.ana_sure) ? (
            <div className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-950/40 dark:text-stone-300 sm:grid-cols-3">
              {peygamber.gondirildigi_yer ? <span>{peygamber.gondirildigi_yer}</span> : null}
              {peygamber.donem ? <span>{peygamber.donem}</span> : null}
              {peygamber.ana_sure ? <span>{peygamber.ana_sure}</span> : null}
            </div>
          ) : null}

          {peygamber.kuran_referanslari_ozet && peygamber.kuran_referanslari_ozet.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">Kur'an Referansları</p>
              <div className="flex flex-wrap gap-2">
                {peygamber.kuran_referanslari_ozet.map((ref) => <RefChip key={ref} refKey={ref} />)}
              </div>
            </div>
          ) : null}

          {peygamber.kissa.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">Kıssalar</p>
              <div className="space-y-2">
                {peygamber.kissa.map((kissa, index) => <KissaCard key={index} kissa={kissa} />)}
              </div>
            </div>
          ) : null}

          <TextList title="Mucizeler" items={peygamber.mucizeler} />
          <TextList title="Dersler" items={peygamber.dersler} />

          {peygamber.ozel_notlar && peygamber.ozel_notlar.length > 0 ? (
            <div>
              <button
                className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-left dark:border-stone-700 dark:bg-stone-950/40"
                onClick={() => setNotesOpen((current) => !current)}
                type="button"
                aria-expanded={notesOpen}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">Özel Notlar</span>
                <Chevron open={notesOpen} />
              </button>
              {notesOpen ? (
                <div className="mt-2 space-y-2">
                  {peygamber.ozel_notlar.map((note, index) => (
                    <div key={index} className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs leading-relaxed text-gold-800 dark:border-gold-800/50 dark:bg-gold-950/20 dark:text-gold-300">
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function PeygamberKissalariClient() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">
            {META.toplam_peygamber} peygamber
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{META.baslik}</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{META.aciklama}</p>
        </header>

        {META.genel_dersler && META.genel_dersler.length > 0 ? (
          <section className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
            <TextList title="Genel Dersler" items={META.genel_dersler} />
          </section>
        ) : null}

        <section className="space-y-3">
          {PEYGAMBERLER.map((peygamber) => <PeygamberCard key={peygamber.id} peygamber={peygamber} />)}
        </section>

        <p className="mt-6 text-center text-xs italic leading-relaxed text-stone-400">{META.kaynak_not}</p>
      </div>
    </main>
  );
}
