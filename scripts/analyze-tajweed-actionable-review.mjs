import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  LOCAL_DB_PATH,
  TAJWEED_RULE_COLORS,
  buildRuntimeData,
  codePoints,
  parseTajweedMarkup,
} from "./build-quran-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT_REPORT = path.join(ROOT, "scripts", "output", "tajweed-source-diff.json");
const GENERATED_SPANS = path.join(ROOT, "data", "generated", "quran", "tajweed-spans.json");
const OUTPUT_DIR = path.join(ROOT, "scripts", "output");

export const ACTIONABLE_OUTPUTS = Object.freeze({
  json: path.join(OUTPUT_DIR, "tajweed-actionable-review.json"),
  markdown: path.join(OUTPUT_DIR, "tajweed-actionable-review.md"),
  rootCauses: path.join(OUTPUT_DIR, "tajweed-diff-root-causes.md"),
});
const REQUIRED_SUBREASONS = [
  "unicode-equivalent-only",
  "waqf-annotation-token-difference",
  "no-rule-cluster",
  "unmapped-rule-cluster",
  "ambiguous-cluster",
  "token-count-mismatch",
  "span-grapheme-boundary",
];

const PRODUCTION_ANNOTATION_MARKS = new Set([
  "\u06d6", "\u06d7", "\u06d8", "\u06d9", "\u06da", "\u06db", "\u06dc", "\u06de", "\u06e9",
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

function isSeparator(char) {
  return char === "\u200c" || /\s/u.test(char);
}

function isMark(char) {
  return /^\p{Mark}$/u.test(char);
}

function isQuranAnnotation(char) {
  const cp = char.codePointAt(0);
  return cp >= 0x06d6 && cp <= 0x06ed;
}

function matchingChar(char) {
  if (char === "\u0672") return "\u0670";
  if (char === "\u066e") return "\u0649";
  if (char === "\u06df") return "\u0652";
  return char;
}

function tokenize(items) {
  const tokens = [];
  let token = null;
  for (const item of items) {
    if (isSeparator(item.char)) {
      if (token) tokens.push(token);
      token = null;
      continue;
    }
    if (!token) token = { items: [] };
    token.items.push(item);
  }
  if (token) tokens.push(token);

  const merged = [];
  for (const current of tokens) {
    if (current.items.length === 1 && PRODUCTION_ANNOTATION_MARKS.has(current.items[0].char) && merged.length) {
      merged[merged.length - 1].items.push(current.items[0]);
    } else {
      merged.push(current);
    }
  }
  return merged.map((current, index) => ({
    ...current,
    index,
    startCp: current.items[0].cpIndex,
    endCp: current.items[current.items.length - 1].cpIndex + 1,
  }));
}

function clustersFor(items) {
  const clusters = [];
  for (const item of items) {
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
      const marks = cluster.items
        .filter((item) => item !== hamza && item.char !== "\u0640")
        .map((item) => matchingChar(item.char)).join("");
      merged.push({ items: [...cluster.items, ...next.items], key: precomposed + marks });
      index += 1;
    } else {
      merged.push({ items: cluster.items, key: cluster.items.map((item) => matchingChar(item.char)).join("") });
    }
  }
  return merged.map((cluster, index) => ({
    ...cluster,
    index,
    startCp: cluster.items[0].cpIndex,
    endCp: cluster.items[cluster.items.length - 1].cpIndex + 1,
  }));
}

function assignedRules(cluster) {
  const withoutAnnotations = cluster.items.filter((item) => !PRODUCTION_ANNOTATION_MARKS.has(item.char));
  const candidates = withoutAnnotations.length ? withoutAnnotations : cluster.items;
  return [...new Set(candidates.map((item) => item.rule).filter((rule) => rule && TAJWEED_RULE_COLORS[rule]))].sort();
}

function tokenRules(token) {
  return [...new Set(clustersFor(token.items).flatMap(assignedRules))].sort();
}

function tokenText(token) {
  return token?.items.map((item) => item.char).join("") ?? null;
}

function normalizedText(token, { removeAnnotations = false } = {}) {
  if (!token) return "";
  return token.items
    .filter((item) => !removeAnnotations || !isQuranAnnotation(item.char))
    .map((item) => matchingChar(item.char))
    .join("")
    .normalize("NFD");
}

function orthographicText(token, { removeAnnotations = false } = {}) {
  const input = codePoints(normalizedText(token, { removeAnnotations }))
    .filter((char) => char !== "\u0640");
  const output = [];
  const shortVowel = new Map([["\u064b", "\u064e"], ["\u064c", "\u064f"], ["\u064d", "\u0650"]]);
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "\u0649" && input[index + 1] === "\u0670") continue;
    if (char === "\u0627" && shortVowel.has(input[index + 1]) && input[index + 2] === "\u0651") {
      output.push("\u0651", "\u0627", shortVowel.get(input[index + 1]));
      index += 2;
      continue;
    }
    if (shortVowel.has(char) && input[index + 1] === "\u0651" && input[index + 2] === "\u0627") {
      output.push("\u0651", "\u0627", shortVowel.get(char));
      index += 2;
      continue;
    }
    if (char === "\u0627" && input[index + 1] === "\u0651") {
      output.push("\u0651", "\u0627");
      index += 1;
      continue;
    }
    if (shortVowel.has(char) && input[index + 1] === "\u0627") {
      output.push("\u0627", shortVowel.get(char));
      index += 1;
      continue;
    }
    output.push(shortVowel.get(char) ?? char);
  }
  return output.join("");
}

function cpLabel(char) {
  return `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

function differenceSignature(canonicalToken, sourceToken) {
  const left = codePoints(normalizedText(canonicalToken));
  const right = codePoints(normalizedText(sourceToken));
  let prefix = 0;
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < left.length - prefix && suffix < right.length - prefix
    && left[left.length - 1 - suffix] === right[right.length - 1 - suffix]) suffix += 1;
  const canonicalDifference = left.slice(prefix, left.length - suffix);
  const sourceDifference = right.slice(prefix, right.length - suffix);
  return `canonical:${canonicalDifference.map(cpLabel).join("+") || "∅"}|source:${sourceDifference.map(cpLabel).join("+") || "∅"}`;
}

function finalSpanStatus(spans, startCp, endCp) {
  const overlapping = spans.filter((span) => span.startCp < endCp && startCp < span.endCp);
  if (!overlapping.length) return { state: "uncolored", spans: [] };
  return { state: "partially-or-fully-colored", spans: overlapping.map(({ startCp: start, endCp: end, rule }) => ({ startCp: start, endCp: end, rule })) };
}

function makeOccurrence({ verse, sourceFragment, startCp, endCp, sourceRules, finalStatus, exactReason, recommendation, diagnosticReason }) {
  return {
    verseKey: verse.verseKey,
    surahId: verse.surahId,
    ayahNumber: verse.ayahNumber,
    canonicalFragment: startCp === null ? verse.arabicText : codePoints(verse.arabicText).slice(startCp, endCp).join(""),
    sourceFragment,
    startCp,
    endCp,
    sourceRules,
    finalSpanStatus: finalStatus,
    exactReason,
    recommendation,
    diagnosticReason,
  };
}

export function classifyUnmatchedToken({ verse, canonicalToken, sourceToken, finalSpans }) {
  const sourceRules = tokenRules(sourceToken);
  let subreason;
  let exactReason;
  let recommendation;
  if (normalizedText(canonicalToken) === normalizedText(sourceToken)) {
    subreason = "unicode-equivalent-only";
    exactReason = "Tokenlar yalnız Unicode normalization/yazım biçimi bakımından farklıdır; canonical sıra aynıdır.";
    recommendation = sourceRules.length ? "script geliştirilebilir" : "güvenle renksiz bırak";
  } else if (orthographicText(canonicalToken) === orthographicText(sourceToken)) {
    subreason = "unicode-equivalent-only";
    exactReason = "Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır.";
    recommendation = sourceRules.length ? "script geliştirilebilir" : "güvenle renksiz bırak";
  } else if (orthographicText(canonicalToken, { removeAnnotations: true }) === orthographicText(sourceToken, { removeAnnotations: true })) {
    subreason = "waqf-annotation-token-difference";
    exactReason = "Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur.";
    recommendation = sourceRules.length ? "script geliştirilebilir" : "güvenle renksiz bırak";
  } else if (!sourceRules.length) {
    subreason = "no-rule-cluster";
    exactReason = "Eşleşmeyen eski-kaynak tokenında tanınan tecvid kuralı taşıyan grapheme yoktur.";
    recommendation = "güvenle renksiz bırak";
  } else {
    subreason = "unmapped-rule-cluster";
    exactReason = "Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır.";
    recommendation = "incele";
  }
  return {
    subreason,
    signature: `${subreason}|${differenceSignature(canonicalToken, sourceToken)}|action:${recommendation}`,
    actionable: sourceRules.length > 0,
    occurrence: makeOccurrence({
      verse,
      sourceFragment: tokenText(sourceToken),
      startCp: canonicalToken.startCp,
      endCp: canonicalToken.endCp,
      sourceRules,
      finalStatus: finalSpanStatus(finalSpans, canonicalToken.startCp, canonicalToken.endCp),
      exactReason,
      recommendation,
      diagnosticReason: "unmatched-token",
    }),
  };
}

function findAmbiguousSourceCluster({ range, canonicalTokens, sourceTokens }) {
  const canonicalToken = canonicalTokens.find((token) => token.startCp <= range.startCp && token.endCp >= range.endCp);
  if (!canonicalToken) return null;
  const canonicalClusters = clustersFor(canonicalToken.items);
  const clusterIndex = canonicalClusters.findIndex((cluster) => cluster.startCp === range.startCp && cluster.endCp === range.endCp);
  if (clusterIndex < 0) return null;
  const sourceToken = sourceTokens[canonicalToken.index];
  return { canonicalToken, sourceCluster: sourceToken ? clustersFor(sourceToken.items)[clusterIndex] : null };
}

function groupResults(results) {
  const groups = new Map();
  for (const result of results) {
    const group = groups.get(result.signature) ?? {
      id: result.signature,
      category: result.subreason,
      exactReason: result.occurrence.exactReason,
      recommendation: result.occurrence.recommendation,
      sourceRules: new Set(),
      occurrences: [],
    };
    for (const rule of result.occurrence.sourceRules) group.sourceRules.add(rule);
    group.occurrences.push(result.occurrence);
    groups.set(result.signature, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    sourceRules: [...group.sourceRules].sort(),
    recordCount: group.occurrences.length,
    verseCount: new Set(group.occurrences.map((item) => item.verseKey)).size,
    verseKeys: [...new Set(group.occurrences.map((item) => item.verseKey))],
    examples: group.occurrences.slice(0, 8),
  })).sort((left, right) => right.recordCount - left.recordCount || left.id.localeCompare(right.id));
}

function graphemeBoundaryResults(verses, spansByKey) {
  const segmenter = new Intl.Segmenter("ar", { granularity: "grapheme" });
  const results = [];
  for (const verse of verses) {
    const boundaries = new Set([0, codePoints(verse.arabicText).length]);
    for (const segment of segmenter.segment(verse.arabicText)) {
      boundaries.add(codePoints(verse.arabicText.slice(0, segment.index)).length);
    }
    for (const span of spansByKey.get(verse.verseKey) ?? []) {
      if (boundaries.has(span.startCp) && boundaries.has(span.endCp)) continue;
      const occurrence = makeOccurrence({
        verse,
        sourceFragment: null,
        startCp: span.startCp,
        endCp: span.endCp,
        sourceRules: [span.rule],
        finalStatus: { state: "boundary-violation", spans: [span] },
        exactReason: "Final span başlangıç veya bitişi Intl.Segmenter grapheme sınırına denk gelmemektedir.",
        recommendation: "incele",
        diagnosticReason: "span-grapheme-boundary",
      });
      results.push({ subreason: "span-grapheme-boundary", signature: `span-grapheme-boundary|${span.rule}`, actionable: true, occurrence });
    }
  }
  return results;
}

function readMarkup() {
  const db = new DatabaseSync(LOCAL_DB_PATH, { readOnly: true });
  try {
    const rows = db.prepare("SELECT verse_key, arabic_tajweed FROM verses WHERE arabic_tajweed IS NOT NULL AND arabic_tajweed <> ''").all();
    return new Map(rows.map((row) => [String(row.verse_key), String(row.arabic_tajweed)]));
  } finally {
    db.close();
  }
}

function markdownEscape(value) {
  return String(value ?? "—").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderExamples(group) {
  return group.examples.map((item) => `| ${item.verseKey} | \`${markdownEscape(item.canonicalFragment)}\` | \`${markdownEscape(item.sourceFragment)}\` | ${item.startCp ?? "—"}–${item.endCp ?? "—"} | ${item.sourceRules.join(", ") || "—"} | ${item.finalSpanStatus.state} | ${markdownEscape(item.exactReason)} | ${item.recommendation} |`).join("\n");
}

export function renderActionableMarkdown(report) {
  const sections = report.actionableGroups.map((group) => `## ${group.category} — ${group.recordCount} kayıt / ${group.verseCount} ayet

- Kök neden: ${group.exactReason}
- Kaynak kuralları: ${group.sourceRules.join(", ") || "—"}
- Önerilen işlem: **${group.recommendation}**

| Ayet | Canonical parça | Kaynak parça | CP aralığı | Kaynak kuralı | Final span | Kesin neden | İşlem |
|---|---|---|---:|---|---|---|---|
${renderExamples(group)}
`).join("\n");
  return `# Tecvid Actionable Review

- Gerçek manuel inceleme gereken benzersiz ayet: **${report.summary.manualReviewUniqueVerses}**
- Actionable kök neden grubu: **${report.actionableGroups.length}**
- Otomatik hizalayıcı geliştirilebilir grup: **${report.summary.alignerImprovementGroups}**
- Güvenlik nedeniyle renksiz bırakılacak grup: **${report.summary.safeUncoloredGroups}**

${sections || "Actionable kayıt bulunmadı."}`;
}

export function renderRootCausesMarkdown(report) {
  const rows = report.rootCauseGroups.map((group) => `| ${group.category} | ${group.recordCount} | ${group.verseCount} | ${group.sourceRules.join(", ") || "—"} | ${group.recommendation} | ${markdownEscape(group.exactReason)} |`).join("\n");
  return `# Tecvid Diff Kök Nedenleri

Beklenen farklar actionable listeye alınmamıştır: aynı kuralı koruyan Unicode yazım farkları (**${report.harmless.expectedUnicodeRecords}**) ve besmele kaynak farkları (**${report.harmless.basmalaRecords}**).

| Alt neden | Kayıt | Ayet | Kaynak kuralları | İşlem | Teknik açıklama |
|---|---:|---:|---|---|---|
${rows}
`;
}

export function buildActionableReport({ generatedAt = new Date().toISOString() } = {}) {
  const prior = JSON.parse(fs.readFileSync(INPUT_REPORT, "utf8"));
  const generated = JSON.parse(fs.readFileSync(GENERATED_SPANS, "utf8"));
  const runtime = buildRuntimeData();
  const markupByKey = readMarkup();
  const verseByKey = new Map(runtime.source.verses.map((verse) => [verse.verseKey, verse]));
  const basmalaByKey = new Map(runtime.basmalaRanges.map((item) => [item.verseKey, item]));
  const spansByKey = new Map(generated.verses.map((item) => [item.verseKey, item.spans]));
  const results = [];

  for (const record of prior.records.filter((item) => item.classification === 6 || item.classification === 7)) {
    const verse = verseByKey.get(record.verseKey);
    const markup = markupByKey.get(record.verseKey);
    if (!verse || !markup) continue;
    const basmala = basmalaByKey.get(record.verseKey);
    const offset = basmala?.kind === "prefix" ? basmala.bodyStartCp : 0;
    const canonicalItems = codePoints(verse.arabicText).slice(offset).map((char, index) => ({ char, rule: null, cpIndex: offset + index }));
    const sourceItems = parseTajweedMarkup(markup);
    const canonicalTokens = tokenize(canonicalItems);
    const sourceTokens = tokenize(sourceItems);
    const finalSpans = spansByKey.get(record.verseKey) ?? [];

    if (record.diagnosticReason === "unmatched-token") {
      const canonicalToken = canonicalTokens.find((token) => token.startCp === record.startCp && token.endCp === record.endCp);
      if (!canonicalToken || canonicalTokens.length !== sourceTokens.length) throw new Error(`Cannot resolve unmatched token ${record.verseKey}:${record.startCp}-${record.endCp}`);
      results.push(classifyUnmatchedToken({ verse, canonicalToken, sourceToken: sourceTokens[canonicalToken.index], finalSpans }));
    } else if (record.diagnosticReason === "ambiguous-cluster") {
      const mapped = findAmbiguousSourceCluster({ range: record, canonicalTokens, sourceTokens });
      const rules = mapped?.sourceCluster ? assignedRules(mapped.sourceCluster) : [];
      const sourceFragment = mapped?.sourceCluster?.items.map((item) => item.char).join("") ?? null;
      const rulePattern = mapped?.sourceCluster?.items.map((item) => item.rule ?? "none").join(">") ?? "unresolved";
      const occurrence = makeOccurrence({
        verse, sourceFragment, startCp: record.startCp, endCp: record.endCp, sourceRules: rules,
        finalStatus: finalSpanStatus(finalSpans, record.startCp, record.endCp),
        exactReason: rules.length > 1
          ? `Aynı grapheme içinde eski kaynak ${rules.join(" ve ")} kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez.`
          : "Ambiguous diagnostic kaynak grapheme'e yeniden bağlanamadı; otomatik kural seçilemez.",
        recommendation: "güvenle renksiz bırak",
        diagnosticReason: "ambiguous-cluster",
      });
      results.push({ subreason: "ambiguous-cluster", signature: `ambiguous-cluster|rules:${rules.join("+") || "unresolved"}|pattern:${rulePattern}`, actionable: rules.length > 0, occurrence });
    } else if (record.diagnosticReason === "token-count-mismatch") {
      const rules = [...new Set(sourceTokens.flatMap(tokenRules))].sort();
      const occurrence = makeOccurrence({
        verse, sourceFragment: sourceItems.map((item) => item.char).join(""), startCp: record.startCp, endCp: record.endCp,
        sourceRules: rules, finalStatus: finalSpanStatus(finalSpans, record.startCp, record.endCp),
        exactReason: `Canonical token sayısı ${canonicalTokens.length}, eski kaynak token sayısı ${sourceTokens.length}; token-index eşlemesi güvenli değildir.`,
        recommendation: rules.length ? "script geliştirilebilir" : "güvenle renksiz bırak",
        diagnosticReason: "token-count-mismatch",
      });
      results.push({ subreason: "token-count-mismatch", signature: `token-count-mismatch|${canonicalTokens.length}>${sourceTokens.length}`, actionable: rules.length > 0, occurrence });
    }
  }

  results.push(...graphemeBoundaryResults(runtime.source.verses, spansByKey));
  const rootCauseGroups = groupResults(results);
  const subreasonTotals = Object.fromEntries(REQUIRED_SUBREASONS.map((category) => {
    const groups = rootCauseGroups.filter((group) => group.category === category);
    const verses = new Set(groups.flatMap((group) => group.verseKeys));
    return [category, {
      records: groups.reduce((sum, group) => sum + group.recordCount, 0),
      verses: verses.size,
      groups: groups.length,
      recommendations: Object.fromEntries(["incele", "script geliştirilebilir", "güvenle renksiz bırak"].map((recommendation) => [
        recommendation,
        groups.filter((group) => group.recommendation === recommendation).reduce((sum, group) => sum + group.recordCount, 0),
      ])),
    }];
  }));
  const actionableGroups = rootCauseGroups.filter((group) => group.occurrences.some((item) => item.sourceRules.length > 0) || group.category === "span-grapheme-boundary");
  const manualVerseKeys = new Set(actionableGroups.filter((group) => group.recommendation === "incele").flatMap((group) => group.verseKeys));
  const harmlessUnmatched = results.filter((result) => !result.actionable && ["unicode-equivalent-only", "waqf-annotation-token-difference", "no-rule-cluster"].includes(result.subreason)).length;
  const harmless = {
    expectedUnicodeRecords: prior.totals.byClass["5"].records,
    basmalaRecords: prior.totals.byClass["8"].records,
    noRuleOrNonActionableAlignmentRecords: harmlessUnmatched,
  };
  harmless.totalDifferenceRecords = harmless.expectedUnicodeRecords + harmless.basmalaRecords + harmless.noRuleOrNonActionableAlignmentRecords;

  return {
    reportVersion: 1,
    generatedAt,
    policy: "Authoritative canonical text and final generated spans are read-only. Old tajweed markup is cross-check evidence only.",
    comparedVerses: runtime.source.verses.length,
    harmless,
    summary: {
      manualReviewUniqueVerses: manualVerseKeys.size,
      manualReviewVerseKeys: [...manualVerseKeys].sort((left, right) => {
        const [ls, la] = left.split(":").map(Number); const [rs, ra] = right.split(":").map(Number);
        return ls - rs || la - ra;
      }),
      alignerImprovementGroups: actionableGroups.filter((group) => group.recommendation === "script geliştirilebilir").length,
      safeUncoloredGroups: actionableGroups.filter((group) => group.recommendation === "güvenle renksiz bırak").length,
      inspectGroups: actionableGroups.filter((group) => group.recommendation === "incele").length,
    },
    subreasonTotals,
    rootCauseGroups,
    actionableGroups,
  };
}

function assertOutputPath(target) {
  const relative = path.relative(OUTPUT_DIR, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Output escaped scripts/output: ${target}`);
}

export function writeActionableReports(report) {
  for (const target of Object.values(ACTIONABLE_OUTPUTS)) assertOutputPath(target);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(ACTIONABLE_OUTPUTS.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(ACTIONABLE_OUTPUTS.markdown, renderActionableMarkdown(report), "utf8");
  fs.writeFileSync(ACTIONABLE_OUTPUTS.rootCauses, renderRootCausesMarkdown(report), "utf8");
}

export function runActionableAnalysis() {
  const report = buildActionableReport();
  writeActionableReports(report);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runActionableAnalysis();
  process.stdout.write(`${JSON.stringify({ harmless: report.harmless, summary: report.summary, rootCauseGroups: report.rootCauseGroups.map(({ id, category, recordCount, verseCount, recommendation }) => ({ id, category, recordCount, verseCount, recommendation })) }, null, 2)}\n`);
}
