import { mkdir, readFile, writeFile } from "node:fs/promises";

type StructuredTermClass = "generic" | "content" | "profile_bound" | "proper_noun" | "keep_unknown";
type ResolutionCandidate =
  | "drop_debug"
  | "useful_addition_candidate"
  | "risky_drop_candidate"
  | "profile_dependent_manual"
  | "keep_manual";

interface ParsedTerm {
  rawValue: string;
  displayValue: string;
  arabicSurface: string;
  root: string;
  lemma: string;
  displayMeaning: string;
  normalizedMeaning: string;
  parseConfidence: "high" | "medium" | "low";
  parseWarnings: string[];
}

interface ParsedExample {
  verseKey: string;
  selectedProfile: string;
  conflictType: string;
  sourceIds: string[];
  parsed: ParsedTerm;
}

interface ParsedGroup {
  normalizedValue: string;
  displayValue: string;
  rawValueSample: string;
  count: number;
  conflictTypeDistribution: Record<string, number>;
  selectedProfileDistribution: Record<string, number>;
  parseConfidenceDistribution: Record<string, number>;
  parseWarningDistribution: Record<string, number>;
  parsedSample: ParsedTerm;
  examples: ParsedExample[];
}

interface StructuredClassification {
  termClass: StructuredTermClass;
  resolutionCandidate: ResolutionCandidate;
  reasonCode: string;
  safeToAutoClassify: boolean;
}

function normalize(value: string): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s:\-./]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function hasAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(normalize(pattern)));
}

function dominantConflictType(distribution: Record<string, number>): string {
  return Object.entries(distribution).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "unknown";
}

function increment(record: Record<string, number>, key: string, amount = 1): void {
  record[key] = (record[key] ?? 0) + amount;
}

const genericMeanings = [
  "apaçık",
  "apacık",
  "güzel",
  "guzel",
  "büyük",
  "buyuk",
  "yüksek",
  "yuksek",
  "daha güzel",
  "daha guzel",
  "yakın",
  "yakin",
  "altında",
  "arkalarından",
  "yıllar",
  "yillar",
  "kaldım",
  "kaldim",
  "sana yeter",
  "gibi benzer",
  "gibi",
  "benzer",
  "çatıları",
  "catıları"
];

const profileBoundMeanings = [
  "hayır",
  "gun",
  "gün",
  "bilen alim",
  "bilen, alim",
  "güçlü aziz",
  "guclu aziz",
  "emir iş",
  "emir, iş",
  "söz kelam",
  "söz, kelam",
  "hikmetli hakim",
  "hikmetli, hakim",
  "gören",
  "goren",
  "şiddetli",
  "siddetli",
  "rahman",
  "rَحْمٰن"
];

const properNounMeanings = [
  "ismail",
  "israil",
  "şuayb",
  "suayb",
  "âd kavmi",
  "ad kavmi",
  "musa",
  "yusuf",
  "ibrahim",
  "nuh",
  "firavun"
];

const contentMeanings = [
  "ümmet",
  "ummet",
  "topluluk",
  "mümin",
  "mumin",
  "müşrik",
  "musrik",
  "şer",
  "ser",
  "savaş",
  "savas",
  "eş çift",
  "eş, çift",
  "es cift",
  "oğul",
  "ogul",
  "oğlum",
  "oglum",
  "kadınlar",
  "kadinlar",
  "sığınmak",
  "sıgınmak",
  "siginmak",
  "sığın",
  "kapı",
  "kapi",
  "seçilmiş",
  "secilmis",
  "müstağni",
  "mustagni",
  "geride kalanlar",
  "acele istemek",
  "yücelmek",
  "yucelmek",
  "kuşattı",
  "kusattı",
  "onları üzer",
  "onlari uzer",
  "uyarıcı",
  "uyarici",
  "vaat etti",
  "geçici fayda",
  "gecici fayda",
  "süslemek",
  "suslemek",
  "tadın",
  "tadin",
  "teslim olmak",
  "şüphe",
  "suphe",
  "alıkoymak",
  "alikoymak",
  "hicret etmek",
  "fitneye düşürmek",
  "fitneye dusurmek",
  "temiz şeyler",
  "temiz seyler",
  "kaynar su",
  "çamur",
  "camur",
  "meni damlası",
  "meni damlasi",
  "hazırlamak",
  "hazirlamak",
  "kayıp",
  "kayip",
  "eğrilik",
  "egrilik",
  "ırmaklar",
  "irmaklar",
  "sûr",
  "sur"
];

function classifyGroup(group: ParsedGroup): StructuredClassification {
  const meaning = normalize(group.parsedSample.normalizedMeaning || group.parsedSample.displayMeaning);
  const lemma = normalize(group.parsedSample.lemma);
  const root = normalize(group.parsedSample.root);
  const search = `${meaning} ${lemma} ${root} ${normalize(group.displayValue)}`;
  const conflictType = dominantConflictType(group.conflictTypeDistribution);

  if (!group.parsedSample.displayMeaning || group.parsedSample.parseConfidence === "low") {
    return {
      termClass: "keep_unknown",
      resolutionCandidate: "keep_manual",
      reasonCode: "missing_or_low_confidence_parse",
      safeToAutoClassify: false
    };
  }

  if (hasAny(search, profileBoundMeanings)) {
    return {
      termClass: "profile_bound",
      resolutionCandidate: "profile_dependent_manual",
      reasonCode: "profile_bound_meaning",
      safeToAutoClassify: false
    };
  }

  if (hasAny(search, genericMeanings)) {
    return {
      termClass: "generic",
      resolutionCandidate: "drop_debug",
      reasonCode: "generic_meaning",
      safeToAutoClassify: true
    };
  }

  if (hasAny(search, properNounMeanings)) {
    return {
      termClass: "proper_noun",
      resolutionCandidate:
        conflictType === "keyTermOnlyInV4" ? "useful_addition_candidate" : "risky_drop_candidate",
      reasonCode: "proper_noun_meaning",
      safeToAutoClassify: true
    };
  }

  if (hasAny(search, contentMeanings)) {
    return {
      termClass: "content",
      resolutionCandidate:
        conflictType === "keyTermOnlyInV4" ? "useful_addition_candidate" : "risky_drop_candidate",
      reasonCode: "content_meaning",
      safeToAutoClassify: true
    };
  }

  return {
    termClass: "keep_unknown",
    resolutionCandidate: "keep_manual",
    reasonCode: "no_structured_rule_match",
    safeToAutoClassify: false
  };
}

function buildMarkdown(snapshot: any): string {
  const termLines = Object.entries(snapshot.summary.termClassDistribution)
    .sort((left: any, right: any) => right[1] - left[1])
    .map(([key, count]) => `- \`${key}\`: ${count}`)
    .join("\n");
  const resolutionLines = Object.entries(snapshot.summary.resolutionCandidateDistribution)
    .sort((left: any, right: any) => right[1] - left[1])
    .map(([key, count]) => `- \`${key}\`: ${count}`)
    .join("\n");
  const reasonLines = Object.entries(snapshot.summary.reasonCodeDistribution)
    .sort((left: any, right: any) => right[1] - left[1])
    .map(([key, count]) => `- \`${key}\`: ${count}`)
    .join("\n");
  const topLines = snapshot.topClassifiedGroups
    .slice(0, 40)
    .map(
      (group: any) =>
        `| \`${group.displayValue}\` | ${group.count} | ${group.structured.termClass} | ${group.structured.resolutionCandidate} | ${group.structured.reasonCode} | ${group.parsedSample.displayMeaning || "-"} |`
    )
    .join("\n");

  return `# vNext Structured Classifier Audit

Bu audit, structured term parser ciktisini kullanarak mevcut classifier'i degistirmeden unknown siniflandirma potansiyelini olcer. Runtime, UI, default source, classifier kararlari, v4 default, kaynak veri, Batch 2 ve overlay degistirilmedi.

## Ozet

- Matrix unknown conflict: ${snapshot.summary.matrixUnknownConflicts}
- Unique unknown group: ${snapshot.summary.uniqueUnknownGroups}
- Guvenle siniflandirilabilir conflict: ${snapshot.summary.safelyClassifiableConflictCount}
- Guvenle siniflandirilabilir oran: %${snapshot.summary.safelyClassifiableConflictPercent}
- Tahmini needsManualReview azalmasi: ${snapshot.summary.estimatedNeedsManualReviewReduction}
- Tahmini kalan needsManualReview: ${snapshot.summary.estimatedRemainingNeedsManualReview}

## TermClass Dagilimi

${termLines}

## ResolutionCandidate Dagilimi

${resolutionLines}

## ReasonCode Dagilimi

${reasonLines}

## En Sik Structured Siniflandirma Ornekleri

| Term | Count | termClass | resolutionCandidate | reason | displayMeaning |
|---|---:|---|---|---|---|
${topLines || "| - | - | - | - | - | - |"}

## Degerlendirme

- Structured alanlar unknown azaltmak icin anlamli bir potansiyel gosteriyor.
- Buna ragmen \`profile_bound\` ve \`keep_unknown\` gruplar dogrudan classifier'a baglanmamali.
- En guvenli adaylar \`generic/drop_debug\`, \`content/source_gap\`, \`content/term_overlap\` ve \`proper_noun/source_gap\` gruplarindan parseConfidence'i high/medium olanlar.

## Sonraki Adim

Classifier'a dogrudan genis baglanti yerine, bu audit sonucundan kucuk bir Batch 3 karar paketi uretmek daha guvenli. Batch 3 sadece \`safeToAutoClassify=true\` olan, meaning'i temiz ve conflictType'i net gruplardan secilmeli.
`;
}

async function main(): Promise<void> {
  const parsePilot = JSON.parse(
    await readFile("data/analysis-snapshots/vnext-structured-term-parse-pilot.json", "utf8")
  ) as {
    summary: { matrixUnknownConflicts: number };
    first100UnknownGroups: ParsedGroup[];
  };
  const matrixAudit = JSON.parse(
    await readFile("data/analysis-snapshots/vnext-conflict-resolution-matrix-audit.json", "utf8")
  ) as { summary: { totalNeedsManualReviewConflicts: number } };

  const groups = parsePilot.first100UnknownGroups.map((group) => ({
    ...group,
    structured: classifyGroup(group)
  }));

  const termClassDistribution: Record<string, number> = {};
  const resolutionCandidateDistribution: Record<string, number> = {};
  const reasonCodeDistribution: Record<string, number> = {};
  let safelyClassifiableConflictCount = 0;

  for (const group of groups) {
    increment(termClassDistribution, group.structured.termClass, group.count);
    increment(resolutionCandidateDistribution, group.structured.resolutionCandidate, group.count);
    increment(reasonCodeDistribution, group.structured.reasonCode, group.count);
    if (group.structured.safeToAutoClassify) {
      safelyClassifiableConflictCount += group.count;
    }
  }

  const keepUnknownConflictCount = groups
    .filter((group) => group.structured.termClass === "keep_unknown")
    .reduce((sum, group) => sum + group.count, 0);
  const profileBoundConflictCount = groups
    .filter((group) => group.structured.termClass === "profile_bound")
    .reduce((sum, group) => sum + group.count, 0);

  const snapshot = {
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
      parsePilot: "data/analysis-snapshots/vnext-structured-term-parse-pilot.json",
      matrixAudit: "data/analysis-snapshots/vnext-conflict-resolution-matrix-audit.json"
    },
    scope: {
      note: "This first audit uses the first100UnknownGroups from the parse pilot, not all 2874 unique unknown terms.",
      inspectedGroups: groups.length,
      inspectedConflictCount: groups.reduce((sum, group) => sum + group.count, 0)
    },
    summary: {
      matrixUnknownConflicts: parsePilot.summary.matrixUnknownConflicts,
      totalNeedsManualReviewConflicts: matrixAudit.summary.totalNeedsManualReviewConflicts,
      uniqueUnknownGroups: groups.length,
      termClassDistribution,
      resolutionCandidateDistribution,
      reasonCodeDistribution,
      safelyClassifiableConflictCount,
      safelyClassifiableConflictPercent: Number(
        ((safelyClassifiableConflictCount / parsePilot.summary.matrixUnknownConflicts) * 100).toFixed(2)
      ),
      profileBoundConflictCount,
      keepUnknownConflictCount,
      estimatedNeedsManualReviewReduction: safelyClassifiableConflictCount,
      estimatedRemainingNeedsManualReview:
        matrixAudit.summary.totalNeedsManualReviewConflicts - safelyClassifiableConflictCount
    },
    topClassifiedGroups: groups.sort((left, right) => right.count - left.count),
    safeAutoClassifyGroups: groups.filter((group) => group.structured.safeToAutoClassify),
    profileBoundGroups: groups.filter((group) => group.structured.termClass === "profile_bound"),
    keepUnknownGroups: groups.filter((group) => group.structured.termClass === "keep_unknown")
  };

  await mkdir("data/analysis-snapshots", { recursive: true });
  await mkdir("docs", { recursive: true });
  await writeFile(
    "data/analysis-snapshots/vnext-structured-classifier-audit.json",
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8"
  );
  await writeFile("docs/VNEXT_STRUCTURED_CLASSIFIER_AUDIT.md", buildMarkdown(snapshot), "utf8");

  console.log(
    JSON.stringify(
      {
        outputJson: "data/analysis-snapshots/vnext-structured-classifier-audit.json",
        outputMarkdown: "docs/VNEXT_STRUCTURED_CLASSIFIER_AUDIT.md",
        summary: snapshot.summary
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
