// "Emir ayetleri" widget havuzu — network'süz, yerel/deterministik rotasyon.
// Havuz apps/mobile/src/data/emirAyetleri.json dosyasında bundle edilir
// (bkz. scripts/generate-emir-ayetleri.mjs — Turso'dan tek seferlik üretilir).
import pool from "../data/emirAyetleri.json";

export interface EmirAyet {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
  arabic_text: string | null;
  reading_tr: string | null;
  meal: string;
}

const POOL = pool as EmirAyet[];

// Widget'ın Expo config plugin'deki adı — app.config.js'teki widgets[].name ile
// AYNI OLMALI (config plugin ayrı bir build-time dosya olduğu için oradan import
// edilemiyor, elle senkron tutuluyor).
export const WIDGET_NAME = "EmirAyetleri";

const GUNLUK_DILIM_SAYISI = 6; // her biri 4 saatlik dilim → günde 6 kez rotasyon

// Günü 6 eşit (4'er saatlik) dilime böler. Aynı gün aynı dilimde her zaman aynı
// ayeti verir (tutarlılık), dilim değişince yeni ayet.
function dilimIndex(date: Date): number {
  return Math.floor(date.getHours() / (24 / GUNLUK_DILIM_SAYISI));
}

export function currentEmirAyet(date: Date = new Date()): EmirAyet | null {
  if (POOL.length === 0) return null;
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const index = (seed * GUNLUK_DILIM_SAYISI + dilimIndex(date)) % POOL.length;
  return POOL[index];
}

// Widget üzerindeki "yenile" dokunuşu için — zamanlanmış dilimi beklemeden
// havuzdan rastgele başka bir ayet gösterir (uygulama açılmaz, sadece widget güncellenir).
export function randomEmirAyet(): EmirAyet | null {
  if (POOL.length === 0) return null;
  return POOL[Math.floor(Math.random() * POOL.length)];
}
