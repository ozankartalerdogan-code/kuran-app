"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── Standart 30 cüz başlangıç ayetleri ─────────────────────────────────────
export const CUZ_MAPPING = [
  { cuz: 1,  surahId: 1,  ayahNumber: 1   },
  { cuz: 2,  surahId: 2,  ayahNumber: 142 },
  { cuz: 3,  surahId: 2,  ayahNumber: 253 },
  { cuz: 4,  surahId: 3,  ayahNumber: 92  },
  { cuz: 5,  surahId: 4,  ayahNumber: 24  },
  { cuz: 6,  surahId: 4,  ayahNumber: 148 },
  { cuz: 7,  surahId: 5,  ayahNumber: 82  },
  { cuz: 8,  surahId: 6,  ayahNumber: 111 },
  { cuz: 9,  surahId: 7,  ayahNumber: 87  },
  { cuz: 10, surahId: 8,  ayahNumber: 41  },
  { cuz: 11, surahId: 9,  ayahNumber: 93  },
  { cuz: 12, surahId: 11, ayahNumber: 6   },
  { cuz: 13, surahId: 12, ayahNumber: 53  },
  { cuz: 14, surahId: 15, ayahNumber: 1   },
  { cuz: 15, surahId: 17, ayahNumber: 1   },
  { cuz: 16, surahId: 18, ayahNumber: 75  },
  { cuz: 17, surahId: 21, ayahNumber: 1   },
  { cuz: 18, surahId: 23, ayahNumber: 1   },
  { cuz: 19, surahId: 25, ayahNumber: 21  },
  { cuz: 20, surahId: 27, ayahNumber: 56  },
  { cuz: 21, surahId: 29, ayahNumber: 46  },
  { cuz: 22, surahId: 33, ayahNumber: 31  },
  { cuz: 23, surahId: 36, ayahNumber: 28  },
  { cuz: 24, surahId: 39, ayahNumber: 32  },
  { cuz: 25, surahId: 41, ayahNumber: 47  },
  { cuz: 26, surahId: 46, ayahNumber: 1   },
  { cuz: 27, surahId: 51, ayahNumber: 31  },
  { cuz: 28, surahId: 58, ayahNumber: 1   },
  { cuz: 29, surahId: 67, ayahNumber: 1   },
  { cuz: 30, surahId: 78, ayahNumber: 1   },
] as const;

const STORAGE_KEY = "mushaf_bookmark";

// surahId * 10000 + ayahNumber — Kuran sıralamasında güvenli karşılaştırma
// (max ayet sayısı 286, 10000'den çok küçük)
function toLinear(surahId: number, ayahNumber: number): number {
  return surahId * 10000 + ayahNumber;
}

export function getCurrentCuz(surahId: number, ayahNumber: number): number {
  const pos = toLinear(surahId, ayahNumber);
  let result = 1;
  for (const entry of CUZ_MAPPING) {
    if (pos >= toLinear(entry.surahId, entry.ayahNumber)) {
      result = entry.cuz;
    }
  }
  return result;
}

function parseVerseKey(key: string): { surahId: number; ayahNumber: number } | null {
  const parts = key.split(":");
  if (parts.length !== 2) return null;
  const s = Number(parts[0]);
  const a = Number(parts[1]);
  return Number.isInteger(s) && s >= 1 && Number.isInteger(a) && a >= 1
    ? { surahId: s, ayahNumber: a }
    : null;
}

interface Props {
  surahId: number;
  ayahNumber: number;
}

export function JuzTracker({ surahId, ayahNumber }: Props) {
  const router = useRouter();
  const [bookmark, setBookmark] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setBookmark(stored);
  }, []);

  const currentCuz   = getCurrentCuz(surahId, ayahNumber);
  const parsedBm     = bookmark ? parseVerseKey(bookmark) : null;
  const bookmarkCuz  = parsedBm ? getCurrentCuz(parsedBm.surahId, parsedBm.ayahNumber) : null;

  function markHere() {
    const key = `${surahId}:${ayahNumber}`;
    localStorage.setItem(STORAGE_KEY, key);
    setBookmark(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function goToBookmark() {
    if (!parsedBm) return;
    router.push(`/mushaf/${parsedBm.surahId}/${parsedBm.ayahNumber}`);
  }

  return (
    <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">

      {/* ── Cüz etiketi + oran ── */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          {currentCuz}. Cüz
        </span>
        <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
          {currentCuz} / 30
        </span>
      </div>

      {/* ── 30 segmentlik ilerleme çubuğu ── */}
      <div
        className="mb-4 flex gap-px"
        role="progressbar"
        aria-valuenow={currentCuz}
        aria-valuemin={1}
        aria-valuemax={30}
        aria-label={`${currentCuz}. cüz okunuyor`}
      >
        {CUZ_MAPPING.map((entry) => {
          const done    = entry.cuz < currentCuz;
          const current = entry.cuz === currentCuz;
          return (
            <div
              key={entry.cuz}
              title={`${entry.cuz}. Cüz`}
              className={`h-2.5 flex-1 rounded-sm transition-colors ${
                done
                  ? "bg-emerald-500 dark:bg-emerald-600"
                  : current
                    ? "bg-amber-500 dark:bg-amber-400"
                    : "bg-stone-200 dark:bg-stone-600"
              }`}
            />
          );
        })}
      </div>

      {/* ── Butonlar ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Şu anki ayeti kaydet */}
        <button
          onClick={markHere}
          type="button"
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            saved
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "border-stone-300 bg-stone-50 text-stone-700 hover:bg-white dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
          }`}
        >
          {saved ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Kaydedildi!
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Buraya işaretle
            </>
          )}
        </button>

        {/* Kaydedilen ayete git */}
        {parsedBm ? (
          <button
            onClick={goToBookmark}
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
            Kaldığım yer: {bookmark}
            {bookmarkCuz !== null && (
              <span className="ml-0.5 text-amber-500 dark:text-amber-500">
                · {bookmarkCuz}. Cüz
              </span>
            )}
          </button>
        ) : (
          <span className="text-xs text-stone-400 dark:text-stone-500">
            Henüz yer imi yok
          </span>
        )}
      </div>
    </div>
  );
}
