export type EvidenceTermParseConfidence = "high" | "medium" | "low";

export interface ParsedEvidenceTerm {
  rawValue: string;
  displayValue: string;
  arabicSurface: string;
  root: string;
  lemma: string;
  displayMeaning: string;
  normalizedMeaning: string;
  parseConfidence: EvidenceTermParseConfidence;
  parseWarnings: string[];
}

function normalizeMeaning(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s:\-./]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function stripArabicMarks(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[^\u0600-\u06FF]/gu, "");
}

function containsArabic(value: string): boolean {
  return /[\u0600-\u06FF]/u.test(value);
}

function isArabicOnly(value: string): boolean {
  const compact = value.replace(/\s+/gu, "");
  return compact.length > 0 && /^[\u0600-\u06FF\u064B-\u065F\u0670\u06D6-\u06EDٰۡـ]+$/u.test(compact);
}

function displayValue(rawValue: string): string {
  const parts = rawValue.split("|").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? rawValue.trim();
}

function inferRootFromLemmaCandidate(candidate: string): string {
  const letters = stripArabicMarks(candidate);
  // This is intentionally conservative: many Quranic lemmas are not bare roots.
  if (letters.length >= 2 && letters.length <= 4) {
    return candidate.trim();
  }
  return "";
}

function confidenceFor(input: {
  arabicSurface: string;
  lemma: string;
  displayMeaning: string;
  warnings: string[];
}): EvidenceTermParseConfidence {
  if (input.arabicSurface && input.lemma && input.displayMeaning && input.warnings.length <= 1) {
    return "high";
  }
  if ((input.arabicSurface && input.lemma) || (input.arabicSurface && input.displayMeaning)) {
    return "medium";
  }
  return "low";
}

export function parseEvidenceTermValue(rawValue: string): ParsedEvidenceTerm {
  const warnings: string[] = [];
  const parts = rawValue.split("|").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    warnings.push("empty_raw_value");
  }
  if (parts.length === 1) {
    warnings.push("no_pipe_segments");
  }
  if (parts.length > 3) {
    warnings.push("extra_pipe_segments");
  }

  const arabicSurface = parts.find((part) => containsArabic(part)) ?? "";
  if (!arabicSurface) {
    warnings.push("missing_arabic_surface");
  }

  const candidateAfterSurface = parts.slice(1).find((part) => containsArabic(part)) ?? "";
  const lemma = candidateAfterSurface;
  const root = inferRootFromLemmaCandidate(candidateAfterSurface);

  if (lemma && root) {
    warnings.push("root_lemma_ambiguous");
  } else if (lemma && !root) {
    warnings.push("root_not_inferred");
  } else {
    warnings.push("missing_lemma_or_root");
  }

  const trailingPart = parts.at(-1) ?? "";
  const displayMeaning = trailingPart && !isArabicOnly(trailingPart) ? trailingPart : "";
  if (!displayMeaning) {
    warnings.push("missing_display_meaning");
  }
  if (trailingPart && isArabicOnly(trailingPart)) {
    warnings.push("display_value_is_arabic");
  }

  const parsed = {
    rawValue,
    displayValue: displayValue(rawValue),
    arabicSurface,
    root,
    lemma,
    displayMeaning,
    normalizedMeaning: normalizeMeaning(displayMeaning),
    parseConfidence: "low" as EvidenceTermParseConfidence,
    parseWarnings: Array.from(new Set(warnings))
  };

  parsed.parseConfidence = confidenceFor({
    arabicSurface: parsed.arabicSurface,
    lemma: parsed.lemma,
    displayMeaning: parsed.displayMeaning,
    warnings: parsed.parseWarnings
  });

  return parsed;
}
