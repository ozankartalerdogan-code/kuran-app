"use client";

import Link from "next/link";
import { useState } from "react";
import siyerRaw from "../../data/siyer_i_nebi.json";

interface Period {
  id: string;
  order: number;
  name: string;
  date_range: string;
  summary: string;
  icon: string;
}

interface Meta {
  title: string;
  subtitle: string;
  description: string;
  sources: string[];
}

interface SiyerEvent {
  id: string;
  period_id: string;
  title: string;
  date_miladi: string | null;
  date_hijri: string | null;
  description: string;
  quran_refs: string[];
  hadith_sources: string[];
  key_lessons: string[];
  reliability_note: string | null;
  tags: string[];
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const raw = siyerRaw as {
  meta?: Partial<Meta>;
  periods?: Period[];
  events?: SiyerEvent[];
};

const META: Meta = {
  title: raw.meta?.title ?? "Siyer-i Nebî",
  subtitle: raw.meta?.subtitle ?? "",
  description: raw.meta?.description ?? "",
  sources: ensureStringArray(raw.meta?.sources),
};

const PERIODS = [...(raw.periods ?? [])].sort((a, b) => a.order - b.order);
const EVENTS = (raw.events ?? []).map((event) => ({
  ...event,
  title: event.title ?? "",
  description: event.description ?? "",
  date_miladi: event.date_miladi ?? null,
  date_hijri: event.date_hijri ?? null,
  quran_refs: ensureStringArray(event.quran_refs),
  hadith_sources: ensureStringArray(event.hadith_sources),
  key_lessons: ensureStringArray(event.key_lessons),
  tags: ensureStringArray(event.tags),
  reliability_note: event.reliability_note ?? null,
}));

const EVENTS_BY_PERIOD: Record<string, SiyerEvent[]> = {};
for (const event of EVENTS) {
  if (!EVENTS_BY_PERIOD[event.period_id]) EVENTS_BY_PERIOD[event.period_id] = [];
  EVENTS_BY_PERIOD[event.period_id].push(event);
}

function QuranRefChip({ refKey }: { refKey: string }) {
  const [surah, ayah] = refKey.split(":").map(Number);
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

function EventCard({ event }: { event: SiyerEvent }) {
  const [open, setOpen] = useState(false);
  const title = event.title || "Başlıksız olay";

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-stone-900 dark:text-stone-100">{title}</span>
          {(event.date_miladi || event.date_hijri) ? (
            <span className="mt-1 block text-xs text-stone-400">
              {[event.date_miladi, event.date_hijri].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-stone-100 px-4 py-4 dark:border-stone-800">
          <p className="text-sm leading-7 text-stone-600 dark:text-stone-300">{event.description || "Açıklama eklenmedi."}</p>

          {event.quran_refs.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">Kur'an Referansları</p>
              <div className="flex flex-wrap gap-2">
                {event.quran_refs.map((ref) => <QuranRefChip key={ref} refKey={ref} />)}
              </div>
            </div>
          ) : null}

          {event.key_lessons.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">Öğretiler</p>
              <ul className="space-y-1.5">
                {event.key_lessons.map((lesson, index) => (
                  <li key={index} className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">• {lesson}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {event.hadith_sources.length > 0 ? (
            <p className="text-xs italic text-stone-400">{event.hadith_sources.join(", ")}</p>
          ) : null}

          {event.reliability_note ? (
            <div className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs leading-relaxed text-gold-800 dark:border-gold-800/50 dark:bg-gold-950/20 dark:text-gold-300">
              {event.reliability_note}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PeriodAccordion({ period }: { period: Period }) {
  const [open, setOpen] = useState(false);
  const events = EVENTS_BY_PERIOD[period.id] ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="text-xl leading-none">{period.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-stone-900 dark:text-stone-100">{period.name}</span>
          <span className="mt-1 block text-xs text-stone-400">{period.date_range}</span>
        </span>
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-300">{events.length}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-100 px-3 py-3 dark:border-stone-800">
          <p className="px-1 text-sm italic leading-relaxed text-stone-500 dark:text-stone-400">{period.summary}</p>
          {events.length > 0
            ? events.map((event) => <EventCard key={event.id} event={event} />)
            : <p className="text-xs text-stone-400">Bu döneme ait kayıt bulunamadı.</p>}
        </div>
      )}
    </div>
  );
}

export function SiyerClient() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">
            {PERIODS.length} dönem · {EVENTS.length} olay
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{META.title}</h1>
          {META.subtitle ? <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{META.subtitle}</p> : null}
          {META.description ? <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{META.description}</p> : null}
        </header>

        <section className="space-y-3">
          {PERIODS.map((period) => <PeriodAccordion key={period.id} period={period} />)}
        </section>

        {META.sources.length > 0 ? (
          <p className="mt-6 text-center text-xs italic leading-relaxed text-stone-400">
            Kaynaklar: {META.sources.join(" · ")}
          </p>
        ) : null}
      </div>
    </main>
  );
}
