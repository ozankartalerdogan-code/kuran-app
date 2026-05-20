export type SemanticWarning =
  | "possible-semantic-drift"
  | "missing-key-relation"
  | "too-generic-summary"
  | "severe-mechanical-or-awkward-turkish"
  | "mechanical-or-awkward-turkish"
  | "weak-summary";

export type AdditionalSemanticWarning = SemanticWarning;

export type SemanticWarningInput = {
  verseKey: string;
  summary: string;
  translation?: string;
};

type RelationRequirement = {
  label: string;
  patterns: Array<string | RegExp>;
};

type KeyRelationRule = {
  requireAll?: RelationRequirement[];
  requireAtLeast?: {
    minimum: number;
    groups: RelationRequirement[];
  };
};

const possibleSemanticDriftPhrases = [
  "sınırsız",
  "iyilik yapma isteği",
  "psikolojik",
  "toplumsal",
  "ahlaki gelişim",
  "içsel huzur",
  "bilinç dönüşümü",
  "evrensel mesaj",
  "modern insan",
  "kişisel gelişim",
  "hayat dersi"
];

const tooGenericSummaryPhrases = [
  "allah merhametlidir",
  "allah bağışlayandır",
  "insan yaratılmıştır",
  "ölüm vardır"
];

const mechanicalOrAwkwardTurkishPhrases = [
  "bir gerçek",
  "kullanılan ibare",
  "söylemektedir",
  "deneyimleyecektir",
  "gerçeğini hatırlayın",
  "allahın",
  "düzenli yol"
];

const mechanicalOrAwkwardRawPatterns: RegExp[] = [/\bInanç\b/u];

const sampleSpecificDriftPhrases: Record<string, string[]> = {
  "1:5": ["gerekir", "zorundadır", "yapmalıdır", "farzdır"],
  "1:3": ["dua", "yardım", "beklenti", "muhatap", "nihai adres", "nihai muhatap"],
  "2:7": [
    "iradesini belirlemiştir",
    "iradelerini etkilemiştir",
    "özgür irade",
    "iyilik yapma isteği",
    "koruması altında",
    "iç dünyalarını korur",
    "kötülüğe yöneltir",
    "ahlaki yetenek",
    "seçim gücü"
  ]
};

const sampleSpecificGenericSummaryPhrases: Record<string, string[]> = {
  "2:173": [
    "allah merhametlidir",
    "allah bağışlayandır",
    "allahın bağışlayıcılığı ve merhameti vardır",
    "allahın merhameti ve bağışlayıcılığı vardır"
  ]
};

const sampleSpecificWeakSummaryPhrases: Record<string, string[]> = {
  "1:1": ["allahın adıyla başlanır"],
  "1:6": ["düzenli yol"],
  "2:7": ["insanların kalplerine konulmuştur", "insanların kalpleri"]
};

const sampleSpecificSevereMechanicalPatterns: Record<string, Array<string | RegExp>> = {
  "8:46": [
    "bilgisini sakınmak için",
    "olduğu bilgisini sakınmak",
    "sakınmak için sabredin",
    /\bsakınmak\b.*\bsabredin\b/iu,
    /\ballah'?ın\b.*\bolduğu bilgis/i
  ]
};

const missingKeyRelationRules: Record<string, KeyRelationRule> = {
  "1:5a": {
    requireAll: [
      { label: "exclusivity", patterns: ["yalnız", "tahsis"] },
      { label: "worship", patterns: ["kulluk", "ibadet"] }
    ]
  },
  "1:5b": {
    requireAll: [
      { label: "exclusivity", patterns: ["yalnız", "nihai"] },
      { label: "help", patterns: ["yardım"] },
      { label: "target", patterns: ["allah", "senden"] }
    ]
  },
  "1:6": {
    requireAll: [
      { label: "guidance", patterns: ["doğru yola", "yol"] },
      { label: "request-target", patterns: ["ilet", "yönel", "rehber", "allah"] }
    ]
  },
  "8:46": {
    requireAll: [
      { label: "command", patterns: ["sabredin", "sebat", "emred"] },
      { label: "divine-togetherness", patterns: ["allah", "beraber", "birlikte"] }
    ]
  },
  "14:7": {
    requireAll: [
      { label: "condition", patterns: ["şükrederseniz", "şükür"] },
      { label: "result", patterns: ["artır", "daha çok", "daha fazla", "nimet"] }
    ]
  },
  "2:7": {
    requireAtLeast: {
      minimum: 2,
      groups: [
        { label: "heart-seal", patterns: ["kalp", "mühür", "mühürle"] },
        {
          label: "hearing-or-seeing-closure",
          patterns: ["işit", "duy", "kulak", "göz", "görme", "perde", "örtü"]
        }
      ]
    }
  },
  "2:173": {
    requireAtLeast: {
      minimum: 2,
      groups: [
        { label: "necessity", patterns: ["zorunluluk", "mecburiyet", "çaresizlik", "zaruret", "muhtaç"] },
        {
          label: "boundary",
          patterns: [/\bsınır\b/u, /\bsınırı\b/u, "aşma", "isteyerek", "taşkın", "mecbur kalma"]
        },
        { label: "forgiveness-or-mercy", patterns: ["bağış", "aff", "merhamet", "rahmet"] }
      ]
    }
  }
};

function normalizeForWarningMatch(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .replace(/[’'`´]/gu, "")
    .replace(/[".,;:!?()\-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function matchesAny(text: string, patterns: Array<string | RegExp>): boolean {
  const normalizedText = normalizeForWarningMatch(text);

  return patterns.some((pattern) => {
    if (typeof pattern === "string") {
      return normalizedText.includes(normalizeForWarningMatch(pattern));
    }

    return pattern.test(text);
  });
}

export function detectPossibleSemanticDrift(summary: string, verseKey?: string): boolean {
  const normalizedSummary = normalizeForWarningMatch(summary);
  const generalMatch = possibleSemanticDriftPhrases.some((phrase) =>
    normalizedSummary.includes(normalizeForWarningMatch(phrase))
  );

  if (generalMatch) {
    return true;
  }

  if (!verseKey) {
    return false;
  }

  return (sampleSpecificDriftPhrases[verseKey] ?? []).some((phrase) =>
    normalizedSummary.includes(normalizeForWarningMatch(phrase))
  );
}

export function detectTooGenericSummary(summary: string, verseKey?: string): boolean {
  const normalizedSummary = normalizeForWarningMatch(summary);
  const generalMatch = tooGenericSummaryPhrases.some(
    (phrase) => normalizedSummary === normalizeForWarningMatch(phrase)
  );

  if (generalMatch) {
    return true;
  }

  if (!verseKey) {
    return false;
  }

  return (sampleSpecificGenericSummaryPhrases[verseKey] ?? []).some(
    (phrase) => normalizedSummary === normalizeForWarningMatch(phrase)
  );
}

export function detectMechanicalOrAwkwardTurkish(summary: string): boolean {
  const normalizedSummary = normalizeForWarningMatch(summary);
  return (
    mechanicalOrAwkwardTurkishPhrases.some((phrase) =>
      normalizedSummary.includes(normalizeForWarningMatch(phrase))
    ) || matchesAny(summary, mechanicalOrAwkwardRawPatterns)
  );
}

export function detectSevereMechanicalOrAwkwardTurkish(summary: string, verseKey?: string): boolean {
  if (!verseKey) {
    return false;
  }

  return matchesAny(summary, sampleSpecificSevereMechanicalPatterns[verseKey] ?? []);
}

export function detectWeakSummary(summary: string, verseKey?: string): boolean {
  if (!verseKey) {
    return false;
  }

  const normalizedSummary = normalizeForWarningMatch(summary);

  if (
    (sampleSpecificWeakSummaryPhrases[verseKey] ?? []).some((phrase) =>
      normalizedSummary.includes(normalizeForWarningMatch(phrase))
    )
  ) {
    return true;
  }

  if (verseKey === "2:7") {
    const mentionsSealField = /\bkalp\b|muhur/.test(normalizedSummary);
    const mentionsSensoryField = /\b(isit|duy|kulak|goz|gorme|perde|ortu)\b/.test(normalizedSummary);

    if (mentionsSealField && !mentionsSensoryField) {
      return true;
    }
  }

  return false;
}

export function detectMissingKeyRelation(verseKey: string, summary: string): boolean {
  const rule = missingKeyRelationRules[verseKey];

  if (!rule) {
    return false;
  }

  if (rule.requireAll) {
    return rule.requireAll.some((requirement) => !matchesAny(summary, requirement.patterns));
  }

  if (rule.requireAtLeast) {
    const matchedCount = rule.requireAtLeast.groups.filter((group) =>
      matchesAny(summary, group.patterns)
    ).length;

    return matchedCount < rule.requireAtLeast.minimum;
  }

  return false;
}

export function getSemanticWarnings(input: SemanticWarningInput): SemanticWarning[] {
  const warnings: SemanticWarning[] = [];

  if (detectPossibleSemanticDrift(input.summary, input.verseKey)) {
    warnings.push("possible-semantic-drift");
  }

  if (detectMissingKeyRelation(input.verseKey, input.summary)) {
    warnings.push("missing-key-relation");
  }

  if (detectTooGenericSummary(input.summary, input.verseKey)) {
    warnings.push("too-generic-summary");
  }

  if (detectMechanicalOrAwkwardTurkish(input.summary)) {
    warnings.push("mechanical-or-awkward-turkish");
  }

  if (detectSevereMechanicalOrAwkwardTurkish(input.summary, input.verseKey)) {
    warnings.push("severe-mechanical-or-awkward-turkish");
  }

  if (detectWeakSummary(input.summary, input.verseKey)) {
    warnings.push("weak-summary");
  }

  return warnings;
}

export function getAdditionalSemanticWarnings(input: {
  sampleKey: string;
  summary: string;
  translation: string;
}): AdditionalSemanticWarning[] {
  return getSemanticWarnings({
    verseKey: input.sampleKey,
    summary: input.summary,
    translation: input.translation
  });
}
