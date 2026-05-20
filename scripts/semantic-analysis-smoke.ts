import * as dotenv from "dotenv";

import {
  getAdditionalSemanticWarnings,
  getSafeDeterministicSemanticSummary,
  selectSemanticSummaryForAyah,
  type SemanticWarningSeverity
} from "@quran-app/core";
import { createGroqSemanticProvider } from "../apps/web/src/lib/analysis/groqSemanticProvider.ts";
import {
  buildAyahSemanticAnalysisPrompt,
  buildFallbackAyahSemanticSummary,
  parseAyahSemanticAnalysisResultDetailed,
  type HybridSemanticAnalysisInput,
  type HybridSemanticAnalysisOutput,
  type ParseResult
} from "../apps/web/src/lib/analysis/semanticPrompt.ts";

dotenv.config({ path: ".env.local", quiet: true });

type SmokeSample = {
  key: string;
  name: string;
  input: HybridSemanticAnalysisInput;
};

const trackedSurfaceWarnings = [
  "possible-semantic-drift",
  "missing-key-relation",
  "too-generic-summary",
  "severe-mechanical-or-awkward-turkish",
  "mechanical-or-awkward-turkish",
  "weak-summary",
  "too-close-to-translation"
] as const;

type BasicCheckResult = {
  passed: boolean;
  reasons: string[];
  warnings: string[];
};

type RawResponseInspection = {
  isJson: boolean;
  extraKeys: string[];
  hasUsableSummary: boolean;
};

type ProviderRejectReason = "provider_429" | "provider_empty" | "provider_unknown";

type SimulatedFinalSource =
  | "ai"
  | "fallback"
  | "fallback_after_quality_guard"
  | "none";

type InterpretiveCategory =
  | "direct_phrases"
  | "verb_patterns"
  | "meta_language"
  | "explanation_tone"
  | "structural_signals";

type InterpretiveRiskLevel = "safe" | "low" | "medium" | "high";

type InterpretiveAssessment = {
  score: number;
  level: InterpretiveRiskLevel;
  matchedPatterns: string[];
  categoryBreakdown: Record<InterpretiveCategory, number>;
};

type DisplaySelection = {
  rawAiSummary: string | null;
  selectedSummary: string | null;
  selectedSource: "ai" | "safe_deterministic" | "fallback" | "none";
  safeFallbackUsed: boolean;
  selectionReason: string;
  severity: SemanticWarningSeverity;
  triggeringWarnings: string[];
};

type SampleExecution = {
  sample: SmokeSample;
  output: HybridSemanticAnalysisOutput | null;
  rawAiResponse: string | null;
  parseResult: ParseResult;
  parseStage: "provider" | "parser";
  basicCheck: BasicCheckResult | null;
  inspection: RawResponseInspection;
  providerError: { name: string; message: string } | null;
  providerRejectReason: ProviderRejectReason | null;
  retryCount: number;
  recoveredFrom429: boolean;
  simulatedFinalSource: SimulatedFinalSource;
  qualityGuardReasons: string[];
  interpretiveAssessment: InterpretiveAssessment | null;
  surfaceWarnings: string[];
  combinedWarnings: string[];
  displaySelection: DisplaySelection;
};

const bannedMetaPhrases = [
  "ayetin kısa",
  "verilen verilere göre",
  "bu analiz",
  "tefsir",
  "hadis",
  "sebeb-i nüzul"
];

const normativeWarningPhrases = [
  "gerekir",
  "gerektiği",
  "gerektiğini",
  "zorunlu",
  "emredilir",
  "emretmektedir",
  "farzdır",
  "yükümlüdür"
];

const artificialLanguageWarningPhrases = [
  "bu ayet",
  "ifade etmektedir",
  "bildirmektedir"
];

const interpretiveLanguageWarningPhrases = [
  "cevap olarak",
  "sonuç olarak",
  "anlamına gelir",
  "bir gerçektir",
  "gösterir",
  "verilen veriler çerçevesinde"
];

const semanticDriftWarningPhrases = [
  "etkilemiştir",
  "sebep olmuştur",
  "sonuçlanmıştır",
  "yol açar",
  "bu durum",
  "ifade eder",
  "anlatır",
  "ortaya koyar",
  "inançlarını etkilemiştir",
  "tutumlarını değiştirmiştir",
  "farkındalık oluşturur"
];

const interpretiveDirectPhrases = [
  "bir gercektir",
  "ifade eder",
  "gosterir",
  "vurgular",
  "anlatir",
  "isaret eder",
  "ortaya koyar",
  "mesaj verir",
  "ders verir",
  "anlamina gelir"
];

const interpretiveVerbPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "gosterir", pattern: /\bgosterir\b/u },
  { label: "vurgular", pattern: /\bvurgular\b/u },
  { label: "anlatir", pattern: /\banlatir\b/u },
  { label: "bildirir", pattern: /\bbildirir\b/u },
  { label: "ifade_eder", pattern: /\bifade eder\b/u },
  { label: "isaret_eder", pattern: /\bisaret eder\b/u },
  { label: "ortaya_koyar", pattern: /\bortaya koyar\b/u },
  { label: "mesaj_verir", pattern: /\bmesaj verir\b/u },
  { label: "ders_verir", pattern: /\bders verir\b/u },
  { label: "anlamina_gelir", pattern: /\banlamina gelir\b/u }
];

const interpretiveMetaLanguagePatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "bu_ayet", pattern: /\bbu ayet\b/u },
  { label: "burada", pattern: /\bburada\b/u },
  { label: "bu_ifade", pattern: /\bbu ifade\b/u },
  { label: "bu_cumle", pattern: /\bbu cumle\b/u },
  { label: "ayette", pattern: /\bayette\b/u },
  { label: "ayetin", pattern: /\bayetin\b/u }
];

const interpretiveExplanationTonePatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "anlamina_gelir", pattern: /\banlamina gelir\b/u },
  { label: "sunu_ifade_eder", pattern: /\bsunu ifade eder\b/u },
  { label: "bunu_gosterir", pattern: /\bbunu gosterir\b/u },
  { label: "suna_isaret_eder", pattern: /\bsuna isaret eder\b/u },
  { label: "oldugunu_bildirir", pattern: /\boldugunu bildirir\b/u },
  { label: "oldugunu_ortaya_koyar", pattern: /\boldugunu ortaya koyar\b/u },
  { label: "oldugunu_gosterir", pattern: /\boldugunu gosterir\b/u }
];

const interpretiveStructuralAbstractPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "hakikat", pattern: /\bhakikat\b/u },
  { label: "gercek", pattern: /\bgercek\b/u },
  { label: "mesaj", pattern: /\bmesaj\b/u },
  { label: "ders", pattern: /\bders\b/u },
  { label: "vurgu", pattern: /\bvurgu\b/u },
  { label: "uyari", pattern: /\buyari\b/u }
];

const imperativeTranslationPatterns = [
  /\bilet\.$/iu,
  /\bsabredin\b/iu,
  /\bedin\b/iu,
  /\bde\b/iu,
  /\bsöyle\b/iu,
  /\bkorkun\b/iu,
  /\bbakın\b/iu,
  /\bsakının\b/iu
];

const indicativeSummaryPatterns = [
  /\biletir\b/iu,
  /\bberaberdir\b/iu,
  /\bgösterir\b/iu,
  /\btanımlanır\b/iu,
  /\bvurgular\b/iu,
  /\bbildirir\b/iu,
  /\bvardır\b/iu,
  /\bolur\b/iu
];

const preservedMoodSummaryPatterns = [
  /\bsabredin\b/iu,
  /\bkulluk ederiz\b/iu,
  /\byardım dileriz\b/iu,
  /\bilet\.$/iu,
  /\bilet\b/iu
];

const badTurkishGrammarWarningPatterns = [
  /\ballah ilet\b/iu,
  /\bhesabını korkarlar\b/iu
];

const RETRY_DELAYS_MS = [3000, 7000, 12000];
const DEFAULT_SMOKE_DELAY_MS = 2000;

const samples: SmokeSample[] = [
  {
    key: "1:1",
    name: "Besmele",
    input: {
      ayahText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      translation: "Rahmân ve Rahîm olan Allah’ın adıyla.",
      themes: ["rahmet", "başlangıç"],
      roots: ["رحم", "سمو"],
      participants: ["Allah"]
    }
  },
  {
    key: "1:2",
    name: "Hamd",
    input: {
      ayahText: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      translation: "Hamd, âlemlerin Rabbi Allah’a mahsustur.",
      themes: ["hamd", "rububiyet"],
      roots: ["حمد", "ربب"],
      participants: ["Allah"]
    }
  },
  {
    key: "1:3",
    name: "Rahmet",
    input: {
      ayahText: "الرَّحْمَٰنِ الرَّحِيمِ",
      translation: "O Rahmân ve Rahîm’dir.",
      themes: ["rahmet"],
      roots: ["رحم"],
      participants: ["Allah"]
    }
  },
  {
    key: "1:5a",
    name: "İbadet",
    input: {
      ayahText: "إِيَّاكَ نَعْبُدُ",
      translation: "Yalnız sana kulluk ederiz.",
      themes: ["ibadet", "tevhid"],
      roots: ["عبد"],
      participants: ["kul", "Allah"]
    }
  },
  {
    key: "1:5b",
    name: "Yardım",
    input: {
      ayahText: "وَإِيَّاكَ نَسْتَعِينُ",
      translation: "Yalnız senden yardım dileriz.",
      themes: ["dua", "yardım"],
      roots: ["عون"],
      participants: ["kul", "Allah"]
    }
  },
  {
    key: "1:6",
    name: "Hidayet",
    input: {
      ayahText: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
      translation: "Bizi dosdoğru yola ilet.",
      themes: ["hidayet", "dua"],
      roots: ["هدي", "صراط"],
      participants: ["kul", "Allah"]
    }
  },
  {
    key: "2:6",
    name: "İnkâr",
    input: {
      ayahText: "إِنَّ الَّذِينَ كَفَرُوا سَوَاءٌ عَلَيْهِمْ أَأَنْذَرْتَهُمْ أَمْ لَمْ تُنْذِرْهُمْ لَا يُؤْمِنُونَ",
      translation: "İnkâr edenler için fark etmez, uyarsan da uyarmasan da inanmazlar.",
      themes: ["inkar", "uyarı"],
      roots: ["كفر"],
      participants: ["insanlar"]
    }
  },
  {
    key: "2:7",
    name: "Kalp mühür",
    input: {
      ayahText: "خَتَمَ اللَّهُ عَلَىٰ قُلُوبِهِمْ",
      translation: "Allah onların kalplerini mühürlemiştir.",
      themes: ["kalp", "inkar"],
      roots: ["ختم", "قلب"],
      participants: ["Allah", "insanlar"]
    }
  },
  {
    key: "2:8",
    name: "Münafıklık",
    input: {
      ayahText: "وَمِنَ النَّاسِ مَنْ يَقُولُ آمَنَّا وَمَا هُمْ بِمُؤْمِنِينَ",
      translation: "Onlar inandık dediler, oysa inanmadılar.",
      themes: ["münafıklık"],
      roots: ["نفق"],
      participants: ["insanlar"]
    }
  },
  {
    key: "76:7",
    name: "Korku",
    input: {
      ayahText: "يَخَافُونَ يَوْمًا كَانَ شَرُّهُ مُسْتَطِيرًا",
      translation: "Onlar büyük bir günün hesabından korkarlar.",
      themes: ["ahiret", "korku"],
      roots: ["خوف", "حسب"],
      participants: ["insanlar"]
    }
  },
  {
    key: "8:46",
    name: "Sabır",
    input: {
      ayahText: "اصْبِرُوا إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
      translation: "Sabredin, çünkü Allah sabredenlerle beraberdir.",
      themes: ["sabır"],
      roots: ["صبر"],
      participants: ["Allah", "insanlar"]
    }
  },
  {
    key: "14:7",
    name: "Şükür",
    input: {
      ayahText: "لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
      translation: "Şükrederseniz artırırım.",
      themes: ["şükür"],
      roots: ["شكر"],
      participants: ["Allah", "insanlar"]
    }
  },
  {
    key: "23:13",
    name: "Yaratılış",
    input: {
      ayahText: "خَلَقْنَاكُمْ مِنْ مَاءٍ",
      translation: "Sizi bir damla sudan yarattık.",
      themes: ["yaratılış"],
      roots: ["خلق"],
      participants: ["Allah", "insanlar"]
    }
  },
  {
    key: "3:185",
    name: "Ölüm",
    input: {
      ayahText: "كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ",
      translation: "Her nefis ölümü tadacaktır.",
      themes: ["ölüm"],
      roots: ["موت"],
      participants: ["insanlar"]
    }
  },
  {
    key: "2:173",
    name: "Bağışlama",
    input: {
      ayahText: "إِنَّ اللَّهَ غَفُورٌ رَحِيمٌ",
      translation: "Allah bağışlayandır, merhamet edendir.",
      themes: ["bağışlama", "rahmet"],
      roots: ["غفر", "رحم"],
      participants: ["Allah"]
    }
  }
];

function parseDelayMs(): number {
  const raw = process.env.SEMANTIC_SMOKE_DELAY_MS?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_SMOKE_DELAY_MS;
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function includesPhrase(summary: string, phrase: string): boolean {
  return summary.toLocaleLowerCase("tr").includes(phrase.toLocaleLowerCase("tr"));
}

function unwrapFence(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

function inspectRawResponse(raw: string | null): RawResponseInspection {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      isJson: false,
      extraKeys: [],
      hasUsableSummary: false
    };
  }

  try {
    const parsed = JSON.parse(unwrapFence(raw));

    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        isJson: true,
        extraKeys: [],
        hasUsableSummary: false
      };
    }

    const keys = Object.keys(parsed);
    const extraKeys = keys.filter((key) => key !== "summary");
    const summary = (parsed as { summary?: unknown }).summary;
    const hasUsableSummary = typeof summary === "string" && summary.trim().length > 0;

    return {
      isJson: true,
      extraKeys,
      hasUsableSummary
    };
  } catch {
    return {
      isJson: false,
      extraKeys: [],
      hasUsableSummary: false
    };
  }
}

function previewRawText(raw: string | null): string {
  if (raw === null || raw.trim().length === 0) {
    return "(empty)";
  }

  const trimmed = raw.trim();
  return trimmed.length <= 300 ? trimmed : `${trimmed.slice(0, 300)}...`;
}

function countSentences(summary: string): number {
  return (summary.match(/[.!?]/g) ?? []).length;
}

function looksLikeOneToThreeSentences(summary: string): boolean {
  const sentenceCount = countSentences(summary);
  return sentenceCount >= 1 && sentenceCount <= 3;
}

function hasFinalPunctuation(summary: string): boolean {
  return /[.!?]\s*$/u.test(summary);
}

function normalizeForComparison(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/[.!?,;:"'`´’‘”“()\-\u061f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function looksLikeFragment(summary: string): boolean {
  const trimmed = summary.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (hasFinalPunctuation(trimmed)) {
    return false;
  }

  if (/\b(dir|dır|dur|dür|tir|tır|tur|tür|eder|olur|vardır|iletir|dileriz|ederiz)\b/iu.test(trimmed)) {
    return false;
  }

  return true;
}

function translationLooksImperativeOrSupplicative(translation: string): boolean {
  const normalized = translation.trim();

  if (normalized.length === 0) {
    return false;
  }

  return imperativeTranslationPatterns.some((pattern) => pattern.test(normalized));
}

function summaryLooksIndicative(summary: string): boolean {
  return indicativeSummaryPatterns.some((pattern) => pattern.test(summary));
}

function summaryPreservesImperativeOrSupplicativeMood(summary: string): boolean {
  return preservedMoodSummaryPatterns.some((pattern) => pattern.test(summary));
}

function looksTooCloseToTranslation(
  sampleKey: string,
  summary: string,
  translation: string
): boolean {
  const normalizedSummary = normalizeForComparison(summary);
  const normalizedTranslation = normalizeForComparison(translation);

  if (normalizedSummary === normalizedTranslation) {
    return true;
  }

  if (sampleKey === "23:13") {
    const mentionsDropOrigin =
      normalizedSummary.includes("bir damla") &&
      (normalizedSummary.includes("sudan") || normalizedSummary.includes("suyun"));

    return mentionsDropOrigin && normalizedSummary.includes("yarat");
  }

  return false;
}

function addWarningIfMatched(
  summary: string,
  phrases: Array<string | RegExp>,
  warning: string,
  warnings: string[]
): void {
  for (const phrase of phrases) {
    const matched =
      typeof phrase === "string" ? includesPhrase(summary, phrase) : phrase.test(summary);

    if (matched) {
      warnings.push(warning);
      return;
    }
  }
}

function normalizeForInterpretiveAnalysis(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .replace(/ç/gu, "c")
    .replace(/ğ/gu, "g")
    .replace(/ö/gu, "o")
    .replace(/ş/gu, "s")
    .replace(/ü/gu, "u")
    .replace(/[’']/gu, "")
    .replace(/[.!?,;:"`´”“()\-\u061f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function createEmptyInterpretiveBreakdown(): Record<InterpretiveCategory, number> {
  return {
    direct_phrases: 0,
    verb_patterns: 0,
    meta_language: 0,
    explanation_tone: 0,
    structural_signals: 0
  };
}

function pushUniquePattern(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function evaluateInterpretiveLanguage(
  summary: string,
  translation: string
): InterpretiveAssessment {
  const normalizedSummary = normalizeForInterpretiveAnalysis(summary);
  const normalizedTranslation = normalizeForInterpretiveAnalysis(translation);
  const matchedPatterns: string[] = [];
  const categoryBreakdown = createEmptyInterpretiveBreakdown();
  let score = 0;

  for (const phrase of interpretiveDirectPhrases) {
    if (normalizedSummary.includes(phrase)) {
      score += 35;
      categoryBreakdown.direct_phrases += 35;
      pushUniquePattern(matchedPatterns, `direct:${phrase}`);
    }
  }

  for (const { label, pattern } of interpretiveVerbPatterns) {
    if (pattern.test(normalizedSummary)) {
      score += 25;
      categoryBreakdown.verb_patterns += 25;
      pushUniquePattern(matchedPatterns, `verb:${label}`);
    }
  }

  for (const { label, pattern } of interpretiveMetaLanguagePatterns) {
    if (pattern.test(normalizedSummary)) {
      score += 20;
      categoryBreakdown.meta_language += 20;
      pushUniquePattern(matchedPatterns, `meta:${label}`);
    }
  }

  for (const { label, pattern } of interpretiveExplanationTonePatterns) {
    if (pattern.test(normalizedSummary)) {
      score += 25;
      categoryBreakdown.explanation_tone += 25;
      pushUniquePattern(matchedPatterns, `explanation:${label}`);
    }
  }

  if (normalizedSummary.length > normalizedTranslation.length + 18) {
    score += 15;
    categoryBreakdown.structural_signals += 15;
    pushUniquePattern(matchedPatterns, "structural:length-expansion");
  }

  for (const { label, pattern } of interpretiveStructuralAbstractPatterns) {
    if (pattern.test(normalizedSummary) && !pattern.test(normalizedTranslation)) {
      score += 15;
      categoryBreakdown.structural_signals += 15;
      pushUniquePattern(matchedPatterns, `structural:${label}`);
    }
  }

  if (normalizedSummary === normalizedTranslation) {
    score = Math.max(0, score - 15);
  }

  if (summary.trim().length <= 60 && !/\b(bu ayet|burada|anlamina gelir|ifade eder|gosterir)\b/u.test(normalizedSummary)) {
    score = Math.max(0, score - 10);
  }

  score = Math.min(100, score);

  let level: InterpretiveRiskLevel = "safe";
  if (score >= 60) {
    level = "high";
  } else if (score >= 40) {
    level = "medium";
  } else if (score >= 20) {
    level = "low";
  }

  return {
    score,
    level,
    matchedPatterns,
    categoryBreakdown
  };
}

function runBasicChecks(output: HybridSemanticAnalysisOutput): BasicCheckResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const summary = output.result.summary.trim();

  if (summary.length === 0) {
    reasons.push("summary is empty");
  }

  for (const phrase of bannedMetaPhrases) {
    if (includesPhrase(summary, phrase)) {
      reasons.push(`contains banned phrase: ${phrase}`);
    }
  }

  if (summary.length > 220) {
    reasons.push("summary is longer than 220 characters");
  }

  if (hasFinalPunctuation(summary) && !looksLikeOneToThreeSentences(summary)) {
    reasons.push("summary does not look like a natural one to three sentence output");
  }

  addWarningIfMatched(summary, normativeWarningPhrases, "normative-language", warnings);
  addWarningIfMatched(summary, artificialLanguageWarningPhrases, "artificial-language", warnings);
  addWarningIfMatched(summary, interpretiveLanguageWarningPhrases, "interpretive-language", warnings);

  return {
    passed: reasons.length === 0,
    reasons,
    warnings
  };
}

function getSurfaceWarnings(execution: SampleExecution): string[] {
  if (execution.output?.source !== "ai" || execution.output === null) {
    return [];
  }

  const warnings: string[] = [];
  const summary = execution.output.result.summary.trim();
  const translation = execution.sample.input.translation.trim();

  if (!hasFinalPunctuation(summary)) {
    warnings.push("missing-final-punctuation");
  }

  if (looksLikeFragment(summary)) {
    warnings.push("fragment-summary");
  }

  if (looksTooCloseToTranslation(execution.sample.key, summary, translation)) {
    warnings.push("too-close-to-translation");
  }

  if (
    translationLooksImperativeOrSupplicative(translation) &&
    !summaryPreservesImperativeOrSupplicativeMood(summary) &&
    summaryLooksIndicative(summary)
  ) {
    warnings.push("changed-mood");
  }

  addWarningIfMatched(summary, semanticDriftWarningPhrases, "semantic-drift", warnings);
  addWarningIfMatched(summary, badTurkishGrammarWarningPatterns, "bad-turkish-grammar", warnings);

  for (const warning of getAdditionalSemanticWarnings({
    sampleKey: execution.sample.key,
    summary,
    translation
  })) {
    warnings.push(warning);
  }

  return warnings;
}

function getQualityGuardReasons(execution: SampleExecution): string[] {
  if (execution.output?.source !== "ai" || execution.output === null) {
    return [];
  }

  const combinedWarnings = execution.combinedWarnings;

  return combinedWarnings.filter((warning) =>
    warning === "bad-turkish-grammar" ||
    warning === "semantic-drift" ||
    warning === "interpretive-language"
  );
}

function buildDisplaySelection(execution: SampleExecution): DisplaySelection {
  if (execution.output === null) {
    return {
      rawAiSummary: null,
      selectedSummary: null,
      selectedSource: "none",
      safeFallbackUsed: false,
      selectionReason: "no semantic result available",
      severity: "none",
      triggeringWarnings: []
    };
  }

  if (execution.output.source !== "ai") {
    const safeSummary = getSafeDeterministicSemanticSummary(execution.sample.key);

    if (safeSummary !== null) {
      return {
        rawAiSummary: execution.output.result.summary,
        selectedSummary: safeSummary,
        selectedSource: "safe_deterministic",
        safeFallbackUsed: true,
        selectionReason: "provider/parser fallback replaced by safe deterministic summary",
        severity: "high",
        triggeringWarnings: ["provider-fallback-safe-replacement"]
      };
    }

    return {
      rawAiSummary: execution.output.result.summary,
      selectedSummary: execution.output.result.summary,
      selectedSource: "fallback",
      safeFallbackUsed: false,
      selectionReason: "provider/parser fallback summary is being shown",
      severity: "none",
      triggeringWarnings: []
    };
  }

  const selection = selectSemanticSummaryForAyah({
    verseKey: execution.sample.key,
    rawSummary: execution.output.result.summary,
    warnings: execution.combinedWarnings
  });

  return {
    rawAiSummary: selection.rawSummary,
    selectedSummary: selection.selectedSummary,
    selectedSource: selection.selectedSource,
    safeFallbackUsed: selection.usedSafeFallback,
    selectionReason: selection.reason,
    severity: selection.severity,
    triggeringWarnings: selection.triggeringWarnings
  };
}

function classifyProviderError(error: unknown, rawResponse: string | null): ProviderRejectReason {
  if (error instanceof Error && error.message.includes("status 429")) {
    return "provider_429";
  }

  if (rawResponse !== null && rawResponse.trim().length === 0) {
    return "provider_empty";
  }

  return "provider_unknown";
}

async function callProviderWithRetry(
  provider: ReturnType<typeof createGroqSemanticProvider>,
  prompt: string
): Promise<{
  rawAiResponse: string | null;
  providerError: { name: string; message: string } | null;
  providerRejectReason: ProviderRejectReason | null;
  retryCount: number;
  recoveredFrom429: boolean;
}> {
  let retryCount = 0;
  let saw429 = false;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const rawAiResponse = await provider.generateSemanticAnalysis(prompt);

      return {
        rawAiResponse,
        providerError: null,
        providerRejectReason: null,
        retryCount,
        recoveredFrom429: saw429
      };
    } catch (error) {
      lastError = error;
      const is429 = error instanceof Error && error.message.includes("status 429");

      if (is429 && attempt < RETRY_DELAYS_MS.length) {
        saw429 = true;
        retryCount += 1;
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      return {
        rawAiResponse: null,
        providerError: {
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error)
        },
        providerRejectReason: classifyProviderError(error, null),
        retryCount,
        recoveredFrom429: false
      };
    }
  }

  return {
    rawAiResponse: null,
    providerError: {
      name: lastError instanceof Error ? lastError.name : "Error",
      message: lastError instanceof Error ? lastError.message : String(lastError)
    },
    providerRejectReason: classifyProviderError(lastError, null),
    retryCount,
    recoveredFrom429: false
  };
}

async function runSample(
  sample: SmokeSample,
  provider: ReturnType<typeof createGroqSemanticProvider>
): Promise<SampleExecution> {
  const prompt = buildAyahSemanticAnalysisPrompt(sample.input);
  const providerCall = await callProviderWithRetry(provider, prompt);

  if (providerCall.providerError !== null) {
    const fallbackResult = buildFallbackAyahSemanticSummary({
      translation: sample.input.translation,
      themes: sample.input.themes
    });

    const output =
      fallbackResult === null
        ? null
        : ({
            result: fallbackResult,
            source: "fallback"
          } satisfies HybridSemanticAnalysisOutput);

    return {
      sample,
      output,
      rawAiResponse: providerCall.rawAiResponse,
      parseResult: {
        ok: false,
        reason: "unknown"
      },
      parseStage: "provider",
      basicCheck: output === null ? null : runBasicChecks(output),
      inspection: inspectRawResponse(providerCall.rawAiResponse),
      providerError: providerCall.providerError,
      providerRejectReason: providerCall.providerRejectReason,
      retryCount: providerCall.retryCount,
      recoveredFrom429: providerCall.recoveredFrom429,
      simulatedFinalSource: output === null ? "none" : "fallback",
      qualityGuardReasons: [],
      interpretiveAssessment: null,
      surfaceWarnings: [],
      combinedWarnings: [],
      displaySelection: {
        rawAiSummary: null,
        selectedSummary: output?.result.summary ?? null,
        selectedSource: output === null ? "none" : "fallback",
        safeFallbackUsed: false,
        selectionReason:
          output === null ? "no semantic result available" : "provider/parser fallback summary is being shown",
        severity: "none",
        triggeringWarnings: []
      }
    };
  }

  const rawAiResponse = providerCall.rawAiResponse;
  const parseResult = parseAyahSemanticAnalysisResultDetailed(rawAiResponse ?? "");
  const inspection = inspectRawResponse(rawAiResponse);

  if (parseResult.ok) {
    const output: HybridSemanticAnalysisOutput = {
      result: { summary: parseResult.summary },
      source: "ai"
    };
    const interpretiveAssessment = evaluateInterpretiveLanguage(
      output.result.summary,
      sample.input.translation
    );

    return {
      sample,
      output,
      rawAiResponse,
      parseResult,
      parseStage: "parser",
      basicCheck: runBasicChecks(output),
      inspection,
      providerError: null,
      providerRejectReason: null,
      retryCount: providerCall.retryCount,
      recoveredFrom429: providerCall.recoveredFrom429,
      simulatedFinalSource: "ai",
      qualityGuardReasons: [],
      interpretiveAssessment,
      surfaceWarnings: [],
      combinedWarnings: [],
      displaySelection: {
        rawAiSummary: output.result.summary,
        selectedSummary: output.result.summary,
        selectedSource: "ai",
        safeFallbackUsed: false,
        selectionReason: "pending warning evaluation",
        severity: "none",
        triggeringWarnings: []
      }
    };
  }

  const fallbackResult = buildFallbackAyahSemanticSummary({
    translation: sample.input.translation,
    themes: sample.input.themes
  });

  const output =
    fallbackResult === null
      ? null
      : ({
          result: fallbackResult,
          source: "fallback"
        } satisfies HybridSemanticAnalysisOutput);

  return {
    sample,
    output,
    rawAiResponse,
    parseResult,
    parseStage: "parser",
    basicCheck: output === null ? null : runBasicChecks(output),
    inspection,
    providerError: null,
    providerRejectReason: null,
    retryCount: providerCall.retryCount,
    recoveredFrom429: providerCall.recoveredFrom429,
    simulatedFinalSource: output === null ? "none" : "fallback",
    qualityGuardReasons: [],
    interpretiveAssessment: null,
    surfaceWarnings: [],
    combinedWarnings: [],
    displaySelection: {
      rawAiSummary: null,
      selectedSummary: output?.result.summary ?? null,
      selectedSource: output === null ? "none" : "fallback",
      safeFallbackUsed: false,
      selectionReason:
        output === null ? "no semantic result available" : "provider/parser fallback summary is being shown",
      severity: "none",
      triggeringWarnings: []
    }
  };
}

function printStandardResult(execution: SampleExecution): void {
  if (execution.output === null || execution.basicCheck === null) {
    console.log(`--- Sample: ${execution.sample.name} (${execution.sample.key}) ---`);
    console.log("");
    console.log("Source: none");
    console.log("Simulated Final Source: none");
    console.log("");
    console.log("Summary:");
    console.log("No semantic result (AI + fallback failed)");
    console.log("");
    console.log("Basic Check: FAIL");
    console.log("");
    console.log("Reasons: no result");
    console.log("");
    return;
  }

  console.log(`--- Sample: ${execution.sample.name} (${execution.sample.key}) ---`);
  console.log("");
  console.log(`Source: ${execution.output.source}`);
  console.log(`Simulated Final Source: ${execution.simulatedFinalSource}`);
  console.log(`Selected Source: ${execution.displaySelection.selectedSource}`);
  console.log(`Safe Deterministic Used: ${execution.displaySelection.safeFallbackUsed ? "true" : "false"}`);
  console.log(`retryCount: ${execution.retryCount}`);
  console.log(`recoveredFrom429: ${execution.recoveredFrom429 ? "true" : "false"}`);
  console.log("");
  console.log("Raw AI Summary:");
  console.log(execution.displaySelection.rawAiSummary ?? "(not applicable)");
  console.log("");
  console.log("Selected Summary:");
  console.log(execution.displaySelection.selectedSummary ?? "(none)");
  console.log("");
  console.log(`Basic Check: ${execution.basicCheck.passed ? "PASS" : "FAIL"}`);
  console.log(`Selection Severity: ${execution.displaySelection.severity}`);
  console.log(`Selection Reason: ${execution.displaySelection.selectionReason}`);

  if (execution.combinedWarnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of execution.combinedWarnings) {
      console.log(`- ${warning}`);
    }
  }

  if (execution.interpretiveAssessment !== null) {
    console.log("");
    console.log(
      `Interpretive score: ${execution.interpretiveAssessment.score} (${execution.interpretiveAssessment.level})`
    );
    console.log(
      `Matched patterns: ${
        execution.interpretiveAssessment.matchedPatterns.length > 0
          ? execution.interpretiveAssessment.matchedPatterns.join(", ")
          : "none"
      }`
    );
    console.log("Category breakdown:");
    for (const [category, value] of Object.entries(execution.interpretiveAssessment.categoryBreakdown)) {
      console.log(`- ${category}: ${value}`);
    }
  }

  if (!execution.basicCheck.passed) {
    console.log("");
    console.log(`Reasons: ${execution.basicCheck.reasons.join(" | ")}`);
  }

  console.log("");
}

function printFallbackDiagnostics(execution: SampleExecution): void {
  if (
    execution.output?.source !== "fallback" &&
    execution.output?.source !== "fallback_after_quality_guard" &&
    execution.simulatedFinalSource !== "fallback_after_quality_guard"
  ) {
    return;
  }

  console.log("Fallback Diagnostics:");
  console.log(`- Ayah title/key: ${execution.sample.name} (${execution.sample.key})`);
  console.log(`- Input translation: ${execution.sample.input.translation}`);
  console.log(`- Parse stage: ${execution.parseStage}`);
  console.log(`- Parser reject reason: ${execution.parseResult.ok ? "none" : execution.parseResult.reason}`);
  console.log(`- Provider reject reason: ${execution.providerRejectReason ?? "none"}`);
  console.log(`- Raw AI response preview: ${previewRawText(execution.rawAiResponse)}`);
  console.log(`- Raw output JSON: ${execution.inspection.isJson ? "yes" : "no"}`);
  console.log(
    `- Extra keys: ${execution.inspection.extraKeys.length > 0 ? execution.inspection.extraKeys.join(", ") : "none"}`
  );
  console.log(`- Summary actually usable: ${execution.inspection.hasUsableSummary ? "yes" : "no"}`);
  if (execution.providerError !== null) {
    console.log(`- Provider error: ${execution.providerError.name}: ${execution.providerError.message}`);
  }
  if (execution.qualityGuardReasons.length > 0) {
    console.log(`- Quality guard reasons: ${execution.qualityGuardReasons.join(", ")}`);
  }
  console.log("");
}

(async () => {
  console.log("Semantic Analysis Smoke (Groq Quality Check)");
  console.log("");

  const apiKey = process.env.GROQ_API_KEY?.trim() ?? "";
  const smokeDelayMs = parseDelayMs();

  if (apiKey.length === 0) {
    console.log("GROQ_API_KEY not found");
    return;
  }

  try {
    const provider = createGroqSemanticProvider({ apiKey });
    const executions: SampleExecution[] = [];
    const parserRejectDistribution = new Map<string, number>();
    const providerErrorDistribution = new Map<string, number>();
    const qualityGuardFallbackReasons = new Map<string, number>();
    const interpretivePatternDistribution = new Map<string, number>();
    let actualAiCount = 0;
    let actualFallbackCount = 0;
    let simulatedAiCount = 0;
    let simulatedFallbackCount = 0;
    let selectedAiCount = 0;
    let selectedSafeDeterministicCount = 0;
    let selectedFallbackCount = 0;
    let selectedNoneCount = 0;
    let providerUnavailableCount = 0;
    let rawAiTwoSentenceCount = 0;
    let rawAiThreeSentenceCount = 0;
    let selectedTwoSentenceCount = 0;
    let selectedThreeSentenceCount = 0;
    let warningCount = 0;
    const surfaceWarningDistribution = new Map<string, number>();
    let recoveredFrom429Count = 0;
    let provider429FinalFailuresCount = 0;
    let qualityGuardFallbackCount = 0;
    let interpretiveScoreTotal = 0;
    let interpretiveAssessmentCount = 0;
    let interpretiveAbove40Count = 0;
    let interpretiveAbove60Count = 0;

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      const execution = await runSample(sample, provider);
      execution.surfaceWarnings = getSurfaceWarnings(execution);
      execution.combinedWarnings = [
        ...(execution.basicCheck?.warnings ?? []),
        ...execution.surfaceWarnings
      ];
      execution.qualityGuardReasons = getQualityGuardReasons(execution);
      execution.displaySelection = buildDisplaySelection(execution);
      execution.simulatedFinalSource =
        execution.output?.source === "ai" && execution.qualityGuardReasons.length > 0
          ? "fallback_after_quality_guard"
          : execution.output?.source ?? "none";
      executions.push(execution);

      if (execution.output?.source === "ai") {
        actualAiCount += 1;
      }

      if (
        execution.output?.source === "fallback" ||
        execution.output?.source === "fallback_after_quality_guard"
      ) {
        actualFallbackCount += 1;

        if (execution.parseStage === "parser" && !execution.parseResult.ok) {
          parserRejectDistribution.set(
            execution.parseResult.reason,
            (parserRejectDistribution.get(execution.parseResult.reason) ?? 0) + 1
          );
        }

        if (execution.providerRejectReason !== null) {
          providerErrorDistribution.set(
            execution.providerRejectReason,
            (providerErrorDistribution.get(execution.providerRejectReason) ?? 0) + 1
          );

          if (execution.providerRejectReason === "provider_429") {
            provider429FinalFailuresCount += 1;
          }
        }
      }

      if (execution.simulatedFinalSource === "ai") {
        simulatedAiCount += 1;
      } else if (
        execution.simulatedFinalSource === "fallback" ||
        execution.simulatedFinalSource === "fallback_after_quality_guard"
      ) {
        simulatedFallbackCount += 1;
      }

      if (execution.simulatedFinalSource === "fallback_after_quality_guard") {
        qualityGuardFallbackCount += 1;
        for (const reason of execution.qualityGuardReasons) {
          qualityGuardFallbackReasons.set(
            reason,
            (qualityGuardFallbackReasons.get(reason) ?? 0) + 1
          );
        }
      }

      if (execution.recoveredFrom429) {
        recoveredFrom429Count += 1;
      }

      if (execution.providerError !== null) {
        providerUnavailableCount += 1;
      }

      if (execution.displaySelection.selectedSource === "ai") {
        selectedAiCount += 1;
      } else if (execution.displaySelection.selectedSource === "safe_deterministic") {
        selectedSafeDeterministicCount += 1;
      } else if (execution.displaySelection.selectedSource === "fallback") {
        selectedFallbackCount += 1;
      } else {
        selectedNoneCount += 1;
      }

      if (execution.displaySelection.rawAiSummary !== null) {
        const rawSentenceCount = countSentences(execution.displaySelection.rawAiSummary);
        if (rawSentenceCount === 2) {
          rawAiTwoSentenceCount += 1;
        } else if (rawSentenceCount === 3) {
          rawAiThreeSentenceCount += 1;
        }
      }

      if (execution.displaySelection.selectedSummary !== null) {
        const selectedSentenceCount = countSentences(execution.displaySelection.selectedSummary);
        if (selectedSentenceCount === 2) {
          selectedTwoSentenceCount += 1;
        } else if (selectedSentenceCount === 3) {
          selectedThreeSentenceCount += 1;
        }
      }

      if (execution.interpretiveAssessment !== null) {
        interpretiveAssessmentCount += 1;
        interpretiveScoreTotal += execution.interpretiveAssessment.score;

        if (execution.interpretiveAssessment.score >= 40) {
          interpretiveAbove40Count += 1;
        }

        if (execution.interpretiveAssessment.score >= 60) {
          interpretiveAbove60Count += 1;
        }

        for (const pattern of execution.interpretiveAssessment.matchedPatterns) {
          interpretivePatternDistribution.set(
            pattern,
            (interpretivePatternDistribution.get(pattern) ?? 0) + 1
          );
        }
      }

      warningCount += execution.basicCheck?.warnings.length ?? 0;
      for (const warning of execution.surfaceWarnings) {
        warningCount += 1;
        surfaceWarningDistribution.set(
          warning,
          (surfaceWarningDistribution.get(warning) ?? 0) + 1
        );
      }

      printStandardResult(execution);
      printFallbackDiagnostics(execution);

      if (index < samples.length - 1) {
        await sleep(smokeDelayMs);
      }
    }

    console.log("=== Summary ===");
    console.log(`Total samples: ${samples.length}`);
    console.log(`Effective delay (ms): ${smokeDelayMs}`);
    console.log(`Max retry: ${RETRY_DELAYS_MS.length}`);
    console.log(`Actual AI results: ${actualAiCount}`);
    console.log(`Actual fallback results: ${actualFallbackCount}`);
    console.log(`Simulated AI results: ${simulatedAiCount}`);
    console.log(`Simulated fallback results: ${simulatedFallbackCount}`);
    console.log(`Selected AI summaries: ${selectedAiCount}`);
    console.log(`Selected safe deterministic summaries: ${selectedSafeDeterministicCount}`);
    console.log(`Selected fallback summaries: ${selectedFallbackCount}`);
    console.log(`Selected none summaries: ${selectedNoneCount}`);
    console.log(`Provider-unavailable samples: ${providerUnavailableCount}`);
    console.log(`Raw AI summaries with 2 sentences: ${rawAiTwoSentenceCount}`);
    console.log(`Raw AI summaries with 3 sentences: ${rawAiThreeSentenceCount}`);
    console.log(`Selected summaries with 2 sentences: ${selectedTwoSentenceCount}`);
    console.log(`Selected summaries with 3 sentences: ${selectedThreeSentenceCount}`);
    console.log(`Quality-guard fallback count: ${qualityGuardFallbackCount}`);
    console.log(`Recovered from 429: ${recoveredFrom429Count}`);
    console.log(`Provider 429 final failures: ${provider429FinalFailuresCount}`);
    console.log(`Total warnings: ${warningCount}`);
    console.log(
      `Average interpretive score: ${
        interpretiveAssessmentCount > 0
          ? (interpretiveScoreTotal / interpretiveAssessmentCount).toFixed(1)
          : "0.0"
      }`
    );
    console.log(
      `% interpretive score >= 40: ${
        interpretiveAssessmentCount > 0
          ? ((interpretiveAbove40Count / interpretiveAssessmentCount) * 100).toFixed(1)
          : "0.0"
      }`
    );
    console.log(
      `% interpretive score >= 60: ${
        interpretiveAssessmentCount > 0
          ? ((interpretiveAbove60Count / interpretiveAssessmentCount) * 100).toFixed(1)
          : "0.0"
      }`
    );

    const problematicSamples = executions
      .filter((item) => {
        const providerAvailabilityIssueOnly =
          item.providerError !== null &&
          item.combinedWarnings.length === 0 &&
          item.displaySelection.selectedSource !== "ai";

        if (providerAvailabilityIssueOnly) {
          return false;
        }

        return (
          item.output?.source === "fallback" ||
          item.displaySelection.selectedSource === "safe_deterministic" ||
          item.simulatedFinalSource === "fallback_after_quality_guard" ||
          item.basicCheck?.warnings.length ||
          item.surfaceWarnings.length ||
          item.basicCheck?.passed === false
        );
      })
      .map((item) => `${item.sample.name} (${item.sample.key})`);

    console.log(`Problematic samples: ${problematicSamples.length > 0 ? problematicSamples.join(", ") : "none"}`);
    console.log("");
    console.log("Parser reject distribution:");
    if (parserRejectDistribution.size === 0) {
      console.log("none");
    } else {
      for (const [reason, count] of parserRejectDistribution.entries()) {
        console.log(`${reason}: ${count}`);
      }
    }

    console.log("");
    console.log("Provider error distribution:");
    if (providerErrorDistribution.size === 0) {
      console.log("none");
    } else {
      for (const [reason, count] of providerErrorDistribution.entries()) {
        console.log(`${reason}: ${count}`);
      }
    }

    if (provider429FinalFailuresCount > 0) {
      console.log("");
      console.log("Suggestion:");
      console.log("SEMANTIC_SMOKE_DELAY_MS değerini artırmayı deneyin.");
    }

    console.log("");
    console.log("Quality-guard fallback reasons:");
    if (qualityGuardFallbackReasons.size === 0) {
      console.log("none");
    } else {
      for (const [reason, count] of qualityGuardFallbackReasons.entries()) {
        console.log(`${reason}: ${count}`);
      }
    }

    console.log("");
    console.log("Surface warning distribution:");
    if (surfaceWarningDistribution.size === 0) {
      console.log("none");
    } else {
      for (const reason of trackedSurfaceWarnings) {
        console.log(`${reason}: ${surfaceWarningDistribution.get(reason) ?? 0}`);
      }

      for (const [reason, count] of surfaceWarningDistribution.entries()) {
        if (trackedSurfaceWarnings.includes(reason as (typeof trackedSurfaceWarnings)[number])) {
          continue;
        }

        console.log(`${reason}: ${count}`);
      }
    }

    console.log("");
    console.log("Top repeated interpretive patterns:");
    if (interpretivePatternDistribution.size === 0) {
      console.log("none");
    } else {
      const topPatterns = Array.from(interpretivePatternDistribution.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 10);

      for (const [pattern, count] of topPatterns) {
        console.log(`${pattern}: ${count}`);
      }
    }
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
  }
})();
