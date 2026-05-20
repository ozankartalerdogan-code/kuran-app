import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";

type SourceName = "json" | "coreDb";

interface Signals {
  tokens: Set<string>;
  arabicRoots: Set<string>;
  arabicLemmas: Set<string>;
  arabicWords: Set<string>;
}

const driftVerses = [
  { surahId: 5, ayahNumber: 3, expected: "hukum_istisna" },
  { surahId: 12, ayahNumber: 100, expected: "kissa" }
] as const;

const profileSignals = {
  hukum_istisna: {
    tokens: ["haram", "yasak", "yiyecek", "et", "kan", "domuz", "zorunluluk", "caresizlik", "istisna", "sinir", "asma", "mecbur", "les", "olu hayvan"],
    arabic: ["حرم", "ميتة", "دم", "دمو", "لحم", "خنزر", "خنزير", "غير", "بغي", "اضطر"]
  },
  kissa: {
    tokens: ["musa", "yusuf", "ibrahim", "nuh", "firavun", "ruya", "asa", "kardes", "baba", "kavim", "dedi", "dediler", "gerceklesme"],
    arabic: ["موسى", "يوسف", "ابراهيم", "نوح", "فرعون", "رءي", "عصو", "اخ", "اب", "قول"]
  },
  emir_yasak: {
    tokens: ["yapmayin", "yaklasmayin", "sakinin", "kacinin", "uzak", "uzak durun", "arastirmayin", "cekistirmesin", "yemeyin", "oldurmeyin", "emredildi", "buyurdu", "ana", "giybet", "zan", "kusur", "haksizlik", "batil", "mallar", "mallarinizi", "ticaret", "anne", "baba", "babaya", "iyilik", "icki", "kumar", "putlar", "fal"],
    arabic: ["اكل", "مال", "قرب", "قتل", "ظنن", "غتب", "ولد", "امر", "نهي", "حكم", "خمر", "يسر", "نصب", "زلم", "رجس", "جنب", "بطل", "جسس", "كره", "تجر", "نفس"]
  },
  genel_karma: {
    clusters: [
      ["iman", "ahiret", "melek", "kitap", "peygamber", "inanan"],
      ["namaz", "zekat", "salat", "ibadet", "kulluk"],
      ["mal", "mallar", "infak", "veren", "yetim", "yoksul", "yolcu"],
      ["ahit", "vefa", "sabir", "savas", "darda", "zorda"],
      ["takva", "dogru", "iyilik"]
    ],
    rich: ["zekat", "namaz", "salat", "infak", "yetim", "yoksul", "yolcu", "ahit", "vefa", "sabir", "melek", "peygamber", "ahiret"]
  }
} as const;

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/gu, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeArabic(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[^\u0600-\u06FF]/gu, "")
    .trim();
}

function collectSignals(context: Awaited<ReturnType<typeof buildVerseAnalysisContext>>): Signals {
  const tokens = new Set<string>();
  const arabicRoots = new Set<string>();
  const arabicLemmas = new Set<string>();
  const arabicWords = new Set<string>();
  const textValues = [
    ...context.keyTerms,
    ...context.translationComparison.commonPhrases,
    ...context.translationComparison.divergentPhrases,
    ...context.themesConcepts,
    context.primaryTranslation?.text ?? "",
    ...context.rootMeanings,
    ...context.deterministicNotes
  ];

  for (const value of textValues) {
    for (const token of normalizeText(value).split(" ").filter(Boolean)) {
      tokens.add(token);
    }
  }

  for (const word of context.wordByWord) {
    if (word.meaning) {
      for (const token of normalizeText(word.meaning).split(" ").filter(Boolean)) {
        tokens.add(token);
      }
    }
    if (word.rootMeaning) {
      for (const token of normalizeText(word.rootMeaning).split(" ").filter(Boolean)) {
        tokens.add(token);
      }
    }

    const root = normalizeArabic(word.root);
    const lemma = normalizeArabic(word.lemma);
    const arabic = normalizeArabic(word.arabic);
    if (root) arabicRoots.add(root);
    if (lemma) arabicLemmas.add(lemma);
    if (arabic) arabicWords.add(arabic);
  }

  return { tokens, arabicRoots, arabicLemmas, arabicWords };
}

function matchTokens(signals: Signals, values: readonly string[]): string[] {
  return values.filter((value) => signals.tokens.has(normalizeText(value)));
}

function matchArabic(signals: Signals, values: readonly string[]): string[] {
  return values.filter(
    (value) =>
      signals.arabicRoots.has(value) ||
      signals.arabicLemmas.has(value) ||
      signals.arabicWords.has(value)
  );
}

function scoreProfile(signals: Signals, profile: "hukum_istisna" | "kissa" | "emir_yasak"): number {
  return (
    matchTokens(signals, profileSignals[profile].tokens).length * 2 +
    matchArabic(signals, profileSignals[profile].arabic).length * 3
  );
}

function inspectHukumAnchor(signals: Signals): Record<string, unknown> {
  const foodTokens = matchTokens(signals, ["domuz", "kan", "et", "yiyecek", "les", "olu hayvan"]);
  const foodArabic = matchArabic(signals, ["ميتة", "دم", "دمو", "لحم", "خنزر", "خنزير"]);
  const necessityTokens = matchTokens(signals, ["zorunluluk", "caresizlik", "istisna", "mecbur", "sinir"]);
  const necessityArabic = matchArabic(signals, ["اضطر", "بغي", "غير"]);
  const haramTokens = matchTokens(signals, ["haram", "yasak"]);
  const haramArabic = matchArabic(signals, ["حرم"]);

  return {
    score: scoreProfile(signals, "hukum_istisna"),
    food: [...foodTokens, ...foodArabic],
    necessity: [...necessityTokens, ...necessityArabic],
    haram: [...haramTokens, ...haramArabic],
    anchorPass: (foodTokens.length + foodArabic.length > 0 && necessityTokens.length + necessityArabic.length > 0) ||
      (foodTokens.length + foodArabic.length > 0 && haramTokens.length + haramArabic.length > 0)
  };
}

function inspectKissaAnchor(signals: Signals): Record<string, unknown> {
  const names = [
    ...matchTokens(signals, ["musa", "yusuf", "ibrahim", "nuh", "firavun"]),
    ...matchArabic(signals, ["موسى", "يوسف", "ابراهيم", "نوح", "فرعون"])
  ];
  const scene = [
    ...matchTokens(signals, ["ruya", "asa", "kardes", "baba", "kavim", "gerceklesme"]),
    ...matchArabic(signals, ["رءي", "عصو", "اخ", "اب"])
  ];
  const speech = [...matchTokens(signals, ["dedi", "dediler"]), ...matchArabic(signals, ["قول"])];

  return {
    score: scoreProfile(signals, "kissa"),
    names,
    scene,
    speech,
    anchorPass: names.length > 0 || (scene.length > 0 && speech.length > 0)
  };
}

function inspectEmirAnchor(signals: Signals): Record<string, unknown> {
  const imperative = matchTokens(signals, [
    "yapmayin",
    "yaklasmayin",
    "sakinin",
    "kacinin",
    "uzak",
    "uzak durun",
    "arastirmayin",
    "cekistirmesin",
    "yemeyin",
    "oldurmeyin",
    "buyurdu",
    "emredildi"
  ]);
  const moral = matchTokens(signals, [
    "ana",
    "giybet",
    "zan",
    "kusur",
    "haksizlik",
    "anne",
    "baba",
    "iyilik",
    "mallar",
    "mallarinizi",
    "ticaret",
    "batil",
    "icki",
    "kumar",
    "putlar",
    "fal"
  ]);
  const family = matchTokens(signals, ["ana", "anne", "baba", "babaya", "iyilik"]);
  const arabic = matchArabic(signals, profileSignals.emir_yasak.arabic);

  return {
    score: scoreProfile(signals, "emir_yasak"),
    imperative,
    moral,
    family,
    arabic,
    anchorPass:
      (imperative.length >= 1 && moral.length >= 1) ||
      moral.length >= 2 ||
      family.length >= 2 ||
      arabic.length >= 3
  };
}

function inspectGeneralAnchor(signals: Signals): Record<string, unknown> {
  const matchedClusters = profileSignals.genel_karma.clusters
    .map((cluster) => matchTokens(signals, cluster))
    .filter((matches) => matches.length > 0);
  const rich = matchTokens(signals, profileSignals.genel_karma.rich);

  return {
    matchedClusters,
    clusterCount: matchedClusters.length,
    rich,
    richCount: rich.length,
    anchorPass: matchedClusters.length >= 4 && rich.length >= 2
  };
}

async function inspectVerse(surahId: number, ayahNumber: number, source: SourceName): Promise<Record<string, unknown>> {
  const context = await buildVerseAnalysisContext(surahId, ayahNumber, { source });
  const preview = buildVerseAnalysisPreview(context);
  const signals = collectSignals(context);

  return {
    source,
    verseKey: context.verseKey,
    selectedProfile: preview.selectedProfile,
    targetScores: {
      hukum_istisna: inspectHukumAnchor(signals),
      kissa: inspectKissaAnchor(signals),
      emir_yasak: inspectEmirAnchor(signals),
      genel_karma: inspectGeneralAnchor(signals)
    },
    counts: {
      tokens: signals.tokens.size,
      roots: signals.arabicRoots.size,
      lemmas: signals.arabicLemmas.size,
      rootMeanings: context.rootMeanings.length,
      keyTerms: context.keyTerms.length
    },
    rootMeanings: context.rootMeanings.slice(0, 12),
    keyTermsPreview: preview.keyTermsPreview
  };
}

function printRow(row: Record<string, unknown>): void {
  const scores = row.targetScores as Record<string, Record<string, unknown>>;
  const counts = row.counts as Record<string, number>;
  console.log(`\n${row.verseKey} | ${row.source} | selected=${row.selectedProfile}`);
  console.log(`counts: tokens=${counts.tokens} roots=${counts.roots} lemmas=${counts.lemmas} rootMeanings=${counts.rootMeanings} keyTerms=${counts.keyTerms}`);
  console.log(`hukum_istisna: score=${scores.hukum_istisna.score} anchor=${scores.hukum_istisna.anchorPass} food=${JSON.stringify(scores.hukum_istisna.food)} necessity=${JSON.stringify(scores.hukum_istisna.necessity)} haram=${JSON.stringify(scores.hukum_istisna.haram)}`);
  console.log(`kissa: score=${scores.kissa.score} anchor=${scores.kissa.anchorPass} names=${JSON.stringify(scores.kissa.names)} scene=${JSON.stringify(scores.kissa.scene)} speech=${JSON.stringify(scores.kissa.speech)}`);
  console.log(`emir_yasak: score=${scores.emir_yasak.score} anchor=${scores.emir_yasak.anchorPass} imperative=${JSON.stringify(scores.emir_yasak.imperative)} moral=${JSON.stringify(scores.emir_yasak.moral)} family=${JSON.stringify(scores.emir_yasak.family)} arabic=${JSON.stringify(scores.emir_yasak.arabic)}`);
  console.log(`genel_karma: anchor=${scores.genel_karma.anchorPass} clusterCount=${scores.genel_karma.clusterCount} richCount=${scores.genel_karma.richCount} clusters=${JSON.stringify(scores.genel_karma.matchedClusters)} rich=${JSON.stringify(scores.genel_karma.rich)}`);
  console.log(`keyTermsPreview=${JSON.stringify(row.keyTermsPreview)}`);
  console.log(`rootMeanings=${JSON.stringify(row.rootMeanings)}`);
}

async function main(): Promise<void> {
  for (const verse of driftVerses) {
    console.log(`\n=== ${verse.surahId}:${verse.ayahNumber} expected=${verse.expected} ===`);
    for (const source of ["json", "coreDb"] as const) {
      printRow(await inspectVerse(verse.surahId, verse.ayahNumber, source));
    }
  }
}

main().catch((error) => {
  console.error("inspect-coredb-drift failed");
  console.error(error);
  process.exitCode = 1;
});
