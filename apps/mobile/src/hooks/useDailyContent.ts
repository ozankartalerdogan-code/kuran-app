import { useState, useEffect, useCallback, useRef } from "react";
import { api, dailyCacheVkey, dailyCacheKey } from "../lib/api";
import { storage, STORAGE_KEYS } from "../lib/storage";
import * as Location from "expo-location";
import { getStrings, getLang } from "../i18n";
import prayerNameStrings from "../i18n/strings/prayerNames";

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

export interface HijriDate {
  day: number;
  monthNumber: number; // 1-12, Muharrem=1
  year: number;
}

export function formatHijriDate(h: HijriDate | null): string {
  if (!h) return "";
  const monthName = getStrings(prayerNameStrings).hijriMonths[h.monthNumber - 1] ?? "";
  return `${h.day} ${monthName} ${h.year}`;
}

function parseHijri(raw: unknown): HijriDate | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Record<string, unknown>;
  const day = Number(h.day);
  const year = Number(h.year);
  const monthNumber = Number((h.month as Record<string, unknown> | undefined)?.number);
  if (!Number.isFinite(day) || !Number.isFinite(year) || !Number.isFinite(monthNumber)) return null;
  return { day, monthNumber, year };
}

export interface UseDailyContentResult {
  verse: DailyVerse | null;
  dua: DailyVerse | null;
  prayers: PrayerTimes | null;
  hijriDate: HijriDate | null;
  prayerCity: string;
  nextPrayer: { key: string; label: string; time: string; remainingMin: number } | null;
  PRAYER_LABELS: Record<string, string>;
  loading: boolean;
  verseLoading: boolean;
  duaLoading: boolean;
  prayerLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ISTANBUL = { lat: 41.0082, lon: 28.9784, city: "İstanbul" };
// Dile göre vakit adları (TR: İmsak…, EN: Fajr…) — her render'da güncel dil okunur.
function prayerLabels(): Record<string, string> {
  const pn = getStrings(prayerNameStrings);
  return { Fajr: pn.Fajr, Sunrise: pn.Sunrise, Dhuhr: pn.Dhuhr, Asr: pn.Asr, Maghrib: pn.Maghrib, Isha: pn.Isha };
}

interface PrayerCache {
  date: string;
  timings: PrayerTimes;
  hijri?: HijriDate | null;
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
  const [hijriDate, setHijriDate] = useState<HijriDate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [verseLoading, setVerseLoading] = useState<boolean>(true);
  const [duaLoading, setDuaLoading] = useState<boolean>(true);
  const [prayerLoading, setPrayerLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [prayerCityState, setPrayerCityState] = useState<string>(ISTANBUL.city);
  const prayerCity = prayerCityState === ISTANBUL.city && getLang() === "en" ? "Istanbul" : prayerCityState;
  const PRAYER_LABELS = prayerLabels();

  // Canlı geri sayım için tik — 30 sn'de bir yeniden render tetikler, nextPrayer
  // aşağıda her render'da yeniden hesaplandığı için kalan süre kendiliğinden
  // güncellenir. Ağ isteği/başka yan etki YOKTUR, yalnız render.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    // Her load'a kimlik ver: unmount olduysa ya da daha yeni bir load (ör.
    // pull-to-refresh) başladıysa, bu çağrının geç gelen yanıtları state'i EZMESİN.
    const myLoadId = ++loadIdRef.current;
    const isCurrent = () => isMountedRef.current && loadIdRef.current === myLoadId;
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    setError(null);
    setVerseLoading(true);
    setDuaLoading(true);
    setPrayerLoading(true);
    setLoading(true);

    let verseDone = false;
    let duaDone = false;
    let prayerDone = false;
    let anyContentLoaded = false;
    let loadFailed = false;

    const markSuccess = () => {
      anyContentLoaded = true;
    };

    const markFailure = () => {
      loadFailed = true;
    };

    const tryFinishLoading = () => {
      if (verseDone && duaDone && prayerDone) {
        setError(loadFailed && !anyContentLoaded ? "Gunluk icerik yuklenemedi." : null);
        setLoading(false);
      }
    };

    // 0. Günün ayeti + duasını anında göster — bugünün cache'ini doğrudan oku
    try {
      const cacheKey = dailyCacheKey();
      const snap =
        (await storage.getJSON<{
          ts: number;
          data: { verse: DailyVerse | null; dua: DailyVerse | null };
        }>(dailyCacheVkey(cacheKey))) ??
        (await storage.getJSON<{
          ts: number;
          data: { verse: DailyVerse | null; dua: DailyVerse | null };
        }>(cacheKey));
      if (snap?.data && isCurrent()) {
        if (snap.data.verse && isValidDailyVerse(snap.data.verse)) {
          setVerse(snap.data.verse);
          markSuccess();
          verseDone = true;
          setVerseLoading(false);
        }
        if (snap.data.dua && isValidDailyVerse(snap.data.dua)) {
          setDua(snap.data.dua);
          markSuccess();
          duaDone = true;
          setDuaLoading(false);
        }
        tryFinishLoading();
      }
    } catch { /* ignore */ }

    // 1. Namaz vakitlerini önce cache'den yükle (anında)
    try {
      const raw = await storage.getString(STORAGE_KEYS.prayerCache);
      if (raw) {
        const cached: unknown = JSON.parse(raw);
        if (
          isCurrent() &&
          cached &&
          typeof cached === "object" &&
          (cached as PrayerCache).date === todayKey() &&
          isValidPrayerTimes((cached as PrayerCache).timings)
        ) {
          setPrayers((cached as PrayerCache).timings);
          if ((cached as PrayerCache).hijri) setHijriDate((cached as PrayerCache).hijri ?? null);
          markSuccess();
        }
      }
    } catch {
      // stale cache — ignore
    }

    // 2. Günün Ayeti + Günün Duası — geniş havuzdan tarih bazlı seçim
    api.daily
      .get()
      .then((data) => {
        if (!isCurrent()) return;
        let hasDailyContent = false;
        if (data.verse && isValidDailyVerse(data.verse)) {
          setVerse(data.verse);
          hasDailyContent = true;
        }
        if (data.dua && isValidDailyVerse(data.dua)) {
          setDua(data.dua);
          hasDailyContent = true;
        }
        if (hasDailyContent) markSuccess();
        else markFailure();
        verseDone = true;
        duaDone = true;
        setVerseLoading(false);
        setDuaLoading(false);
        tryFinishLoading();
      })
      .catch(() => {
        if (!isCurrent()) return;
        markFailure();
        // Fallback: deploy öncesi eski davranış
        api.verses
          .bySurah(89)
          .then((res) => {
            if (!isCurrent()) return;
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
              markSuccess();
            } else {
              markFailure();
            }
            verseDone = true;
            setVerseLoading(false);
            tryFinishLoading();
          })
          .catch(() => {
            if (!isCurrent()) return;
            markFailure();
            verseDone = true;
            setVerseLoading(false);
            tryFinishLoading();
          });
        api.mood
          .random("sabır")
          .then((d) => {
            if (!isCurrent()) return;
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
              markSuccess();
            } else {
              markFailure();
            }
            duaDone = true;
            setDuaLoading(false);
            tryFinishLoading();
          })
          .catch(() => {
            if (!isCurrent()) return;
            markFailure();
            duaDone = true;
            setDuaLoading(false);
            tryFinishLoading();
          });
      });

    // 4. Namaz vakitlerini gerçek konumla çek. Ana sayfada izin İSTEMEYİZ; yalnız
    //    önceden verilmişse kullanırız (izin asıl context'inde — kıble / namaz
    //    bildirimi açılırken — istenir). Yoksa sessizce İstanbul'a düşeriz.
    // Şehir adı (reverse geocode) namaz vakti isteğini BLOKE ETMEZ — arka planda
    // ayrı çözülür, gelince yalnız görünen etiketi günceller. Konum de önce OS'un
    // önbelleklediği "son bilinen konum"u dener (anında); yoksa canlı GPS fix ister.
    const coords = await (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return ISTANBUL;

        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 10 * 60 * 1000, // 10 dk içindeyse taze say
        }).catch(() => null);

        const pos = lastKnown ?? await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((r) => setTimeout(() => r(null), 15000)),
        ]);
        if (pos && "coords" in pos) {
          const { latitude, longitude } = pos.coords;
          Location.reverseGeocodeAsync({ latitude, longitude })
            .then((geo) => {
              if (!isCurrent()) return;
              const place = geo[0];
              const cityName = place?.city ?? place?.subregion ?? place?.region ?? null;
              if (cityName) setPrayerCityState(cityName);
            })
            .catch(() => { /* ignore — İstanbul etiketiyle kalır */ });
          return { lat: latitude, lon: longitude };
        }
      } catch { /* ignore */ }
      return ISTANBUL;
    })();

    // Konum çözümü 15 sn'e kadar sürebilir; bu sırada unmount/yeni-load olduysa
    // artık namaz fetch'ini başlatma ve state'e dokunma.
    if (!isCurrent()) return;

    const ts = buildDateStr();
    const prayerAC = new AbortController();
    const prayerTimeoutId = setTimeout(() => prayerAC.abort(), 8_000);

    fetch(
      // school=0: Türkiye genelinde yaygın ikindi yöntemini hesaplar (school=1/Hanefi İkindi'yi ~1 saat geç verir)
      `https://api.aladhan.com/v1/timings/${ts}?latitude=${coords.lat}&longitude=${coords.lon}&method=13&school=0&midnightMode=0&timezonestring=Europe%2FIstanbul`,
      { headers: { "Accept": "application/json" }, signal: prayerAC.signal },
    )
      .then((r) => r.json())
      .then((d) => {
        clearTimeout(prayerTimeoutId);
        if (!isCurrent()) return;
        if (d?.data?.timings && isValidPrayerTimes(d.data.timings)) {
          setPrayers(d.data.timings);
          const hijri = parseHijri(d.data.date?.hijri);
          if (hijri) setHijriDate(hijri);
          markSuccess();
          storage.setJSON(STORAGE_KEYS.prayerCache, {
            date: todayKey(),
            timings: d.data.timings,
            hijri,
          }).catch(() => {});
        } else {
          markFailure();
        }
        prayerDone = true;
        setPrayerLoading(false);
        tryFinishLoading();
      })
      .catch(() => {
        clearTimeout(prayerTimeoutId);
        if (!isCurrent()) return;
        markFailure();
        prayerDone = true;
        setPrayerLoading(false);
        tryFinishLoading();
      });

    // Safety timeout: en geç 10 saniye sonra loading'i kapat
    safetyTimerRef.current = setTimeout(() => {
      if (!isCurrent()) return;
      if (!verseDone) setVerseLoading(false);
      if (!duaDone) setDuaLoading(false);
      if (!prayerDone) { prayerAC.abort(); setPrayerLoading(false); }
      if (loadFailed && !anyContentLoaded) setError("Gunluk icerik yuklenemedi.");
      setLoading(false);
    }, 10_000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    return () => {
      isMountedRef.current = false;
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [load]);

  const nextPrayer = prayers
    ? (() => {
        const now = new Date(nowTick);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        for (const key of ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
          const [h, m] = (prayers[key as keyof PrayerTimes] ?? "")
            .split(":")
            .map(Number);
          if (!isNaN(h) && h * 60 + m > nowMin) {
            return {
              key,
              label: PRAYER_LABELS[key],
              time: prayers[key as keyof PrayerTimes],
              remainingMin: h * 60 + m - nowMin,
            };
          }
        }
        // Bugünün tüm vakitleri geçti → yarınki İmsak'a kalan süre.
        const [fh, fm] = (prayers.Fajr ?? "").split(":").map(Number);
        const toFajr = isNaN(fh) ? 0 : 24 * 60 - nowMin + fh * 60 + fm;
        return { key: "Fajr", label: PRAYER_LABELS["Fajr"], time: prayers.Fajr, remainingMin: toFajr };
      })()
    : null;

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return {
    verse,
    dua,
    prayers,
    hijriDate,
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
