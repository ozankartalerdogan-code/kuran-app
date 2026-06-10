/**
 * verify-live.mjs — CANLI ALTIN AYET DOĞRULAMASI
 *
 * Canlı API'den (production) bir dizi "altın ayet" çeker ve yerel master
 * app.db ile karşılaştırır. Amaç: 2026-06-10'da yaşanan SESSİZ bayat-okuma
 * hatası gibi regresyonları DAKİKALAR içinde yakalamak.
 *
 * Karşılaştırılan alanlar (curate ettiğimiz veri):
 *   - literalCeviri  (verses.literal_ceviri)
 *   - farkAnalizi    (verses.fark_analizi)
 *   - kelime anlamları (words.meaning_tr, word_index bazında MIN)
 *
 * Kullanım:
 *   node scripts/verify-live.mjs
 *   node scripts/verify-live.mjs --base=https://kuran-app-web-ozan-s-projects8.vercel.app
 *   node scripts/verify-live.mjs --quiet     (sadece özet + exit kodu)
 *
 * Exit: 0 = hepsi GEÇTİ, 1 = en az bir UYUŞMAZLIK (CI/cron için).
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB = path.resolve(dir, "../data/app.db");

const arg = (k, d) => {
  const f = process.argv.find((a) => a.startsWith(`--${k}=`));
  return f ? f.slice(k.length + 3) : d;
};
const BASE = arg("base", "https://kuran-app-web-ozan-s-projects8.vercel.app").replace(/\/$/, "");
const QUIET = process.argv.includes("--quiet");

// ── ALTIN AYETLER (kenar durumları kapsar) ───────────────────────────────────
// Uzunlar (literal kesilme riski), kelimeli, fark analizli, popülerler.
const GOLDEN = [
  "1:1",    // Besmele (kısa, popüler)
  "2:3",    // kelime senkronu (#44 "onlara rızık verdik")
  "2:255",  // Ayetü'l-Kürsi (BAYAT HATASININ AYETİ — uzun)
  "2:282",  // en uzun ayet (borç)
  "2:286",  // uzun (Amenerresulü)
  "4:12",   // uzun (miras)
  "24:35",  // Nur ayeti (uzun, mecaz)
  "55:13",  // Rahman tekrar ayeti
  "96:1",   // Alak (hero ayeti)
  "112:1",  // İhlas (kısa)
];

// cleanMeal.ts'in yaptığı hafif temizliği taklit eder (literal/fark için çoğu no-op)
function clean(text) {
  if (text == null) return "";
  return String(text)
    .replace(/^\(\d+(?:-\d+)+\)\s*/u, "")
    .replace(/\[\d+\]/gu, "")
    .replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
const norm = (v) => clean(v);

const local = new DatabaseSync(LOCAL_DB, { readOnly: true });
const selVerse = local.prepare("SELECT literal_ceviri, fark_analizi FROM verses WHERE verse_key=?");
const selWords = local.prepare(
  "SELECT word_index, MIN(meaning_tr) AS meaning_tr FROM words WHERE verse_key=? GROUP BY word_index ORDER BY word_index"
);

async function checkVerse(key) {
  const [s, a] = key.split(":").map(Number);
  const fails = [];

  const lv = selVerse.get(key);
  if (!lv) return { key, fails: ["app.db'de ayet YOK"] };

  let live;
  try {
    const res = await fetch(`${BASE}/api/ayah?surah_id=${s}&ayah_number=${a}&_=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return { key, fails: [`API HTTP ${res.status}`] };
    live = await res.json();
  } catch (e) {
    return { key, fails: ["API hata: " + (e?.message ?? e)] };
  }

  // literal
  if (norm(lv.literal_ceviri) !== norm(live.literalCeviri)) {
    fails.push(`literal: app.db(${norm(lv.literal_ceviri).length}) ≠ canlı(${norm(live.literalCeviri).length})`);
  }
  // fark
  if (norm(lv.fark_analizi) !== norm(live.farkAnalizi)) {
    fails.push(`fark: app.db(${norm(lv.fark_analizi).length}) ≠ canlı(${norm(live.farkAnalizi).length})`);
  }
  // kelimeler
  const lw = selWords.all(key);
  const liveWords = new Map((live.words ?? []).map((w) => [w.wordIndex, w.meaningTr]));
  let wMismatch = 0;
  for (const w of lw) {
    if (norm(w.meaning_tr) !== norm(liveWords.get(w.word_index))) wMismatch++;
  }
  if (wMismatch > 0) fails.push(`kelime anlamı: ${wMismatch}/${lw.length} uyuşmuyor`);

  return { key, fails };
}

const results = [];
for (const key of GOLDEN) results.push(await checkVerse(key));

const failed = results.filter((r) => r.fails.length > 0);

if (!QUIET) {
  console.log(`\n=== CANLI DOĞRULAMA — ${BASE} ===`);
  for (const r of results) {
    if (r.fails.length === 0) console.log(`  ✅ ${r.key}`);
    else { console.log(`  ❌ ${r.key}`); r.fails.forEach((f) => console.log(`        ${f}`)); }
  }
}

if (failed.length === 0) {
  console.log(`\n✅ HEPSİ GEÇTİ (${results.length} altın ayet) — canlı = app.db`);
  process.exit(0);
} else {
  console.log(`\n❌ ${failed.length}/${results.length} AYET UYUŞMUYOR — canlıda bayat/regresyon!`);
  console.log(`   (sync gerekebilir: node --env-file=apps/web/.env.local scripts/sync-diff-to-turso.mjs)`);
  process.exit(1);
}
