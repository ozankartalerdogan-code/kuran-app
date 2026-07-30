import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  LOCAL_DB_PATH,
  SOURCE_PATH,
  TAJWEED_RULE_COLORS,
  buildRuntimeData,
  codePoints,
  parseTajweedMarkup,
} from "./build-quran-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_SPANS_PATH = path.join(ROOT, "data", "generated", "quran", "tajweed-spans.json");
const OUTPUT_DIR = path.join(ROOT, "scripts", "output");

export const OUTPUT_PATHS = Object.freeze({
  json: path.join(OUTPUT_DIR, "tajweed-source-diff.json"),
  summary: path.join(OUTPUT_DIR, "tajweed-source-diff-summary.md"),
  manualReview: path.join(OUTPUT_DIR, "tajweed-source-diff-manual-review.md"),
});

export const CLASSIFICATIONS = Object.freeze({
  1: "İki tarafta tamamen aynı kural",
  2: "Bizde var, eski kaynakta yok",
  3: "Eski kaynakta var, bizde yok",
  4: "Aynı konumda farklı tecvid kuralı",
  5: "Yalnız Unicode/karakter yazımı farklı, canonical hizalama aynı",
  6: "Token veya grapheme hizalama problemi",
  7: "Belirsiz veya otomatik karar verilemeyen durum",
  8: "Besmele kaynak farkı",
});

const MANUAL_REVIEW_CLASSES = new Set([2, 3, 4, 6, 7]);
const SIMPLE_EQUIVALENTS = new Map([
  ["\u0672", "\u0670"],
  ["\u066e", "\u0649"],
  ["\u06df", "\u0652"],
]);
const HAMZA_ABOVE = "\u0654";
const HAMZA_BELOW = "\u0655";
const HAMZA_SEATS = new Map([
  [`${HAMZA_ABOVE}\u0627`, "\u0623"],
  [`${HAMZA_ABOVE}\u0648`, "\u0624"],
  [`${HAMZA_ABOVE}\u0649`, "\u0626"],
  [`${HAMZA_ABOVE}\u064a`, "\u0626"],
  [`${HAMZA_BELOW}\u0627`, "\u0625"],
]);

function isMark(char) {
  return /^\p{Mark}$/u.test(char);
}

function isSeparator(char) {
  return char === "\u200c" || /\s/u.test(char);
}

function comparableChar(char) {
  return SIMPLE_EQUIVALENTS.get(char) ?? char;
}

function makeClusters(items) {
  const clusters = [];
  for (const item of items) {
    if (isSeparator(item.char)) continue;
    if (isMark(item.char) && clusters.length) clusters[clusters.length - 1].items.push(item);
    else clusters.push({ items: [item] });
  }

  const merged = [];
  for (let index = 0; index < clusters.length; index += 1) {
    const cluster = clusters[index];
    const next = clusters[index + 1];
    const hamza = cluster.items.find((item) => item.char === HAMZA_ABOVE || item.char === HAMZA_BELOW);
    const precomposed = hamza && next?.items.length === 1
      ? HAMZA_SEATS.get(`${hamza.char}${next.items[0].char}`)
      : null;
    if (cluster.items[0].char === "\u0640" && precomposed) {
      const otherMarks = cluster.items
        .filter((item) => item !== hamza && item.char !== "\u0640")
        .map((item) => comparableChar(item.char))
        .join("");
      merged.push({ items: [...cluster.items, ...next.items], key: precomposed + otherMarks });
      index += 1;
    } else {
      merged.push({ items: cluster.items, key: cluster.items.map((item) => comparableChar(item.char)).join("") });
    }
  }
  return merged;
}

function cpList(text) {
  return codePoints(text).map((char) => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`).join(" ");
}

function overlaps(left, right) {
  return left.startCp < right.endCp && right.startCp < left.endCp;
}

function fragment(text, startCp, endCp) {
  return codePoints(text).slice(startCp, endCp).join("");
}

function bodyRangeFor(verseKey, textLength, basmalaByKey) {
  const basmala = basmalaByKey.get(verseKey);
  const startCp = basmala?.kind === "prefix" ? basmala.bodyStartCp : 0;
  return { startCp, endCp: textLength };
}

export function findUnicodeWritingDifferences(canonicalText, tajweedMarkup, bodyStartCp = 0) {
  const canonicalItems = codePoints(canonicalText).slice(bodyStartCp)
    .map((char, index) => ({ char, cpIndex: bodyStartCp + index }));
  const sourceItems = parseTajweedMarkup(tajweedMarkup);
  const canonicalClusters = makeClusters(canonicalItems);
  const sourceClusters = makeClusters(sourceItems);
  if (canonicalClusters.length !== sourceClusters.length) return [];
  if (canonicalClusters.some((cluster, index) => cluster.key !== sourceClusters[index].key)) return [];

  return canonicalClusters.flatMap((cluster, index) => {
    const sourceCluster = sourceClusters[index];
    const canonicalRaw = cluster.items.map((item) => item.char).join("");
    const sourceRaw = sourceCluster.items.map((item) => item.char).join("");
    if (canonicalRaw === sourceRaw) return [];
    return [{
      startCp: cluster.items[0].cpIndex,
      endCp: cluster.items[cluster.items.length - 1].cpIndex + 1,
      sourceFragment: sourceRaw,
      explanation: `Yazım farkı mevcut hizalayıcının eşdeğerlikleriyle aynı grapheme'e bağlandı: canonical ${cpList(canonicalRaw)}; eski kaynak ${cpList(sourceRaw)}.`,
    }];
  });
}

function validateSpans(spans, textLength, verseKey, side) {
  let previousEnd = 0;
  for (const span of spans) {
    if (!Number.isInteger(span.startCp) || !Number.isInteger(span.endCp)
      || span.startCp < previousEnd || span.endCp <= span.startCp || span.endCp > textLength) {
      throw new Error(`${verseKey}: invalid ${side} span ${JSON.stringify(span)}`);
    }
    previousEnd = span.endCp;
  }
}

function ruleAt(spans, startCp, endCp) {
  return spans.find((span) => span.startCp <= startCp && span.endCp >= endCp)?.rule ?? null;
}

function recordFor(verse, range, currentRule, oldRule, classification, explanation, extra = {}) {
  return {
    verseKey: verse.verseKey,
    surahId: verse.surahId,
    ayahNumber: verse.ayahNumber,
    startCp: range.startCp,
    endCp: range.endCp,
    canonicalFragment: fragment(verse.arabicText, range.startCp, range.endCp),
    currentRule,
    oldRule,
    classification,
    classificationLabel: CLASSIFICATIONS[classification],
    explanation,
    ...extra,
  };
}

export function compareRuleRanges({ verse, currentSpans, oldSpans, unicodeDifferences = [] }) {
  const textLength = codePoints(verse.arabicText).length;
  validateSpans(currentSpans, textLength, verse.verseKey, "current");
  validateSpans(oldSpans, textLength, verse.verseKey, "old");
  const boundaries = new Set();
  for (const range of [...currentSpans, ...oldSpans, ...unicodeDifferences]) {
    boundaries.add(range.startCp);
    boundaries.add(range.endCp);
  }
  const points = [...boundaries].sort((left, right) => left - right);
  const records = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const range = { startCp: points[index], endCp: points[index + 1] };
    const currentRule = ruleAt(currentSpans, range.startCp, range.endCp);
    const oldRule = ruleAt(oldSpans, range.startCp, range.endCp);
    const writingDifference = unicodeDifferences.find((item) => overlaps(item, range));
    if (!currentRule && !oldRule && !writingDifference) continue;
    if (writingDifference && currentRule === oldRule) {
      records.push(recordFor(
        verse, range, currentRule, oldRule, 5, writingDifference.explanation,
        { sourceFragment: writingDifference.sourceFragment },
      ));
    } else if (currentRule && currentRule === oldRule) {
      records.push(recordFor(verse, range, currentRule, oldRule, 1, "Canonical code-point aralığı ve tecvid kuralı iki tarafta aynıdır."));
    } else if (currentRule && !oldRule) {
      records.push(recordFor(verse, range, currentRule, null, 2, "Authoritative generated span'de kural vardır; yeniden hizalanan eski kaynakta bu aralıkta kural yoktur."));
    } else if (!currentRule && oldRule) {
      records.push(recordFor(verse, range, null, oldRule, 3, "Yeniden hizalanan eski kaynakta kural vardır; authoritative generated span'de bu aralıkta kural yoktur."));
    } else {
      records.push(recordFor(verse, range, currentRule, oldRule, 4, "Aynı canonical code-point aralığı iki tarafta farklı tecvid kuralları taşır."));
    }
  }
  return records;
}

export function classificationForDiagnosticReason(reason) {
  if (reason === "basmala-prefix-not-in-tajweed-source") return 8;
  if (reason === "token-count-mismatch" || reason === "unmatched-token") return 6;
  return 7;
}

function explanationForDiagnostic(reason) {
  if (reason === "basmala-prefix-not-in-tajweed-source") return "Tanzil canonical ayette besmele prefixi bulunur; eski ayet-bazlı tecvid kaynağı bu prefixi yapısal olarak içermez.";
  if (reason === "token-count-mismatch") return "Canonical metin ile eski kaynağın token sayıları farklıdır; güvenli karakter-aralığı kararı otomatik verilemez.";
  if (reason === "unmatched-token") return "Token, mevcut production hizalayıcısının doğrulanmış Unicode/grapheme eşdeğerlikleriyle eşleşmemiştir.";
  if (reason === "ambiguous-cluster") return "Aynı grapheme kümesinde birden fazla atanmış eski kaynak kuralı vardır; production hizalayıcısı bu aralığı bilinçli olarak renksiz bırakır.";
  if (reason === "missing-source") return "Eski kaynakta bu ayet için tecvid markup bulunmadığından otomatik karşılaştırma yapılamaz.";
  return `Mevcut hizalayıcı bu aralığı otomatik karara kapatmıştır: ${reason}.`;
}

function diagnosticRecords(verse, diagnostic) {
  return diagnostic.uncoloredRanges.map((range) => recordFor(
    verse,
    range,
    null,
    null,
    classificationForDiagnosticReason(range.reason),
    explanationForDiagnostic(range.reason),
    { diagnosticReason: range.reason },
  ));
}

export function unknownRuleRecords(verse, markup) {
  const unknownByRule = new Map();
  for (const item of parseTajweedMarkup(markup)) {
    if (!item.rule || TAJWEED_RULE_COLORS[item.rule]) continue;
    const characters = unknownByRule.get(item.rule) ?? [];
    characters.push(item.char);
    unknownByRule.set(item.rule, characters);
  }
  return [...unknownByRule.entries()].map(([rule, characters]) => ({
    verseKey: verse.verseKey,
    surahId: verse.surahId,
    ayahNumber: verse.ayahNumber,
    startCp: null,
    endCp: null,
    canonicalFragment: null,
    currentRule: null,
    oldRule: rule,
    classification: 7,
    classificationLabel: CLASSIFICATIONS[7],
    explanation: `Eski kaynakta production renk tablosunun tanımadığı "${rule}" kuralı vardır; güvenli canonical aralık otomatik atanamaz.`,
    sourceFragment: characters.join(""),
    diagnosticReason: "unknown-rule",
  }));
}

function readOldMarkup() {
  const db = new DatabaseSync(LOCAL_DB_PATH, { readOnly: true });
  try {
    const rows = db.prepare("SELECT verse_key, arabic_tajweed FROM verses WHERE arabic_tajweed IS NOT NULL AND arabic_tajweed <> ''").all();
    return new Map(rows.map((row) => [String(row.verse_key), String(row.arabic_tajweed)]));
  } finally {
    db.close();
  }
}

function readGeneratedSpans() {
  return JSON.parse(fs.readFileSync(GENERATED_SPANS_PATH, "utf8"));
}

export function buildManualReview(records) {
  const byVerse = new Map();
  for (const record of records) {
    if (!MANUAL_REVIEW_CLASSES.has(record.classification)) continue;
    const entry = byVerse.get(record.verseKey) ?? {
      verseKey: record.verseKey,
      surahId: record.surahId,
      ayahNumber: record.ayahNumber,
      classifications: new Set(),
      recordCount: 0,
      explanations: new Set(),
      fragments: new Set(),
    };
    entry.classifications.add(record.classification);
    entry.recordCount += 1;
    entry.explanations.add(record.explanation);
    if (record.canonicalFragment) entry.fragments.add(record.canonicalFragment);
    byVerse.set(record.verseKey, entry);
  }
  return [...byVerse.values()]
    .sort((left, right) => left.surahId - right.surahId || left.ayahNumber - right.ayahNumber)
    .map((entry) => ({
      ...entry,
      classifications: [...entry.classifications].sort((left, right) => left - right),
      explanations: [...entry.explanations],
      fragments: [...entry.fragments].slice(0, 3),
    }));
}

function countByClass(records) {
  return Object.fromEntries(Object.keys(CLASSIFICATIONS).map((key) => {
    const classification = Number(key);
    const matching = records.filter((record) => record.classification === classification);
    return [key, {
      label: CLASSIFICATIONS[classification],
      records: matching.length,
      verses: new Set(matching.map((record) => record.verseKey)).size,
    }];
  }));
}

export function createAuditReport({ runtime, generated, markupByKey, generatedAt = new Date().toISOString() }) {
  if (generated.canonicalSourceSha256 !== runtime.source.sourceSha256) {
    throw new Error(`Canonical SHA mismatch: generated=${generated.canonicalSourceSha256} runtime=${runtime.source.sourceSha256}`);
  }
  if (generated.coordinateSystem !== "unicode-code-point-half-open") {
    throw new Error(`Unsupported generated coordinate system: ${generated.coordinateSystem}`);
  }
  if (generated.verses.length !== runtime.source.verses.length) {
    throw new Error(`Verse count mismatch: generated=${generated.verses.length} canonical=${runtime.source.verses.length}`);
  }

  const generatedByKey = new Map(generated.verses.map((item) => [item.verseKey, item.spans]));
  const oldByKey = new Map(runtime.tajweedVerses.map((item) => [item.verseKey, item.spans]));
  const diagnosticByKey = new Map(runtime.tajweedDiagnostics.map((item) => [item.verseKey, item]));
  const basmalaByKey = new Map(runtime.basmalaRanges.map((item) => [item.verseKey, item]));
  const records = [];

  for (const verse of runtime.source.verses) {
    const currentSpans = generatedByKey.get(verse.verseKey);
    const oldSpans = oldByKey.get(verse.verseKey);
    const diagnostic = diagnosticByKey.get(verse.verseKey);
    if (!currentSpans || !oldSpans || !diagnostic) throw new Error(`Missing audit input for ${verse.verseKey}`);
    const markup = markupByKey.get(verse.verseKey);
    const bodyRange = bodyRangeFor(verse.verseKey, codePoints(verse.arabicText).length, basmalaByKey);
    const unicodeDifferences = markup
      ? findUnicodeWritingDifferences(verse.arabicText, markup, bodyRange.startCp)
        .filter((difference) => !diagnostic.uncoloredRanges.some((range) => overlaps(difference, range)))
      : [];
    records.push(...compareRuleRanges({ verse, currentSpans, oldSpans, unicodeDifferences }));
    records.push(...diagnosticRecords(verse, diagnostic));
    if (markup) records.push(...unknownRuleRecords(verse, markup));
  }

  const manualReview = buildManualReview(records);
  return {
    auditVersion: 1,
    generatedAt,
    comparisonPolicy: "Tanzil canonical text and generated tajweed spans are authoritative; the old source is read-only cross-check evidence only.",
    authoritative: {
      canonicalText: path.relative(ROOT, SOURCE_PATH),
      canonicalSourceSha256: runtime.source.sourceSha256,
      generatedSpans: path.relative(ROOT, GENERATED_SPANS_PATH),
    },
    oldSource: {
      database: path.relative(ROOT, LOCAL_DB_PATH),
      tableColumn: "verses.arabic_tajweed",
      access: "read-only",
    },
    coordinateSystem: "unicode-code-point-half-open",
    countUnit: "Her kayıt, birleşik span sınırlarıyla bölünmüş bir canonical aralık veya mevcut hizalayıcının tek diagnostic aralığıdır.",
    classifications: CLASSIFICATIONS,
    totals: {
      comparedVerses: runtime.source.verses.length,
      records: records.length,
      byClass: countByClass(records),
      manualReviewVerses: manualReview.length,
    },
    manualReview,
    records,
  };
}

function markdownEscape(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderSummary(report) {
  const rows = Object.entries(report.totals.byClass)
    .map(([key, value]) => `| ${key} | ${value.label} | ${value.records} | ${value.verses} |`)
    .join("\n");
  return `# Tecvid Kaynak Farkı Audit Özeti

- Karşılaştırılan ayet: **${report.totals.comparedVerses}**
- Toplam audit kaydı: **${report.totals.records}**
- Manuel inceleme gereken ayet: **${report.totals.manualReviewVerses}**
- Koordinat sistemi: \`${report.coordinateSystem}\`

| Sınıf | Açıklama | Kayıt | Ayet |
|---:|---|---:|---:|
${rows}

Authoritative kaynaklar değiştirilmemiştir. Eski kaynak yalnız \`data/app.db / verses.arabic_tajweed\` üzerinden read-only açılmış ve mevcut production parser/hizalayıcı ile yeniden hizalanmıştır.
`;
}

export function renderManualReview(report) {
  const rows = report.manualReview.map((item) => {
    const fragments = item.fragments.map((value) => `\`${markdownEscape(value)}\``).join(" ");
    return `| ${item.verseKey} | ${item.classifications.join(", ")} | ${item.recordCount} | ${fragments} | ${markdownEscape(item.explanations.join("; "))} |`;
  }).join("\n");
  return `# Manuel İnceleme Gerektiren Ayetler

Sınıf 2, 3, 4, 6 veya 7 içeren ayetler listelenir. Bu liste hiçbir farkı doğru/yanlış ilan etmez ve production verisine otomatik karar taşımaz.

| Ayet | Sınıflar | Kayıt | Canonical örnek | Teknik neden |
|---|---|---:|---|---|
${rows || "| — | — | 0 | — | — |"}
`;
}

function assertAuditOutputPath(target) {
  const relative = path.relative(OUTPUT_DIR, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Audit output must remain under scripts/output: ${target}`);
  }
}

export function writeAuditOutputs(report) {
  for (const target of Object.values(OUTPUT_PATHS)) assertAuditOutputPath(target);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATHS.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUT_PATHS.summary, renderSummary(report), "utf8");
  fs.writeFileSync(OUTPUT_PATHS.manualReview, renderManualReview(report), "utf8");
}

export function runAudit() {
  const runtime = buildRuntimeData();
  const generated = readGeneratedSpans();
  const markupByKey = readOldMarkup();
  const report = createAuditReport({ runtime, generated, markupByKey });
  writeAuditOutputs(report);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runAudit();
  process.stdout.write(`${JSON.stringify({
    comparedVerses: report.totals.comparedVerses,
    byClass: report.totals.byClass,
    manualReviewVerses: report.totals.manualReviewVerses,
    outputs: OUTPUT_PATHS,
  }, null, 2)}\n`);
}
