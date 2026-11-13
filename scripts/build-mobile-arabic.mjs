// Kanonik Tanzil Uthmani 1.1 Arapça Kur'an metnini mobil uygulamaya gömülecek
// JSON'a dönüştürür. Kaynak ve provenance: data/vendor/tanzil/uthmani-1.1/manifest.json
//
//   node scripts/build-mobile-arabic.mjs
//
// Çıktı: apps/mobile/src/data/quran_arabic.json — dizi[sure-1][ayet-1] = metin
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SRC = "data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt";
const MANIFEST_PATH = "data/vendor/tanzil/uthmani-1.1/manifest.json";
const MUSHAF_PAGE_DATA_PATH = "apps/mobile/src/data/mushaf_sayfalari.json";
const OUT = "apps/mobile/src/data/quran_arabic.json";

// scripts/build-quran-runtime.mjs içindeki kanonik kaynak sabitleri
const EXPECTED_SOURCE_SHA256 = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326";
const EXPECTED_SURAH_COUNT = 114;
const EXPECTED_VERSE_COUNT = 6236;

// apps/web/src/lib/mushafCompat.ts (satır 56-117) içindeki mevcut besmele ayırma kuralı:
// Harf iskeleti: NFC + tüm combining işaretler (Mn), format karakterleri (Cf)
// ve tatweel atılır; elif-i vasl (U+0671) düz elife eşlenir. Yalnız doğrulama
// karşılaştırması için kullanılır — çıktı metnine asla dokunmaz.
const BASMALA_SKELETON = "بسم الله الرحمن الرحيم";

function letterSkeleton(value) {
  return value
    .normalize("NFC")
    .replace(/[\p{Mn}\p{Cf}ـ]/gu, "")
    .replace(/ٱ/g, "ا");
}

function isValidPrefixRange(chars, range) {
  return (
    range.kind === "prefix" &&
    range.startCp === 0 &&
    range.endCp > 0 &&
    range.endCp < range.bodyStartCp &&
    range.bodyStartCp <= chars.length
  );
}

function trySplitWithRange(chars, fullText, range) {
  if (!isValidPrefixRange(chars, range)) return null;
  const basmalaText = chars.slice(range.startCp, range.endCp).join("");
  const separator = chars.slice(range.endCp, range.bodyStartCp).join("");
  const body = chars.slice(range.bodyStartCp).join("");
  if (letterSkeleton(basmalaText) !== BASMALA_SKELETON) return null;
  if (`${basmalaText}${separator}${body}` !== fullText) return null;
  return { basmalaText, body, range };
}

function trySplitTextually(chars, fullText, surahId, ayahNumber) {
  if (ayahNumber !== 1 || surahId === 1 || surahId === 9) return null;
  const spaces = [];
  for (let i = 0; i < chars.length && spaces.length < 4; i += 1) {
    if (chars[i] === " ") spaces.push(i);
  }
  if (spaces.length < 4) return null;
  const derived = { kind: "prefix", startCp: 0, endCp: spaces[3], bodyStartCp: spaces[3] + 1 };
  return trySplitWithRange(chars, fullText, derived);
}

// 1) Kaynak doğrulama ve okuma (scripts/build-quran-runtime.mjs deseni)
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const raw = readFileSync(SRC);
const sha = createHash("sha256").update(raw).digest("hex");
if (manifest.sha256 !== EXPECTED_SOURCE_SHA256 || sha !== EXPECTED_SOURCE_SHA256) {
  throw new Error(
    `Tanzil kaynak SHA-256 uyuşmuyor: beklenen=${EXPECTED_SOURCE_SHA256} manifest=${manifest.sha256} gerçek=${sha}`,
  );
}
if (raw.includes(0x0d)) {
  throw new Error("Tanzil kaynağı CR baytı içeriyor; kaynak LF bayt akışı olarak kalmalıdır.");
}
const source = raw.toString("utf8");
if (Buffer.compare(Buffer.from(source, "utf8"), raw) !== 0) {
  throw new Error("Tanzil kaynağı kayıpsız bir UTF-8 bayt dizisi değil.");
}

// 2) Sure ve ayet sayısı şemasını mushaf_sayfalari.json içinden yükle ve doğrula
const mushafData = JSON.parse(readFileSync(MUSHAF_PAGE_DATA_PATH, "utf8"));
const sureAyetSayilari = mushafData.sureAyetSayilari;
if (!Array.isArray(sureAyetSayilari) || sureAyetSayilari.length !== EXPECTED_SURAH_COUNT) {
  throw new Error(`mushaf_sayfalari.json sureAyetSayilari geçersiz: ${sureAyetSayilari?.length}`);
}
const expectedTotalFromCounts = sureAyetSayilari.reduce((n, c) => n + c, 0);
if (expectedTotalFromCounts !== EXPECTED_VERSE_COUNT) {
  throw new Error(`sureAyetSayilari toplamı ${EXPECTED_VERSE_COUNT} değil: ${expectedTotalFromCounts}`);
}

const out = sureAyetSayilari.map((count) => new Array(count).fill(null));

// 3) Satırları sure|ayet|metin olarak ayrıştır (yorum ve boş satırları atla)
const lines = source.split("\n");
for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  if (!line || line.startsWith("#")) continue;

  const first = line.indexOf("|");
  const second = line.indexOf("|", first + 1);
  if (first < 1 || second < first + 2) {
    throw new Error(`Geçersiz Tanzil satırı (satır ${index + 1}): ${line}`);
  }

  const surahId = Number(line.slice(0, first));
  const ayahNumber = Number(line.slice(first + 1, second));
  const arabicText = line.slice(second + 1);

  if (!Number.isInteger(surahId) || surahId < 1 || surahId > EXPECTED_SURAH_COUNT) {
    throw new Error(`Geçersiz sure numarası: ${surahId}:${ayahNumber}`);
  }
  const row = out[surahId - 1];
  if (!row || !Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > row.length) {
    throw new Error(`Geçersiz ayet numarası: ${surahId}:${ayahNumber}`);
  }
  if (row[ayahNumber - 1] !== null) {
    throw new Error(`Mükerrer ayet: ${surahId}:${ayahNumber}`);
  }
  if (!arabicText || arabicText.startsWith("\u0020")) {
    throw new Error(`Boş veya başında boşluk olan ayet: ${surahId}:${ayahNumber}`);
  }

  // 4) Besmele ayırma: 1. ve 9. sure dışında her surenin 1. ayetinin başındaki
  // besmele önekini mushafCompat.ts kuralıyla ayır; ayrılamazsa hata ver.
  let finalText = arabicText;
  if (ayahNumber === 1 && surahId !== 1 && surahId !== 9) {
    const chars = Array.from(arabicText);
    const split = trySplitTextually(chars, arabicText, surahId, ayahNumber);
    if (!split || !split.body) {
      throw new Error(`Besmele öneki ayrılamadı: ${surahId}:${ayahNumber}`);
    }
    finalText = split.body;
  }

  row[ayahNumber - 1] = finalText;
}

// 5) Eksik ayet ve sure bazlı ayet sayısı kontrolü
const missing = [];
out.forEach((row, i) => {
  if (row.length !== sureAyetSayilari[i]) {
    throw new Error(`Sure ${i + 1} ayet sayısı uyuşmuyor: ${row.length} !== ${sureAyetSayilari[i]}`);
  }
  row.forEach((t, j) => {
    if (t === null || typeof t !== "string" || t.length === 0) {
      missing.push(`${i + 1}:${j + 1}`);
    }
  });
});
if (missing.length) {
  throw new Error(`Eksik ayetler: ${missing.slice(0, 10).join(", ")}`);
}

// Fatiha 1:1 besmele doğrulaması
if (letterSkeleton(out[0][0]) !== BASMALA_SKELETON) {
  throw new Error("Fatiha 1:1 besmele iskeletiyle eşleşmiyor.");
}

const total = out.reduce((n, r) => n + r.length, 0);
if (out.length !== EXPECTED_SURAH_COUNT || total !== EXPECTED_VERSE_COUNT) {
  throw new Error(`Beklenmeyen sayı: ${out.length}/${total}`);
}

writeFileSync(OUT, JSON.stringify(out) + "\n", "utf8");
console.log(`OK: 114 sure, ${total} ayet → ${OUT}`);
