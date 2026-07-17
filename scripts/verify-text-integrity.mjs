#!/usr/bin/env node
// Verifies that data/generated/quran/verses.json matches the canonical
// Tanzil Uthmani text codepoint-for-codepoint, for every ayah.
//
// Canonical source: data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt
// (format: surah|ayah|text, one ayah per line, trailing comment block ignored)
//
// basmala-ranges.json is consulted only to confirm that verses.json stores
// the basmala inline within the verse's own arabicText (as a "prefix"
// range), matching how quran-uthmani.txt stores it — so no basmala
// extraction/injection is needed before comparing. If that assumption ever
// stops holding, this script fails loudly instead of silently comparing
// mismatched text.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const VERSES_PATH = path.join(ROOT, "data/generated/quran/verses.json");
const BASMALA_RANGES_PATH = path.join(
  ROOT,
  "data/generated/quran/basmala-ranges.json",
);
const TANZIL_PATH = path.join(
  ROOT,
  "data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt",
);
const OUTPUT_PATH = path.join(
  ROOT,
  "scripts/output/text-integrity-report.json",
);

function toCodepoints(str) {
  return Array.from(str).map((ch) => ch.codePointAt(0));
}

function hex(cp) {
  return cp === undefined
    ? "undefined"
    : `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

function surahAyahFromKey(verseKey) {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return { surah, ayah };
}

async function loadCanonicalMap() {
  const raw = await readFile(TANZIL_PATH, "utf8");
  const map = new Map();
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const firstBar = line.indexOf("|");
    const secondBar = line.indexOf("|", firstBar + 1);
    if (firstBar === -1 || secondBar === -1) continue;
    const surah = Number(line.slice(0, firstBar));
    const ayah = Number(line.slice(firstBar + 1, secondBar));
    const text = line.slice(secondBar + 1);
    map.set(`${surah}:${ayah}`, text);
  }
  return map;
}

async function loadBasmalaRanges() {
  const raw = await readFile(BASMALA_RANGES_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const byKey = new Map();
  for (const range of parsed.ranges) {
    byKey.set(range.verseKey, range);
  }
  return byKey;
}

async function main() {
  const [canonicalMap, basmalaRanges, versesRaw] = await Promise.all([
    loadCanonicalMap(),
    loadBasmalaRanges(),
    readFile(VERSES_PATH, "utf8"),
  ]);
  const verses = JSON.parse(versesRaw);

  // Confirm the basmala-storage assumption before trusting a direct
  // arabicText <-> canonical-line comparison: for every verse listed in
  // basmala-ranges.json as a "prefix", verses.json's arabicText must
  // already contain that prefix inline (same as quran-uthmani.txt does).
  for (const [verseKey, range] of basmalaRanges) {
    if (range.kind !== "prefix") continue;
    const verse = verses.find((v) => v.verseKey === verseKey);
    if (!verse) continue;
    const cps = toCodepoints(verse.arabicText);
    if (cps.length < range.bodyStartCp) {
      throw new Error(
        `Assumption violated: ${verseKey} arabicText is shorter than the ` +
          `basmala prefix recorded in basmala-ranges.json. verses.json may ` +
          `store the basmala separately — this script must be revisited ` +
          `before trusting its output.`,
      );
    }
  }

  const diffs = [];
  let matched = 0;

  const sortedVerses = [...verses].sort((a, b) => {
    const av = surahAyahFromKey(a.verseKey);
    const bv = surahAyahFromKey(b.verseKey);
    return av.surah - bv.surah || av.ayah - bv.ayah;
  });

  for (const verse of sortedVerses) {
    const { surah, ayah } = surahAyahFromKey(verse.verseKey);
    const canonical = canonicalMap.get(verse.verseKey);
    const renderText = verse.arabicText;

    if (canonical === undefined) {
      diffs.push({
        surah,
        ayah,
        verseKey: verse.verseKey,
        index: null,
        reason: "missing-in-canonical-source",
        expectedCodepoint: null,
        actualCodepoint: null,
      });
      continue;
    }

    const canonicalCps = toCodepoints(canonical);
    const renderCps = toCodepoints(renderText);
    const maxLen = Math.max(canonicalCps.length, renderCps.length);

    let verseHasDiff = false;
    for (let i = 0; i < maxLen; i++) {
      const expectedCp = canonicalCps[i];
      const actualCp = renderCps[i];
      if (expectedCp !== actualCp) {
        verseHasDiff = true;
        diffs.push({
          surah,
          ayah,
          verseKey: verse.verseKey,
          index: i,
          expectedCodepoint: {
            hex: hex(expectedCp),
            char: expectedCp === undefined ? null : String.fromCodePoint(expectedCp),
          },
          actualCodepoint: {
            hex: hex(actualCp),
            char: actualCp === undefined ? null : String.fromCodePoint(actualCp),
          },
        });
      }
    }

    if (!verseHasDiff) {
      matched++;
    }
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        canonicalSource: path.relative(ROOT, TANZIL_PATH).replace(/\\/g, "/"),
        totalVerses: sortedVerses.length,
        matchedVerses: matched,
        diffCount: diffs.length,
        diffs,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const verseKeysWithDiff = new Set(diffs.map((d) => d.verseKey));

  console.log("Text integrity check");
  console.log("=====================");
  console.log(`Toplam ayet sayisi     : ${sortedVerses.length}`);
  console.log(`Eslesen ayet sayisi    : ${matched}`);
  console.log(`Farkli olan ayet sayisi: ${verseKeysWithDiff.size}`);
  console.log(`Toplam codepoint farki : ${diffs.length}`);
  console.log(`Rapor yazildi          : ${path.relative(ROOT, OUTPUT_PATH).replace(/\\/g, "/")}`);

  if (diffs.length > 0) {
    console.log("\nIlk 10 fark:");
    for (const d of diffs.slice(0, 10)) {
      if (d.reason) {
        console.log(`  ${d.verseKey}: ${d.reason}`);
      } else {
        console.log(
          `  ${d.verseKey} [cp ${d.index}]: beklenen ${d.expectedCodepoint.hex} (${d.expectedCodepoint.char ?? "-"}) vs gelen ${d.actualCodepoint.hex} (${d.actualCodepoint.char ?? "-"})`,
        );
      }
    }
  }

  if (diffs.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
