import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { api, dailyCacheVkey, dailyCacheKey } from "../lib/api";
import { storage } from "../lib/storage";
import * as Location from "expo-location";
import { getStrings, getLang } from "../i18n";
import prayerNameStrings from "../i18n/strings/prayerNames";
import { getManualCity, isTurkeyCountry, titleCaseTr } from "../lib/diyanetPrayer";
import { diyanetDeps } from "../lib/diyanetPrayerDeps";
import { buildPrayerContext, getHomeLocation } from "../lib/prayerContextDeps";
import { getPrayerDayRepository } from "../lib/prayerDayRepositoryDeps";
import type { PrayerContext, PrayerDayRecord } from "../lib/prayerDayRepository";
import { addDaysYmd, prayerDateInZone, formatHmInZone, intlZoneSupported, PRAYER_KEYS } from "../lib/prayerInstant";
import { HOME_LOCATION_REFRESH_MS, homeHijriDate, nextPrayerFromInstants, shouldRefreshHomeLocation, watchHomePrayerDays } from "../lib/homePrayer";
import { clearPrayerWidgetFallback, serializeFallbackSnapshot, writePrayerWidgetFallback } from "../widgets/prayerWidgetFallback";
import { refreshPrayerWidgetsNow } from "../widgets/widgetRefresh";

function prayerTime(atMs: number, zone: string): string {
  if (intlZoneSupported()) return formatHmInZone(atMs, zone);
  const local = new Date(atMs);
  return `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`;
}

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
  refreshHomeLocation: () => Promise<void>;
}

const ISTANBUL = { lat: 41.0082, lon: 28.9784, city: "İstanbul" };
// Dile göre vakit adları (TR: İmsak…, EN: Fajr…) — her render'da güncel dil okunur.
function prayerLabels(): Record<string, string> {
  const pn = getStrings(prayerNameStrings);
  return { Fajr: pn.Fajr, Sunrise: pn.Sunrise, Dhuhr: pn.Dhuhr, Asr: pn.Asr, Maghrib: pn.Maghrib, Isha: pn.Isha };
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
  // güncellenir. Şehirde gün değişirse aşağıdaki effect gün penceresini yeniler.
  const [, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const loadIdRef = useRef(0);
  // Diyanet günü bulunduysa şehir etiketi ondan gelir; geç gelen reverseGeocode
  // sonucu bu etiketi ezmesin.
  const diyanetCityRef = useRef(false);
  const [prayerDays, setPrayerDays] = useState<readonly PrayerDayRecord[]>([]);
  const [prayerWindow, setPrayerWindow] = useState<{ date: string; zone: string } | null>(null);
  const prayerSubscriptionRef = useRef<(() => void) | null>(null);
  const prayerContextRef = useRef<PrayerContext | null>(null);
  const lastLocationCheckRef = useRef(0);
  const locationCheckInFlightRef = useRef(false);
  const fallbackWriteRef = useRef<Promise<void>>(Promise.resolve());

  const watchPrayers = useCallback((context: PrayerContext, coords: { lat: number; lng: number },
    isCurrent: () => boolean, onSuccess: () => void, onError: () => void) => {
    prayerSubscriptionRef.current?.();
    prayerContextRef.current = context;
    diyanetCityRef.current = false;
    const isActive = () => isCurrent() && prayerContextRef.current === context;
    // A label from a previous location (or the initial Istanbul placeholder) is
    // not a resolved name for this context.
    let cityLabel = "";
    let hasAladhan = false;
    let lastFallbackSignature = "";
    const syncFallback = () => {
      if (!context.cityKey.startsWith("geo:") || !hasAladhan || !cityLabel.trim()) return;
      const city = cityLabel === ISTANBUL.city && getLang() === "en" ? "Istanbul" : cityLabel;
      fallbackWriteRef.current = fallbackWriteRef.current.then(async () => {
        if (!isActive() || diyanetCityRef.current) return;
        const writtenAtMs = Date.now();
        const date = prayerDateInZone(writtenAtMs, context.cityTimeZone);
        const records = (await getPrayerDayRepository().readCachedDays(
          { cityKey: context.cityKey, cityTimeZone: context.cityTimeZone },
          Array.from({ length: 16 }, (_, i) => addDaysYmd(date, i - 1)),
        )).filter(record => record.source === "aladhan");
        if (!records.length || !isActive() || diyanetCityRef.current) return;
        const snapshot = { city, tz: context.cityTimeZone, writtenAtMs, records };
        // Exclude the write clock; compare exactly the sanitized disk content.
        const serialized = serializeFallbackSnapshot(snapshot);
        if (!serialized) return;
        const contentSignature = JSON.stringify({ ...JSON.parse(serialized), writtenAtMs: 0 });
        if (contentSignature === lastFallbackSignature) return;
        await writePrayerWidgetFallback(snapshot);
        lastFallbackSignature = contentSignature;
        if (isActive()) await refreshPrayerWidgetsNow();
      }).catch(() => {});
    };
    const applyLocationLabel = () => {
      if (!isActive() || diyanetCityRef.current || !context.cityKey.startsWith("geo:")) return;
      cityLabel = getLang() === "tr" ? "Konumunuz" : "Your location";
      setPrayerCityState(cityLabel);
      syncFallback();
    };
    if (!context.cityKey.startsWith("m")) {
      Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng })
        .then(geo => {
          if (!isActive() || diyanetCityRef.current) return;
          const place = geo[0];
          const name = [place?.city, place?.subregion, place?.region, place?.country]
            .find(value => value?.trim());
          if (name) {
            cityLabel = name;
            setPrayerCityState(name);
            syncFallback();
          } else {
            applyLocationLabel();
          }
        }).catch(applyLocationLabel);
    }
    const today = prayerDateInZone(Date.now(), context.cityTimeZone);
    setPrayerWindow({ date: today, zone: context.cityTimeZone });
    prayerSubscriptionRef.current = watchHomePrayerDays(
      getPrayerDayRepository(), context, [today, addDaysYmd(today, 1)], isActive,
      records => {
        setPrayerDays(records);
        const day = records.find(record => record.sourceDate === today);
        if (!day) { onError(); return; }
        setPrayers(Object.fromEntries(PRAYER_KEYS.map(key => [key, prayerTime(day.atMs[key], day.cityTimeZone)])) as unknown as PrayerTimes);
        setHijriDate(homeHijriDate(day));
        diyanetCityRef.current = day.source === "diyanet";
        hasAladhan = day.source === "aladhan";
        if (day.source === "diyanet") {
          fallbackWriteRef.current = fallbackWriteRef.current.then(async () => {
            if (!isActive() || lastFallbackSignature === "diyanet") return;
            await clearPrayerWidgetFallback();
            lastFallbackSignature = "diyanet";
            if (isActive()) await refreshPrayerWidgetsNow();
          }).catch(() => {});
        } else {
          syncFallback();
        }
        if (day.source === "diyanet" && day.cityDisplayName) {
          setPrayerCityState(titleCaseTr(day.cityDisplayName, context.cityTimeZone === "Europe/Istanbul"));
        }
        onSuccess();
      }, onError,
    );
  }, []);

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
    diyanetCityRef.current = false;
    prayerSubscriptionRef.current?.();
    prayerSubscriptionRef.current = null;
    prayerContextRef.current = null;

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

    // GPS ve şehir çözümü de bu bütçeye dahildir; zamanlayıcı onların sonrasına kalmaz.
    safetyTimerRef.current = setTimeout(() => {
      if (!isCurrent()) return;
      if (!verseDone) setVerseLoading(false);
      if (!duaDone) setDuaLoading(false);
      if (!prayerDone) setPrayerLoading(false);
      setLoading(false);
    }, 12_000);

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

    const manualCity = await getManualCity(diyanetDeps());
    if (!isCurrent()) return;
    setPrayers(null);
    setPrayerDays([]);
    setPrayerWindow(null);
    setHijriDate(null);
    setPrayerCityState(manualCity ? titleCaseTr(manualCity.name, isTurkeyCountry(manualCity.country)) : ISTANBUL.city);

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

    // Konum çözümü eski ana sayfa davranışıyla aynı; context kurucusu bildirimlerle ortak.
    const coords = await getHomeLocation();
    if (!isCurrent()) return;
    try {
      const context = await buildPrayerContext(coords.lat, coords.lng);
      if (!isCurrent()) return;
      lastLocationCheckRef.current = Date.now();
      watchPrayers(context, coords, isCurrent,
        () => {
          markSuccess();
          prayerDone = true;
          setPrayerLoading(false);
          tryFinishLoading();
        },
        () => {
          markFailure();
          prayerDone = true;
          setPrayerLoading(false);
          tryFinishLoading();
        },
      );
    } catch {
      if (!isCurrent()) return;
      markFailure();
      prayerDone = true;
      setPrayerLoading(false);
      tryFinishLoading();
    }
  }, [watchPrayers]);

  const refreshHomeLocation = useCallback(async () => {
    const now = Date.now();
    if (!prayerContextRef.current || locationCheckInFlightRef.current ||
      now - lastLocationCheckRef.current < HOME_LOCATION_REFRESH_MS) return;
    const lastCheck = lastLocationCheckRef.current;
    lastLocationCheckRef.current = now;
    locationCheckInFlightRef.current = true;
    const loadId = loadIdRef.current;
    const previous = prayerContextRef.current;
    const isCurrent = () => isMountedRef.current && loadIdRef.current === loadId;
    try {
      if (await getManualCity(diyanetDeps())) return;
      // Read only the OS cache: no permission prompt or wait for a GPS fix.
      const position = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
      if (!position || !isCurrent()) return;
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (coords.lat === previous.lat && coords.lng === previous.lon) return;
      const context = await buildPrayerContext(coords.lat, coords.lng);
      if (!isCurrent() || await getManualCity(diyanetDeps()) || !isCurrent()) return;
      if (!shouldRefreshHomeLocation(previous.cityKey, context.cityKey, lastCheck, now)) return;
      watchPrayers(context, coords, isCurrent, () => setPrayerLoading(false), () => setPrayerLoading(false));
    } catch { /* Keep the current card if location resolution fails. */ }
    finally { locationCheckInFlightRef.current = false; }
  }, [watchPrayers]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void refreshHomeLocation();
    });
    return () => subscription.remove();
  }, [refreshHomeLocation]);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    return () => {
      isMountedRef.current = false;
      prayerSubscriptionRef.current?.();
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [load]);

  // Refill the city calendar window when a mounted home crosses midnight.
  const displayedDate = prayerWindow?.date;
  const currentDate = prayerWindow ? prayerDateInZone(Date.now(), prayerWindow.zone) : undefined;
  useEffect(() => {
    if (displayedDate && currentDate && displayedDate !== currentDate) void load();
  }, [displayedDate, currentDate, load]);

  const next = nextPrayerFromInstants(prayerDays, Date.now());
  const nextPrayer = next ? {
    key: next.key,
    label: PRAYER_LABELS[next.key],
    time: prayerTime(next.atMs, next.record.cityTimeZone),
    remainingMin: next.remainingMin,
  } : null;

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
    refreshHomeLocation,
  };
}
