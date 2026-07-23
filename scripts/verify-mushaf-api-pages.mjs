// Mushaf sayfa uçlarının, mobil uygulamanın YEREL sayfa tablosuyla birebir
// uyuştuğunu 604 sayfanın tamamı için doğrular.
//
// Neden: mobil taraf (apps/mobile/app/mushaf-sayfa.tsx) API cevabını
// mushafSayfaAyetSirasiGecerli ile katı biçimde doğruluyor; tek bir sayfada
// bile ayrışma olursa o sayfa kalıcı olarak "Sayfa yüklenemedi" gösteriyor.
// Mevcut testler yalnız yerel metadata'yı kontrol ediyor, gerçek API cevabını
// değil — bu script o boşluğu kapatır.
//
// Kullanım:
//   node scripts/verify-mushaf-api-pages.mjs [--base <url>] [--from 1] [--to 604]
//                                            [--concurrency 8] [--json <dosya>]
// Varsayılan base: apps/mobile/.env.local içindeki EXPO_PUBLIC_API_URL.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function varsayilanBase() {
  try {
    const env = readFileSync(path.join(REPO, "apps/mobile/.env.local"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith("EXPO_PUBLIC_API_URL="));
    if (line) return line.slice("EXPO_PUBLIC_API_URL=".length).trim();
  } catch { /* .env.local yoksa --base zorunlu */ }
  return null;
}

/** Uygulamanın kullandığı sayfa tablosunun ta kendisi (tek gerçek kaynak). */
function yerelTablolar() {
  const data = JSON.parse(
    readFileSync(path.join(REPO, "apps/mobile/src/data/mushaf_sayfalari.json"), "utf8"),
  );
  return { sayfalar: data.sayfaBaslangiclari, ayetSayilari: data.sureAyetSayilari };
}

function beklenenAyetler(page, sayfalar, ayetSayilari) {
  const out = [];
  let [surahId, ayahNumber] = sayfalar[page - 1];
  const sonraki = page < sayfalar.length ? sayfalar[page] : null;
  const karsilastir = (s1, a1, s2, a2) => (s1 !== s2 ? s1 - s2 : a1 - a2);
  while (
    sonraki
      ? karsilastir(surahId, ayahNumber, sonraki[0], sonraki[1]) < 0
      : surahId <= ayetSayilari.length
  ) {
    out.push([surahId, ayahNumber]);
    if (ayahNumber < ayetSayilari[surahId - 1]) ayahNumber += 1;
    else { surahId += 1; ayahNumber = 1; }
  }
  return out;
}

const bekle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** API hız sınırlıdır (429): Retry-After'a saygılı üstel geri çekilme. */
async function sayfayiGetir(base, page, denemeHakki = 6) {
  const url = `${base.replace(/\/$/, "")}/mushaf?page=${page}&v=6`;
  let gecikme = 1000;
  for (let deneme = 1; ; deneme += 1) {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.ok) return res.json();
    const yenidenDenenebilir = res.status === 429 || res.status >= 500;
    if (!yenidenDenenebilir || deneme >= denemeHakki) throw new Error(`HTTP ${res.status}`);
    const retryAfter = Number(res.headers.get("retry-after"));
    await bekle(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : gecikme);
    gecikme = Math.min(gecikme * 2, 30_000);
  }
}

async function main() {
  const base = arg("base", varsayilanBase());
  if (!base) throw new Error("API adresi yok: --base <url> verin veya .env.local ekleyin");
  const from = Number(arg("from", 1));
  const to = Number(arg("to", 604));
  const concurrency = Math.max(1, Number(arg("concurrency", 3)));
  const aralik = Math.max(0, Number(arg("delay", 120))); // istekler arası nefes payı
  const jsonOut = arg("json", null);

  const { sayfalar, ayetSayilari } = yerelTablolar();
  if (sayfalar.length !== 604) throw new Error(`yerel sayfa tablosu 604 değil: ${sayfalar.length}`);

  const pages = [];
  for (let p = from; p <= to; p += 1) pages.push(p);

  const sorunlar = [];
  let tamam = 0;
  let sira = 0;

  async function worker() {
    while (sira < pages.length) {
      const page = pages[sira++];
      try {
        const data = await sayfayiGetir(base, page);
        const verses = Array.isArray(data?.verses) ? data.verses : null;
        if (!verses) {
          sorunlar.push({ page, tip: "cevapta verses yok" });
          continue;
        }
        const beklenen = beklenenAyetler(page, sayfalar, ayetSayilari);
        if (verses.length !== beklenen.length) {
          sorunlar.push({
            page,
            tip: "ayet sayısı farklı",
            beklenen: beklenen.length,
            gelen: verses.length,
          });
          continue;
        }
        const ilkFark = beklenen.findIndex(
          ([s, a], i) => verses[i].surahId !== s || verses[i].ayahNumber !== a,
        );
        if (ilkFark !== -1) {
          sorunlar.push({
            page,
            tip: "sıra/koordinat farklı",
            index: ilkFark,
            beklenen: `${beklenen[ilkFark][0]}:${beklenen[ilkFark][1]}`,
            gelen: `${verses[ilkFark].surahId}:${verses[ilkFark].ayahNumber}`,
          });
        }
      } catch (error) {
        sorunlar.push({ page, tip: "istek hatası", hata: String(error.message ?? error) });
      } finally {
        tamam += 1;
        if (tamam % 50 === 0) process.stdout.write(`  ${tamam}/${pages.length}\n`);
      }
      if (aralik > 0) await bekle(aralik);
    }
  }

  console.log(`Mushaf API doğrulaması: ${base} · sayfa ${from}-${to}`);
  const basla = Date.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const sn = ((Date.now() - basla) / 1000).toFixed(1);

  sorunlar.sort((a, b) => a.page - b.page);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ base, from, to, sorunlar }, null, 2));

  if (sorunlar.length === 0) {
    console.log(`\nOK — ${pages.length} sayfanın tamamı yerel tabloyla birebir uyuşuyor (${sn}s).`);
    return;
  }
  console.log(`\nUYUŞMAYAN ${sorunlar.length} sayfa (${sn}s):`);
  for (const s of sorunlar.slice(0, 40)) console.log(" ", JSON.stringify(s));
  if (sorunlar.length > 40) console.log(`  … ve ${sorunlar.length - 40} tane daha`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
