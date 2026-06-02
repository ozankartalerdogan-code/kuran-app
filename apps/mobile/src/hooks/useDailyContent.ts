import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { storage, STORAGE_KEYS } from "../lib/storage";
import * as Location from "expo-location";

interface DailyVerse {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
  arabic_text: string | null;
  reading_tr: string | null;
  meal: string | null;
}

interface PrayerTimes {
  Fajr: string; Sunrise: string; Dhuhr: string;
  Asr: string; Maghrib: string; Isha: string;
}

export interface UseDailyContentResult {
  verse: DailyVerse | null;
  dua: DailyVerse | null;
  prayers: PrayerTimes | null;
  prayerCity: string;
  nextPrayer: { label: string; time: string } | null;
  PRAYER_LABELS: Record<string, string>;
  loading: boolean;
  verseLoading: boolean;
  duaLoading: boolean;
  prayerLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ISTANBUL = { lat: 41.0082, lon: 28.9784, city: "İstanbul" };
const PRAYER_LABELS: Record<string, string> = {
  Fajr: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle",
  Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı",
};

interface PrayerCache {
  date: string;
  timings: PrayerTimes;
}

function isValidPrayerTimes(data: unknown): data is PrayerTimes {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].every(
    (k) => typeof d[k] === "string",
  );
}

function isValidDailyVerse(data: unknown): data is DailyVerse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.verse_key === "string" &&
    typeof d.surah_id === "number" &&
    typeof d.ayah_number === "number"
  );
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function buildDateStr(): string {
  return `${new Date().getDate().toString().padStart(2, "0")}-${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${new Date().getFullYear()}`;
}

export function useDailyContent(): UseDailyContentResult {
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [dua, setDua] = useState<DailyVerse | null>(null);
  const [prayers, setPrayers] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [verseLoading, setVerseLoading] = useState<boolean>(true);
  const [duaLoading, setDuaLoading] = useState<boolean>(true);
  const [prayerLoading, setPrayerLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [prayerCityState, setPrayerCityState] = useState<string>(ISTANBUL.city);
  const prayerCity = prayerCityState;

  const load = async () => {
    setError(null);
    setVerseLoading(true);
    setDuaLoading(true);
    setPrayerLoading(true);
    setLoading(true);

    // Track sub-load completions via flags (updated in closures)
    let verseDone = false;
    let duaDone = false;
    let prayerDone = false;

    const tryFinishLoading = () => {
      if (verseDone && duaDone && prayerDone) {
        setLoading(false);
      }
    };

    // 1. Namaz vakitlerini önce cache'den yükle (anında)
    try {
      const raw = await storage.getString(STORAGE_KEYS.prayerCache);
      if (raw) {
        const cached: unknown = JSON.parse(raw);
        if (
          cached &&
          typeof cached === "object" &&
          (cached as PrayerCache).date === todayKey() &&
          isValidPrayerTimes((cached as PrayerCache).timings)
        ) {
          setPrayers((cached as PrayerCache).timings);
        }
      }
    } catch {
      // stale cache — ignore
    }

    // 2. Günün Ayeti + Günün Duası — geniş havuzdan tarih bazlı seçim
    api.daily
      .get()
      .then((data) => {
        if (data.verse && isValidDailyVerse(data.verse)) {
          setVerse(data.verse);
        }
        if (data.dua && isValidDailyVerse(data.dua)) {
          setDua(data.dua);
        }
        verseDone = true;
        duaDone = true;
        setVerseLoading(false);
        setDuaLoading(false);
        tryFinishLoading();
      })
      .catch(() => {
        // Fallback: deploy öncesi eski davranış
        api.verses
          .bySurah(89)
          .then((res) => {
            const seed =
              new Date().getFullYear() * 10000 +
              (new Date().getMonth() + 1) * 100 +
              new Date().getDate();
            const v = res.verses[seed % res.verses.length];
            if (v) {
              setVerse({
                verse_key: `89:${v.ayahNumber}`,
                surah_id: 89,
                ayah_number: v.ayahNumber,
                surah_name: res.surah.name,
                arabic_text: null,
                reading_tr: v.reading ?? null,
                meal: v.meal,
              });
            }
            verseDone = true;
            setVerseLoading(false);
            tryFinishLoading();
          })
          .catch(() => {
            verseDone = true;
            setVerseLoading(false);
            tryFinishLoading();
          });
        api.mood
          .random("sabır")
          .then((d) => {
            if (d?.verse_key) {
              setDua({
                verse_key: d.verse_key,
                surah_id: d.surah_id,
                ayah_number: d.ayah_number,
                surah_name: d.surah_name,
                arabic_text: d.arabic_text ?? null,
                reading_tr: null,
                meal: d.meal,
              });
            }
            duaDone = true;
            setDuaLoading(false);
            tryFinishLoading();
          })
          .catch(() => {
            duaDone = true;
            setDuaLoading(false);
            tryFinishLoading();
          });
      });

    // 4. Namaz vakitlerini gerçek konumla çek (izin yoksa İstanbul)
    const coords = await (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return ISTANBUL;
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((r) => setTimeout(() => r(null), 15000)),
        ]);
        if (pos && "coords" in pos) {
          const { latitude, longitude } = pos.coords;
          // Şehir adını al (reverse geocoding)
          try {
            const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
            const place = geo[0];
            const cityName = place?.city ?? place?.subregion ?? place?.region ?? null;
            if (cityName) setPrayerCityState(cityName);
          } catch { /* ignore */ }
          return { lat: latitude, lon: longitude };
        }
      } catch { /* ignore */ }
      return ISTANBUL;
    })();

    const ts = buildDateStr();
    fetch(
      `https://api.aladhan.com/v1/timings/${ts}?latitude=${coords.lat}&longitude=${coords.lon}&method=13&school=1&midnightMode=0&timezonestring=Europe%2FIstanbul`,
      {
        headers: { "Accept": "application/json" },
      },
    )
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.timings && isValidPrayerTimes(d.data.timings)) {
          setPrayers(d.data.timings);
          storage.setJSON(STORAGE_KEYS.prayerCache, {
            date: todayKey(),
            timings: d.data.timings,
          }).catch(() => {});
        }
        prayerDone = true;
        setPrayerLoading(false);
        tryFinishLoading();
      })
      .catch(() => {
        prayerDone = true;
        setPrayerLoading(false);
        tryFinishLoading();
      });

    // Safety timeout: en geç 10 saniye sonra loading'i kapat
    setTimeout(() => {
      if (!verseDone) setVerseLoading(false);
      if (!duaDone) setDuaLoading(false);
      if (!prayerDone) setPrayerLoading(false);
      setLoading(false);
    }, 10_000);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextPrayer = prayers
    ? (() => {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        for (const key of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
          const [h, m] = (prayers[key as keyof PrayerTimes] ?? "")
            .split(":")
            .map(Number);
          if (!isNaN(h) && h * 60 + m > nowMin) {
            return {
              label: PRAYER_LABELS[key],
              time: prayers[key as keyof PrayerTimes],
            };
          }
        }
        return { label: PRAYER_LABELS["Fajr"], time: prayers.Fajr };
      })()
    : null;

  const refresh = async () => {
    await load();
  };

  return {
    verse,
    dua,
    prayers,
    prayerCity,
    nextPrayer,
    PRAYER_LABELS,
    loading,
    verseLoading,
    duaLoading,
    prayerLoading,
    error,
    refresh,
  };
}
