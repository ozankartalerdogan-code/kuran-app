// Kelime/kök İngilizce sözlüğünü birleştirir ve doğrular.
//   node scripts/export-word-meanings-en-source.mjs        (kaynak + gloss dosyaları)
//   TRANSLATOR=codex node scripts/translate-json-en.mjs content/words/meanings-nogloss.tr.json content/words/root-meanings.tr.json
//   node scripts/build-word-meanings-en.mjs                 → apps/mobile/src/data/wordMeaningsEn.json
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = path.join(ROOT, "content", "words");
const read = (f) => JSON.parse(readFileSync(path.join(W, f), "utf8"));
const TR = /[çğışöüÇĞİŞÖÜ]/;

// İngilizcede de aynı yazılan özel adlar.
const SAME_IN_EN = new Set(["Allah", "Arafat", "Tubba'"]);
const errors = [];
function check(trObj, enObj, label) {
  const out = {};
  for (const [k, tr] of Object.entries(trObj)) {
    const en = enObj[k];
    if (typeof en !== "string" || !en.trim()) { errors.push(`${label}: eksik: ${k}`); continue; }
    // translate-json-en SKIP_KEYS'e takılan (çevrilmeden kalan) değerler.
    if (en === tr && /[a-zçğışöü]/i.test(tr) && !SAME_IN_EN.has(tr)) errors.push(`${label}: çevrilmemiş: ${k} → ${en}`);
    else if (TR.test(en)) errors.push(`${label}: Türkçe harf: ${k} → ${en}`);
    out[k] = en.trim();
  }
  return out;
}
const meanings = check(read("meanings-nogloss.tr.json"), read("meanings-nogloss.tr.en.json"), "anlam");
const roots = check(read("root-meanings.tr.json"), read("root-meanings.tr.en.json"), "kök");

if (errors.length) {
  console.error(`✗ ${errors.length} sorun:\n${errors.slice(0, 50).join("\n")}`);
  process.exit(1);
}
const out = path.join(ROOT, "apps", "mobile", "src", "data", "wordMeaningsEn.json");
writeFileSync(out, JSON.stringify({ meanings, roots }, null, 2) + "\n");
console.log(`✓ ${out}: ${Object.keys(meanings).length} anlam, ${Object.keys(roots).length} kök`);
