#!/usr/bin/env node
// KONTROL A — Span sınırı bütünlüğü.
//
// tajweed-spans.json'daki her renk aralığının (span) başlangıç ve bitiş
// code-point indekslerinin, ayetin kanonik metnindeki (verses.json) Unicode
// grapheme cluster SINIRLARINA denk gelip gelmediğini doğrular. Bir span,
// temel harfi kendi combining işaretlerinden (hareke/şedde/sükun/med vb.)
// ayırarak başlıyor ya da bitiyorsa ihlal olarak raporlanır.
//
// Tespit Intl.Segmenter (granularity: "grapheme") ile yapılır; hiçbir üretim
// dosyası DEĞİŞTİRİLMEZ — yalnız scripts/output/span-boundary-report.json yazılır.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const VERSES_PATH = path.join(ROOT, "data/generated/quran/verses.json");
const SPANS_PATH = path.join(ROOT, "data/generated/quran/tajweed-spans.json");
const OUTPUT_PATH = path.join(ROOT, "scripts/output/span-boundary-report.json");

const segmenter = new Intl.Segmenter("ar", { granularity: "grapheme" });

// Ayet metni için geçerli grapheme sınırlarının code-point offset kümesi.
// Intl.Segmenter UTF-16 index verir; metin code-point dizisine çevrilip her
// segmentin code-point uzunluğu üzerinden ilerlenir (span koordinat sistemi
// "unicode-code-point-half-open" olduğu için birim dönüşümü şart).
function graphemeBoundaryCpSet(text) {
  const boundaries = new Set([0]);
  let cpOffset = 0;
  for (const { segment } of segmenter.segment(text)) {
    cpOffset += Array.from(segment).length;
    boundaries.add(cpOffset);
  }
  return boundaries;
}

function hex(cp) {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

// İhlal noktasındaki karakteri (sınırın böldüğü combining işareti) tanımla:
// sınır indeksindeki code point, bir önceki grapheme'in devamı olan işarettir.
function splitCharacterAt(chars, cpIndex) {
  const char = chars[cpIndex];
  if (char === undefined) return null;
  return { char, codePoint: hex(char.codePointAt(0)) };
}

async function main() {
  const [versesRaw, spansRaw] = await Promise.all([
    readFile(VERSES_PATH, "utf8"),
    readFile(SPANS_PATH, "utf8"),
  ]);
  const verses = JSON.parse(versesRaw);
  const spansDoc = JSON.parse(spansRaw);

  const textByKey = new Map(verses.map((v) => [v.verseKey, v.arabicText]));

  const violations = [];
  let totalSpans = 0;

  for (const verseEntry of spansDoc.verses) {
    if (!verseEntry.spans.length) continue;
    const text = textByKey.get(verseEntry.verseKey);
    if (text === undefined) {
      violations.push({
        sure: Number(verseEntry.verseKey.split(":")[0]),
        ayet: Number(verseEntry.verseKey.split(":")[1]),
        spanIndex: null,
        boundaryType: null,
        splitCharacter: null,
        reason: "verse-missing-in-verses.json",
      });
      continue;
    }
    const chars = Array.from(text);
    const boundaries = graphemeBoundaryCpSet(text);
    const [sure, ayet] = verseEntry.verseKey.split(":").map(Number);

    for (let spanIndex = 0; spanIndex < verseEntry.spans.length; spanIndex += 1) {
      const span = verseEntry.spans[spanIndex];
      totalSpans += 1;
      if (!boundaries.has(span.startCp)) {
        violations.push({
          sure,
          ayet,
          spanIndex,
          boundaryType: "start",
          splitCharacter: splitCharacterAt(chars, span.startCp),
          rule: span.rule,
          cp: span.startCp,
        });
      }
      if (!boundaries.has(span.endCp)) {
        violations.push({
          sure,
          ayet,
          spanIndex,
          boundaryType: "end",
          splitCharacter: splitCharacterAt(chars, span.endCp),
          rule: span.rule,
          cp: span.endCp,
        });
      }
    }
  }

  violations.sort((a, b) => a.sure - b.sure || a.ayet - b.ayet || (a.spanIndex ?? 0) - (b.spanIndex ?? 0));

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        method: "Intl.Segmenter(ar, grapheme) boundaries vs unicode-code-point-half-open span indices",
        totalSpans,
        violationCount: violations.length,
        violations,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log("Span sinir butunlugu kontrolu");
  console.log("==============================");
  console.log(`Toplam span            : ${totalSpans}`);
  console.log(`Ihlal sayisi           : ${violations.length}`);
  console.log(`Rapor                  : ${path.relative(ROOT, OUTPUT_PATH).replace(/\\/g, "/")}`);
  if (violations.length) {
    console.log("\nIlk 10 ihlal:");
    for (const v of violations.slice(0, 10)) {
      const ch = v.splitCharacter ? `${v.splitCharacter.codePoint} (${v.splitCharacter.char})` : "-";
      console.log(`  ${v.sure}:${v.ayet} span#${v.spanIndex} ${v.boundaryType} @cp${v.cp} bolunen: ${ch} kural: ${v.rule ?? "-"}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
