"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { JUZ_DATA } from "./juzData";

interface Hatim {
  id: string;
  startDate: string;
  completedDate: string | null;
  readJuz: number[];
}

interface HatimStore {
  hatims: Hatim[];
  currentId: string | null;
}

const STORAGE_KEY = "hatimTakibi";

function load(): HatimStore {
  if (typeof window === "undefined") return { hatims: [], currentId: null };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? { hatims: [], currentId: null };
  } catch { return { hatims: [], currentId: null }; }
}

function save(data: HatimStore) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function newHatim(): Hatim {
  return { id: Date.now().toString(), startDate: new Date().toISOString(), completedDate: null, readJuz: [] };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function HatimClient() {
  const [store, setStore]   = useState<HatimStore>({ hatims: [], currentId: null });
  const [mounted, setMount] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setStore(load());
    setMount(true);
  }, []);

  const persist = useCallback((next: HatimStore) => {
    setStore(next);
    save(next);
  }, []);

  const startHatim = () => {
    const h = newHatim();
    persist({ hatims: [h, ...store.hatims], currentId: h.id });
    setConfirm(false);
  };

  const toggleJuz = (juzNo: number) => {
    const next = store.hatims.map((h) => {
      if (h.id !== store.currentId) return h;
      const already = h.readJuz.includes(juzNo);
      const readJuz = already ? h.readJuz.filter((j) => j !== juzNo) : [...h.readJuz, juzNo];
      const completedDate = readJuz.length === 30 ? (h.completedDate ?? new Date().toISOString()) : null;
      return { ...h, readJuz, completedDate };
    });
    persist({ ...store, hatims: next });
  };

  const resetCurrent = () => {
    const next = store.hatims.map((h) =>
      h.id === store.currentId ? { ...h, readJuz: [], completedDate: null } : h
    );
    persist({ ...store, hatims: next });
  };

  const current = store.hatims.find((h) => h.id === store.currentId) ?? null;
  const completed = store.hatims.filter((h) => h.completedDate !== null);
  const progress = current ? current.readJuz.length : 0;
  const pct = Math.round((progress / 30) * 100);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-stone-950">
      <div className="mx-auto max-w-lg">

        {/* Başlık */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">📖 Hatim Takibi</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            30 cüzlük okumanızı işaretleyin
          </p>
        </div>

        {/* Hatim yok */}
        {!current && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800/50 dark:bg-emerald-950/20">
            <p className="mb-4 text-stone-600 dark:text-stone-400">Aktif hatim yok.</p>
            <button
              onClick={startHatim}
              className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 active:scale-95"
            >
              Yeni Hatim Başlat
            </button>
          </div>
        )}

        {/* Aktif hatim */}
        {current && (
          <>
            {/* İlerleme */}
            <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Başlangıç: {formatDate(current.startDate)}</p>
                  {current.completedDate && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      ✅ Tamamlandı: {formatDate(current.completedDate)} ({daysBetween(current.startDate, current.completedDate)} günde)
                    </p>
                  )}
                </div>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{progress}/30</span>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <div
                  className="h-3 rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-stone-400">%{pct}</p>

              {/* Eylemler */}
              <div className="mt-3 flex gap-2">
                {!confirm ? (
                  <>
                    <button
                      onClick={() => setConfirm(true)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-400"
                    >
                      Sıfırla
                    </button>
                    <button
                      onClick={startHatim}
                      className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                    >
                      + Yeni Hatim
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-stone-500 dark:text-stone-400">Sıfırlamak istediğinize emin misiniz?</span>
                    <button onClick={resetCurrent} className="text-xs font-semibold text-red-600 hover:text-red-700">Evet</button>
                    <button onClick={() => setConfirm(false)} className="text-xs text-stone-400">Hayır</button>
                  </>
                )}
              </div>
            </div>

            {/* 30 Cüz listesi */}
            <div className="space-y-2">
              {JUZ_DATA.map((juz) => {
                const done = current.readJuz.includes(juz.juz);
                return (
                  <button
                    key={juz.juz}
                    onClick={() => toggleJuz(juz.juz)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                      done
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900"
                    }`}
                  >
                    {/* Checkbox */}
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-stone-300 text-stone-400 dark:border-stone-600"
                    }`}>
                      {done ? "✓" : juz.juz}
                    </span>

                    {/* Cüz bilgisi */}
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold ${done ? "text-emerald-700 dark:text-emerald-400" : "text-stone-800 dark:text-stone-200"}`}>
                        {juz.juz}. Cüz
                      </span>
                      <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
                        {juz.startName} {juz.startAyah} – {juz.endName} {juz.endAyah}
                      </span>
                    </div>

                    {/* Sure linki */}
                    <Link
                      href={`/surah/${juz.startSurah}/ayah/${juz.startAyah}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded-lg border border-stone-200 px-2 py-1 text-[10px] text-stone-400 hover:border-emerald-300 hover:text-emerald-600 dark:border-stone-600 dark:text-stone-500"
                    >
                      Git →
                    </Link>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Tamamlanan hatimler */}
        {completed.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-stone-500 dark:text-stone-400">
              Tamamlanan Hatimler ({completed.length})
            </h2>
            <div className="space-y-2">
              {completed.map((h, i) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
                  <div>
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">{completed.length - i}. Hatim</span>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {formatDate(h.startDate)} → {formatDate(h.completedDate!)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {daysBetween(h.startDate, h.completedDate!)} gün
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
