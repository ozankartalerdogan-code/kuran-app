// İngilizce okunuşu (Quran.com tarzı transliterasyon) mobil uygulamaya gömülecek
// JSON'a dönüştürür. Kaynak ve provenance: data/translations/en.transliteration/SOURCE.md
//
//   node scripts/build-mobile-translit-en.mjs
//
// Çıktı: apps/mobile/src/data/translit_en.json — dizi[sure-1][ayet-1] = metin
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SRC = "data/translations/en.transliteration/alquran-cloud.json";
const OUT = "apps/mobile/src/data/translit_en.json";
const EXPECTED_SHA256 = "91c3693eec78d26cf89b50f1987d6cc9ece33f62cdf9a888bd3dbbbfc1a0ff8c";

// Kaynaktaki dizgi hataları (anlamı değiştirmez; SOURCE.md'de listelendi).
const FIXES = {
  "2:253": [/\s*\($/, ""],
  "12:34": ["Huswas_Samee'ul", "Huwas Samee'ul"],
  "12:22": ["bukmanw", "hukmanw"],
  "12:97": ["zunoo =banaaa", "zunoobanaaa"],
  "25:34": [/\s*\)section 3\)$/, ""],
};

const raw = readFileSync(SRC);
const sha = createHash("sha256").update(raw).digest("hex");
if (sha !== EXPECTED_SHA256) throw new Error(`Kaynak hash uyuşmuyor: ${sha}`);

const surahs = JSON.parse(readFileSync("data/quran/surahs.json", "utf8"));
const src = JSON.parse(raw.toString("utf8")).data.surahs;
if (src.length !== 114) throw new Error(`Sure sayısı: ${src.length}`);

const used = new Set();
const out = surahs.map((s, i) => {
  const ayahs = src[i].ayahs;
  if (src[i].number !== i + 1 || ayahs.length !== s.verses) throw new Error(`Sure ${i + 1}: ${ayahs.length}/${s.verses}`);
  return ayahs.map((a, j) => {
    const key = `${i + 1}:${j + 1}`;
    if (a.numberInSurah !== j + 1) throw new Error(`Sıra bozuk: ${key}`);
    let t = a.text.trim();
    const fix = FIXES[key];
    if (fix) {
      const before = t;
      t = t.replace(fix[0], fix[1]).trim();
      if (t === before) throw new Error(`Düzeltme uygulanamadı: ${key}`);
      used.add(key);
    }
    if (!t) throw new Error(`Boş ayet: ${key}`);
    if (/[^A-Za-z '’;,.:!?\-]/.test(t)) throw new Error(`Beklenmeyen karakter: ${key}: ${t}`);
    return t;
  });
});
if (used.size !== Object.keys(FIXES).length) throw new Error("Kullanılmayan düzeltme var");

const total = out.reduce((n, r) => n + r.length, 0);
if (total !== 6236) throw new Error(`Beklenmeyen sayı: ${total}`);
writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(`OK: 114 sure, ${total} ayet → ${OUT}`);
