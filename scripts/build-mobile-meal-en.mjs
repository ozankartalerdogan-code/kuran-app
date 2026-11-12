// Pickthall (1930, kamu malı) İngilizce mealini mobil uygulamaya gömülecek
// JSON'a dönüştürür. Kaynak ve provenance: data/translations/en.pickthall/SOURCE.md
//
//   node scripts/build-mobile-meal-en.mjs
//
// Çıktı: apps/mobile/src/data/meal_en_pickthall.json — dizi[sure-1][ayet-1] = metin
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SRC = "data/translations/en.pickthall/en.pickthall.txt";
const OUT = "apps/mobile/src/data/meal_en_pickthall.json";
const EXPECTED_SHA256 = "4aabbfa9d96796f5a6b0217d2c39dce1a3084f772bf6f2650e37082a774e3cc7";

const raw = readFileSync(SRC);
const sha = createHash("sha256").update(raw).digest("hex");
if (sha !== EXPECTED_SHA256) throw new Error(`Kaynak hash uyuşmuyor: ${sha}`);

const surahs = JSON.parse(readFileSync("data/quran/surahs.json", "utf8"));
const out = surahs.map((s) => new Array(s.verses).fill(null));

for (const line of raw.toString("utf8").split(/\r?\n/)) {
  const m = /^(\d+)\|(\d+)\|(.*)$/.exec(line);
  if (!m) continue;
  const [, s, a, text] = m;
  const row = out[Number(s) - 1];
  if (!row || Number(a) < 1 || Number(a) > row.length) throw new Error(`Geçersiz ayet: ${s}:${a}`);
  if (row[Number(a) - 1] !== null) throw new Error(`Mükerrer ayet: ${s}:${a}`);
  const t = text.trim();
  if (!t) throw new Error(`Boş ayet: ${s}:${a}`);
  row[Number(a) - 1] = t;
}

const missing = [];
out.forEach((row, i) => row.forEach((t, j) => { if (t === null) missing.push(`${i + 1}:${j + 1}`); }));
if (missing.length) throw new Error(`Eksik ayetler: ${missing.slice(0, 10).join(", ")}`);

const total = out.reduce((n, r) => n + r.length, 0);
if (out.length !== 114 || total !== 6236) throw new Error(`Beklenmeyen sayı: ${out.length}/${total}`);

writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(`OK: 114 sure, ${total} ayet → ${OUT}`);
