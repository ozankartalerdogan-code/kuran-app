import type { VerseAnalysisContext, VerseAnalysisWordEntry } from "./verseAnalysisContext";
import {
  buildMainMeaningAxisForProfile,
  buildTranslationDifferenceCategories,
  scoreKeyTermForProfile,
  selectVerseAnalysisProfile,
  type VerseAnalysisProfile
} from "./verseAnalysisDecision";
import {
  buildVerseAnalysisEvidenceLayer,
  type EvidenceItem,
  type EvidenceKind
} from "./verseAnalysisEvidenceLayer";
import { buildProfileSpecificWeakPreview } from "./verseAnalysisWeakPreview";

export interface VerseAnalysisPreview {
  verseKey: string;
  title: string;
  selectedProfile: VerseAnalysisProfile;
  mainMeaningAxisPreview: string[];
  keyTermsPreview: string[];
  supportingKeyTermsPreview: string[];
  translationDifferencesPreview: string[];
  weakCorrespondencesPreview: string[];
  evidenceNotesPreview: string[];
  sourceStatus: {
    available: string[];
    missing: string[];
    mutedText?: string;
  };
}

export interface BuildVerseAnalysisPreviewOptions {
  sourceStatus?: "legacy" | "mapped";
}

interface ParsedKeyTerm {
  label: string;
  meaning: string;
  canonicalMeaning: string;
  profileScore: number;
  usefulnessScore: number;
  sourceRank: number;
}

const fallbackMeaningMap: Record<string, string> = {
  "الله": "Allah",
  "احد": "birlik",
  "واحد": "birlik",
  "صمد": "tek dayanak",
  "عبد": "kulluk",
  "عون": "yardim isteme",
  "استعين": "yardim isteme",
  "دعو": "dua",
  "هدي": "hidayet",
  "صرط": "yol",
  "كتب": "kitap",
  "ريب": "suphe",
  "وقي": "takva",
  "امن": "iman",
  "صلو": "namaz",
  "وفي": "ahit",
  "صبر": "sabir",
  "نفق": "infak",
  "برر": "iyilik",
  "زكو": "zekat",
  "يتم": "yetim",
  "سكن": "yoksul",
  "ملك": "melek",
  "نبي": "peygamber",
  "نعم": "nimet",
  "غضب": "gazap",
  "ضلل": "sapma",
  "ختم": "muhurleme",
  "سمع": "isitme",
  "بصر": "gorme",
  "قلب": "kalp",
  "غشو": "perde",
  "عذب": "azap",
  "حرم": "haram kilma",
  "ميتة": "olu hayvan",
  "دمو": "kan",
  "دم": "kan",
  "لحم": "et",
  "خنزر": "domuz",
  "خنزير": "domuz",
  "غير": "baskasi",
  "بغي": "sinir asmama",
  "اضطر": "zorunluluk",
  "خير": "iyilik",
  "شر": "kotuluk",
  "ذر": "zerre",
  "وزن": "tarti",
  "خف": "hafif basma",
  "عمل": "amel",
  "رحم": "rahmet",
  "غفر": "bagislanma",
  "توب": "tovbe",
  "ذنب": "gunah",
  "قنط": "umut kesme",
  "عفو": "affetme",
  "وسع": "genislik",
  "رءي": "ruya",
  "عصو": "asa",
  "موسى": "Musa",
  "يوسف": "Yusuf",
  "ابرهيم": "Ibrahim",
  "نوح": "Nuh",
  "فرعون": "Firavun",
  "ابو": "anne baba",
  "ابوان": "anne baba",
  "اب": "baba",
  "اخو": "kardes",
  "اخ": "kardes",
  "سجد": "secde",
  "حقق": "gerceklesme",
  "خرج": "cikarma",
  "سجن": "zindan",
  "لطف": "lutuf",
  "خمر": "icki",
  "يسر": "kumar",
  "نصب": "putlar",
  "زلم": "fal oklari",
  "رجس": "pislik",
  "جنب": "sakinma",
  "اكل": "yemek",
  "مال": "mallar",
  "بطل": "haksizlik",
  "قتل": "oldurme",
  "نفس": "can",
  "تجر": "ticaret",
  "جسس": "kusur arama",
  "ظنن": "zan",
  "غتب": "giybet",
  "كفو": "benzersizlik",
  "ميزان": "tarti",
  "ثقل": "agirlik",
  "يمن": "elindeki",
  "رأي": "gorme"
};

const rawLowValueMeanings = [
  "buyuk",
  "büyük",
  "ehil, sahip",
  "baskasi",
  "başkası",
  "baska, disinda",
  "başka, dışında",
  "tek dayanak",
  "iste o",
  "o ki olan",
  "o ki, olan",
  "-den, -dan",
  "degil",
  "değil",
  "ancak sadece",
  "sadece",
  "yoksa veya",
  "suphesiz",
  "suphesiz gercekten",
  "dikkat",
  "dost, veli",
  "dost",
  "veli",
  "geldi, getirdi",
  "geldi",
  "getirdi",
  "dosdogru kildi",
  "dosdogru",
  "dosdoğru kıldı",
  "dosdoğru",
  "sag, yemin",
  "sağ, yemin",
  "rahmet",
  "bagislanma",
  "bağışlanma",
  "olum",
  "rahim"
];

const profileCoreMeanings: Record<Exclude<VerseAnalysisProfile, "genel_karma">, string[]> = {
  dua_kulluk: ["kulluk", "kul", "ibadet", "yardim", "yardim isteme", "dua", "iman", "namaz", "infak", "rizik"],
  yol_hidayet: ["yol", "hidayet", "nimet", "gazap", "sapma", "rehberlik", "takva"],
  uyari_inkar: ["kalp", "isitme", "gorme", "perde", "muhurleme", "azap", "hastalik", "inkar", "kufr", "uyari", "uyar", "iman"],
  hukum_istisna: ["haram kilma", "olu hayvan", "kan", "et", "domuz", "zorunluluk", "sinir asmama"],
  ahiret: ["ahiret", "hesap", "mizan", "amel", "zerre", "iyilik", "kotuluk", "tarti", "terazi", "agirlik", "sonuc", "akibet", "ates", "cehennem"],
  rahmet_magfiret: ["rahmet", "bagislanma", "tovbe", "gunah", "umut kesme", "affetme", "genislik"],
  kissa: ["Musa", "Yusuf", "Ibrahim", "Nuh", "Firavun", "ruya", "asa", "kardes", "baba", "anne baba", "secde", "gerceklesme", "zindan", "lutuf", "elindeki", "sahne", "soru"],
  emir_yasak: ["yasak", "sakinma", "giybet", "zan", "anne baba", "iyilik", "ihsan", "zekat", "mallar", "mal", "servet", "haksizlik", "yaklasma", "icki", "kumar", "putlar", "fal oklari", "oldurme", "nefis", "kusur arama", "ticaret", "can", "batil"],
  tevhid_birlik: ["Allah", "birlik", "tek dayanak", "benzersizlik"]
};

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

const lowValueMeanings = new Set(rawLowValueMeanings.map((value) => normalizeText(value)));

function isLowValueMeaning(value: string): boolean {
  return lowValueMeanings.has(normalizeText(value));
}

function stripConfidence(value: string): string {
  return value.replace(/\s*\[(?:yuksek|orta|dusuk)\]\s*$/u, "").trim();
}

function stripArabicDiacritics(value: string): string {
  return value.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "");
}

function normalizeArabicLike(value: string): string {
  return stripArabicDiacritics(value).replace(/[^\u0600-\u06FF]/gu, "").trim();
}

function findWordForParsedTerm(context: VerseAnalysisContext, term: ParsedKeyTerm): VerseAnalysisWordEntry | null {
  const normalizedTermArabic = normalizeArabicLike(term.label);

  if (!normalizedTermArabic) {
    return null;
  }

  return (
    context.wordByWord.find((word) => {
      const normalizedWordArabic = normalizeArabicLike(word.arabic ?? "");
      return normalizedWordArabic.length > 0 && normalizedTermArabic.includes(normalizedWordArabic);
    }) ?? null
  );
}

function isCandidateBackedLowValueWord(word: VerseAnalysisWordEntry | null): boolean {
  if (!word) {
    return false;
  }

  const isCandidateBacked =
    word.meaningSource === "meaning_overrides_from_candidates" ||
    word.confidence === "low" ||
    word.confidence === "low-enriched";

  if (!isCandidateBacked) {
    return false;
  }

  return word.role === "particle" || word.role === "pronoun" || word.pos === "P" || word.pos === "P+N";
}

function isVisibleKeyTermAllowed(context: VerseAnalysisContext, term: ParsedKeyTerm): boolean {
  return !isCandidateBackedLowValueWord(findWordForParsedTerm(context, term));
}

function containsArabic(value: string): boolean {
  return /[\u0600-\u06FF]/u.test(value);
}

function isReadableTurkishMeaning(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || containsArabic(trimmed)) {
    return false;
  }

  const normalized = normalizeText(trimmed);
  if (!normalized || normalized.length < 3) {
    return false;
  }

  if (/[`0-9]/u.test(trimmed)) {
    return false;
  }

  return /[a-zcghiklmnoprstuvy]/u.test(normalized);
}

function _findFallbackMeaning(parts: string[]): string | null {
  for (const part of parts) {
    const normalizedArabic = normalizeArabicLike(part);
    if (normalizedArabic && fallbackMeaningMap[normalizedArabic]) {
      return fallbackMeaningMap[normalizedArabic];
    }
  }

  return null;
}

function scoreMeaningUsefulness(meaning: string, profile: VerseAnalysisProfile): number {
  const normalizedMeaning = normalizeText(meaning);
  let score = 0;

  if (!isLowValueMeaning(normalizedMeaning)) {
    score += 2;
  }

  if (profile !== "genel_karma") {
    for (const candidate of profileCoreMeanings[profile]) {
      if (normalizedMeaning.includes(normalizeText(candidate))) {
        score += 3;
      }
    }
  }

  if (normalizedMeaning.split(" ").length <= 3) {
    score += 1;
  }

  return score;
}

function toCanonicalMeaning(value: string): string {
  return normalizeText(value)
    .replace(/\b(etti|eder|ederiz|ettiği|kildi|kilma|kılar|verdi|vermek|oldu)\b/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function isMeaningAllowedForProfile(meaning: string, profile: VerseAnalysisProfile): boolean {
  if (profile === "genel_karma") {
    return !isLowValueMeaning(meaning);
  }

  if (profile !== "tevhid_birlik" && meaning === "allah") {
    return false;
  }

  if (profile === "hukum_istisna" && ["rahmet", "bagislanma"].includes(meaning)) {
    return false;
  }

  if (profile === "uyari_inkar" && ["allah", "birlik", "tevhid", "rahmet", "bagislanma"].includes(meaning)) {
    return false;
  }

  if (profile === "emir_yasak" && ["rahmet", "bagislanma", "baskasi", "baska disinda"].includes(meaning)) {
    return false;
  }

  return !isLowValueMeaning(meaning);
}

function parseTerm(value: string, profile: VerseAnalysisProfile, sourceRank: number): ParsedKeyTerm | null {
  const stripped = stripConfidence(value);
  const parts = stripped.split("|").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const arabic = parts[0];
  const readableMeaning = parts.length >= 3 && isReadableTurkishMeaning(parts[2]) ? parts[2] : null;
  let chosenMeaning = readableMeaning;

  if (profile === "kissa" && chosenMeaning) {
    const normalizedChosenMeaning = normalizeText(chosenMeaning);
    if (normalizedChosenMeaning === "sag yemin") {
      chosenMeaning = "elindeki";
    }
  }

  if (!arabic || !chosenMeaning) {
    return null;
  }

  const normalizedMeaning = normalizeText(chosenMeaning);
  const canonicalMeaning = toCanonicalMeaning(chosenMeaning) || normalizedMeaning;
  const displayMeaning =
    canonicalMeaning &&
    canonicalMeaning !== normalizedMeaning &&
    isReadableTurkishMeaning(canonicalMeaning) &&
    !isLowValueMeaning(canonicalMeaning)
      ? canonicalMeaning
      : chosenMeaning;
  const profileScore = scoreKeyTermForProfile(`${arabic} - ${displayMeaning}`, profile);
  const usefulnessScore = scoreMeaningUsefulness(displayMeaning, profile);

  return {
    label: `${arabic} — ${displayMeaning}`,
    meaning: normalizedMeaning,
    canonicalMeaning,
    profileScore,
    usefulnessScore,
    sourceRank
  };
}

function buildKeyTermBuckets(
  context: VerseAnalysisContext,
  profile: VerseAnalysisProfile
): {
  visible: string[];
  supporting: string[];
} {
  const directTerms = context.keyTerms
    .map((value) => parseTerm(value, profile, 2))
    .filter((value): value is ParsedKeyTerm => value !== null);

  const sourceBackedTerms = context.wordByWord
    .map((word) => {
      if (!word.arabic || !word.meaning || !isReadableTurkishMeaning(word.meaning)) {
        return null;
      }

      return parseTerm(`${word.arabic} | ${word.lemma ?? word.root ?? ""} | ${word.meaning}`, profile, 1);
    })
    .filter((value): value is ParsedKeyTerm => value !== null);

  const ranked = Array.from(
    new Map(
      [...directTerms, ...sourceBackedTerms].map((term) => [`${term.label}::${term.canonicalMeaning}`, term])
    ).values()
  ).sort((left, right) => {
    if (right.profileScore !== left.profileScore) {
      return right.profileScore - left.profileScore;
    }
    if (right.usefulnessScore !== left.usefulnessScore) {
      return right.usefulnessScore - left.usefulnessScore;
    }
    if (right.sourceRank !== left.sourceRank) {
      return right.sourceRank - left.sourceRank;
    }
    return left.label.localeCompare(right.label, "tr");
  });

  const filteredRanked = ranked.filter((term) => isMeaningAllowedForProfile(term.canonicalMeaning, profile));

  const uniqueVisibleTerms = Array.from(
    new Map(
      filteredRanked.map((term) => [term.canonicalMeaning || term.meaning, term])
    ).values()
  );

  const visible = uniqueVisibleTerms
    .filter((term) => isVisibleKeyTermAllowed(context, term))
    .filter((term) =>
      profile === "genel_karma"
        ? term.usefulnessScore >= 3 || term.profileScore > 0
        : term.profileScore > 0 || term.usefulnessScore >= 4
    )
    .filter(
      (term) =>
        !(
          (isLowValueMeaning(term.meaning) || isLowValueMeaning(term.canonicalMeaning)) &&
          term.profileScore < 2
        )
    )
    .filter(
      (term) =>
        !(
          profile === "genel_karma" &&
          (isLowValueMeaning(term.meaning) || isLowValueMeaning(term.canonicalMeaning))
        )
    )
    .slice(0, 5)
    .map((term) => term.label);

  const supporting = filteredRanked
    .filter((term) => !visible.includes(term.label))
    .filter((term) => term.profileScore > 0 || term.usefulnessScore >= 2)
    .slice(0, 3)
    .map((term) => term.label);

  return { visible, supporting };
}

function buildEvidenceNotesPreview(input: {
  mainMeaningAxisPreview: string[];
  keyTermsPreview: string[];
  translationDifferencesPreview: string[];
  weakCorrespondencesPreview: string[];
  evidenceItems: EvidenceItem[];
}): string[] {
  const notes: string[] = [];

  for (const note of buildEvidenceLayerNotes({
    evidenceItems: input.evidenceItems,
    keyTermsPreview: input.keyTermsPreview,
    weakCorrespondencesPreview: input.weakCorrespondencesPreview
  })) {
    if (!notes.includes(note)) {
      notes.push(note);
    }
  }

  if (input.keyTermsPreview.length > 0) {
    notes.push("Kelime verisi, ayette öne çıkan terimlerin belirlenebildiğini gösteriyor.");
  }

  if (input.translationDifferencesPreview.length > 0) {
    notes.push("Meal karşılaştırması, bazı anlam alanlarının farklı ifadelerle aktarıldığını gösteriyor.");
  }

  if (input.weakCorrespondencesPreview.length > 0) {
    notes.push("Karşılık verileri, bazı anlam alanlarında ek kontrol gerektiğini gösteriyor.");
  }

  return notes.slice(0, 3);
}

function buildEvidenceLayerNotes(input: {
  evidenceItems: EvidenceItem[];
  keyTermsPreview: string[];
  weakCorrespondencesPreview: string[];
}): string[] {
  const safeItems = input.evidenceItems.filter((item) =>
    isEvidenceItemAllowedForPreviewNote({
      item,
      keyTermsPreview: input.keyTermsPreview,
      weakCorrespondencesPreview: input.weakCorrespondencesPreview
    })
  );
  const kindCounts = safeItems.reduce<Record<EvidenceKind, number>>(
    (counts, item) => {
      counts[item.kind] += 1;
      return counts;
    },
    {
      keyTerm: 0,
      root: 0,
      lemma: 0,
      rootExplanation: 0,
      weakCorrespondence: 0,
      coverage: 0,
      sourceStatus: 0,
      translationCoverage: 0,
      limitedContext: 0
    }
  );
  const notes: string[] = [];

  if (kindCounts.keyTerm > 0) {
    notes.push(
      `Kelime verisi, ${kindCounts.keyTerm} anahtar terimin birden fazla güvenli sinyalle desteklendiğini gösteriyor.`
    );
  }

  if (kindCounts.weakCorrespondence > 0) {
    notes.push(
      `Karşılık verileri, ${kindCounts.weakCorrespondence} anlam alanında profile uygun kontrol sinyali bulunduğunu gösteriyor.`
    );
  }

  return notes;
}

function isEvidenceItemAllowedForPreviewNote(input: {
  item: EvidenceItem;
  keyTermsPreview: string[];
  weakCorrespondencesPreview: string[];
}): boolean {
  const { item } = input;
  const baseAllowed =
    item.userFacingAllowed &&
    !item.debugOnly &&
    item.internalConfidence !== "low" &&
    item.conflictFlags.length === 0 &&
    !item.singleSource;

  if (!baseAllowed) {
    return false;
  }

  if (item.kind === "keyTerm") {
    return isEvidenceKeyTermAlignedWithVisiblePreview(item, input.keyTermsPreview);
  }

  if (item.kind === "weakCorrespondence") {
    return input.weakCorrespondencesPreview.length > 0;
  }

  return false;
}

function isEvidenceKeyTermAlignedWithVisiblePreview(item: EvidenceItem, keyTermsPreview: string[]): boolean {
  if (keyTermsPreview.length === 0) {
    return false;
  }

  const meaning = extractEvidenceMeaning(item.value);

  if (!meaning || !isReadableTurkishMeaning(meaning) || isLowValueMeaning(meaning)) {
    return false;
  }

  const normalizedMeaning = normalizeText(meaning);
  return keyTermsPreview.some((term) => normalizeText(term).includes(normalizedMeaning));
}

function extractEvidenceMeaning(value: string): string {
  const parts = value.split("|").map((part) => part.trim()).filter(Boolean);
  const candidate = parts.at(-1) ?? value;

  if (containsArabic(candidate)) {
    return "";
  }

  return stripConfidence(candidate);
}

function buildSourceStatus(context: VerseAnalysisContext): {
  available: string[];
  missing: string[];
  mutedText?: string;
} {
  const availableLabels: string[] = [];
  const missing: string[] = [];

  if (context.primaryTranslation && context.wordByWord.length > 0) {
    availableLabels.push("meal", "kelime", "morfoloji");
  }

  if (context.translationComparison.availableTranslations.length > 1) {
    availableLabels.push("meal karşılaştırması");
  }

  if (
    context.fidelitySignals.coverageRatio !== null ||
    context.fidelitySignals.weakOrMissingCorrespondences.length > 0
  ) {
    availableLabels.push("karşılık kontrolü");
  }

  if (context.contextNuzul) {
    availableLabels.push("bağlam");
  }

  if (context.missingSources.includes("tafsir_summary")) {
    missing.push("Ayet bazlı tefsir özeti sınırlı.");
  }

  const available = Array.from(new Set(availableLabels));

  if (available.length === 0) {
    return {
      available: ["Kaynaklar kısmen mevcut."],
      missing: missing.slice(0, 1)
    };
  }

  return {
    available: [`Kaynaklar: ${available.join(", ")}.`],
    missing: missing.slice(0, 1)
  };
}

function buildMappedSourceStatus(context: VerseAnalysisContext): {
  available: string[];
  missing: string[];
  mutedText: string;
} {
  const available: string[] = [];
  const missing: string[] = [];

  if (context.arabicText) {
    available.push("Ayet metni mevcut.");
  }

  if (context.primaryTranslation || context.translations.length > 0) {
    available.push("Meal verileri mevcut.");
  }

  if (context.wordByWord.length > 0 || context.morphology.length > 0) {
    available.push("Kelime ve morfoloji verileri mevcut.");
  }

  if (
    context.translationComparison.availableTranslations.length > 1 ||
    context.fidelitySignals.coverageRatio !== null ||
    context.fidelitySignals.weakOrMissingCorrespondences.length > 0
  ) {
    available.push("Kar\u015f\u0131la\u015ft\u0131rma sinyalleri k\u0131smen mevcut.");
  }

  if (context.wordByWord.some((word) => Boolean(word.meaning))) {
    available.push("Kelime anlamlar\u0131 k\u0131smen mevcut.");
  }

  if (context.missingSources.includes("tafsir_summary") || context.tafsirNotes.length === 0) {
    missing.push("Ayet bazl\u0131 tefsir \u00f6zeti s\u0131n\u0131rl\u0131.");
  }

  const compact =
    context.arabicText && (context.primaryTranslation || context.translations.length > 0) && context.wordByWord.length > 0
      ? "Kaynaklar: ayet metni, meal, kelime verisi ve kar\u015f\u0131la\u015ft\u0131rma sinyalleri mevcut."
      : "Kaynaklar: mevcut veri sinyalleri k\u0131smen haz\u0131r.";
  const mutedText =
    missing.length > 0
      ? `${compact} Ayet bazl\u0131 tefsir/n\u00fczul kapsam\u0131 s\u0131n\u0131rl\u0131.`
      : compact;

  return {
    available: Array.from(new Set(available)),
    missing: missing.slice(0, 1),
    mutedText
  };
}

export function buildVerseAnalysisPreview(
  context: VerseAnalysisContext,
  options: BuildVerseAnalysisPreviewOptions = {}
): VerseAnalysisPreview {
  const selectedProfile = selectVerseAnalysisProfile(context);
  const evidenceLayer = buildVerseAnalysisEvidenceLayer(context);
  const keyTermBuckets = buildKeyTermBuckets(context, selectedProfile);
  const mainMeaningAxisPreview = buildMainMeaningAxisForProfile(selectedProfile, context);
  const translationDifferencesPreview = buildTranslationDifferenceCategories(
    selectedProfile,
    context.translationComparison.availableTranslations.length > 1
  );
  const weakCorrespondencesPreview = buildProfileSpecificWeakPreview({
    profile: selectedProfile,
    weakOrMissingCorrespondences: context.fidelitySignals.weakOrMissingCorrespondences
  }).userFacingPreview;
  const evidenceNotesPreview = buildEvidenceNotesPreview({
    mainMeaningAxisPreview,
    keyTermsPreview: keyTermBuckets.visible,
    translationDifferencesPreview,
    weakCorrespondencesPreview,
    evidenceItems: evidenceLayer.items
  });

  return {
    verseKey: context.verseKey,
    title: "Kanıtlı Analiz Önizleme",
    selectedProfile,
    mainMeaningAxisPreview,
    keyTermsPreview: keyTermBuckets.visible,
    supportingKeyTermsPreview: keyTermBuckets.supporting,
    translationDifferencesPreview,
    weakCorrespondencesPreview,
    evidenceNotesPreview,
    sourceStatus:
      options.sourceStatus === "mapped"
        ? buildMappedSourceStatus(context)
        : buildSourceStatus(context)
  };
}
