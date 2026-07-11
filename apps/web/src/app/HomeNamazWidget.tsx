"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface NamazCache {
  times:    PrayerTimes;
  city:     string;
  cachedAt: number;
  day:      string; // YYYY-MM-DD (yerel) — vakitler güne göre değişir
}

const ISTANBUL    = { lat: 41.0082, lon: 28.9784, city: "İstanbul" };
const CACHE_KEY   = "namazCache";

// Yerel takvim günü — cache aynı güne aitse taze sayılır (vakitler günde 1 kez değişir)
function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const VAKITLER: { key: keyof PrayerTimes; label: string }[] = [
  { key: "Fajr",    label: "İmsak"  },
  { key: "Sunrise", label: "Güneş"  },
  { key: "Dhuhr",   label: "Öğle"   },
  { key: "Asr",     label: "İkindi" },
  { key: "Maghrib", label: "Akşam"  },
  { key: "Isha",    label: "Yatsı"  },
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function findNextPrayer(times: PrayerTimes): string | null {
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const { key, label } of VAKITLER) {
    if (timeToMinutes(times[key]) > nowMin) return label;
  }
  return VAKITLER[0].label;
}

// Yaşına bakmadan ham cache'i döndürür (stale-while-revalidate için).
function readCache(): NamazCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NamazCache;
  } catch {
    return null;
  }
}

// Cache bugüne aitse taze — ağ isteğine gerek yok.
function isFresh(cache: NamazCache): boolean {
  return cache.day === localDayStr();
}

function writeCache(times: PrayerTimes, city: string): void {
  try {
    const cache: NamazCache = { times, city, cachedAt: Date.now(), day: localDayStr() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

export function HomeNamazWidget({
  initialTimes = null,
}: {
  /** Sunucuda çekilen İstanbul vakitleri — ilk boyama iskeletsiz, dolu gelsin */
  initialTimes?: PrayerTimes | null;
}) {
  const [times, setTimes]       = useState<PrayerTimes | null>(initialTimes);
  const [city, setCity]         = useState(ISTANBUL.city);
  const [status, setStatus]     = useState<"loading" | "ok" | "error">(
    initialTimes ? "ok" : "loading"
  );
  const [nextPrayer, setNextPrayer] = useState<string | null>(null);

  useEffect(() => {
    // A) Bayat olsa bile cache varsa ANINDA göster (stale-while-revalidate).
    const cached = readCache();
    if (cached) {
      setTimes(cached.times);
      setCity(cached.city);
      setNextPrayer(findNextPrayer(cached.times));
      setStatus("ok");
      if (isFresh(cached)) return; // bugüne ait → ağ isteği yok
      // bayat → aşağıda arka planda sessizce yenile (iskelet gösterme)
    } else if (initialTimes) {
      // SSR vakitleri gösterimde — sıradaki vakti işaretle, konum güncellemesi arkada
      setNextPrayer(findNextPrayer(initialTimes));
    }

    async function fetchTimes(lat: number, lon: number, cityName: string) {
      try {
        const ts  = Math.floor(Date.now() / 1000);
        const res = await fetch(
          `https://api.aladhan.com/v1/timings/${ts}?latitude=${lat}&longitude=${lon}&method=13`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        const t    = json.data.timings as PrayerTimes;
        setTimes(t);
        setCity(cityName);
        setNextPrayer(findNextPrayer(t));
        setStatus("ok");
        writeCache(t, cityName);
      } catch {
        // Cache veya SSR verisi gösteriliyorsa hatayı yut — sadece hiç veri yoksa hata göster.
        if (!cached && !initialTimes) setStatus("error");
      }
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchTimes(pos.coords.latitude, pos.coords.longitude, "Konumunuz"),
        ()    => fetchTimes(ISTANBUL.lat, ISTANBUL.lon, ISTANBUL.city),
        // B) Yakın geçmişteki konumu kabul et (≤30 dk) → genelde anında; timeout 5sn→4sn.
        { timeout: 4000, maximumAge: 30 * 60 * 1000 }
      );
    } else {
      fetchTimes(ISTANBUL.lat, ISTANBUL.lon, ISTANBUL.city);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca ilk mount'ta çalışsın
  }, []);

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200">
          <Clock aria-hidden="true" className="h-4 w-4 text-navy-600 dark:text-navy-400" strokeWidth={2} />
          Namaz Vakitleri
        </h2>
        <span className="text-xs text-stone-400">{city}</span>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {VAKITLER.map(({ key }) => (
            <div key={key} className="h-14 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-stone-400">Vakitler yüklenemedi.</p>
      )}

      {status === "ok" && times && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {VAKITLER.map(({ key, label }) => {
            const isNext = label === nextPrayer;
            return (
              <div
                key={key}
                className={`flex flex-col items-center rounded-lg px-2 py-2.5 text-center transition-colors ${
                  isNext
                    ? "bg-navy-500 text-white shadow-sm"
                    : "bg-stone-50 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                <span className={`text-[10px] font-medium leading-none ${
                  isNext ? "text-white/80" : "text-stone-400 dark:text-stone-500"
                }`}>
                  {label}
                </span>
                <span className="mt-1 text-sm font-bold tabular-nums leading-none">
                  {times[key]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
