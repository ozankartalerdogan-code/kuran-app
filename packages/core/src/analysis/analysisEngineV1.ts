import type { AyahAnalysisEngineV1, AyahDetailPayload, WordAnalysis } from "@quran-app/types";
import { getSurahContext } from "../quran/getSurahContext";
import { getAyahDetail } from "./getAyahDetail";

const analysisEngineSource = "analysis-engine-v1:rule-based";

const themeLabels = [
  "tevhid",
  "rahmet",
  "hidayet",
  "ibadet",
  "dua",
  "iman",
  "inkar",
  "ahiret",
  "adalet",
  "sabir",
  "infak",
  "yaratilis"
] as const;

type AnalysisTheme = (typeof themeLabels)[number];

type AnalysisDebugSource = "text-rule" | "root-rule" | "other";

interface AnalysisDebugMatch {
  theme?: string;
  label?: string;
  source: AnalysisDebugSource;
  matchedBy: string[];
}

export interface AyahAnalysisEngineDebug {
  verseKey: string;
  analysis: AyahAnalysisEngineV1 | null;
  themeDebug: Array<{
    theme: string;
    source: AnalysisDebugSource;
    matchedBy: string[];
  }>;
  participantDebug: {
    mentioned: Array<{
      label: string;
      source: AnalysisDebugSource;
      matchedBy: string[];
    }>;
    addressee: {
      value: string;
      matchedBy: string[];
    } | null;
    speaker: {
      value: string;
      matchedBy: string[];
    } | null;
  };
  summaryDebug: {
    produced: boolean;
    usedThemes: string[];
    usedMentioned: string[];
    template: string | null;
  };
}

const allowedThemes = new Set<string>(themeLabels);

const rootThemeRules: Record<string, AnalysisTheme[]> = {
  اله: ["tevhid"],
  احد: ["tevhid"],
  وحد: ["tevhid"],
  رحم: ["rahmet"],
  هدي: ["hidayet"],
  عبد: ["ibadet"],
  صلو: ["ibadet", "dua"],
  دعو: ["dua"],
  عون: ["dua"],
  عوذ: ["dua"],
  امن: ["iman"],
  كفر: ["inkar"],
  كذب: ["inkar"],
  بعث: ["ahiret"],
  حشر: ["ahiret"],
  جزي: ["ahiret"],
  عدل: ["adalet"],
  حكم: ["adalet"],
  صبر: ["sabir"],
  نفق: ["infak"],
  رزق: ["infak"],
  خلق: ["yaratilis"],
  فطر: ["yaratilis"]
};

const textThemeRules: Array<{ theme: AnalysisTheme; patterns: RegExp[] }> = [
  { theme: "tevhid", patterns: [/ilah/u] },
  { theme: "rahmet", patterns: [/rahmet/u, /merhamet/u] },
  { theme: "hidayet", patterns: [/hidayet/u, /doğru yol/u, /rehber/u] },
  { theme: "ibadet", patterns: [/ibadet/u, /kulluk/u, /namaz/u] },
  { theme: "dua", patterns: [/dua/u, /yardım ister/u, /yardım diler/u, /sığın/u, /yakarı/u] },
  { theme: "iman", patterns: [/iman eden/u, /inanan/u] },
  { theme: "inkar", patterns: [/inkar/u, /kafir/u, /yalanla/u] },
  { theme: "ahiret", patterns: [/hesap günü/u] },
  { theme: "adalet", patterns: [/adalet/u] },
  { theme: "sabir", patterns: [/sabır/u, /sabreden/u] },
  { theme: "infak", patterns: [/infak/u, /rızık/u, /harca/u] }
];

const mentionedParticipantRules: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Allah", patterns: [/اللّٰه/u, /الله/u] },
  { label: "müminler", patterns: [/ey iman edenler/u] },
  { label: "inkar edenler", patterns: [/inkar eden/u, /kafir/u, /yalanlayan/u] },
  { label: "insanlar", patterns: [/ey insanlar/u, /النّاس/u, /الناس/u] },
  { label: "peygamber", patterns: [/resul/u, /elçi/u, /النبي/u, /الرسول/u] }
];

const addresseeRules: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "insanlar", patterns: [/ey insanlar/u, /يَا أَيُّهَا النَّاس/u, /يا ايها الناس/u] },
  {
    label: "müminler",
    patterns: [/ey iman edenler/u, /يَا أَيُّهَا الَّذِينَ آمَنُوا/u, /يا ايها الذين امنوا/u]
  }
];

function parseVerseKey(verseKey: string): { surahId: number; ayahNumber: number } | null {
  const match = /^(\d+):(\d+)$/u.exec(verseKey.trim());

  if (!match) {
    return null;
  }

  const surahId = Number(match[1]);
  const ayahNumber = Number(match[2]);

  if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) {
    return null;
  }

  if (surahId < 1 || surahId > 114 || ayahNumber < 1) {
    return null;
  }

  return { surahId, ayahNumber };
}

function getTextSignals(detail: AyahDetailPayload): string {
  const translationText = detail.translations
    .map((translation) => translation.text)
    .filter((text): text is string => typeof text === "string" && text.length > 0)
    .join(" ");

  const wordText = detail.wordAnalyses
    .flatMap((word) => [
      word.arabic,
      word.transliteration,
      word.meaning?.text,
      word.rootExplanation?.text
    ])
    .filter((text): text is string => typeof text === "string" && text.length > 0)
    .join(" ");

  return `${detail.ayah.arabicText ?? ""} ${translationText} ${wordText}`.toLocaleLowerCase("tr");
}

function addTheme(target: Set<string>, theme: AnalysisTheme): void {
  if (allowedThemes.has(theme)) {
    target.add(theme);
  }
}

function addDebugMatch(
  matches: Map<string, AnalysisDebugMatch>,
  key: string,
  match: AnalysisDebugMatch
): void {
  const existingMatch = matches.get(key);

  if (!existingMatch) {
    matches.set(key, match);
    return;
  }

  existingMatch.matchedBy.push(...match.matchedBy);
}

function getPatternLabel(pattern: RegExp): string {
  return pattern.toString();
}

function detectAnalysisThemeDebug(detail: AyahDetailPayload) {
  const matches = new Map<string, AnalysisDebugMatch>();
  const textSignals = getTextSignals(detail);

  for (const word of detail.wordAnalyses) {
    const root = word.root?.trim();

    if (!root) {
      continue;
    }

    for (const theme of rootThemeRules[root] ?? []) {
      addDebugMatch(matches, `${theme}:root-rule`, {
        theme,
        source: "root-rule",
        matchedBy: [`root:${root};wordIndex:${word.wordIndex};arabic:${word.arabic ?? ""}`]
      });
    }
  }

  for (const rule of textThemeRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(textSignals)) {
        addDebugMatch(matches, `${rule.theme}:text-rule`, {
          theme: rule.theme,
          source: "text-rule",
          matchedBy: [getPatternLabel(pattern)]
        });
      }
    }
  }

  return Array.from(matches.values()).map((match) => ({
    theme: match.theme ?? "",
    source: match.source,
    matchedBy: [...new Set(match.matchedBy)]
  }));
}

export function detectAnalysisThemes(detail: AyahDetailPayload): string[] {
  const themes = new Set<string>();
  const textSignals = getTextSignals(detail);

  for (const word of detail.wordAnalyses) {
    const root = word.root?.trim();

    if (!root) {
      continue;
    }

    for (const theme of rootThemeRules[root] ?? []) {
      addTheme(themes, theme);
    }
  }

  for (const rule of textThemeRules) {
    if (rule.patterns.some((pattern) => pattern.test(textSignals))) {
      addTheme(themes, rule.theme);
    }
  }

  return themeLabels.filter((theme) => themes.has(theme));
}

function detectFirstMatchingLabel(
  rules: Array<{ label: string; patterns: RegExp[] }>,
  textSignals: string
): string | null {
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(textSignals))) {
      return rule.label;
    }
  }

  return null;
}

function detectMentionedParticipants(textSignals: string, wordAnalyses: WordAnalysis[]): string[] {
  const mentioned = new Set<string>();

  for (const rule of mentionedParticipantRules) {
    if (rule.patterns.some((pattern) => pattern.test(textSignals))) {
      mentioned.add(rule.label);
    }
  }

  for (const word of wordAnalyses) {
    if (word.root === "اله") {
      mentioned.add("Allah");
    }
  }

  return Array.from(mentioned);
}

function detectMentionedParticipantDebug(textSignals: string, wordAnalyses: WordAnalysis[]) {
  const matches = new Map<string, AnalysisDebugMatch>();

  for (const rule of mentionedParticipantRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(textSignals)) {
        addDebugMatch(matches, `${rule.label}:text-rule`, {
          label: rule.label,
          source: "text-rule",
          matchedBy: [getPatternLabel(pattern)]
        });
      }
    }
  }

  for (const word of wordAnalyses) {
    if (word.root === "اله") {
      addDebugMatch(matches, "Allah:root-rule", {
        label: "Allah",
        source: "root-rule",
        matchedBy: [`root:${word.root};wordIndex:${word.wordIndex};arabic:${word.arabic ?? ""}`]
      });
    }
  }

  return Array.from(matches.values()).map((match) => ({
    label: match.label ?? "",
    source: match.source,
    matchedBy: [...new Set(match.matchedBy)]
  }));
}

function detectAddresseeDebug(
  textSignals: string
): AyahAnalysisEngineDebug["participantDebug"]["addressee"] {
  for (const rule of addresseeRules) {
    const matchedBy = rule.patterns
      .filter((pattern) => pattern.test(textSignals))
      .map(getPatternLabel);

    if (matchedBy.length > 0) {
      return {
        value: rule.label,
        matchedBy
      };
    }
  }

  return null;
}

export function detectAnalysisParticipants(detail: AyahDetailPayload): AyahAnalysisEngineV1["participants"] {
  const textSignals = getTextSignals(detail);

  return {
    speaker: null,
    addressee: detectFirstMatchingLabel(addresseeRules, textSignals),
    mentioned: detectMentionedParticipants(textSignals, detail.wordAnalyses)
  };
}

export function buildAyahAnalysisSummary(
  themes: string[],
  participants: AyahAnalysisEngineV1["participants"]
): string | null {
  if (themes.length === 0 && participants.mentioned.length === 0) {
    return null;
  }

  const lowConfidenceThemeOnlySummaries = new Set<string>(["rahmet", "iman", "ahiret", "adalet", "sabir", "infak"]);

  if (
    themes.length === 1 &&
    participants.mentioned.length === 0 &&
    lowConfidenceThemeOnlySummaries.has(themes[0])
  ) {
    return null;
  }

  if (themes.length === 0 && participants.mentioned.length > 0 && participants.addressee === null) {
    return null;
  }

  return null;
}

function buildSummaryDebug(
  summary: string | null,
  themes: string[],
  participants: AyahAnalysisEngineV1["participants"]
): AyahAnalysisEngineDebug["summaryDebug"] {
  const usedThemes = themes.slice(0, 3);
  const usedMentioned = participants.mentioned.slice(0, 3);
  let template: string | null = null;

  if (summary !== null) {
    if (usedThemes.length > 0 && usedMentioned.length > 0) {
      template = "theme-and-mentioned";
    } else if (usedThemes.length > 0) {
      template = "theme-only";
    } else if (usedMentioned.length > 0) {
      template = "mentioned-only";
    }
  }

  return {
    produced: summary !== null,
    usedThemes,
    usedMentioned,
    template
  };
}

export async function getAyahAnalysisEngine(
  verseKey: string
): Promise<AyahAnalysisEngineV1 | null> {
  const parsedVerseKey = parseVerseKey(verseKey);

  if (parsedVerseKey === null) {
    return null;
  }

  const { surahId, ayahNumber } = parsedVerseKey;
  let detail: Awaited<ReturnType<typeof getAyahDetail>>;
  try {
    [detail] = await Promise.all([
      getAyahDetail(surahId, ayahNumber, { wordAnalysisSource: "canonical" }),
      getSurahContext(surahId)
    ]);
  } catch (err) {
    console.error(`[analysisEngineV1] ${verseKey} yüklenemedi:`, err);
    return null;
  }

  if (detail.status !== "available") {
    return null;
  }

  const themes = detectAnalysisThemes(detail);
  const participants = detectAnalysisParticipants(detail);

  return {
    verseKey,
    summary: buildAyahAnalysisSummary(themes, participants),
    participants,
    themes,
    source: analysisEngineSource
  };
}

function emptyAyahAnalysisEngineDebug(verseKey: string): AyahAnalysisEngineDebug {
  return {
    verseKey,
    analysis: null,
    themeDebug: [],
    participantDebug: {
      mentioned: [],
      addressee: null,
      speaker: null
    },
    summaryDebug: {
      produced: false,
      usedThemes: [],
      usedMentioned: [],
      template: null
    }
  };
}

export async function getAyahAnalysisEngineDebug(
  verseKey: string
): Promise<AyahAnalysisEngineDebug> {
  const parsedVerseKey = parseVerseKey(verseKey);

  if (parsedVerseKey === null) {
    return emptyAyahAnalysisEngineDebug(verseKey);
  }

  const { surahId, ayahNumber } = parsedVerseKey;
  let detail: Awaited<ReturnType<typeof getAyahDetail>>;
  try {
    [detail] = await Promise.all([
      getAyahDetail(surahId, ayahNumber, { wordAnalysisSource: "canonical" }),
      getSurahContext(surahId)
    ]);
  } catch (err) {
    console.error(`[analysisEngineV1Debug] ${verseKey} yüklenemedi:`, err);
    return emptyAyahAnalysisEngineDebug(verseKey);
  }

  if (detail.status !== "available") {
    return emptyAyahAnalysisEngineDebug(verseKey);
  }

  const textSignals = getTextSignals(detail);
  const themes = detectAnalysisThemes(detail);
  const participants = detectAnalysisParticipants(detail);
  const summary = buildAyahAnalysisSummary(themes, participants);
  const analysis: AyahAnalysisEngineV1 = {
    verseKey,
    summary,
    participants,
    themes,
    source: analysisEngineSource
  };

  return {
    verseKey,
    analysis,
    themeDebug: detectAnalysisThemeDebug(detail),
    participantDebug: {
      mentioned: detectMentionedParticipantDebug(textSignals, detail.wordAnalyses),
      addressee: detectAddresseeDebug(textSignals),
      speaker: null
    },
    summaryDebug: buildSummaryDebug(summary, themes, participants)
  };
}
