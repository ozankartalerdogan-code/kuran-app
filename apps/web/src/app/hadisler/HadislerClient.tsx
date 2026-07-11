"use client";

import { useState } from "react";
import hadislerRaw from "../../data/hadisler_v2.json";

interface Meta {
  title?: string;
  subtitle?: string;
  description?: string;
  reliability_standard?: string;
  sources?: string[];
}

interface Topic {
  id: string;
  name: string;
  group: string;
  group_order: number;
  order: number;
  intro?: string;
}

interface Hadith {
  id: string;
  topic_id: string;
  turkish_text: string;
  narrator: string;
  source_bukhari: string;
  source_muslim?: string;
  sunnah_url?: string;
  key_lesson: string;
  tags: string[];
  info_note?: string;
}

interface HadithData {
  meta?: Meta;
  topics?: Topic[];
  hadiths?: Hadith[];
}

interface TopicWithHadiths extends Topic {
  hadiths: Hadith[];
}

interface GroupData {
  name: string;
  order: number;
  topics: TopicWithHadiths[];
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function hasContextualSource(value: string): boolean {
  return /bağlamsal/i.test(value);
}

function parseSunnahSource(url?: string): string {
  if (!url) return "";
  const match = url.match(/sunnah\.com\/([^:]+):(\d+)/i);
  if (!match) return "";

  const [, rawCollection, rawNumber] = match;
  const collectionNames: Record<string, string> = {
    bukhari: "Buhârî",
    muslim: "Müslim",
    tirmidhi: "Tirmizî",
    ibnmajah: "İbn Mâce",
    abudawud: "Ebû Dâvûd",
    ahmad: "Ahmed b. Hanbel",
  };

  return `${collectionNames[rawCollection.toLowerCase()] ?? rawCollection}, ${rawNumber}`;
}

function buildSourceText(hadith: Hadith): string {
  const exactSources = ensureStringArray([hadith.source_bukhari, hadith.source_muslim])
    .filter((source) => !hasContextualSource(source));

  if (exactSources.length > 0) return exactSources.join(" · ");

  const parsedSource = parseSunnahSource(hadith.sunnah_url);
  if (parsedSource) return parsedSource;

  return ensureStringArray([hadith.source_bukhari, hadith.source_muslim]).join(" · ");
}

const ROOT = hadislerRaw as HadithData;
const META = ROOT.meta ?? {};
const TOPICS = Array.isArray(ROOT.topics)
  ? [...ROOT.topics]
      .map((topic) => ({ ...topic, intro: topic.intro ?? "" }))
      .sort((a, b) => (a.group_order - b.group_order) || (a.order - b.order) || a.name.localeCompare(b.name, "tr"))
  : [];
const HADITHS = Array.isArray(ROOT.hadiths)
  ? ROOT.hadiths.map((hadith) => ({
      ...hadith,
      source_muslim: hadith.source_muslim ?? "",
      sunnah_url: hadith.sunnah_url ?? "",
      tags: ensureStringArray(hadith.tags),
      info_note: hadith.info_note ?? "",
    }))
  : [];

const HADITHS_BY_TOPIC: Record<string, Hadith[]> = {};
for (const hadith of HADITHS) {
  if (!HADITHS_BY_TOPIC[hadith.topic_id]) HADITHS_BY_TOPIC[hadith.topic_id] = [];
  HADITHS_BY_TOPIC[hadith.topic_id].push(hadith);
}

const GROUP_MAP: Record<string, GroupData> = {};
for (const topic of TOPICS) {
  if (!GROUP_MAP[topic.group]) {
    GROUP_MAP[topic.group] = { name: topic.group, order: topic.group_order, topics: [] };
  }

  GROUP_MAP[topic.group].topics.push({
    ...topic,
    hadiths: HADITHS_BY_TOPIC[topic.id] ?? [],
  });
}

const GROUPED = Object.values(GROUP_MAP)
  .map((group) => ({
    ...group,
    topics: [...group.topics].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "tr")),
  }))
  .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "tr"));

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function HadithCard({ hadith }: { hadith: Hadith }) {
  const [open, setOpen] = useState(false);
  const narrator = hadith.narrator || "Rivayet";
  const hadithText = hadith.turkish_text || "Hadis metni eklenmedi.";
  const sources = buildSourceText(hadith);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-sm italic leading-6 text-stone-800 dark:text-stone-100 ${open ? "" : "line-clamp-3"}`}>
            &quot;{hadithText}&quot;
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-navy-700 dark:text-navy-400">{narrator}</span>
            {sources ? <span className="text-stone-400">{sources}</span> : null}
          </div>
        </div>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-100 px-4 py-3 dark:border-stone-800">
          {hadith.key_lesson ? (
            <div className="rounded-lg border border-navy-100 bg-navy-50 px-3 py-2 text-xs leading-relaxed text-navy-800 dark:border-navy-800/50 dark:bg-navy-950/20 dark:text-navy-300">
              {hadith.key_lesson}
            </div>
          ) : null}
          {hadith.info_note ? (
            <div className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-xs leading-relaxed text-gold-800 dark:border-gold-800/50 dark:bg-gold-950/20 dark:text-gold-300">
              {hadith.info_note}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TopicAccordion({ topic }: { topic: TopicWithHadiths }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-950/40">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-stone-800 dark:text-stone-100">{topic.name}</span>
        <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {topic.hadiths.length}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-200 px-3 py-3 dark:border-stone-700">
          {topic.intro ? <p className="text-xs italic leading-relaxed text-stone-500 dark:text-stone-400">{topic.intro}</p> : null}
          {topic.hadiths.length > 0
            ? topic.hadiths.map((hadith) => <HadithCard key={hadith.id} hadith={hadith} />)
            : <p className="text-xs text-stone-400">Bu konu için hadis kaydı bulunamadı.</p>}
        </div>
      )}
    </div>
  );
}

function GroupAccordion({ group }: { group: GroupData }) {
  const [open, setOpen] = useState(false);
  const total = group.topics.reduce((sum, topic) => sum + topic.hadiths.length, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 text-sm font-bold text-stone-900 dark:text-stone-100">{group.name}</span>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
          {total} hadis
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-2 border-t border-stone-100 px-3 py-3 dark:border-stone-800">
          {group.topics.map((topic) => <TopicAccordion key={topic.id} topic={topic} />)}
        </div>
      )}
    </div>
  );
}

export function HadislerClient() {
  const sources = ensureStringArray(META.sources);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">
            {HADITHS.length} hadis · {TOPICS.length} konu
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{META.title ?? "Sahih Hadisler"}</h1>
          {META.subtitle ? <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{META.subtitle}</p> : null}
          {META.description ? <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{META.description}</p> : null}
        </header>

        {META.reliability_standard ? (
          <section className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-navy-700 dark:text-navy-400">Güvenilirlik Standardı</p>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{META.reliability_standard}</p>
          </section>
        ) : null}

        <section className="space-y-3">
          {GROUPED.length > 0
            ? GROUPED.map((group) => <GroupAccordion key={group.name} group={group} />)
            : <p className="text-center text-sm text-stone-400">Bu bölüm için gösterilecek hadis kaydı bulunamadı.</p>}
        </section>

        {sources.length > 0 ? (
          <p className="mt-6 text-center text-xs italic leading-relaxed text-stone-400">
            Kaynaklar: {sources.join(" · ")}
          </p>
        ) : null}
      </div>
    </main>
  );
}
