import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";

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

const ISTANBUL = { lat: 41.0082, lon: 28.9784, city: "İstanbul" };
const PRAYER_LABELS: Record<string, string> = {
  Fajr: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle",
  Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı",
};
const PRAYER_CACHE_KEY = "prayerTimesCache";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}


export function useDailyContent() {
  const [verse, setVerse]     = useState<DailyVerse | null>(null);
  const [dua, setDua]         = useState<DailyVerse | null>(null);
  const [prayers, setPrayers] = useState<PrayerTimes | null>(null);
  const prayerCity = ISTANBUL.city;

  useEffect(() => {
    // 1. Namaz vakitlerini önce cache'den yükle (anında)
    AsyncStorage.getItem(PRAYER_CACHE_KEY).then(raw => {
      if (!raw) return;
      try {
        const cached = JSON.parse(raw);
        if (cached.date === todayKey() && cached.timings) {
          setPrayers(cached.timings);
        }
      } catch (_e) { /* stale cache — ignore */ }
    });

    // 2. Günün Ayeti + Günün Duası — geniş havuzdan tarih bazlı seçim
    api.daily.get()
      .then((data) => {
        if (data.verse) setVerse(data.verse);
        if (data.dua)   setDua(data.dua);
      })
      .catch(() => {
        // Fallback: deploy öncesi eski davranış
        api.verses.bySurah(89).then((res) => {
          const seed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
          const v = res.verses[seed % res.verses.length];
          if (v) setVerse({
            verse_key: `89:${v.ayahNumber}`,
            surah_id: 89, ayah_number: v.ayahNumber,
            surah_name: res.surah.name,
            arabic_text: null, reading_tr: v.reading ?? null, meal: v.meal,
          });
        }).catch(() => {});
        api.mood.random("sabır").then((d) => {
          if (d?.verse_key) setDua({
            verse_key: d.verse_key, surah_id: d.surah_id, ayah_number: d.ayah_number,
            surah_name: d.surah_name, arabic_text: d.arabic_text ?? null,
            reading_tr: null, meal: d.meal,
          });
        }).catch(() => {});
      });

    // 4. Namaz vakitlerini API'den çek ve cache'e yaz
    const ts = `${new Date().getDate().toString().padStart(2,"0")}-${(new Date().getMonth()+1).toString().padStart(2,"0")}-${new Date().getFullYear()}`;
    fetch(`https://api.aladhan.com/v1/timings/${ts}?latitude=${ISTANBUL.lat}&longitude=${ISTANBUL.lon}&method=13`, {
      headers: { "Accept": "application/json" },
    })
      .then(r => r.json())
      .then((d) => {
        if (d?.data?.timings) {
          setPrayers(d.data.timings);
          AsyncStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify({
            date: todayKey(),
            timings: d.data.timings,
          })).catch(() => {});
        }
      }).catch(() => {});
  }, []);

  const nextPrayer = prayers ? (() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (const key of ["Fajr","Dhuhr","Asr","Maghrib","Isha"]) {
      const [h, m] = (prayers[key as keyof PrayerTimes] ?? "").split(":").map(Number);
      if (!isNaN(h) && h * 60 + m > nowMin) {
        return { label: PRAYER_LABELS[key], time: prayers[key as keyof PrayerTimes] };
      }
    }
    return { label: PRAYER_LABELS["Fajr"], time: prayers.Fajr };
  })() : null;

  return { verse, dua, prayers, prayerCity, nextPrayer, PRAYER_LABELS };
}
