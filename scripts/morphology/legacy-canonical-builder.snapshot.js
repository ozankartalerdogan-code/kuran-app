const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA2_DIR = path.join(ROOT_DIR, "data2");
const PROCESSED_DIR = path.join(DATA2_DIR, "processed");
const REPORT_DIR = path.join(PROCESSED_DIR, "reports");

const PATHS = {
  quranJsonChapterDir: path.join(DATA2_DIR, "quran-json", "dist", "chapters"),
  activeMorphology: path.join(DATA_DIR, "word-analysis", "quran-morphology.txt"),
  corpusMorphology: path.join(DATA2_DIR, "corpus-morphology.txt"),
  data2Morphology: path.join(DATA2_DIR, "quran-morphology", "quran-morphology.txt"),
  wordTranslations: path.join(DATA_DIR, "word-analysis", "word-translations-tr.json"),
  rootExplanations: path.join(DATA_DIR, "word-analysis", "extended-roots.json"),
  quranNlpDictionary: path.join(
    DATA2_DIR,
    "QURAN-NLP",
    "data",
    "quran",
    "corpus",
    "quran_dictionary.csv"
  ),
  output: path.join(PROCESSED_DIR, "canonical_word_analysis.json"),
  coverageReport: path.join(REPORT_DIR, "canonical_word_analysis_coverage.json"),
  missingReport: path.join(REPORT_DIR, "canonical_word_analysis_missing.json"),
  conflictReport: path.join(REPORT_DIR, "canonical_word_analysis_conflicts.json")
};

const FIELD_NAMES = [
  "arabic",
  "lemma",
  "root",
  "pos",
  "role",
  "morphology",
  "meaning_tr",
  "root_explanation_tr",
  "gloss_en"
];

const SOURCE_LABELS = {
  quranJson: "data2/quran-json",
  activeMorphology: "data/word-analysis/quran-morphology.txt",
  corpusMorphology: "data2/corpus-morphology.txt",
  data2Morphology: "data2/quran-morphology/quran-morphology.txt",
  wordTranslations: "data/word-analysis/word-translations-tr.json",
  rootExplanations: "data/word-analysis/extended-roots.json",
  quranNlpDictionary: "data2/QURAN-NLP/data/quran/corpus/quran_dictionary.csv"
};

function parseArgs(argv) {
  const options = {
    surah: 1,
    ayah: 1,
    all: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--all") {
      options.all = true;
    } else if (arg === "--surah") {
      options.surah = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--ayah") {
      options.ayah = Number(argv[index + 1]);
      index += 1;
    }
  }

  if (!options.all && (!Number.isInteger(options.surah) || !Number.isInteger(options.ayah))) {
    throw new Error("Use numeric --surah and --ayah values, or pass --all.");
  }

  return options;
}

function verseKey(surah, ayah) {
  return `${surah}:${ayah}`;
}

function wordKey(surah, ayah, position) {
  return `${surah}:${ayah}:${position}`;
}

function parseLocation(rawLocation) {
  const parts = String(rawLocation || "")
    .replace(/[()]/g, "")
    .trim()
    .split(":")
    .map(Number);

  if (parts.length < 3 || parts.some((part) => !Number.isInteger(part))) {
    return null;
  }

  return {
    surah: parts[0],
    ayah: parts[1],
    word: parts[2],
    segment: parts[3] ?? null
  };
}

function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);

  return fields;
}

function suspiciousScore(value) {
  return (value.match(/[ÃƒÃ‚Ã…Ã„Ã˜Ã™ÃÃ‘\uFFFD]/g) ?? []).length;
}

function repairText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let current = String(value)
    .replace(/^\uFEFF/u, "")
    .replace(/\u00A0/g, " ")
    .trim()
    .normalize("NFC");

  if (!current) {
    return "";
  }

  let best = current;
  let bestScore = suspiciousScore(best);

  for (let iteration = 0; iteration < 3; iteration += 1) {
    if (bestScore === 0) {
      break;
    }

    const decoded = Buffer.from(current, "latin1").toString("utf8").trim().normalize("NFC");
    const decodedScore = suspiciousScore(decoded);

    if (!decoded || decoded === current || decodedScore >= bestScore) {
      break;
    }

    best = decoded;
    bestScore = decodedScore;
    current = decoded;
  }

  return best;
}

function normalizeLookupKey(value) {
  const repaired = repairText(value);

  if (!repaired) {
    return "";
  }

  return repaired
    .replace(/[\u0640]/g, "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .trim()
    .normalize("NFC");
}

function readFeature(features, prefix) {
  return (
    String(features || "")
      .split("|")
      .find((feature) => feature.startsWith(prefix))
      ?.slice(prefix.length) ?? ""
  );
}

function parseMorphologyLine(line, source) {
  const trimmed = line.trim();

  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed === "LOCATION\tFORM\tTAG\tFEATURES"
  ) {
    return null;
  }

  const [rawLocation, rawForm = "", rawTag = "", rawFeatures = ""] = trimmed.split("\t");
  const location = parseLocation(rawLocation);

  if (location === null || location.segment === null) {
    return null;
  }

  const features = repairText(rawFeatures);

  return {
    ...location,
    source,
    form: repairText(rawForm),
    tag: repairText(rawTag),
    features,
    lemma: repairText(readFeature(features, "LEM:")),
    root: repairText(readFeature(features, "ROOT:"))
  };
}

async function loadMorphologyMap(filePath, source, filter) {
  const content = await fs.readFile(filePath, "utf8");
  const map = new Map();
  const stats = {
    source,
    rows: 0,
    parsedRows: 0,
    words: new Set(),
    ayahs: new Set()
  };

  for (const line of content.split(/\r?\n/u)) {
    const entry = parseMorphologyLine(line, source);

    if (entry === null) {
      continue;
    }

    stats.rows += 1;

    if (!filter(entry.surah, entry.ayah)) {
      continue;
    }

    stats.parsedRows += 1;
    stats.words.add(wordKey(entry.surah, entry.ayah, entry.word));
    stats.ayahs.add(verseKey(entry.surah, entry.ayah));

    const key = wordKey(entry.surah, entry.ayah, entry.word);
    const group = map.get(key) ?? [];
    group.push(entry);
    map.set(key, group);
  }

  return {
    map,
    stats: {
      source,
      rows: stats.rows,
      parsedRows: stats.parsedRows,
      words: stats.words.size,
      ayahs: stats.ayahs.size
    }
  };
}

async function loadQuranJsonVerses(options) {
  const verses = [];
  const targetSurahs = options.all ? [...Array(114)].map((_, index) => index + 1) : [options.surah];

  for (const surah of targetSurahs) {
    const chapter = JSON.parse(
      await fs.readFile(path.join(PATHS.quranJsonChapterDir, `${surah}.json`), "utf8")
    );

    for (const verse of chapter.verses) {
      const ayah = Number(verse.id);

      if (!options.all && ayah !== options.ayah) {
        continue;
      }

      verses.push({
        surah,
        ayah,
        key: verseKey(surah, ayah),
        words: String(verse.text || "")
          .split(/\s+/u)
          .filter(Boolean)
      });
    }
  }

  return verses;
}

async function loadQuranNlpDictionary(filter) {
  const content = await fs.readFile(PATHS.quranNlpDictionary, "utf8");
  const rows = content.split(/\r?\n/u).slice(1);
  const map = new Map();
  const stats = {
    rows: 0,
    matchedRows: 0,
    words: new Set(),
    ayahs: new Set()
  };

  for (const row of rows) {
    if (!row.trim()) {
      continue;
    }

    stats.rows += 1;
    const fields = splitCsvLine(row);
    const location = parseLocation(fields[3]);

    if (location === null || !filter(location.surah, location.ayah)) {
      continue;
    }

    const key = wordKey(location.surah, location.ayah, location.word);
    map.set(key, {
      lemma: repairText(fields[1]),
      gloss_en: repairText(fields[5]),
      arabic: repairText(fields[7])
    });
    stats.matchedRows += 1;
    stats.words.add(key);
    stats.ayahs.add(verseKey(location.surah, location.ayah));
  }

  return {
    map,
    stats: {
      rows: stats.rows,
      matchedRows: stats.matchedRows,
      words: stats.words.size,
      ayahs: stats.ayahs.size
    }
  };
}

function addLookupVariants(map, rawKey, rawValue) {
  const key = normalizeLookupKey(rawKey);
  const value = repairText(rawValue);

  if (key && value && !map.has(key)) {
    map.set(key, value);
  }
}

async function loadMeaningLookups() {
  const [translationFile, rootFile] = await Promise.all([
    fs.readFile(PATHS.wordTranslations, "utf8"),
    fs.readFile(PATHS.rootExplanations, "utf8")
  ]);
  const dictionary = JSON.parse(translationFile);
  const rootDictionary = JSON.parse(rootFile);
  const translations = new Map();
  const rootMeanings = new Map();
  const rootExplanations = new Map();

  for (const [key, value] of Object.entries(dictionary.translations ?? {})) {
    addLookupVariants(translations, key, value);
  }

  for (const [key, value] of Object.entries(dictionary.rootMeanings ?? {})) {
    addLookupVariants(rootMeanings, key, value);
  }

  for (const [key, value] of Object.entries(rootDictionary ?? {})) {
    addLookupVariants(rootExplanations, key, value);
  }

  return {
    translations,
    rootMeanings,
    rootExplanations,
    stats: {
      translations: Object.keys(dictionary.translations ?? {}).length,
      rootMeanings: Object.keys(dictionary.rootMeanings ?? {}).length,
      rootExplanations: Object.keys(rootDictionary ?? {}).length
    }
  };
}

function shouldSuppressRoot(rootValue, segment) {
  const normalizedRoot = repairText(rootValue);

  if (!normalizedRoot || normalizedRoot === "Any" || normalizedRoot === "أني") {
    return true;
  }

  const featureParts = String(segment?.features || "").split("|");
  return segment?.tag === "INTG" || featureParts.includes("INTG") || featureParts.includes("POS:INTG");
}

function toRole(tag, features) {
  const featureParts = String(features || "").split("|");

  if (tag === "V") {
    return "verb";
  }

  if (tag === "P" || featureParts.includes("P") || featureParts.includes("PREF")) {
    return "particle";
  }

  if (featureParts.includes("PRON") || featureParts.includes("REL")) {
    return "pronoun";
  }

  if (featureParts.includes("ADJ") || tag === "ADJ") {
    return "adjective";
  }

  if (featureParts.includes("ADV")) {
    return "adverb";
  }

  if (tag === "N" || tag === "PN") {
    return "noun";
  }

  return tag ? "unknown" : "";
}

function uniqueJoin(values, separator = "+") {
  return [...new Set(values.filter((value) => value && value.trim()))].join(separator);
}

function stemOrFirst(segments) {
  return (
    segments.find((segment) => segment.root) ??
    segments.find((segment) => segment.features.split("|").includes("STEM")) ??
    segments.find((segment) => !["P", "DET"].includes(segment.tag)) ??
    segments.find((segment) => segment.lemma || segment.root) ??
    segments[0] ??
    null
  );
}

function firstField(candidates, conflicts, fieldName, key) {
  const valid = candidates.filter((candidate) => candidate.value);
  const selected = valid[0] ?? { value: "", source: "" };

  for (const candidate of valid.slice(1)) {
    if (candidate.value !== selected.value && candidate.representation === selected.representation) {
      conflicts.push({
        key,
        field: fieldName,
        kept: selected.value,
        keptSource: selected.source,
        candidate: candidate.value,
        candidateSource: candidate.source
      });
    }
  }

  return selected;
}

function matchMeaning(lookups, candidates) {
  const normalizedCandidates = candidates
    .map((candidate) => normalizeLookupKey(candidate))
    .filter(Boolean);

  for (const key of normalizedCandidates) {
    const matched = lookups.translations.get(key) ?? lookups.rootMeanings.get(key);

    if (matched) {
      return matched;
    }
  }

  return "";
}

function matchRootExplanation(lookups, root) {
  const key = normalizeLookupKey(root);

  return key ? lookups.rootExplanations.get(key) ?? "" : "";
}

function buildMorphologyString(segments) {
  return segments
    .map((segment) =>
      [segment.segment, segment.tag, segment.features].filter((value) => value !== "").join(":")
    )
    .join(" | ");
}

function buildCanonicalWord({ verse, position, sources, lookups, conflicts }) {
  const key = wordKey(verse.surah, verse.ayah, position);
  const activeSegments = sources.activeMorphology.get(key) ?? [];
  const corpusSegments = sources.corpusMorphology.get(key) ?? [];
  const data2Segments = sources.data2Morphology.get(key) ?? [];
  const dictionaryEntry = sources.quranNlpDictionary.get(key) ?? {};
  const activeStem = stemOrFirst(activeSegments);
  const corpusStem = stemOrFirst(corpusSegments);
  const data2Stem = stemOrFirst(data2Segments);
  const arabic = {
    value: verse.words[position - 1] ?? "",
    source: SOURCE_LABELS.quranJson
  };
  const lemma = firstField(
    [
      {
        value: activeStem?.lemma ?? "",
        source: SOURCE_LABELS.activeMorphology,
        representation: "arabic"
      },
      {
        value: data2Stem?.lemma ?? "",
        source: SOURCE_LABELS.data2Morphology,
        representation: "arabic"
      },
      {
        value: corpusStem?.lemma ?? "",
        source: SOURCE_LABELS.corpusMorphology,
        representation: "buckwalter"
      },
      {
        value: dictionaryEntry.lemma ?? "",
        source: SOURCE_LABELS.quranNlpDictionary,
        representation: "dictionary-title"
      }
    ],
    conflicts,
    "lemma",
    key
  );
  const root = firstField(
    [
      {
        value: shouldSuppressRoot(activeStem?.root ?? "", activeStem) ? "" : activeStem?.root ?? "",
        source: SOURCE_LABELS.activeMorphology,
        representation: "arabic"
      },
      {
        value: shouldSuppressRoot(data2Stem?.root ?? "", data2Stem) ? "" : data2Stem?.root ?? "",
        source: SOURCE_LABELS.data2Morphology,
        representation: "arabic"
      },
      {
        value: shouldSuppressRoot(corpusStem?.root ?? "", corpusStem) ? "" : corpusStem?.root ?? "",
        source: SOURCE_LABELS.corpusMorphology,
        representation: "buckwalter"
      }
    ],
    conflicts,
    "root",
    key
  );
  const pos = firstField(
    [
      {
        value: uniqueJoin(activeSegments.map((segment) => segment.tag)),
        source: SOURCE_LABELS.activeMorphology,
        representation: "tag"
      },
      {
        value: uniqueJoin(data2Segments.map((segment) => segment.tag)),
        source: SOURCE_LABELS.data2Morphology,
        representation: "tag"
      },
      {
        value: uniqueJoin(corpusSegments.map((segment) => segment.tag)),
        source: SOURCE_LABELS.corpusMorphology,
        representation: "tag"
      }
    ],
    conflicts,
    "pos",
    key
  );
  const role = firstField(
    [
      {
        value: activeStem ? toRole(activeStem.tag, activeStem.features) : "",
        source: SOURCE_LABELS.activeMorphology,
        representation: "role"
      },
      {
        value: data2Stem ? toRole(data2Stem.tag, data2Stem.features) : "",
        source: SOURCE_LABELS.data2Morphology,
        representation: "role"
      },
      {
        value: corpusStem ? toRole(corpusStem.tag, corpusStem.features) : "",
        source: SOURCE_LABELS.corpusMorphology,
        representation: "role"
      }
    ],
    conflicts,
    "role",
    key
  );
  const morphology = firstField(
    [
      {
        value: buildMorphologyString(activeSegments),
        source: SOURCE_LABELS.activeMorphology,
        representation: "feature-string"
      },
      {
        value: buildMorphologyString(data2Segments),
        source: SOURCE_LABELS.data2Morphology,
        representation: "feature-string"
      },
      {
        value: buildMorphologyString(corpusSegments),
        source: SOURCE_LABELS.corpusMorphology,
        representation: "feature-string"
      }
    ],
    conflicts,
    "morphology",
    key
  );
  const meaningTrValue = matchMeaning(lookups, [
    activeStem?.lemma,
    activeStem?.root,
    arabic.value,
    lemma.value,
    root.value
  ]);
  const rootExplanationValue = matchRootExplanation(lookups, root.value);
  const glossEn = {
    value: dictionaryEntry.gloss_en ?? "",
    source: dictionaryEntry.gloss_en ? SOURCE_LABELS.quranNlpDictionary : ""
  };
  const word = {
    position,
    arabic: arabic.value,
    lemma: lemma.value,
    root: root.value,
    pos: pos.value,
    role: role.value,
    morphology: morphology.value,
    meaning_tr: meaningTrValue,
    root_explanation_tr: rootExplanationValue,
    gloss_en: glossEn.value,
    sources: {
      arabic: arabic.source,
      lemma: lemma.source,
      root: root.source,
      pos: pos.source,
      role: role.source,
      morphology: morphology.source,
      meaning_tr: meaningTrValue ? SOURCE_LABELS.wordTranslations : "",
      root_explanation_tr: rootExplanationValue ? SOURCE_LABELS.rootExplanations : "",
      gloss_en: glossEn.source
    },
    missing_fields: []
  };

  word.missing_fields = FIELD_NAMES.filter((fieldName) => !word[fieldName]);

  return word;
}

function buildReports(result, sourceStats, meaningStats, conflicts) {
  const coverage = {
    generatedAt: new Date().toISOString(),
    strategy: {
      primaryWordReference: SOURCE_LABELS.quranJson,
      primaryMorphology: SOURCE_LABELS.activeMorphology,
      morphologyFallbacks: [SOURCE_LABELS.data2Morphology, SOURCE_LABELS.corpusMorphology],
      enrichmentSources: [SOURCE_LABELS.wordTranslations, SOURCE_LABELS.rootExplanations, SOURCE_LABELS.quranNlpDictionary],
      overwriteRule: "First high-confidence non-empty source wins; lower-priority sources only fill gaps."
    },
    sourceStats,
    meaningStats,
    totals: {
      ayahs: 0,
      words: 0,
      fields: {}
    },
    sourceUsage: {},
    conflictCount: conflicts.length
  };
  const missing = [];

  for (const fieldName of FIELD_NAMES) {
    coverage.totals.fields[fieldName] = {
      filled: 0,
      missing: 0,
      coverageRatio: 0
    };
    coverage.sourceUsage[fieldName] = {};
  }

  for (const [ayahKey, words] of Object.entries(result)) {
    coverage.totals.ayahs += 1;
    coverage.totals.words += words.length;

    for (const word of words) {
      if (word.missing_fields.length > 0) {
        missing.push({
          key: ayahKey,
          position: word.position,
          missing_fields: word.missing_fields,
          sources: word.sources
        });
      }

      for (const fieldName of FIELD_NAMES) {
        const hasValue = Boolean(word[fieldName]);
        const stats = coverage.totals.fields[fieldName];

        if (hasValue) {
          stats.filled += 1;
        } else {
          stats.missing += 1;
        }

        const source = word.sources[fieldName] || "missing";
        coverage.sourceUsage[fieldName][source] =
          (coverage.sourceUsage[fieldName][source] ?? 0) + 1;
      }
    }
  }

  for (const fieldStats of Object.values(coverage.totals.fields)) {
    fieldStats.coverageRatio =
      coverage.totals.words === 0 ? 0 : fieldStats.filled / coverage.totals.words;
  }

  const conflictSummary = conflicts.reduce((summary, conflict) => {
    const key = `${conflict.field} | ${conflict.keptSource} <> ${conflict.candidateSource}`;
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});

  return {
    coverage,
    missing,
    conflicts: {
      total: conflicts.length,
      summary: conflictSummary,
      sampleLimit: 1000,
      samples: conflicts.slice(0, 1000),
      truncated: conflicts.length > 1000
    }
  };
}

async function buildCanonicalWordAnalysis(options) {
  const filter = options.all
    ? () => true
    : (surah, ayah) => surah === options.surah && ayah === options.ayah;
  const [verses, activeMorphology, corpusMorphology, data2Morphology, quranNlpDictionary, lookups] =
    await Promise.all([
      loadQuranJsonVerses(options),
      loadMorphologyMap(PATHS.activeMorphology, SOURCE_LABELS.activeMorphology, filter),
      loadMorphologyMap(PATHS.corpusMorphology, SOURCE_LABELS.corpusMorphology, filter),
      loadMorphologyMap(PATHS.data2Morphology, SOURCE_LABELS.data2Morphology, filter),
      loadQuranNlpDictionary(filter),
      loadMeaningLookups()
    ]);
  const sources = {
    activeMorphology: activeMorphology.map,
    corpusMorphology: corpusMorphology.map,
    data2Morphology: data2Morphology.map,
    quranNlpDictionary: quranNlpDictionary.map
  };
  const result = {};
  const conflicts = [];

  for (const verse of verses) {
    result[verse.key] = verse.words.map((_, index) =>
      buildCanonicalWord({
        verse,
        position: index + 1,
        sources,
        lookups,
        conflicts
      })
    );
  }

  const reports = buildReports(
    result,
    {
      quranJson: {
        ayahs: verses.length,
        words: verses.reduce((sum, verse) => sum + verse.words.length, 0)
      },
      activeMorphology: activeMorphology.stats,
      corpusMorphology: corpusMorphology.stats,
      data2Morphology: data2Morphology.stats,
      quranNlpDictionary: quranNlpDictionary.stats
    },
    lookups.stats,
    conflicts
  );

  return {
    result,
    reports
  };
}

async function writeOutputs(payload) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(PATHS.output, `${JSON.stringify(payload.result, null, 2)}\n`, "utf8"),
    fs.writeFile(PATHS.coverageReport, `${JSON.stringify(payload.reports.coverage, null, 2)}\n`, "utf8"),
    fs.writeFile(PATHS.missingReport, `${JSON.stringify(payload.reports.missing, null, 2)}\n`, "utf8"),
    fs.writeFile(PATHS.conflictReport, `${JSON.stringify(payload.reports.conflicts, null, 2)}\n`, "utf8")
  ]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const payload = await buildCanonicalWordAnalysis(options);
  await writeOutputs(payload);

  console.log(JSON.stringify(payload.reports.coverage, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  PATHS,
  buildCanonicalWordAnalysis,
  loadMorphologyMap,
  loadQuranJsonVerses,
  loadQuranNlpDictionary,
  parseMorphologyLine
};
