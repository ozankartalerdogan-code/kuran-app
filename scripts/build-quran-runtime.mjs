import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE_DIR = path.join(ROOT, "data", "vendor", "tanzil", "uthmani-1.1");
export const SOURCE_PATH = path.join(SOURCE_DIR, "quran-uthmani.txt");
export const SOURCE_MANIFEST_PATH = path.join(SOURCE_DIR, "manifest.json");
export const GENERATED_DIR = path.join(ROOT, "data", "generated", "quran");
export const LOCAL_DB_PATH = path.join(ROOT, "data", "app.db");
const MUSHAF_PAGE_DATA_PATH = path.join(ROOT, "apps", "mobile", "src", "data", "mushaf_sayfalari.json");
const EXPECTED_SOURCE_SHA256 = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326";
const EXPECTED_VERSE_COUNT = 6236;
const SURAH_VERSE_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

export const TAJWEED_RULE_COLORS = {
  n: "#e11d48", p: "#e11d48", o: "#dc2626", m: "#b91c1c",
  g: "#16a34a", f: "#16a34a", i: "#16a34a", a: "#16a34a",
  c: "#16a34a", u: "#16a34a", w: "#16a34a", b: "#16a34a",
  q: "#2563eb", h: "#9ca3af", s: "#9ca3af", l: "#9ca3af", d: "#9ca3af",
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function codePoints(value) {
  return Array.from(value);
}

export function sourceRowsToBytes(verses, sourceSuffix = "\n") {
  return Buffer.from(verses.map((verse) => `${verse.surahId}|${verse.ayahNumber}|${verse.arabicText}`).join("\n") + sourceSuffix, "utf8");
}

export function readCanonicalSource() {
  const manifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, "utf8"));
  const sourceBytes = fs.readFileSync(SOURCE_PATH);
  const sourceSha256 = sha256(sourceBytes);
  if (manifest.sha256 !== EXPECTED_SOURCE_SHA256 || sourceSha256 !== EXPECTED_SOURCE_SHA256) {
    throw new Error(`Tanzil source SHA-256 mismatch: expected=${EXPECTED_SOURCE_SHA256} manifest=${manifest.sha256} actual=${sourceSha256}`);
  }
  if (sourceBytes.includes(0x0d)) throw new Error("Tanzil source contains CR bytes; source must remain the downloaded LF byte stream.");

  const source = sourceBytes.toString("utf8");
  if (Buffer.compare(Buffer.from(source, "utf8"), sourceBytes) !== 0) {
    throw new Error("Tanzil source is not a lossless UTF-8 byte sequence.");
  }
  const copyrightMarker = "\n\n\n# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK";
  const copyrightOffset = source.indexOf(copyrightMarker);
  if (copyrightOffset < 0) throw new Error("Tanzil copyright block is missing.");
  const sourceSuffix = source.slice(copyrightOffset);
  const lines = source.slice(0, copyrightOffset).split("\n");
  const verses = lines.map((line, index) => {
    const first = line.indexOf("|");
    const second = line.indexOf("|", first + 1);
    if (first < 1 || second < first + 2) throw new Error(`Invalid Tanzil line ${index + 1}`);
    const surahId = Number(line.slice(0, first));
    const ayahNumber = Number(line.slice(first + 1, second));
    const arabicText = line.slice(second + 1);
    if (!arabicText || arabicText.startsWith("\u0020")) throw new Error(`Unexpected empty/leading-space source ayah ${surahId}:${ayahNumber}`);
    return { verseKey: `${surahId}:${ayahNumber}`, surahId, ayahNumber, arabicText, status: "available" };
  });

  if (verses.length !== EXPECTED_VERSE_COUNT) throw new Error(`Expected ${EXPECTED_VERSE_COUNT} verses, got ${verses.length}`);
  let cursor = 0;
  for (let surahId = 1; surahId <= 114; surahId += 1) {
    for (let ayahNumber = 1; ayahNumber <= SURAH_VERSE_COUNTS[surahId - 1]; ayahNumber += 1) {
      const verse = verses[cursor++];
      if (verse.surahId !== surahId || verse.ayahNumber !== ayahNumber) {
        throw new Error(`Tanzil verse order mismatch at ${surahId}:${ayahNumber}`);
      }
    }
  }
  if (Buffer.compare(sourceRowsToBytes(verses, sourceSuffix), sourceBytes) !== 0) {
    throw new Error("Parsed verses do not reconstruct the immutable Tanzil bytes.");
  }
  return { manifest, sourceBytes, sourceSha256, sourceSuffix, verses };
}

export function buildBasmalaRanges(verses) {
  const byKey = new Map(verses.map((verse) => [verse.verseKey, verse]));
  const basmala = byKey.get("1:1")?.arabicText;
  if (!basmala) throw new Error("Canonical basmala 1:1 is missing.");
  const basmalaLength = codePoints(basmala).length;
  const ranges = [{ verseKey: "1:1", kind: "ayah", startCp: 0, endCp: basmalaLength, bodyStartCp: basmalaLength }];
  for (let surahId = 2; surahId <= 114; surahId += 1) {
    if (surahId === 9) continue;
    const verseKey = `${surahId}:1`;
    const verse = byKey.get(verseKey);
    if (!verse) throw new Error(`Canonical first ayah missing at ${verseKey}`);
    const chars = codePoints(verse.arabicText);
    const spaces = chars.flatMap((char, index) => char === " " ? [index] : []);
    if (spaces.length < 4) throw new Error(`Canonical basmala range cannot be derived at ${verseKey}`);
    // Tanzil carries the basmala as the first four source words. We record its
    // exact source range; no shared/hardcoded basmala string is substituted.
    const endCp = spaces[3];
    ranges.push({ verseKey, kind: "prefix", startCp: 0, endCp, bodyStartCp: endCp + 1 });
  }
  if (ranges.length !== 113) throw new Error(`Expected 113 basmala occurrences, got ${ranges.length}`);
  return ranges;
}

const OPEN = /^\[([a-z]+)(?::\d+)?\[/;

export function parseTajweedMarkup(markup) {
  const characters = [];
  const stack = [];
  let offset = 0;
  while (offset < markup.length) {
    const open = OPEN.exec(markup.slice(offset));
    if (open) {
      stack.push(open[1]);
      offset += open[0].length;
      continue;
    }
    if (markup[offset] === "[") { stack.push(null); offset += 1; continue; }
    if (markup[offset] === "]") { if (stack.length) stack.pop(); offset += 1; continue; }
    const point = markup.codePointAt(offset);
    const char = String.fromCodePoint(point);
    let rule = null;
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (stack[i] !== null) { rule = stack[i]; break; }
    }
    characters.push({ char, rule, cpIndex: characters.length });
    offset += char.length;
  }
  return characters;
}

function isSeparator(char) {
  return char === "\u200c" || /\s/u.test(char);
}

// Tanzil's plain-text format writes these Quranic pause/annotation signs as
// standalone space-delimited "words", while the AlQuran.cloud tajweed source
// glues them onto the preceding letter with no separating space. They carry
// no tajweed rule of their own in either source, so for alignment purposes
// only (never for the stored canonical text) a lone sign token is folded
// into the previous token, matching the source's grouping.
const QURANIC_ANNOTATION_MARKS = new Set([
  "\u06d6", "\u06d7", "\u06d8", "\u06d9", "\u06da", "\u06db", "\u06dc", "\u06de", "\u06e9",
]);

function mergeStandaloneAnnotationTokens(tokens) {
  const merged = [];
  for (const token of tokens) {
    const isLoneAnnotationMark = token.items.length === 1 && QURANIC_ANNOTATION_MARKS.has(token.items[0].char);
    if (isLoneAnnotationMark && merged.length) {
      merged[merged.length - 1].items.push(token.items[0]);
    } else {
      merged.push(token);
    }
  }
  return merged;
}

function tokenize(characters) {
  const tokens = [];
  let token = null;
  for (const item of characters) {
    if (isSeparator(item.char)) {
      if (token) { tokens.push(token); token = null; }
      continue;
    }
    if (!token) token = { items: [] };
    token.items.push(item);
  }
  if (token) tokens.push(token);
  return mergeStandaloneAnnotationTokens(tokens);
}

function matchingChar(char) {
  if (char === "\u0672") return "\u0670";
  if (char === "\u066e") return "\u0649";
  // U+06DF ARABIC SMALL HIGH ROUNDED ZERO is Tanzil's mark for a written-but-
  // silent letter (e.g. the alif in "...\u0648\u0627\u06df"); AlQuran.cloud's tajweed
  // source marks the same silent position with the plain U+0652 SUKUN. Both
  // denote "no vowel sound here" for the same letter, not a different rule.
  if (char === "\u06df") return "\u0652";
  return char;
}

function isMark(char) {
  return /^\p{Mark}$/u.test(char);
}

// Tanzil sometimes spells a hamza using the decomposed Uthmani convention —
// a tatweel carrying the hamza mark, immediately followed by its bare "seat"
// letter (alif/waw/ya) — while AlQuran.cloud's tajweed source always uses the
// single precomposed hamza letter for the same word. Both denote the exact
// same letter; this is a documented Unicode/Uthmani-orthography equivalence
// (U+0623 etc. canonically decompose to seat+hamza-mark), not a tajweed
// judgment call. Only a tatweel-carried hamza mark immediately followed by a
// bare, unmarked seat letter is merged — anything else (already-precomposed
// letters, a seat letter carrying its own marks, no seat letter at all) is
// left untouched and falls back to the existing conservative "unmatched"
// handling.
const HAMZA_ABOVE = "ٔ";
const HAMZA_BELOW = "ٕ";
const HAMZA_SEAT_PRECOMPOSED = {
  [HAMZA_ABOVE]: { "ا": "أ", "و": "ؤ", "ى": "ئ", "ي": "ئ" },
  [HAMZA_BELOW]: { "ا": "إ" },
};

function mergeDecomposedHamzaClusters(clusters) {
  const merged = [];
  for (let index = 0; index < clusters.length; index += 1) {
    const cluster = clusters[index];
    const next = clusters[index + 1];
    const hamzaMark = cluster.items.find((item) => item.char === HAMZA_ABOVE || item.char === HAMZA_BELOW);
    const seatMap = hamzaMark && HAMZA_SEAT_PRECOMPOSED[hamzaMark.char];
    const precomposed = seatMap && next && next.items.length === 1 && seatMap[next.items[0].char];
    if (cluster.items[0].char === "ـ" && precomposed) {
      const hareke = cluster.items
        .filter((item) => item !== hamzaMark && item.char !== "ـ")
        .map((item) => matchingChar(item.char))
        .join("");
      merged.push({ items: [...cluster.items, ...next.items], key: precomposed + hareke });
      index += 1; // consume the seat-letter cluster too
      continue;
    }
    merged.push(cluster);
  }
  return merged;
}

function clustersFor(items) {
  const clusters = [];
  for (const item of items) {
    if (isMark(item.char) && clusters.length) {
      clusters[clusters.length - 1].items.push(item);
    } else {
      clusters.push({ items: [item] });
    }
  }
  return mergeDecomposedHamzaClusters(clusters).map((cluster) => ({
    items: cluster.items,
    key: cluster.key ?? cluster.items.map((item) => matchingChar(item.char)).join(""),
    // Positions are derived from each item's own source cpIndex rather than
    // an offset relative to the token start, so alignment stays correct even
    // when mergeStandaloneAnnotationTokens() has folded a non-adjacent
    // annotation-mark token into this one (see tokenize()).
    startCp: cluster.items[0].cpIndex,
    endCp: cluster.items[cluster.items.length - 1].cpIndex + 1,
  }));
}

function tokenKey(token) {
  // Built from the same cluster keys used for the detailed comparison below
  // (including the decomposed-hamza merge), so this early whole-token check
  // can't reject a token pair that the cluster-level comparison would accept.
  return clustersFor(token.items).map((cluster) => cluster.key).join("");
}

function knownRuleClusters(tokens) {
  return tokens.reduce((count, token) => count + clustersFor(token.items).filter((cluster) =>
    cluster.items.some((item) => item.rule && TAJWEED_RULE_COLORS[item.rule]),
  ).length, 0);
}

function fullTokenRange(token, reason) {
  return {
    startCp: token.items[0].cpIndex,
    endCp: token.items[token.items.length - 1].cpIndex + 1,
    reason,
  };
}

export function alignTajweedSpans(canonicalText, tajweedMarkup) {
  const canonicalItems = codePoints(canonicalText).map((char, cpIndex) => ({ char, rule: null, cpIndex }));
  const sourceItems = parseTajweedMarkup(tajweedMarkup);
  const canonicalTokens = tokenize(canonicalItems);
  const sourceTokens = tokenize(sourceItems);
  const spans = [];
  const uncoloredRanges = [];
  let matchedTokens = 0;
  let unmatchedTokens = 0;
  let ambiguousClusters = 0;
  const ruleClusters = knownRuleClusters(sourceTokens);
  let mappedRuleClusters = 0;

  if (canonicalTokens.length !== sourceTokens.length) {
    if (canonicalItems.length) uncoloredRanges.push({ startCp: 0, endCp: canonicalItems.length, reason: "token-count-mismatch" });
    return { spans, uncoloredRanges, matchedTokens, unmatchedTokens: canonicalTokens.length, ambiguousClusters, ruleClusters, mappedRuleClusters, tokenCountMismatch: true };
  }

  for (let tokenIndex = 0; tokenIndex < canonicalTokens.length; tokenIndex += 1) {
    const canonicalToken = canonicalTokens[tokenIndex];
    const sourceToken = sourceTokens[tokenIndex];
    if (tokenKey(canonicalToken) !== tokenKey(sourceToken)) {
      unmatchedTokens += 1;
      uncoloredRanges.push(fullTokenRange(canonicalToken, "unmatched-token"));
      continue;
    }
    const canonicalClusters = clustersFor(canonicalToken.items);
    const sourceClusters = clustersFor(sourceToken.items);
    if (canonicalClusters.length !== sourceClusters.length || canonicalClusters.some((cluster, index) => cluster.key !== sourceClusters[index].key)) {
      unmatchedTokens += 1;
      uncoloredRanges.push(fullTokenRange(canonicalToken, "unmatched-token"));
      continue;
    }
    matchedTokens += 1;
    for (let clusterIndex = 0; clusterIndex < canonicalClusters.length; clusterIndex += 1) {
      const canonicalCluster = canonicalClusters[clusterIndex];
      const sourceCluster = sourceClusters[clusterIndex];
      // Quranic annotation marks (waqf/pause signs) carry no tajweed rule of
      // their own; when one has been merged onto a letter's cluster (see
      // mergeStandaloneAnnotationTokens), ignore it here so it cannot turn an
      // otherwise-unambiguous letter into a falsely "ambiguous" cluster.
      const ruleBearingItems = sourceCluster.items.filter((item) => !QURANIC_ANNOTATION_MARKS.has(item.char));
      const rules = new Set((ruleBearingItems.length ? ruleBearingItems : sourceCluster.items).map((item) => item.rule));
      if (rules.size !== 1) {
        ambiguousClusters += 1;
        uncoloredRanges.push({
          startCp: canonicalCluster.startCp,
          endCp: canonicalCluster.endCp,
          reason: "ambiguous-cluster",
        });
        continue;
      }
      const [rule] = rules;
      if (!rule || !TAJWEED_RULE_COLORS[rule]) continue;
      const startCp = canonicalCluster.startCp;
      const endCp = canonicalCluster.endCp;
      mappedRuleClusters += 1;
      const last = spans[spans.length - 1];
      if (last && last.rule === rule && last.endCp === startCp) last.endCp = endCp;
      else spans.push({ startCp, endCp, rule, color: TAJWEED_RULE_COLORS[rule] });
    }
  }
  return { spans, uncoloredRanges, matchedTokens, unmatchedTokens, ambiguousClusters, ruleClusters, mappedRuleClusters, tokenCountMismatch: false };
}

function readTajweedMarkup(dbPath, verseKeys) {
  if (!fs.existsSync(dbPath)) return new Map();
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const columns = db.prepare("PRAGMA table_info(verses)").all();
    if (!columns.some((column) => column.name === "arabic_tajweed")) return new Map();
    const rows = db.prepare("SELECT verse_key, arabic_tajweed FROM verses WHERE arabic_tajweed IS NOT NULL AND arabic_tajweed <> ''").all();
    const allowed = new Set(verseKeys);
    return new Map(rows.filter((row) => allowed.has(String(row.verse_key))).map((row) => [String(row.verse_key), String(row.arabic_tajweed)]));
  } finally {
    db.close();
  }
}

function compareVersePosition(left, right) {
  if (left.surahId !== right.surahId) return left.surahId - right.surahId;
  return left.ayahNumber - right.ayahNumber;
}

function pageForVerse(pageStarts, surahId, ayahNumber) {
  const target = { surahId, ayahNumber };
  let low = 0;
  let high = pageStarts.length - 1;
  let answer = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const [pageSurah, pageAyah] = pageStarts[middle];
    if (compareVersePosition({ surahId: pageSurah, ayahNumber: pageAyah }, target) <= 0) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return answer + 1;
}

function aggregateCoverage(diagnostics, keyOf) {
  const groups = new Map();
  for (const item of diagnostics) {
    if (item.unmatchedTokens === 0 && item.ambiguousClusters === 0) continue;
    const key = keyOf(item);
    const group = groups.get(key) ?? { key, affectedVerses: 0, unmatchedTokens: 0, ambiguousClusters: 0, impact: 0 };
    group.affectedVerses += 1;
    group.unmatchedTokens += item.unmatchedTokens;
    group.ambiguousClusters += item.ambiguousClusters;
    group.impact += item.unmatchedTokens + item.ambiguousClusters;
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) =>
    right.impact - left.impact || right.affectedVerses - left.affectedVerses || Number(left.key) - Number(right.key),
  );
}

// AlQuran.cloud's per-ayah tajweed source structurally excludes the basmala
// prefix for every surah-opening ayah that carries one (Tanzil embeds it as
// the verse's first four words instead). There is no tajweed rule data for
// that prefix in this source at all, so it is aligned separately against
// only the ayah body (using the already-verified basmala range) and the
// prefix itself is always reported uncolored — never guessed.
export function alignVerseTajweed(verseText, markup, basmalaRange) {
  if (!basmalaRange || basmalaRange.kind !== "prefix") {
    return alignTajweedSpans(verseText, markup);
  }
  const chars = codePoints(verseText);
  const offset = basmalaRange.bodyStartCp;
  const bodyText = chars.slice(offset).join("");
  const aligned = alignTajweedSpans(bodyText, markup);
  return {
    spans: aligned.spans.map((span) => ({ ...span, startCp: span.startCp + offset, endCp: span.endCp + offset })),
    uncoloredRanges: [
      { startCp: 0, endCp: offset, reason: "basmala-prefix-not-in-tajweed-source" },
      ...aligned.uncoloredRanges.map((range) => ({ ...range, startCp: range.startCp + offset, endCp: range.endCp + offset })),
    ],
    matchedTokens: aligned.matchedTokens,
    unmatchedTokens: aligned.unmatchedTokens,
    ambiguousClusters: aligned.ambiguousClusters,
    ruleClusters: aligned.ruleClusters,
    mappedRuleClusters: aligned.mappedRuleClusters,
    tokenCountMismatch: aligned.tokenCountMismatch,
  };
}

export function buildRuntimeData({ dbPath = LOCAL_DB_PATH } = {}) {
  const source = readCanonicalSource();
  const basmalaRanges = buildBasmalaRanges(source.verses);
  const basmalaByKey = new Map(basmalaRanges.map((range) => [range.verseKey, range]));
  const tajweedMarkup = readTajweedMarkup(dbPath, source.verses.map((verse) => verse.verseKey));
  const pageStarts = JSON.parse(fs.readFileSync(MUSHAF_PAGE_DATA_PATH, "utf8")).sayfaBaslangiclari;
  const tajweedVerses = [];
  const tajweedDiagnostics = [];
  const totals = {
    sourceVerses: tajweedMarkup.size, mappedVerses: 0, spans: 0,
    matchedTokens: 0, unmatchedTokens: 0, ambiguousClusters: 0,
    ruleClusters: 0, mappedRuleClusters: 0, tokenCountMismatchVerses: 0,
  };
  for (const verse of source.verses) {
    const markup = tajweedMarkup.get(verse.verseKey);
    const aligned = markup ? alignVerseTajweed(verse.arabicText, markup, basmalaByKey.get(verse.verseKey)) : {
      spans: [], uncoloredRanges: [{ startCp: 0, endCp: codePoints(verse.arabicText).length, reason: "missing-source" }],
      matchedTokens: 0, unmatchedTokens: codePoints(verse.arabicText).length,
      ambiguousClusters: 0, ruleClusters: 0, mappedRuleClusters: 0, tokenCountMismatch: false,
    };
    if (aligned.spans.length) totals.mappedVerses += 1;
    totals.spans += aligned.spans.length;
    totals.matchedTokens += aligned.matchedTokens;
    totals.unmatchedTokens += aligned.unmatchedTokens;
    totals.ambiguousClusters += aligned.ambiguousClusters;
    totals.ruleClusters += aligned.ruleClusters;
    totals.mappedRuleClusters += aligned.mappedRuleClusters;
    if (aligned.tokenCountMismatch) totals.tokenCountMismatchVerses += 1;
    tajweedVerses.push({ verseKey: verse.verseKey, spans: aligned.spans });
    tajweedDiagnostics.push({
      verseKey: verse.verseKey,
      surahId: verse.surahId,
      ayahNumber: verse.ayahNumber,
      page: pageForVerse(pageStarts, verse.surahId, verse.ayahNumber),
      status: aligned.spans.length ? "mapped" : aligned.tokenCountMismatch ? "token-count-mismatch" : aligned.ruleClusters === 0 ? "no-rule-clusters" : "unmapped-rule-clusters",
      spanCount: aligned.spans.length,
      matchedTokens: aligned.matchedTokens,
      unmatchedTokens: aligned.unmatchedTokens,
      ambiguousClusters: aligned.ambiguousClusters,
      ruleClusters: aligned.ruleClusters,
      mappedRuleClusters: aligned.mappedRuleClusters,
      uncoloredRanges: aligned.uncoloredRanges,
    });
  }
  const statuses = ["mapped", "token-count-mismatch", "no-rule-clusters", "unmapped-rule-clusters"];
  const statusCounts = Object.fromEntries(statuses.map((status) => [
    status, tajweedDiagnostics.filter((item) => item.status === status).length,
  ]));
  const unmatchedTokenVerses = tajweedDiagnostics.filter((item) => item.unmatchedTokens > 0).length;
  const ambiguousClusterVerses = tajweedDiagnostics.filter((item) => item.ambiguousClusters > 0).length;
  const affectedVerses = tajweedDiagnostics.filter((item) => item.unmatchedTokens > 0 || item.ambiguousClusters > 0).length;
  const coverage = {
    definition: "mapped recognized tajweed-rule grapheme clusters / all recognized tajweed-rule grapheme clusters in the rule source",
    mappedRuleClusters: totals.mappedRuleClusters,
    ruleClusters: totals.ruleClusters,
    percent: totals.ruleClusters === 0 ? 100 : Number((totals.mappedRuleClusters * 100 / totals.ruleClusters).toFixed(4)),
    verseSpanCoveragePercent: Number((totals.mappedVerses * 100 / source.verses.length).toFixed(4)),
    tokenAlignmentPercent: Number((totals.matchedTokens * 100 / (totals.matchedTokens + totals.unmatchedTokens)).toFixed(4)),
  };
  const coverageSummary = {
    statusCounts,
    unmatchedTokenVerses,
    ambiguousClusterVerses,
    affectedVerses,
    topSurahs: aggregateCoverage(tajweedDiagnostics, (item) => item.surahId),
    topPages: aggregateCoverage(tajweedDiagnostics, (item) => item.page),
    coverage,
  };
  const textOnlySha256 = sha256(Buffer.from(source.verses.map((verse) => verse.arabicText).join("\n"), "utf8"));
  return { source, basmalaRanges, tajweedVerses, tajweedDiagnostics, coverageSummary, totals, textOnlySha256 };
}

function writeJson(fileName, value) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(path.join(GENERATED_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeGeneratedRuntime(runtime) {
  writeJson("verses.json", runtime.source.verses);
  writeJson("basmala-ranges.json", {
    sourceSha256: runtime.source.sourceSha256,
    coordinateSystem: "unicode-code-point-half-open",
    ranges: runtime.basmalaRanges,
  });
  writeJson("tajweed-spans.json", {
    canonicalSourceSha256: runtime.source.sourceSha256,
    source: "AlQuran.cloud quran-tajweed (rules only; source text is never rendered or copied into canonical text)",
    coordinateSystem: "unicode-code-point-half-open",
    ambiguityPolicy: "unmatched words and mixed-rule grapheme clusters are left uncolored",
    totals: runtime.totals,
    verses: runtime.tajweedVerses,
  });
  writeJson("tajweed-coverage.json", {
    canonicalSourceSha256: runtime.source.sourceSha256,
    coordinateSystem: "unicode-code-point-half-open",
    failurePolicy: "Every failed token or ambiguous cluster is emitted as an uncolored range. Generated color spans must never overlap these ranges.",
    totals: runtime.totals,
    summary: runtime.coverageSummary,
    verses: runtime.tajweedDiagnostics,
  });
  writeJson("build-manifest.json", {
    source: runtime.source.manifest.id,
    sourceSha256: runtime.source.sourceSha256,
    verseCount: runtime.source.verses.length,
    reconstructedSourceSha256: sha256(sourceRowsToBytes(runtime.source.verses, runtime.source.sourceSuffix)),
    textOnlySha256: runtime.textOnlySha256,
    generatedFiles: ["verses.json", "basmala-ranges.json", "tajweed-spans.json", "tajweed-coverage.json"],
    unicodePolicy: "No normalization, replacement, sanitization, trimming, or combining-mark reordering is applied to Quran text.",
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function applyLocalDatabase(runtime, dbPath = LOCAL_DB_PATH) {
  if (!fs.existsSync(dbPath)) throw new Error(`Local database not found: ${dbPath}`);
  const backupPath = path.join(ROOT, "backups", `app-before-quran-uthmani-1.1-${timestamp()}.db`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(dbPath, backupPath);

  const db = new DatabaseSync(dbPath);
  let oldDifferent = 0;
  try {
    const existing = new Map(db.prepare("SELECT verse_key, arabic_text FROM verses ORDER BY surah_id, ayah_number").all().map((row) => [String(row.verse_key), row.arabic_text == null ? null : String(row.arabic_text)]));
    if (existing.size !== EXPECTED_VERSE_COUNT) throw new Error(`Local DB has ${existing.size} verses; expected ${EXPECTED_VERSE_COUNT}`);
    oldDifferent = runtime.source.verses.filter((verse) => existing.get(verse.verseKey) !== verse.arabicText).length;

    db.exec("BEGIN IMMEDIATE");
    db.exec(`
      CREATE TABLE IF NOT EXISTS quran_verse_metadata (
        verse_key TEXT PRIMARY KEY,
        basmala_kind TEXT,
        basmala_start_cp INTEGER,
        basmala_end_cp INTEGER,
        body_start_cp INTEGER
      );
      CREATE TABLE IF NOT EXISTS tajweed_spans (
        id INTEGER PRIMARY KEY,
        verse_key TEXT NOT NULL,
        start_cp INTEGER NOT NULL,
        end_cp INTEGER NOT NULL,
        rule TEXT NOT NULL,
        color TEXT NOT NULL,
        confidence TEXT NOT NULL DEFAULT 'exact-codepoint-grapheme'
      );
      CREATE INDEX IF NOT EXISTS idx_tajweed_spans_verse ON tajweed_spans(verse_key, start_cp);
      CREATE TABLE IF NOT EXISTS quran_runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      DELETE FROM quran_verse_metadata;
      DELETE FROM tajweed_spans;
      DELETE FROM quran_runtime_meta;
    `);
    const updateVerse = db.prepare("UPDATE verses SET arabic_text = ? WHERE verse_key = ?");
    for (const verse of runtime.source.verses) {
      const result = updateVerse.run(verse.arabicText, verse.verseKey);
      if (result.changes !== 1) throw new Error(`Local DB update failed for ${verse.verseKey}`);
    }
    const insertMetadata = db.prepare("INSERT INTO quran_verse_metadata (verse_key, basmala_kind, basmala_start_cp, basmala_end_cp, body_start_cp) VALUES (?, ?, ?, ?, ?)");
    for (const range of runtime.basmalaRanges) insertMetadata.run(range.verseKey, range.kind, range.startCp, range.endCp, range.bodyStartCp);
    const insertSpan = db.prepare("INSERT INTO tajweed_spans (verse_key, start_cp, end_cp, rule, color, confidence) VALUES (?, ?, ?, ?, ?, ?)");
    for (const verse of runtime.tajweedVerses) for (const span of verse.spans) insertSpan.run(verse.verseKey, span.startCp, span.endCp, span.rule, span.color, "exact-codepoint-grapheme");
    const insertMeta = db.prepare("INSERT INTO quran_runtime_meta (key, value) VALUES (?, ?)");
    insertMeta.run("source_sha256", runtime.source.sourceSha256);
    insertMeta.run("verse_count", String(runtime.source.verses.length));
    insertMeta.run("text_only_sha256", runtime.textOnlySha256);
    db.exec("COMMIT");

    const dbRows = db.prepare("SELECT verse_key, surah_id, ayah_number, arabic_text FROM verses ORDER BY surah_id, ayah_number").all().map((row) => ({ verseKey: String(row.verse_key), surahId: Number(row.surah_id), ayahNumber: Number(row.ayah_number), arabicText: String(row.arabic_text) }));
    const mismatches = runtime.source.verses.filter((verse, index) => {
      const row = dbRows[index];
      return !row || row.verseKey !== verse.verseKey || row.arabicText !== verse.arabicText || Buffer.compare(Buffer.from(row.arabicText, "utf8"), Buffer.from(verse.arabicText, "utf8")) !== 0 || codePoints(row.arabicText).join("|") !== codePoints(verse.arabicText).join("|");
    });
    const reconstructedSha256 = sha256(sourceRowsToBytes(dbRows, runtime.source.sourceSuffix));
    if (mismatches.length || reconstructedSha256 !== runtime.source.sourceSha256) {
      throw new Error(`Post-migration verification failed: mismatches=${mismatches.length} sha=${reconstructedSha256}`);
    }
    return { backupPath, oldDifferent, newDifferent: 0, reconstructedSha256 };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    db.close();
  }
}

async function main() {
  if (process.argv.includes("--production") || process.argv.includes("--turso")) {
    throw new Error("This builder is local-only and intentionally has no production/Turso write path.");
  }
  const runtime = buildRuntimeData();
  writeGeneratedRuntime(runtime);
  let local = null;
  if (process.argv.includes("--apply-local")) local = applyLocalDatabase(runtime);
  console.log(JSON.stringify({
    sourcePath: path.relative(ROOT, SOURCE_PATH).replaceAll("\\", "/"),
    sourceSha256: runtime.source.sourceSha256,
    verseCount: runtime.source.verses.length,
    reconstructedSourceSha256: sha256(sourceRowsToBytes(runtime.source.verses, runtime.source.sourceSuffix)),
    basmalaRanges: runtime.basmalaRanges.length,
    tajweed: runtime.totals,
    generatedDirectory: path.relative(ROOT, GENERATED_DIR).replaceAll("\\", "/"),
    local,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
