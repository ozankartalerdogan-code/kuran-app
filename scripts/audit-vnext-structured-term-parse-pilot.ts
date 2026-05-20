import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisEvidenceLayer, type RootEasyOnlyEntry } from "../packages/core/src/analysis/verseAnalysisEvidenceLayer.ts";
import { classifyEvidenceConflict } from "../packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts";
import {
  parseEvidenceTermValue,
  type EvidenceTermParseConfidence,
  type ParsedEvidenceTerm
} from "../packages/core/src/analysis/verseAnalysisEvidenceTermParser.ts";

interface ArabicVerse {
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  status?: string;
}

type MatrixTermClass = "generic" | "content" | "profile_bound" | "proper_noun" | "unknown";

interface ParsedUnknownExample {
  verseKey: string;
  selectedProfile: string;
  conflictType: string;
  sourceIds: string[];
  parsed: ParsedEvidenceTerm;
}

interface ParsedUnknownGroup {
  normalizedValue: string;
  displayValue: string;
  rawValueSample: string;
  count: number;
  conflictTypeDistribution: Record<string, number>;
  selectedProfileDistribution: Record<string, number>;
  parseConfidenceDistribution: Record<EvidenceTermParseConfidence, number>;
  parseWarningDistribution: Record<string, number>;
  parsedSample: ParsedEvidenceTerm;
  examples: ParsedUnknownExample[];
}

interface ParsePilotSnapshot {
  generatedAt: string;
  rules: {
    runtimeChanged: false;
    defaultSourceChanged: false;
    uiChanged: false;
    classifierChanged: false;
    v4DefaultEnabled: false;
    sourceDataOverwritten: false;
    batch2Applied: false;
    overlayProduced: false;
  };
  inputs: {
    parser: string;
    classifier: string;
    globalAudit: string;
    matrixAudit: string;
  };
  valueShapeNotes: string[];
  summary: {
    processedAyahs: number;
    failedAyahs: number;
    matrixUnknownConflicts: number;
    uniqueMatrixUnknownTerms: number;
    parsedUnknownConflicts: number;
    arabicSurfaceExtractedCount: number;
    rootExtractedCount: number;
    lemmaExtractedCount: number;
    displayMeaningExtractedCount: number;
    parseConfidenceDistribution: Record<EvidenceTermParseConfidence, number>;
    parseWarningDistribution: Record<string, number>;
    topUnknownGroupConflictCount: number;
    first100UnknownGroupConflictCount: number;
  };
  topUnknownGroups: ParsedUnknownGroup[];
  first100UnknownGroups: ParsedUnknownGroup[];
}

function toVerseKey(surahId: number, ayahNumber: number): string {
  return `${surahId}:${ayahNumber}`;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s:\-./]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function displayValue(value: string): string {
  const parts = value.split("|").map((part) => part.trim());
  return parts.at(-1) ?? value;
}

function increment(record: Record<string, number>, key: string, amount = 1): void {
  record[key] = (record[key] ?? 0) + amount;
}

function incrementConfidence(
  record: Record<EvidenceTermParseConfidence, number>,
  key: EvidenceTermParseConfidence
): void {
  record[key] = (record[key] ?? 0) + 1;
}

function pushExample(list: ParsedUnknownExample[], value: ParsedUnknownExample, limit = 5): void {
  if (
    list.length < limit &&
    !list.some((item) => item.verseKey === value.verseKey && item.conflictType === value.conflictType)
  ) {
    list.push(value);
  }
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(normalize(pattern)));
}

const profileBoundPatterns = [
  "hayır",
  "gun",
  "gün",
  "bilen alim",
  "guclu aziz",
  "güçlü aziz",
  "emir is",
  "emir iş",
  "soz kelam",
  "söz kelam",
  "hikmetli hakim",
  "kadir guclu",
  "kadir güçlü",
  "daha siddetli",
  "daha şiddetli",
  "sag yemin",
  "sağ yemin",
  "ehil sahip",
  "daha iyi bilir"
];

const genericPatterns = [
  "sey bir sey",
  "şey bir şey",
  "az biraz",
  "umulur ki",
  "the belirtec",
  "ustunde",
  "üstünde",
  "altında",
  "arkalarından",
  "nasıl",
  "nasil",
  "guzel",
  "güzel",
  "buyuk",
  "büyük",
  "yuksek",
  "yüksek",
  "daha guzel",
  "daha güzel",
  "gibi benzer",
  "yakın",
  "yakin",
  "sana yeter",
  "yıllar",
  "yillar",
  "kaldım",
  "kaldim",
  "cok",
  "çok",
  "bazı",
  "bazi"
];

const properNounPatterns = [
  "ismail",
  "israil",
  "suayb",
  "şuayb",
  "ad kavmi",
  "âd kavmi",
  "musa",
  "yusuf",
  "ibrahim",
  "nuh",
  "firavun"
];

const contentPatterns = [
  "mumin",
  "mümin",
  "musluman",
  "müslüman",
  "ummet",
  "ümmet",
  "topluluk",
  "suclular",
  "suçlular",
  "uyarıcı",
  "uyarici",
  "dunya",
  "dünya",
  "gunduz",
  "gündüz",
  "dag",
  "dağ",
  "gunes",
  "güneş",
  "iyilik",
  "islah",
  "ıslah",
  "salih",
  "acı veren",
  "aci veren",
  "gecici fayda",
  "geçici fayda",
  "vaat etti",
  "yemin etmek",
  "sehir",
  "şehir",
  "sur",
  "sûr",
  "teslim olmak",
  "suphe",
  "şüphe",
  "alıkoymak",
  "alikoymak",
  "süslemek",
  "suslemek",
  "tadın",
  "tadin",
  "müjde ver",
  "mujde ver",
  "ırmaklar",
  "irmaklar",
  "kaynar su",
  "sahipler arkadaslar",
  "sahipler arkadaşlar",
  "ashab",
  "kadınlar",
  "kadinlar",
  "fitne",
  "hicret",
  "aşmak",
  "asmak",
  "eğrilik",
  "egrilik",
  "çığlık",
  "cıglık",
  "çamur",
  "camur",
  "temiz seyler",
  "temiz şeyler",
  "meni damlası",
  "meni damlasi",
  "hazırlamak",
  "hazirlamak",
  "kayıp",
  "kayip",
  "ebedi kalan"
];

function classifyMatrixTermClass(value: string, normalizedValue: string): MatrixTermClass {
  const text = `${normalize(displayValue(value))} ${normalize(normalizedValue)} ${normalize(value)}`;
  if (hasAny(text, profileBoundPatterns)) return "profile_bound";
  if (hasAny(text, genericPatterns)) return "generic";
  if (hasAny(text, properNounPatterns)) return "proper_noun";
  if (hasAny(text, contentPatterns)) return "content";
  return "unknown";
}

function emptyConfidenceDistribution(): Record<EvidenceTermParseConfidence, number> {
  return {
    high: 0,
    medium: 0,
    low: 0
  };
}

function groupFor(input: {
  normalizedValue: string;
  rawValue: string;
  parsed: ParsedEvidenceTerm;
}): ParsedUnknownGroup {
  return {
    normalizedValue: input.normalizedValue,
    displayValue: input.parsed.displayValue,
    rawValueSample: input.rawValue,
    count: 0,
    conflictTypeDistribution: {},
    selectedProfileDistribution: {},
    parseConfidenceDistribution: emptyConfidenceDistribution(),
    parseWarningDistribution: {},
    parsedSample: input.parsed,
    examples: []
  };
}

function buildMarkdown(snapshot: ParsePilotSnapshot): string {
  const confidenceLines = Object.entries(snapshot.summary.parseConfidenceDistribution)
    .map(([key, count]) => `- \`${key}\`: ${count}`)
    .join("\n");
  const warningLines = Object.entries(snapshot.summary.parseWarningDistribution)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([key, count]) => `- \`${key}\`: ${count}`)
    .join("\n");
  const topLines = snapshot.topUnknownGroups
    .map(
      (group) =>
        `| \`${group.displayValue}\` | ${group.count} | ${group.parsedSample.parseConfidence} | \`${group.parsedSample.arabicSurface || "-"}\` | \`${group.parsedSample.lemma || "-"}\` | \`${group.parsedSample.root || "-"}\` | \`${group.parsedSample.displayMeaning || "-"}\` | ${group.parsedSample.parseWarnings.join(", ")} |`
    )
    .join("\n");

  return `# vNext Structured Term Parse Pilot

Bu pilot, vNext Evidence Layer icindeki keyTerm \`value\` string'lerini audit-only olarak yapilandirilmis parcalara ayirir. Runtime, UI, default source, classifier kararlari, v4 default, kaynak veri, Batch 2 ve overlay degistirilmedi.

## Value Yapisi

Gozlenen yaygin yapi:

- \`Arapca yuzey | lemma/kok adayi | Turkce display meaning\`
- \`Arapca yuzey | lemma/kok adayi\` (Turkce anlam eksik)

Parser bu formati okuyup su alanlari cikarmaya calisir:

- \`rawValue\`
- \`displayValue\`
- \`arabicSurface\`
- \`root\`
- \`lemma\`
- \`displayMeaning\`
- \`normalizedMeaning\`
- \`parseConfidence\`
- \`parseWarnings\`

## Ozet

- Islenen ayet: ${snapshot.summary.processedAyahs}
- Hata: ${snapshot.summary.failedAyahs}
- Matrix unknown conflict: ${snapshot.summary.matrixUnknownConflicts}
- Unique matrix unknown term: ${snapshot.summary.uniqueMatrixUnknownTerms}
- Parsed unknown conflict: ${snapshot.summary.parsedUnknownConflicts}
- Arabic surface cikarilan: ${snapshot.summary.arabicSurfaceExtractedCount}
- Root cikarilan: ${snapshot.summary.rootExtractedCount}
- Lemma cikarilan: ${snapshot.summary.lemmaExtractedCount}
- Display meaning cikarilan: ${snapshot.summary.displayMeaningExtractedCount}

## Parse Confidence Dagilimi

${confidenceLines}

## Parse Warning Dagilimi

${warningLines || "- Yok"}

## Top Unknown Gruplarda Parser Ciktisi

| Term | Count | Confidence | Arabic Surface | Lemma | Root | Display Meaning | Warnings |
|---|---:|---|---|---|---|---|---|
${topLines || "| - | - | - | - | - | - | - | - |"}

## Teshis

- Unknown terimlerin buyuk kismi parse edilebilir parcalara sahip: Arapca yuzey ve lemma/kok adayi genelde ayrilabiliyor.
- En buyuk sorun parser degil, mevcut classifier'in bu yapilandirilmis alanlari kullanmamasi.
- Root alani temkinli tutuldu; lemma/kok adayi kisa ise root olarak da isaretlendi ve \`root_lemma_ambiguous\` uyarisi verildi.
- Turkce display meaning eksik olan kayitlar ayrica \`missing_display_meaning\` ile gorunur hale geldi.

## Unknown Dusurmek Icin En Iyi Sonraki Adim

Classifier'a genis string rule eklemek yerine, bu parser'i once audit classifier'da kullanarak kucuk bir structured-classification pilotu yapmak en guvenli yol. Sonra sadece parse confidence'i \`high\` veya \`medium\` olan ve displayMeaning'i temiz gorunen gruplardan yeni karar batch'i uretilmeli.
`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const [arabicVerses, rootEasyOnly] = await Promise.all([
    readJson<ArabicVerse[]>("data/normalized/arabic.json"),
    readJson<RootEasyOnlyEntry[]>("data2/processed/root_explanations_tr_v2_easy_only.json")
  ]);
  const groups = new Map<string, ParsedUnknownGroup>();
  const confidenceDistribution = emptyConfidenceDistribution();
  const warningDistribution: Record<string, number> = {};
  let failedAyahs = 0;
  let matrixUnknownConflicts = 0;
  let parsedUnknownConflicts = 0;
  let arabicSurfaceExtractedCount = 0;
  let rootExtractedCount = 0;
  let lemmaExtractedCount = 0;
  let displayMeaningExtractedCount = 0;

  for (const [index, verse] of arabicVerses.entries()) {
    const verseKey = toVerseKey(verse.surahId, verse.ayahNumber);

    try {
      const [context, v4Context] = await Promise.all([
        buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, {
          source: "json",
          debug: { includeCoverageReport: true }
        }),
        buildVerseAnalysisContext(verse.surahId, verse.ayahNumber, {
          source: "v4",
          debug: { includeCoverageReport: true }
        })
      ]);
      const evidenceLayer = buildVerseAnalysisEvidenceLayer(context, {
        v4Context,
        rootEasyOnly
      });

      for (const item of evidenceLayer.items) {
        for (const conflict of item.conflictFlags) {
          const classification = classifyEvidenceConflict({
            conflictType: conflict.type,
            value: item.value,
            selectedProfile: evidenceLayer.selectedProfile
          });

          if (classification.qualityClass !== "needsManualReview") continue;
          if (classifyMatrixTermClass(item.value, item.normalizedValue) !== "unknown") continue;

          matrixUnknownConflicts += 1;
          const parsed = parseEvidenceTermValue(item.value);
          parsedUnknownConflicts += 1;
          if (parsed.arabicSurface) arabicSurfaceExtractedCount += 1;
          if (parsed.root) rootExtractedCount += 1;
          if (parsed.lemma) lemmaExtractedCount += 1;
          if (parsed.displayMeaning) displayMeaningExtractedCount += 1;
          incrementConfidence(confidenceDistribution, parsed.parseConfidence);
          for (const warning of parsed.parseWarnings) increment(warningDistribution, warning);

          const key = item.normalizedValue;
          const group = groups.get(key) ?? groupFor({
            normalizedValue: item.normalizedValue,
            rawValue: item.value,
            parsed
          });

          group.count += 1;
          increment(group.conflictTypeDistribution, conflict.type);
          increment(group.selectedProfileDistribution, evidenceLayer.selectedProfile);
          incrementConfidence(group.parseConfidenceDistribution, parsed.parseConfidence);
          for (const warning of parsed.parseWarnings) increment(group.parseWarningDistribution, warning);
          pushExample(group.examples, {
            verseKey,
            selectedProfile: evidenceLayer.selectedProfile,
            conflictType: conflict.type,
            sourceIds: item.sourceIds,
            parsed
          });
          groups.set(key, group);
        }
      }
    } catch {
      failedAyahs += 1;
    }

    if ((index + 1) % 1000 === 0 || index + 1 === arabicVerses.length) {
      console.log(
        `processed ${index + 1}/${arabicVerses.length}; matrixUnknown=${matrixUnknownConflicts}; groups=${groups.size}`
      );
    }
  }

  const sortedGroups = Array.from(groups.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.normalizedValue.localeCompare(right.normalizedValue, "tr");
  });

  const snapshot: ParsePilotSnapshot = {
    generatedAt: new Date().toISOString(),
    rules: {
      runtimeChanged: false,
      defaultSourceChanged: false,
      uiChanged: false,
      classifierChanged: false,
      v4DefaultEnabled: false,
      sourceDataOverwritten: false,
      batch2Applied: false,
      overlayProduced: false
    },
    inputs: {
      parser: "packages/core/src/analysis/verseAnalysisEvidenceTermParser.ts",
      classifier: "packages/core/src/analysis/verseAnalysisEvidenceConflictClassifier.ts",
      globalAudit: "data/analysis-snapshots/vnext-evidence-layer-global-audit.json",
      matrixAudit: "data/analysis-snapshots/vnext-conflict-resolution-matrix-audit.json"
    },
    valueShapeNotes: [
      "Common shape: Arabic surface | lemma/root candidate | Turkish display meaning.",
      "Some values contain only Arabic surface | lemma/root candidate; displayMeaning is empty in those cases.",
      "The parser treats short Arabic lemma candidates as possible roots but marks them root_lemma_ambiguous."
    ],
    summary: {
      processedAyahs: arabicVerses.length,
      failedAyahs,
      matrixUnknownConflicts,
      uniqueMatrixUnknownTerms: sortedGroups.length,
      parsedUnknownConflicts,
      arabicSurfaceExtractedCount,
      rootExtractedCount,
      lemmaExtractedCount,
      displayMeaningExtractedCount,
      parseConfidenceDistribution: confidenceDistribution,
      parseWarningDistribution: warningDistribution,
      topUnknownGroupConflictCount: sortedGroups.slice(0, 20).reduce((sum, group) => sum + group.count, 0),
      first100UnknownGroupConflictCount: sortedGroups.slice(0, 100).reduce((sum, group) => sum + group.count, 0)
    },
    topUnknownGroups: sortedGroups.slice(0, 20),
    first100UnknownGroups: sortedGroups.slice(0, 100)
  };

  await mkdir("data/analysis-snapshots", { recursive: true });
  await mkdir("docs", { recursive: true });
  await writeFile(
    "data/analysis-snapshots/vnext-structured-term-parse-pilot.json",
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8"
  );
  await writeFile("docs/VNEXT_STRUCTURED_TERM_PARSE_PILOT.md", buildMarkdown(snapshot), "utf8");

  console.log(
    JSON.stringify(
      {
        outputJson: "data/analysis-snapshots/vnext-structured-term-parse-pilot.json",
        outputMarkdown: "docs/VNEXT_STRUCTURED_TERM_PARSE_PILOT.md",
        summary: snapshot.summary,
        elapsedSeconds: Math.round((Date.now() - startedAt) / 1000)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
