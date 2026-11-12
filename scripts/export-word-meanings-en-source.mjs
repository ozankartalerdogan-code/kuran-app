// Kelime/kök anlamlarının İngilizce katmanı için kaynak üretir (yerel data/app.db,
// SALT-OKUNUR; canlı sunucuya dokunmaz).
//
//   node scripts/export-word-meanings-en-source.mjs
//
// Çıktılar:
//   apps/mobile/src/data/wordGlossEn/NNN.json  — sure başına { "<ayet>:<wordIndex>": "<gloss_en>" }
//       (words.gloss_en; ayet API'siyle aynı gruplama: verse_key + word_index, MIN())
//   content/words/meanings-nogloss.tr.json     — gloss_en'i olmayan kelimelerin tekrarsız
//       Türkçe anlamları { "<tr>": "<tr>" } → translate-json-en.mjs ile .en.json olur
//   content/words/root-meanings.tr.json        — { "<kök>": "<tr anlam>" } → .en.json
//   content/words/meanings-root.tr.json        — kök sayfası anlam grupları: kökü olan kelimelerin
//       (gloss'u olsa bile) nogloss kümesinde olmayan tekrarsız Türkçe anlamları → .en.json
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });

const rows = db.prepare(`SELECT verse_key, word_index, MIN(meaning_tr) AS m, MIN(gloss_en) AS g
  FROM words GROUP BY verse_key, word_index`).all();

const glossDir = path.join(ROOT, "apps", "mobile", "src", "data", "wordGlossEn");
mkdirSync(glossDir, { recursive: true });
const bySurah = new Map();
const noGloss = new Set();
for (const r of rows) {
  const g = r.g?.trim();
  if (g) {
    const s = Number(r.verse_key.split(":")[0]);
    if (!bySurah.has(s)) bySurah.set(s, {});
    bySurah.get(s)[`${r.verse_key}:${r.word_index}`] = g;
  } else if (r.m?.trim()) {
    noGloss.add(r.m.trim());
  }
}
const cmp = (a, b) => {
  const [as, aa, aw] = a.split(":").map(Number), [bs, ba, bw] = b.split(":").map(Number);
  return as - bs || aa - ba || aw - bw;
};
for (let s = 1; s <= 114; s++) {
  const obj = bySurah.get(s) ?? {};
  const sorted = Object.fromEntries(Object.keys(obj).sort(cmp).map((k) => [k, obj[k]]));
  writeFileSync(path.join(glossDir, `${String(s).padStart(3, "0")}.json`), JSON.stringify(sorted) + "\n");
}

const wordsDir = path.join(ROOT, "content", "words");
mkdirSync(wordsDir, { recursive: true });
const meanings = Object.fromEntries([...noGloss].sort((a, b) => a.localeCompare(b, "tr")).map((m) => [m, m]));
writeFileSync(path.join(wordsDir, "meanings-nogloss.tr.json"), JSON.stringify(meanings, null, 2) + "\n");

const rootWordMeanings = db.prepare(`SELECT DISTINCT TRIM(meaning_tr) AS m FROM words
  WHERE root IS NOT NULL AND root <> '' AND meaning_tr IS NOT NULL AND TRIM(meaning_tr) <> ''`).all()
  .map((r) => r.m.normalize("NFC")).filter((m) => !noGloss.has(m));
writeFileSync(path.join(wordsDir, "meanings-root.tr.json"), JSON.stringify(Object.fromEntries(
  [...new Set(rootWordMeanings)].sort((a, b) => a.localeCompare(b, "tr")).map((m) => [m, m])), null, 2) + "\n");

const roots = db.prepare(`SELECT root, MIN(meaning_tr) AS m FROM root_meanings
  WHERE meaning_tr IS NOT NULL AND meaning_tr <> '' GROUP BY root ORDER BY root`).all();
writeFileSync(path.join(wordsDir, "root-meanings.tr.json"),
  JSON.stringify(Object.fromEntries(roots.map((r) => [r.root, r.m.trim()])), null, 2) + "\n");

console.log(`gloss: ${[...bySurah.values()].reduce((a, o) => a + Object.keys(o).length, 0)} kelime, 114 dosya; `
  + `glosssuz tekrarsız anlam: ${noGloss.size}; kök: ${roots.length}`);
