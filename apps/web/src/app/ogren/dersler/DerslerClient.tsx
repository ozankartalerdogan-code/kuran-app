"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DERSLER_META, KATEGORILER, type DersMeta } from "../../../data/dersler/registry";
import { useDersProgress, type AllDersProgress } from "../../../hooks/useDersProgress";

type SortMode = "tumu" | "sure" | "konu";

const TABS: { key: SortMode; label: string }[] = [
  { key: "tumu", label: "Tümü" },
  { key: "sure", label: "Kolaydan Zora" },
  { key: "konu", label: "Konuya Göre" },
];

function progressPct(ders: DersMeta, görülen?: number) {
  if (typeof görülen !== "number") return 0;
  return Math.min(100, Math.round(((görülen + 1) / ders.kartSayisi) * 100));
}

function DersCard({ ders, progress }: { ders: DersMeta; progress: AllDersProgress }) {
  const p = progress[ders.id];
  const pct = progressPct(ders, p?.["görülen"]);
  const done = p?.quizBitti ?? false;

  return (
    <Link
      href={`/ogren/dersler/${ders.id}`}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-stone-900 ${done ? "border-emerald-300 dark:border-emerald-700" : "border-amber-200/70 hover:border-amber-300 dark:border-stone-700 dark:hover:border-amber-700"}`}
    >
      {done ? (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">✓</span>
      ) : null}
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-4xl leading-none">{ders.ikon}</span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">~{ders.sure} dk</span>
      </div>
      <h2 className="text-base font-bold text-stone-900 group-hover:text-amber-800 dark:text-stone-50 dark:group-hover:text-amber-300">{ders.baslik}</h2>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{ders.kartSayisi} kart + 10 soruluk quiz</p>
      {pct > 0 ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>İlerleme</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}
    </Link>
  );
}

function Section({ title, dersler, progress }: { title: string; dersler: DersMeta[]; progress: AllDersProgress }) {
  if (dersler.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dersler.map((ders) => <DersCard key={ders.id} ders={ders} progress={progress} />)}
      </div>
    </section>
  );
}

export function DerslerClient() {
  const [sortMode, setSortMode] = useState<SortMode>("tumu");
  const { progress } = useDersProgress();
  const sorted = useMemo(() => sortMode === "sure" ? [...DERSLER_META].sort((a, b) => a.sure - b.sure) : DERSLER_META, [sortMode]);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-stone-950 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/ogren" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800">
          ← Öğren
        </Link>

        <header className="mb-6 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 dark:border-amber-900/50 dark:from-amber-950/20 dark:via-stone-900 dark:to-emerald-950/20">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">{DERSLER_META.length} ders · quizli öğrenme</p>
          <h1 className="text-3xl font-black tracking-tight text-stone-950 dark:text-stone-50">Dersler</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            İbadet, iman, ahlak, siyer ve tecvid konularını kısa kartlarla oku; sonunda 10 soruluk testle pekiştir.
          </p>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-stone-200 bg-white p-1.5 dark:border-stone-700 dark:bg-stone-900">
          {TABS.map((tab) => {
            const active = sortMode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSortMode(tab.key)}
                className={`rounded-xl px-2 py-2.5 text-xs font-bold transition-colors sm:text-sm ${active ? "bg-amber-500 text-stone-950" : "text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800"}`}
                aria-pressed={active}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {sortMode === "konu" ? (
          <div className="space-y-8">
            {KATEGORILER.map((kategori) => (
              <Section
                key={kategori.label}
                title={kategori.label}
                dersler={kategori.ids.map((id) => DERSLER_META.find((ders) => ders.id === id)).filter((ders): ders is DersMeta => !!ders)}
                progress={progress}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((ders) => <DersCard key={ders.id} ders={ders} progress={progress} />)}
          </div>
        )}

        <p className="mt-8 rounded-2xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-center text-xs leading-5 text-stone-500 dark:border-amber-900/40 dark:bg-amber-950/10 dark:text-stone-400">
          Dersler Kur'an-ı Kerim, sahih hadis kaynakları ve klasik ilmihal birikimi esas alınarak hazırlanmıştır.
        </p>
      </div>
    </main>
  );
}