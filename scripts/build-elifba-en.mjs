// Elif-Ba İngilizce katmanını üretir ve doğrular (bkz. translate-elifba-en.mjs).
//   node scripts/build-elifba-en.mjs
// Girdi: content/elifba/{source.tr.json, letters.en.json, strings.en.json}
// Çıktı: apps/mobile/src/data/elifba.en.json — TÜRKÇE METİN ANAHTARLI sözlükler:
//   dersBaslik: { "<tr başlık>": "<en>" }
//   harfler:    { "<tr harf_adi>": { harf_adi, harf_sesi, mahrec } }
//   strings:    { "<tr soru/şık/ipucu>": "<en>" }
// Mobil, sunucudan gelen Türkçe metni bu sözlükle eşler; eşleşmeyen soru
// bütünüyle Türkçe kalır (iki dil aynı soruda karışmaz).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "elifba");
const read = (f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
const src = read("source.tr.json");
const letters = read("letters.en.json");
const strings = read("strings.en.json");

const errors = [];
const TR = /[çğışöüÇĞİŞÖÜ]/;
const noTr = (s, where) => { if (TR.test(s.replace(/[؀-ۿ]/g, ""))) errors.push(`${where}: Türkçe harf: ${s}`); };

const dersBaslik = {};
for (const d of src.dersler) {
  const en = letters.dersler.find((x) => x.id === d.id)?.baslik;
  if (!en) { errors.push(`ders ${d.id} eksik`); continue; }
  noTr(en, `ders ${d.id}`);
  dersBaslik[d.baslik] = en;
}

const harfler = {};
for (const h of src.harfler) {
  const en = letters.harfler.find((x) => x.harf_id === h.harf_id);
  if (!en) { errors.push(`harf ${h.harf_id} eksik`); continue; }
  for (const k of ["harf_adi", "harf_sesi", "mahrec"]) {
    if (!en[k]?.trim()) errors.push(`harf ${h.harf_id}.${k} boş`);
    else noTr(en[k], `harf ${h.harf_id}.${k}`);
  }
  harfler[h.harf_adi] = { harf_adi: en.harf_adi, harf_sesi: en.harf_sesi, mahrec: en.mahrec };
}
const enNames = Object.values(harfler).map((h) => h.harf_adi);
if (new Set(enNames).size !== enNames.length) errors.push("İngilizce harf adları tekrarlı");

for (const s of src.strings) {
  if (!strings[s]?.trim()) errors.push(`çeviri yok: ${s}`);
  else noTr(strings[s], "metin");
}
for (const q of src.quiz) {
  const opts = q.secenekler.map((s) => strings[s]);
  const dc = strings[q.dogru_cevap];
  if (new Set(opts).size !== new Set(q.secenekler).size) errors.push(`soru ${q.quiz_id}: şıklar çeviride çakıştı: ${opts.join(" | ")}`);
  if (!opts.includes(dc)) errors.push(`soru ${q.quiz_id}: doğru cevap şıklarda yok`);
  // Arapça satırlar korunmalı.
  const ar = (t) => (t.match(/[؀-ۿ]+/g) || []).join(" ");
  if (ar(q.soru) !== ar(strings[q.soru] || "")) errors.push(`soru ${q.quiz_id}: Arapça değişti: ${strings[q.soru]}`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} hata:\n` + errors.slice(0, 40).join("\n"));
  process.exit(1);
}
const used = Object.fromEntries(src.strings.map((s) => [s, strings[s]]));
const out = path.join(ROOT, "apps", "mobile", "src", "data", "elifba.en.json");
writeFileSync(out, JSON.stringify({ dersBaslik, harfler, strings: used }, null, 2) + "\n");
console.log(`✓ ${out}: ${Object.keys(dersBaslik).length} ders, ${Object.keys(harfler).length} harf, ${Object.keys(used).length} metin; ${src.quiz.length} soru doğrulandı`);
