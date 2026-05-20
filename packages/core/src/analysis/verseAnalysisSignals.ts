import type {
  VerseAnalysisFidelitySignals,
  VerseAnalysisTranslationComparison,
  VerseAnalysisWordEntry
} from "./verseAnalysisContext";

export interface VerseAnalysisSignalInput {
  wordByWord: VerseAnalysisWordEntry[];
  translationComparison: VerseAnalysisTranslationComparison;
  fidelitySignals: VerseAnalysisFidelitySignals;
}

export interface VerseAnalysisSignalOutput {
  keyTerms: string[];
  commonPhrases: string[];
  divergentPhrases: string[];
  coveredTerms: string[];
  deterministicNotes: string[];
  suppressedLowConfidenceTerms: string[];
  suppressedLowUsefulnessTerms: string[];
  recoveredCoreTerms: string[];
  suppressedNoisyPhrases: string[];
}

interface ReadableSignalTerm {
  text: string;
  confidence: "yuksek" | "orta" | "dusuk";
  role: VerseAnalysisWordEntry["role"];
  wordIndex: number;
  meaning: string | null;
  word: VerseAnalysisWordEntry;
}

const stopwords = new Set([
  "allah",
  "ancak",
  "ama",
  "fakat",
  "ve",
  "veya",
  "ile",
  "icin",
  "bir",
  "bu",
  "su",
  "da",
  "de",
  "ki",
  "olan",
  "olarak",
  "uzere",
  "kim",
  "onu",
  "ona",
  "onun",
  "onlar",
  "siz",
  "size",
  "sizi",
  "sen",
  "sana",
  "ben",
  "biz",
  "bizi",
  "bircok",
  "cok",
  "her",
  "gibi",
  "muhakkak",
  "suphesiz"
]);

const weakMeaningTerms = new Set([
  "olum",
  "sey",
  "seyler",
  "kimse",
  "kisi",
  "gercek",
  "olan",
  "olmak",
  "vardir",
  "yoktur"
]);

const lowUsefulnessMeanings = new Set([
  "suphesiz gercekten",
  "ancak sadece",
  "den dan",
  "e dogru"
]);

const recoveryPriorityLexemes = new Set([
  "الله",
  "اله",
  "احد",
  "صمد",
  "عبد",
  "عون",
  "هدي",
  "حرم",
  "غفر",
  "رحم"
]);

const lowValuePhraseTokens = new Set([
  "tek",
  "olan",
  "gibi",
  "icin",
  "uzere",
  "cunku",
  "fakat",
  "ancak"
]);

const copulaSuffixTokens = new Set([
  "dir",
  "dır",
  "dur",
  "dür",
  "tir",
  "tır",
  "tur",
  "tür"
]);

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0)
    )
  );
}

function containsArabic(value: string): boolean {
  return /[\u0600-\u06FF]/u.test(value);
}

function containsBuckwalterLikeNoise(value: string): boolean {
  return /[`_^~]/u.test(value) || /^[A-Za-z][A-Za-z0-9`'._-]*$/u.test(value);
}

function isNoisyDisplayValue(value: string | null | undefined): boolean {
  if (!value) {
    return true;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  if (containsArabic(trimmed)) {
    return false;
  }

  return containsBuckwalterLikeNoise(trimmed);
}

function normalizeTurkishText(value: string | null | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenizeContentWords(value: string): string[] {
  return normalizeTurkishText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function getTranslationNgrams(text: string): Set<string> {
  const tokens = tokenizeContentWords(text);
  const ngrams = new Set<string>();

  for (let index = 0; index < tokens.length; index += 1) {
    ngrams.add(tokens[index]);

    if (index < tokens.length - 1) {
      ngrams.add(`${tokens[index]} ${tokens[index + 1]}`);
    }
  }

  return ngrams;
}

function sortRankedEntries(entries: Array<[string, number]>): Array<[string, number]> {
  return [...entries].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    const leftWordCount = left[0].split(" ").length;
    const rightWordCount = right[0].split(" ").length;

    if (rightWordCount !== leftWordCount) {
      return rightWordCount - leftWordCount;
    }

    return right[0].length - left[0].length;
  });
}

function normalizePhraseTokenForDisplay(token: string): string {
  const trimmed = token.trim().toLocaleLowerCase("tr-TR");

  if (/^[a-zçğıöşü]+1[a-zçğıöşü]*$/iu.test(trimmed)) {
    return trimmed.replaceAll("1", "ı");
  }

  return trimmed;
}

function normalizePhraseForDisplay(phrase: string): string | null {
  const trimmed = phrase.trim();

  if (!trimmed) {
    return null;
  }

  if (containsBuckwalterLikeNoise(trimmed)) {
    return null;
  }

  const normalizedTokens = trimmed
    .split(/\s+/u)
    .map(normalizePhraseTokenForDisplay)
    .filter((token) => token.length > 0);

  if (normalizedTokens.length === 0) {
    return null;
  }

  if (normalizedTokens.some((token) => /\d/u.test(token))) {
    return null;
  }

  const cleaned = normalizedTokens.join(" ");

  if (cleaned.length < 4) {
    return null;
  }

  if (normalizedTokens.length === 1 && lowValuePhraseTokens.has(normalizedTokens[0])) {
    return null;
  }

  if (normalizedTokens.every((token) => lowValuePhraseTokens.has(token))) {
    return null;
  }

  if (
    normalizedTokens.length === 2 &&
    copulaSuffixTokens.has(normalizedTokens[1])
  ) {
    return null;
  }

  if (
    normalizedTokens.length === 2 &&
    lowValuePhraseTokens.has(normalizedTokens[0]) &&
    normalizedTokens[1].length <= 3
  ) {
    return null;
  }

  return cleaned;
}

function cleanPhraseList(phrases: string[]): {
  visible: string[];
  suppressed: string[];
} {
  const visible: string[] = [];
  const suppressed: string[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const normalized = normalizePhraseForDisplay(phrase);

    if (normalized === null) {
      suppressed.push(phrase);
      continue;
    }

    if (seen.has(normalized)) {
      suppressed.push(phrase);
      continue;
    }

    seen.add(normalized);
    visible.push(normalized);
  }

  return {
    visible,
    suppressed
  };
}

function buildTranslationPhraseSignals(
  comparison: VerseAnalysisTranslationComparison
): Pick<VerseAnalysisSignalOutput, "commonPhrases" | "divergentPhrases" | "suppressedNoisyPhrases"> {
  const texts = comparison.availableTranslations.map((entry) => entry.text).filter((text) => text.length > 0);

  if (texts.length < 2) {
    return {
      commonPhrases: [],
      divergentPhrases: [],
      suppressedNoisyPhrases: []
    };
  }

  const frequencyMap = new Map<string, number>();

  for (const text of texts) {
    for (const ngram of getTranslationNgrams(text)) {
      frequencyMap.set(ngram, (frequencyMap.get(ngram) ?? 0) + 1);
    }
  }

  const commonThreshold = Math.max(2, Math.ceil(texts.length * 0.5));
  const divergentFloor = 2;
  const ranked = sortRankedEntries(Array.from(frequencyMap.entries()));

  const commonPhrases = ranked
    .filter(([, count]) => count >= commonThreshold)
    .map(([phrase]) => phrase)
    .slice(0, 6);

  const divergentPhrases = ranked
    .filter(([_phrase, count]) => count >= divergentFloor && count < commonThreshold)
    .filter(([phrase]) => phrase.includes(" "))
    .map(([phrase]) => phrase)
    .slice(0, 6);

  const cleanedCommon = cleanPhraseList(commonPhrases);
  const cleanedDivergent = cleanPhraseList(divergentPhrases);

  return {
    commonPhrases: cleanedCommon.visible,
    divergentPhrases: cleanedDivergent.visible,
    suppressedNoisyPhrases: [
      ...cleanedCommon.suppressed,
      ...cleanedDivergent.suppressed
    ].filter((phrase, index, values) => values.indexOf(phrase) === index)
  };
}

function getRolePriority(role: VerseAnalysisWordEntry["role"]): number {
  switch (role) {
    case "verb":
      return 0;
    case "noun":
    case "adjective":
      return 1;
    case "pronoun":
      return 2;
    case "particle":
      return 3;
    default:
      return 4;
  }
}

function cleanMeaning(word: VerseAnalysisWordEntry): string | null {
  const meaning = word.meaning?.trim() ?? "";

  if (!meaning) {
    return null;
  }

  const normalized = normalizeTurkishText(meaning);

  if (weakMeaningTerms.has(normalized)) {
    return null;
  }

  if (containsBuckwalterLikeNoise(meaning)) {
    return null;
  }

  return meaning;
}

function cleanArabicOrRoot(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return isNoisyDisplayValue(trimmed) ? null : trimmed;
}

function getConfidenceLabel(word: VerseAnalysisWordEntry, meaning: string | null): ReadableSignalTerm["confidence"] {
  if (meaning !== null && !word.missingFields.includes("meaning_tr")) {
    return "yuksek";
  }

  if (meaning !== null) {
    return "orta";
  }

  return "dusuk";
}

function formatReadableTerm(word: VerseAnalysisWordEntry): string | null {
  const arabic = cleanArabicOrRoot(word.arabic);
  const lemma = cleanArabicOrRoot(word.lemma);
  const root = cleanArabicOrRoot(word.root);
  const meaning = cleanMeaning(word);

  if (arabic === null) {
    return null;
  }

  const parts = [arabic];

  if (lemma !== null && lemma !== arabic) {
    parts.push(lemma);
  } else if (root !== null && root !== arabic) {
    parts.push(root);
  }

  if (meaning !== null) {
    parts.push(meaning);
  }

  if (parts.length === 1) {
    return null;
  }

  return `${parts.join(" | ")} [${getConfidenceLabel(word, meaning)}]`;
}

function extractConfidence(term: string): ReadableSignalTerm["confidence"] {
  if (term.endsWith("[yuksek]")) {
    return "yuksek";
  }

  if (term.endsWith("[orta]")) {
    return "orta";
  }

  return "dusuk";
}

function buildReadableTerms(wordByWord: VerseAnalysisWordEntry[]): ReadableSignalTerm[] {
  const seen = new Set<string>();

  return wordByWord
    .filter((word) => word.meaning !== null || word.lemma !== null || word.root !== null)
    .filter((word) => !(word.role === "pronoun" && cleanMeaning(word) === null))
    .sort((left, right) => {
      const leftPriority = getRolePriority(left.role);
      const rightPriority = getRolePriority(right.role);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.wordIndex - right.wordIndex;
    })
    .map((word) => {
      const text = formatReadableTerm(word);

      if (text === null) {
        return null;
      }

      return {
        text,
        confidence: extractConfidence(text),
        role: word.role,
        wordIndex: word.wordIndex,
        meaning: cleanMeaning(word),
        word
      } satisfies ReadableSignalTerm;
    })
    .filter((term): term is ReadableSignalTerm => term !== null)
    .filter((term) => {
      if (seen.has(term.text)) {
        return false;
      }

      seen.add(term.text);
      return true;
    });
}

function splitVisibleAndSuppressedTerms(terms: ReadableSignalTerm[]): {
  visible: ReadableSignalTerm[];
  suppressed: ReadableSignalTerm[];
} {
  return {
    visible: terms.filter((term) => term.confidence === "yuksek" || term.confidence === "orta"),
    suppressed: terms.filter((term) => term.confidence === "dusuk")
  };
}

function isLowUsefulnessTerm(term: ReadableSignalTerm): boolean {
  const normalizedMeaning = normalizeTurkishText(term.meaning);

  if (term.role === "particle" || term.role === "pronoun") {
    return true;
  }

  if (normalizedMeaning && lowUsefulnessMeanings.has(normalizedMeaning)) {
    return true;
  }

  if ((term.meaning ?? "").trim().length > 0 && /^[-–]/u.test((term.meaning ?? "").trim())) {
    return true;
  }

  return false;
}

function splitVisibleAndLowUsefulnessTerms(terms: ReadableSignalTerm[]): {
  visible: ReadableSignalTerm[];
  suppressed: ReadableSignalTerm[];
} {
  return {
    visible: terms.filter((term) => !isLowUsefulnessTerm(term)),
    suppressed: terms.filter((term) => isLowUsefulnessTerm(term))
  };
}

function buildCoveredTerms(
  wordByWord: VerseAnalysisWordEntry[],
  fidelitySignals: VerseAnalysisFidelitySignals
): ReadableSignalTerm[] {
  const weakWordIndexes = new Set(
    fidelitySignals.weakOrMissingCorrespondences.map((entry) => entry.wordIndex)
  );

  const seen = new Set<string>();

  return wordByWord
    .filter((word) => !weakWordIndexes.has(word.wordIndex))
    .map((word) => {
      const text = formatReadableTerm(word);

      if (text === null) {
        return null;
      }

      return {
        text,
        confidence: extractConfidence(text),
        role: word.role,
        wordIndex: word.wordIndex,
        meaning: cleanMeaning(word),
        word
      } satisfies ReadableSignalTerm;
    })
    .filter((term): term is ReadableSignalTerm => term !== null)
    .filter((term) => {
      if (seen.has(term.text)) {
        return false;
      }

      seen.add(term.text);
      return true;
    });
}

function normalizeArabicKey(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[\u0640]/gu, "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .replace(/ة/gu, "ه")
    .replace(/[^\u0621-\u064A]/gu, "")
    .trim();
}

function isRecoverableCoreLexeme(term: ReadableSignalTerm): boolean {
  const candidates = [
    normalizeArabicKey(term.word.arabic),
    normalizeArabicKey(term.word.lemma),
    normalizeArabicKey(term.word.root),
    normalizeTurkishText(term.meaning)
  ].filter((value) => value.length > 0);

  return candidates.some((value) => recoveryPriorityLexemes.has(value));
}

function getRecoveryPriority(term: ReadableSignalTerm): number {
  let score = 0;

  if (isRecoverableCoreLexeme(term)) {
    score += 10;
  }

  if (term.role === "verb") {
    score += 4;
  } else if (term.role === "noun" || term.role === "adjective") {
    score += 3;
  }

  if (term.confidence === "yuksek") {
    score += 3;
  } else if (term.confidence === "orta") {
    score += 2;
  } else if (term.confidence === "dusuk" && isRecoverableCoreLexeme(term)) {
    score += 1;
  }

  return score;
}

function canRecoverTerm(term: ReadableSignalTerm): boolean {
  if (term.role === "particle" || term.role === "pronoun") {
    return false;
  }

  if (term.confidence === "dusuk") {
    return isRecoverableCoreLexeme(term);
  }

  return true;
}

function recoverMinimumVisibleKeyTerms(input: {
  visibleKeyTerms: ReadableSignalTerm[];
  keyTermCandidates: ReadableSignalTerm[];
  suppressedLowUsefulnessTerms: ReadableSignalTerm[];
  suppressedLowConfidenceTerms: ReadableSignalTerm[];
}): {
  visibleKeyTerms: ReadableSignalTerm[];
  recoveredCoreTerms: ReadableSignalTerm[];
} {
  const visible = [...input.visibleKeyTerms];

  if (visible.length >= 2) {
    return {
      visibleKeyTerms: visible,
      recoveredCoreTerms: []
    };
  }

  const candidatePool = [...input.suppressedLowUsefulnessTerms, ...input.suppressedLowConfidenceTerms]
    .filter(canRecoverTerm)
    .filter((term, index, values) => values.findIndex((candidate) => candidate.text === term.text) === index)
    .sort((left, right) => {
      const scoreDiff = getRecoveryPriority(right) - getRecoveryPriority(left);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.wordIndex - right.wordIndex;
    });

  const targetAdditionalCount = visible.length === 0 ? 2 : 1;
  const recovered: ReadableSignalTerm[] = [];

  for (const candidate of candidatePool) {
    if (recovered.length >= targetAdditionalCount) {
      break;
    }

    if (visible.some((item) => item.text === candidate.text) || recovered.some((item) => item.text === candidate.text)) {
      continue;
    }

    recovered.push(candidate);
  }

  return {
    visibleKeyTerms: [...visible, ...recovered].slice(0, 5),
    recoveredCoreTerms: recovered
  };
}

function buildDeterministicNotes(input: {
  keyTerms: string[];
  commonPhrases: string[];
  divergentPhrases: string[];
  coveredTerms: string[];
  fidelitySignals: VerseAnalysisFidelitySignals;
  suppressedCount: number;
}): string[] {
  const notes: string[] = [];

  if (input.keyTerms.length > 0) {
    notes.push(`Veri, one cikan terimler arasinda ${input.keyTerms.slice(0, 3).join("; ")} gosteriyor.`);
  }

  if (input.fidelitySignals.weakOrMissingCorrespondences.length > 0) {
    const labels = uniqueNonEmpty(
      input.fidelitySignals.weakOrMissingCorrespondences
        .slice(0, 4)
        .flatMap((entry) => [
          cleanArabicOrRoot(entry.arabic),
          cleanArabicOrRoot(entry.lemma),
          cleanArabicOrRoot(entry.root)
        ])
    ).slice(0, 4);

    if (labels.length > 0) {
      notes.push(`Veri, bazi kelimelerde meal-karsilik eslesmesinin zayif oldugunu gosteriyor: ${labels.join(", ")}.`);
    } else {
      notes.push("Veri, bazi kelimelerde meal-karsilik eslesmesinin zayif oldugunu gosteriyor.");
    }
  }

  if (input.commonPhrases.length > 0) {
    notes.push(`Birden fazla mealde ortak gorulen ifadeler: ${input.commonPhrases.slice(0, 3).join("; ")}.`);
  }

  if (input.divergentPhrases.length > 0) {
    notes.push(`Meal farkliliklari ozellikle su ifadelerde yogunlasiyor: ${input.divergentPhrases.slice(0, 3).join("; ")}.`);
  }

  if (notes.length === 0 && input.coveredTerms.length > 0) {
    notes.push(`Karsiligi daha acik gorunen terimler: ${input.coveredTerms.slice(0, 3).join("; ")}.`);
  }

  if (input.suppressedCount > 0) {
    notes.push("Bazi dusuk guvenli veya dusuk degerli terimler gorunur listelerde bastirildi.");
  }

  return notes.slice(0, 4);
}

export function buildVerseAnalysisSignals(
  input: VerseAnalysisSignalInput
): VerseAnalysisSignalOutput {
  const { commonPhrases, divergentPhrases, suppressedNoisyPhrases } = buildTranslationPhraseSignals(
    input.translationComparison
  );
  const keyTermCandidates = buildReadableTerms(input.wordByWord);
  const coveredTermCandidates = buildCoveredTerms(input.wordByWord, input.fidelitySignals);
  const keyTermSplit = splitVisibleAndSuppressedTerms(keyTermCandidates);
  const coveredTermSplit = splitVisibleAndSuppressedTerms(coveredTermCandidates);
  const usefulKeyTermSplit = splitVisibleAndLowUsefulnessTerms(keyTermSplit.visible);
  const usefulCoveredTermSplit = splitVisibleAndLowUsefulnessTerms(coveredTermSplit.visible);
  const suppressedLowConfidenceTerms = [
    ...keyTermSplit.suppressed.map((term) => term.text),
    ...coveredTermSplit.suppressed.map((term) => term.text)
  ].filter((term, index, values) => values.indexOf(term) === index);
  const suppressedLowUsefulnessTerms = [
    ...usefulKeyTermSplit.suppressed.map((term) => term.text),
    ...usefulCoveredTermSplit.suppressed.map((term) => term.text)
  ].filter((term, index, values) => values.indexOf(term) === index);

  const recovery = recoverMinimumVisibleKeyTerms({
    visibleKeyTerms: usefulKeyTermSplit.visible.slice(0, 5),
    keyTermCandidates,
    suppressedLowUsefulnessTerms: usefulKeyTermSplit.suppressed,
    suppressedLowConfidenceTerms: keyTermSplit.suppressed
  });

  const keyTerms = recovery.visibleKeyTerms.map((term) => term.text).slice(0, 5);
  const coveredTerms = usefulCoveredTermSplit.visible.map((term) => term.text).slice(0, 8);
  const recoveredCoreTerms = recovery.recoveredCoreTerms.map((term) => term.text);

  const deterministicNotes = buildDeterministicNotes({
    keyTerms,
    commonPhrases,
    divergentPhrases,
    coveredTerms,
    fidelitySignals: input.fidelitySignals,
    suppressedCount: suppressedLowConfidenceTerms.length + suppressedLowUsefulnessTerms.length
  });

  return {
    keyTerms,
    commonPhrases,
    divergentPhrases,
    coveredTerms,
    deterministicNotes,
    suppressedLowConfidenceTerms,
    suppressedLowUsefulnessTerms,
    recoveredCoreTerms,
    suppressedNoisyPhrases
  };
}
