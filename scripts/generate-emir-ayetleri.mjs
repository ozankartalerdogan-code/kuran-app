/**
 * generate-emir-ayetleri.mjs
 * QAC morfoloji verisinde "IMPV" (emir kipi) etiketi geçen ayetleri Turso'dan
 * çekip apps/mobile/src/data/emirAyetleri.json olarak bundle edilecek statik
 * bir havuz üretir. Android widget bu havuzdan network'süz, yerel rotasyon yapar.
 *
 *   node --env-file=apps/web/.env.local scripts/generate-emir-ayetleri.mjs
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(dir, "..", "apps", "mobile", "src", "data", "emirAyetleri.json");
const MAX_MEAL_LEN = 200; // widget kutusunda taşmasın diye uzun mealleri ele

const url = process.env.TURSO_DB_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("TURSO bilgileri yok."); process.exit(1); }
const turso = createClient({ url, authToken });

// apps/web/src/lib/cleanMeal.ts ile birebir aynı mantık (ESM script içinde TS import edemediğimiz için kopyalandı)
function hasEncodingError(text) {
  const lower = text.toLocaleLowerCase("tr-TR");
  if (/\ballah(?:['''ʼ]in)?\s+adiyl[ae]\b/u.test(lower)) return true;
  if (/[A-Za-zÇĞİÖŞÜçğıöşü]['']?[01][A-Za-zÇĞİÖŞÜçğıöşü]/u.test(text)) return true;
  if (/[Ã�]|(?:Ù|Ø)/u.test(text)) return true;
  return false;
}
function cleanMealText(text) {
  if (!text?.trim()) return null;
  const cleaned = text
    .replace(/^\(\d+(?:-\d+)+\)\s*/u, "")
    .replace(/\[\d+\]/gu, "")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned || hasEncodingError(cleaned)) return null;
  return cleaned;
}

const { rows } = await turso.execute(`
  SELECT DISTINCT w.verse_key, v.surah_id, v.ayah_number, s.adi_turkce AS surah_name,
         v.arabic_text, v.reading_tr,
         COALESCE(yt.text, v.literal_ceviri, v.primary_translation) AS meal
  FROM   words w
  JOIN   verses v ON v.verse_key = w.verse_key
  JOIN   sureler s ON s.id = v.surah_id
  LEFT JOIN translations yt ON yt.verse_key = v.verse_key
         AND (yt.source = 'yazir' OR yt.source LIKE '%#yazir')
  WHERE  w.morphology LIKE '%IMPV%'
    AND  v.arabic_text IS NOT NULL AND v.reading_tr IS NOT NULL AND v.literal_ceviri IS NOT NULL
  ORDER  BY w.verse_key
`);

const pool = [];
for (const r of rows) {
  const meal = cleanMealText(r.meal);
  if (!meal || meal.length > MAX_MEAL_LEN) continue;
  pool.push({
    verse_key: r.verse_key,
    surah_id: r.surah_id,
    ayah_number: r.ayah_number,
    surah_name: r.surah_name,
    arabic_text: r.arabic_text,
    reading_tr: r.reading_tr,
    meal,
  });
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(pool, null, 0));

console.log(`Toplam IMPV satırı: ${rows.length}, havuza giren (meal<=${MAX_MEAL_LEN} char): ${pool.length}`);
console.log(`Yazıldı: ${OUT_PATH}`);
console.log("Örnek:", pool[0]);
