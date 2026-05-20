import {
  buildVerseAnalysisContext,
  buildVerseAnalysisPreview,
  getAyahAnalysisEngine,
  getAyahDetail,
  getSurahFullTafsir,
  getSurahs,
  normalizeTransliterationToReadingTrDetailed
} from "@quran-app/core";
import type { WordAnalysisSource } from "@quran-app/core";
import type { VerseAnalysisPreview as ProvenAnalysisPreview } from "@quran-app/core";
import type {
  AvailabilityStatus,
  AyahAnalysisEngineV1,
  FidelityAnalysis,
  MealComparisonEntry,
  RevelationContext,
  Surah,
  TafsirSummary,
  Translation,
  WordAnalysis
} from "@quran-app/types";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  buildUnavailableSemanticSummary,
  resolveServerSemanticProviderFromEnv,
  runSelectedSemanticAnalysisWithProvider,
  type SelectedSemanticProviderSummary
} from "../../../../../lib/analysis/semanticSelectedSummary";
import { resolveWordAnalysisSource } from "../../../../../experimentalSources";
import {
  buildValidatorCopyPayload,
  getMeaningOverride,
  getWordMeaningDisplayText,
  type ValidatorCopyPayload
} from "./validatorDebug";
import { AyahDetailTabs, type AyahDetailTabItem } from "./AyahDetailTabs";
import { AyahJumpForm } from "./AyahJumpForm";
import { SurahAboutAccordion } from "./SurahAboutAccordion";

type SectionStatus = "ready" | "partially_ready" | "missing";

interface PageProps {
  params: {
    surahId: string;
    ayahNumber: string;
  };
  searchParams?: {
    debug?: string | string[];
    reading_source?: string | string[];
    wa_source?: string | string[];
  };
}

interface AyahLink {
  surahId: number;
  ayahNumber: number;
  label: string;
}

interface PrimaryTranslationSelection {
  translation: Translation | null;
  note: string;
  isFallback: boolean;
}

interface TranslationSourceQuality {
  sourceName: string;
  translation: Translation;
  isClean: boolean;
}

interface SectionStatuses {
  page: SectionStatus;
  arabicText: SectionStatus;
  transliteration: SectionStatus;
  primaryTranslation: SectionStatus;
  otherTranslations: SectionStatus;
  wordAnalysis: SectionStatus;
  wordMeanings: SectionStatus;
  rootExplanations: SectionStatus;
  tafsir: SectionStatus;
  revelationContext: SectionStatus;
  fidelity: SectionStatus;
}

interface AyahDetailDebugPayload {
  id: number;
  arabicText: string | null;
  arabicTokens: Array<string | null>;
  analysisTokens: Array<{
    index: number;
    arabic: string | null;
    morphology: string | null;
    transliteration: string | null;
    status: AvailabilityStatus;
  }>;
  roots: Array<{
    index: number;
    root: string | null;
    rootExplanationText: string | null;
    rootExplanationStatus: AvailabilityStatus;
    rootExplanationMissingReason: string | null;
  }>;
  meanings: Array<{
    index: number;
    text: string | null;
    rawText: string | null;
    source: string | null;
    status: AvailabilityStatus;
    usedOverride: boolean;
    overrideText: string | null;
  }>;
  reading_tr: ReturnType<typeof normalizeTransliterationToReadingTrDetailed>;
  fallback_override_status: {
    wordAnalysisSource: WordAnalysisSource;
    detailStatus: AvailabilityStatus;
    ayahStatus: AvailabilityStatus;
    primaryTranslation: {
      source: string | null;
      isFallback: boolean;
      note: string;
    };
    meaningOverrides: Array<{
      index: number;
      arabic: string | null;
      rawText: string | null;
      overrideText: string;
    }>;
    hiddenSourcesToOmit: string[];
    filteredTranslationSources: string[];
    sectionStatuses: SectionStatuses;
  };
  semanticSummary?: {
    status: SelectedSemanticProviderSummary["status"];
    selectedSummary: string | null;
    selectedSource: SelectedSemanticProviderSummary["selectedSource"];
    severity: SelectedSemanticProviderSummary["severity"];
    reason: string;
    warnings: string[];
    rawSummary: string | null;
  };
  copyForValidator?: ValidatorCopyPayload;
}

const primaryReferenceSource = "diyanet";
const preferredPrimarySources = ["diyanet", "hayrat", "yazir", "ugur", "ozturk", "bilmen"];
const statusClasses: Record<SectionStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  partially_ready: "border-amber-200 bg-amber-50 text-amber-800",
  missing: "border-stone-200 bg-stone-100 text-stone-700"
};

const statusDescriptions: Record<SectionStatus, string> = {
  ready: "Hazır",
  partially_ready: "Kısmi veri",
  missing: "Veri yok"
};

const statusHelpText: Record<SectionStatus, string> = {
  ready: "Bu bölüm için gösterilecek veri var.",
  partially_ready: "Bu bölümde veri var ancak kapsam veya kalite sınırlı olabilir.",
  missing: "Bu bölüm için gösterilecek veri bulunmuyor."
};

const morphologyLabels: Record<string, string> = {
  particle: "edat",
  noun: "isim",
  adjective: "sıfat",
  verb: "fiil",
  pronoun: "zamir",
  adverb: "zarf",
  article: "belirlilik takısı",
  determiner: "belirlilik takısı",
  preposition: "edat",
  conjunction: "bağlaç",
  other: "diğer",
  unknown: "bilinmiyor"
};

const naturallyRootlessMorphologyLabels: Record<string, string> = {
  particle: "edat",
  preposition: "edat",
  conjunction: "bağlaç",
  article: "harf",
  determiner: "harf"
};

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function getSingleQueryValue(value: string | string[] | undefined): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim() ?? "";

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getWordAnalysisSourceHref({
  ayahNumber,
  searchParams,
  source,
  surahId
}: {
  ayahNumber: number;
  searchParams: PageProps["searchParams"];
  source: WordAnalysisSource;
  surahId: number;
}): string {
  const params = new URLSearchParams();
  const debug = getSingleQueryValue(searchParams?.debug);
  const readingSource = getSingleQueryValue(searchParams?.reading_source);

  if (debug !== null) {
    params.set("debug", debug);
  }

  if (readingSource !== null) {
    params.set("reading_source", readingSource);
  }

  params.set("wa_source", source);

  return `/surah/${surahId}/ayah/${ayahNumber}?${params.toString()}`;
}

function toSectionStatus(status: AvailabilityStatus | null | undefined): SectionStatus {
  if (status === "available") {
    return "ready";
  }

  if (status === "insufficient_data") {
    return "partially_ready";
  }

  return "missing";
}

function getCompleteness(hasData: boolean, hasIncompleteData = false): SectionStatus {
  if (!hasData) {
    return "missing";
  }

  return hasIncompleteData ? "partially_ready" : "ready";
}

function combineCompleteness(statuses: SectionStatus[]): SectionStatus {
  if (statuses.some((status) => status === "missing" || status === "partially_ready")) {
    return "partially_ready";
  }

  return "ready";
}

function getTextQualityIssue(text: string | null | undefined): string | null {
  if (!text?.trim()) {
    return "empty";
  }

  const normalizedText = text.toLocaleLowerCase("tr-TR");

  if (/\ballah(?:['\u2018\u2019\u02bc]in)?\s+adiyl[ae]\b/u.test(normalizedText)) {
    return "ascii_turkish_loss";
  }

  if (/[A-Za-zÇĞİÖŞÜçğıöşü]['’]?[01][A-Za-zÇĞİÖŞÜçğıöşü]/u.test(text)) {
    return "digit_substitution";
  }

  if (/\[\d+\]|^\(\d+(?:-\d+)+\)/u.test(text)) {
    return "footnote_residue";
  }

  if (/[&]|(?:Ã|�|Ù|Ø)/u.test(text)) {
    return "encoding_residue";
  }

  if (text.length > 420) {
    return "too_long_for_ayah_view";
  }

  return null;
}

function isCleanTranslation(translation: Translation): boolean {
  return translation.status === "available" && getTextQualityIssue(translation.text) === null;
}

function isCleanComparison(comparison: MealComparisonEntry): boolean {
  return comparison.status === "available" && getTextQualityIssue(comparison.text) === null;
}

function getTranslationSourceQualities(translations: Translation[]): TranslationSourceQuality[] {
  return translations.map((translation) => ({
    sourceName: getTranslationSourceName(translation),
    translation,
    isClean: isCleanTranslation(translation)
  }));
}

function getDisplayableTranslations(qualities: TranslationSourceQuality[]): Translation[] {
  return qualities.filter((quality) => quality.isClean).map((quality) => quality.translation);
}

function getFilteredTranslationSources(
  qualities: TranslationSourceQuality[],
  excludedSources: string[] = []
): string[] {
  const excluded = new Set(excludedSources);

  return [
    ...new Set(
      qualities
        .filter((quality) => {
          return (
            quality.translation.status === "available" &&
            !quality.isClean &&
            !excluded.has(quality.sourceName)
          );
        })
        .map((quality) => quality.sourceName)
    )
  ].sort((left, right) => left.localeCompare(right, "tr"));
}

function getWordMeaningStatus(words: WordAnalysis[]): SectionStatus {
  const hasMeaning = words.some((word) => Boolean(getWordMeaningDisplayText(word)));
  const hasMissingMeaning = words.some((word) => !getWordMeaningDisplayText(word));

  return getCompleteness(hasMeaning, hasMissingMeaning || hasMeaning);
}

function getRootExplanationStatus(words: WordAnalysis[]): SectionStatus {
  const hasRootData = words.some((word) =>
    Boolean(word.root || word.rootExplanation?.text || getNaturallyRootlessLabel(word))
  );
  const hasMissingRootData = words.some(
    (word) => !getNaturallyRootlessLabel(word) && (!word.root || !word.rootExplanation?.text)
  );

  return getCompleteness(hasRootData, hasMissingRootData);
}

function getWordAnalysisStatus(words: WordAnalysis[]): SectionStatus {
  const hasWords = words.length > 0;
  const hasIncompleteWord = words.some((word) => {
    const hasRootIssue =
      !getNaturallyRootlessLabel(word) && (!word.root || !word.rootExplanation?.text);

    return !word.arabic || !getWordMeaningDisplayText(word) || hasRootIssue;
  });

  return getCompleteness(hasWords, hasIncompleteWord);
}

function getFidelityStatus(fidelity: FidelityAnalysis | null): SectionStatus {
  if (!fidelity || fidelity.status !== "available") {
    return "partially_ready";
  }

  const hasCleanComparison = fidelity.comparisons.some(isCleanComparison);
  const hasFilteredComparison = fidelity.comparisons.some(
    (comparison) => comparison.status === "available" && !isCleanComparison(comparison)
  );
  const hasMissingComparison = fidelity.comparisons.some(
    (comparison) => comparison.status !== "available" || !comparison.text
  );

  return getCompleteness(
    hasCleanComparison,
    hasFilteredComparison || hasMissingComparison || fidelity.comparisons.length === 0
  );
}

function getMorphologyLabel(value: string | null): string {
  if (value === null) {
    return "missing";
  }

  return morphologyLabels[value] ?? value;
}

function getNaturallyRootlessLabel(word: WordAnalysis): string | null {
  if (word.root) {
    return null;
  }

  return word.morphology ? naturallyRootlessMorphologyLabels[word.morphology] ?? null : null;
}

function getRootDisplayText(word: WordAnalysis): string {
  if (word.root) {
    return word.root;
  }

  const naturallyRootlessLabel = getNaturallyRootlessLabel(word);

  return naturallyRootlessLabel ? `Kök yok (${naturallyRootlessLabel})` : "Kök bilgisi yok";
}

function getRevelationContextStatus(context: RevelationContext | null): SectionStatus {
  return context === null ? "missing" : "partially_ready";
}

function getSectionStatuses({
  ayahStatus,
  hasTransliteration,
  primarySelection,
  displayableTranslationCount,
  filteredTranslationCount,
  words,
  tafsir,
  revelationContext,
  fidelity
}: {
  ayahStatus: AvailabilityStatus;
  hasTransliteration: boolean;
  primarySelection: PrimaryTranslationSelection;
  displayableTranslationCount: number;
  filteredTranslationCount: number;
  words: WordAnalysis[];
  tafsir: TafsirSummary | null;
  revelationContext: RevelationContext | null;
  fidelity: FidelityAnalysis | null;
}): SectionStatuses {
  const sectionStatuses: Omit<SectionStatuses, "page"> = {
    arabicText: toSectionStatus(ayahStatus),
    transliteration: getCompleteness(hasTransliteration),
    primaryTranslation: getCompleteness(Boolean(primarySelection.translation), primarySelection.isFallback),
    otherTranslations: getCompleteness(displayableTranslationCount > 1, filteredTranslationCount > 0),
    wordAnalysis: getWordAnalysisStatus(words),
    wordMeanings: getWordMeaningStatus(words),
    rootExplanations: getRootExplanationStatus(words),
    tafsir: toSectionStatus(tafsir?.status),
    revelationContext: getRevelationContextStatus(revelationContext),
    fidelity: getFidelityStatus(fidelity)
  };

  return {
    ...sectionStatuses,
    page: combineCompleteness(Object.values(sectionStatuses))
  };
}

function StatusBadge({ status }: { status: SectionStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[status]}`}
      title={statusHelpText[status]}
    >
      {statusDescriptions[status]}
    </span>
  );
}

function SectionCard({
  title,
  status,
  children,
  note
}: {
  title: string;
  status: SectionStatus;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
        <StatusBadge status={status} />
      </div>
      {note ? <p className="mb-4 text-sm text-stone-600">{note}</p> : null}
      {children}
    </section>
  );
}

function EmptyState({ children = "Veri yok" }: { children?: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
      {children}
    </p>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionCard title="Geçersiz ayet adresi" status="missing">
          <EmptyState>{message}</EmptyState>
        </SectionCard>
      </div>
    </main>
  );
}

function getTranslationSourceName(translation: Pick<Translation, "source">): string {
  return translation.source?.split("#").at(-1) ?? "bilinmeyen kaynak";
}

function getTranslationBySource(translations: Translation[], source: string): Translation | null {
  return (
    translations.find((translation) => getTranslationSourceName(translation) === source) ?? null
  );
}

function getPrimaryTranslationSelection(
  qualities: TranslationSourceQuality[]
): PrimaryTranslationSelection {
  const translations = qualities.map((quality) => quality.translation);
  const referenceQuality =
    qualities.find((quality) => quality.sourceName === primaryReferenceSource) ?? null;
  const referenceTranslation = referenceQuality?.translation ?? null;

  if (referenceQuality?.isClean) {
    return {
      translation: referenceQuality.translation,
      note: "Ana meal olarak Diyanet meali gösteriliyor.",
      isFallback: false
    };
  }

  for (const source of preferredPrimarySources) {
    if (source === primaryReferenceSource) {
      continue;
    }

    const matched = getTranslationBySource(translations, source);

    if (matched && isCleanTranslation(matched)) {
      return {
        translation: matched,
        note: referenceTranslation
          ? `Diyanet meali bu ayette temiz görüntülenemediği için ${source} meali gösteriliyor.`
          : `Diyanet meali bu ayette bulunamadığı için ${source} meali gösteriliyor.`,
        isFallback: true
      };
    }
  }

  return {
    translation: null,
    note: referenceTranslation
      ? "Ana meal bu ayette temiz görüntülenemiyor."
      : "Ana meal bu ayette bulunamadı.",
    isFallback: false
  };
}

function getPreviousAyah(surahs: Surah[], surahId: number, ayahNumber: number): AyahLink | null {
  if (ayahNumber > 1) {
    return {
      surahId,
      ayahNumber: ayahNumber - 1,
      label: "Önceki ayet"
    };
  }

  const previousSurah = surahs.find((surah) => surah.id === surahId - 1) ?? null;

  if (previousSurah?.verseCount) {
    return {
      surahId: previousSurah.id,
      ayahNumber: previousSurah.verseCount,
      label: "Önceki ayet"
    };
  }

  return null;
}

function getNextAyah(surahs: Surah[], currentSurah: Surah, ayahNumber: number): AyahLink | null {
  if (currentSurah.verseCount && ayahNumber < currentSurah.verseCount) {
    return {
      surahId: currentSurah.id,
      ayahNumber: ayahNumber + 1,
      label: "Sonraki ayet"
    };
  }

  const nextSurah = surahs.find((surah) => surah.id === currentSurah.id + 1) ?? null;

  if (nextSurah) {
    return {
      surahId: nextSurah.id,
      ayahNumber: 1,
      label: "Sonraki ayet"
    };
  }

  return null;
}

function getSemanticRootSignals(words: WordAnalysis[]): string[] {
  return Array.from(
    new Set(
      words
        .map((word) => word.root?.trim() ?? "")
        .filter((root) => root.length > 0)
    )
  );
}

function getSemanticParticipantSignals(analysis: AyahAnalysisEngineV1 | null): string[] {
  if (analysis === null) {
    return [];
  }

  return Array.from(
    new Set(
      [analysis.participants.speaker, analysis.participants.addressee].filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    )
  );
}

function normalizeUiSignal(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const helperThemeAllowList: Record<ProvenAnalysisPreview["selectedProfile"], string[]> = {
  tevhid_birlik: ["tevhid"],
  dua_kulluk: ["ibadet", "dua"],
  yol_hidayet: ["hidayet"],
  uyari_inkar: ["uyari", "inkar", "azap"],
  hukum_istisna: [],
  ahiret: [],
  rahmet_magfiret: ["rahmet"],
  kissa: [],
  emir_yasak: [],
  genel_karma: ["iman", "ibadet", "sabir", "infak"]
};

function filterHelperThemes({
  analysis,
  preview
}: {
  analysis: AyahAnalysisEngineV1;
  preview: ProvenAnalysisPreview | null;
}): string[] {
  if (analysis.themes.length === 0) {
    return [];
  }

  if (preview === null) {
    return analysis.themes;
  }

  const allowedThemes = helperThemeAllowList[preview.selectedProfile].map(normalizeUiSignal);
  return analysis.themes.filter((theme) => allowedThemes.includes(normalizeUiSignal(theme)));
}

async function getSelectedSemanticSummaryForPage({
  analysis,
  detail,
  primaryTranslation,
  verseKey
}: {
  analysis: AyahAnalysisEngineV1 | null;
  detail: Awaited<ReturnType<typeof getAyahDetail>>;
  primaryTranslation: Translation | null;
  verseKey: string;
}): Promise<SelectedSemanticProviderSummary> {
  if (!primaryTranslation?.text) {
    return buildUnavailableSemanticSummary(
      "missing_translation",
      "primary translation unavailable for semantic summary"
    );
  }

  if (!detail.ayah.arabicText) {
    return buildUnavailableSemanticSummary(
      "missing_ayah_text",
      "ayah text unavailable for semantic summary"
    );
  }

  const provider = resolveServerSemanticProviderFromEnv();

  if (provider === null) {
    return buildUnavailableSemanticSummary(
      "provider_missing",
      "semantic provider env not available"
    );
  }

  return runSelectedSemanticAnalysisWithProvider({
    verseKey,
    semanticInput: {
      ayahText: detail.ayah.arabicText,
      translation: primaryTranslation.text,
      themes: analysis?.themes ?? [],
      roots: getSemanticRootSignals(detail.wordAnalyses),
      participants: getSemanticParticipantSignals(analysis),
      wordAnalysisCount: detail.wordAnalyses.length
    },
    provider
  });
}

function AyahNavigation({
  previous,
  next
}: {
  previous: AyahLink | null;
  next: AyahLink | null;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Ayet gezinme">
      {previous ? (
        <Link
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
          href={`/surah/${previous.surahId}/ayah/${previous.ayahNumber}`}
        >
          {previous.label}
        </Link>
      ) : (
        <span className="rounded-md border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-500">
          Önceki ayet yok
        </span>
      )}
      {next ? (
        <Link
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
          href={`/surah/${next.surahId}/ayah/${next.ayahNumber}`}
        >
          {next.label}
        </Link>
      ) : (
        <span className="rounded-md border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-500">
          Sonraki ayet yok
        </span>
      )}
    </nav>
  );
}

function WordAnalysisDebugToggle({
  ayahNumber,
  currentSource,
  searchParams,
  surahId
}: {
  ayahNumber: number;
  currentSource: WordAnalysisSource;
  searchParams: PageProps["searchParams"];
  surahId: number;
}) {
  const legacyHref = getWordAnalysisSourceHref({
    ayahNumber,
    searchParams,
    source: "legacy",
    surahId
  });
  const canonicalHref = getWordAnalysisSourceHref({
    ayahNumber,
    searchParams,
    source: "canonical",
    surahId
  });
  const baseClass = "rounded-md border px-3 py-1.5 text-xs font-medium";
  const activeClass = "border-stone-900 bg-stone-900 text-white";
  const inactiveClass = "border-stone-300 bg-white text-stone-700 hover:bg-stone-50";

  return (
    <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Analiz kaynağı karşılaştırması
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          className={`${baseClass} ${currentSource === "legacy" ? activeClass : inactiveClass}`}
          href={legacyHref}
        >
          Segment analizi
        </Link>
        <Link
          className={`${baseClass} ${currentSource === "canonical" ? activeClass : inactiveClass}`}
          href={canonicalHref}
        >
          Kelime bazlı analiz
        </Link>
      </div>
    </div>
  );
}

function HiddenSourcesSummary({ sources }: { sources: string[] }) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 text-sm text-stone-600">
      <p>{sources.length} kaynak kalite filtresi nedeniyle gizlendi.</p>
      <details className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
        <summary className="cursor-pointer font-medium text-stone-700">
          Kaynak listesini göster
        </summary>
        <p className="mt-2 leading-6">{sources.join(", ")}</p>
      </details>
    </div>
  );
}

function OtherTranslations({
  displayableTranslations,
  primaryTranslation,
  filteredSources
}: {
  displayableTranslations: Translation[];
  primaryTranslation: Translation | null;
  filteredSources: string[];
}) {
  const otherTranslations = displayableTranslations.filter(
    (translation) => translation !== primaryTranslation
  );

  if (otherTranslations.length === 0) {
    return <EmptyState>Diğer Türkçe mealler için temiz görüntü verisi bulunamadı.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <HiddenSourcesSummary sources={filteredSources} />
      <div className="grid gap-3 md:grid-cols-2">
        {otherTranslations.map((translation) => (
          <article
            className="rounded-md border border-stone-200 bg-stone-50 p-4"
            key={`${translation.source}-${translation.text}`}
          >
            <h3 className="mb-2 text-sm font-semibold text-stone-700">
              {getTranslationSourceName(translation)}
            </h3>
            <p className="text-sm leading-6 text-stone-800">{translation.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function WordMeaning({ word }: { word: WordAnalysis }) {
  const meaningText = getWordMeaningDisplayText(word);

  if (meaningText) {
    return <span>{meaningText}</span>;
  }

  return <span className="text-stone-500">Kelime anlamı yok.</span>;
}

function RootExplanation({ word }: { word: WordAnalysis }) {
  if (word.rootExplanation?.text) {
    return <span>{word.rootExplanation.text}</span>;
  }

  if (word.root) {
    return <span className="text-stone-500">Kök var, açıklaması eksik.</span>;
  }

  const naturallyRootlessLabel = getNaturallyRootlessLabel(word);

  if (naturallyRootlessLabel) {
    return (
      <span className="text-stone-500">Bu kelime kök içermez ({naturallyRootlessLabel}).</span>
    );
  }

  return <span className="text-stone-500">Kök bilgisi yok.</span>;
}

function WordAnalysisTable({ words }: { words: WordAnalysis[] }) {
  if (words.length === 0) {
    return <EmptyState>Kelime analizi verisi yok.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-xs uppercase text-stone-500">
            <th
              className="py-2 pr-4 font-semibold"
              title="Bu numara ekrandaki görsel sırayı gösterir; ham veri indeksi değildir."
            >
              #
            </th>
            <th className="py-2 pr-4 font-semibold">Kelime</th>
            <th className="py-2 pr-4 font-semibold">Tür</th>
            <th className="py-2 pr-4 font-semibold">Anlam</th>
            <th className="py-2 pr-4 font-semibold">Kök</th>
            <th className="py-2 font-semibold">Kök açıklaması</th>
          </tr>
        </thead>
        <tbody>
          {words.map((word, index) => (
            <tr
              className="border-b border-stone-100 align-top"
              key={`${index + 1}-${word.arabic ?? "missing"}`}
            >
              <td className="py-3 pr-4 text-stone-500">{index + 1}</td>
              <td className="py-3 pr-4 text-xl leading-8 text-stone-950" dir="rtl" lang="ar">
                {word.arabic ?? "Metin yok"}
              </td>
              <td className="py-3 pr-4 text-stone-700">
                {getMorphologyLabel(word.morphology)}
              </td>
              <td className="py-3 pr-4 text-stone-700">
                <WordMeaning word={word} />
              </td>
              <td className="py-3 pr-4 text-stone-700">{getRootDisplayText(word)}</td>
              <td className="py-3 text-stone-700">
                <RootExplanation word={word} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WordMeaningSummary({ words }: { words: WordAnalysis[] }) {
  const missingWords = words.filter((word) => !getWordMeaningDisplayText(word));

  if (words.length === 0) {
    return <EmptyState>Kelime anlamı verisi yok.</EmptyState>;
  }

  if (missingWords.length === 0) {
    return <p className="text-sm text-stone-700">Temel anlam verisi büyük ölçüde mevcut.</p>;
  }

  return (
    <p className="text-sm text-stone-700">
      {words.length} kelimenin {missingWords.length} tanesinde anlam verisi eksik. Ayrıntı ana
      kelime tablosunda gösterilir.
    </p>
  );
}

function RootExplanationSummary({ words }: { words: WordAnalysis[] }) {
  const naturallyRootless = words.filter((word) => getNaturallyRootlessLabel(word));
  const withoutRoot = words.filter((word) => !word.root && !getNaturallyRootlessLabel(word));
  const rootWithoutExplanation = words.filter((word) => word.root && !word.rootExplanation?.text);
  const withExplanation = words.filter((word) => word.rootExplanation?.text);

  if (words.length === 0) {
    return <EmptyState>Kök bilgisi yok.</EmptyState>;
  }

  if (withoutRoot.length === words.length && withExplanation.length === 0) {
    return <EmptyState>Kök bilgisi yok.</EmptyState>;
  }

  return (
    <div className="space-y-3 text-sm text-stone-700">
      <p>
        Açıklaması olan kök: {withExplanation.length}. Kök var, açıklaması eksik:{" "}
        {rootWithoutExplanation.length}. Kök içermeyen kelime: {naturallyRootless.length}. Kök
        bilgisi yok: {withoutRoot.length}.
      </p>
      {rootWithoutExplanation.length > 0 ? (
        <EmptyState>Kök var, açıklaması eksik olan kayıtlar mevcut.</EmptyState>
      ) : null}
      {naturallyRootless.length > 0 ? (
        <EmptyState>Edat veya bağlaç gibi bazı kelimeler doğal olarak kök içermez.</EmptyState>
      ) : null}
      {withoutRoot.length > 0 ? <EmptyState>Kök bilgisi olmayan kelimeler mevcut.</EmptyState> : null}
    </div>
  );
}

interface UniqueRootSummary {
  root: string;
  explanation: string | null;
  count: number;
}

function getUniqueRootSummaries(words: WordAnalysis[]): UniqueRootSummary[] {
  const rootSummaries = new Map<string, UniqueRootSummary>();

  for (const word of words) {
    if (!word.root) {
      continue;
    }

    const existingSummary = rootSummaries.get(word.root);
    const explanation = word.rootExplanation?.text ?? null;

    if (existingSummary) {
      existingSummary.count += 1;

      if (!existingSummary.explanation && explanation) {
        existingSummary.explanation = explanation;
      }

      continue;
    }

    rootSummaries.set(word.root, {
      root: word.root,
      explanation,
      count: 1
    });
  }

  return Array.from(rootSummaries.values());
}

function UniqueRootList({ words }: { words: WordAnalysis[] }) {
  const roots = getUniqueRootSummaries(words);

  if (roots.length === 0) {
    return <EmptyState>Bu ayet icin kok bilgisi bulunamadi.</EmptyState>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {roots.map((rootSummary) => (
        <article
          className="rounded-md border border-stone-200 bg-stone-50 p-4"
          key={rootSummary.root}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl leading-8 text-stone-950" dir="rtl" lang="ar">
              {rootSummary.root}
            </h3>
            <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600">
              {rootSummary.count} kelime
            </span>
          </div>
          <p className="text-sm leading-6 text-stone-800">
            {rootSummary.explanation ?? "Kok aciklamasi yok"}
          </p>
        </article>
      ))}
    </div>
  );
}

function TafsirBlock({ tafsir }: { tafsir: TafsirSummary | null }) {
  if (tafsir?.status === "available" && tafsir.summary) {
    return (
      <div className="space-y-3">
        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
          Ayet aralığı tefsiri
        </span>
        <p className="whitespace-pre-line text-sm leading-7 text-stone-800">{tafsir.summary}</p>
      </div>
    );
  }

  return (
    <EmptyState>
      Bu ayet için ayet bazlı tefsir verisi yok. Sûre düzeyi açıklamalar ayrı değerlendirilir.
    </EmptyState>
  );
}

function RevelationBlock({ context }: { context: RevelationContext | null }) {
  if (context?.status !== "available") {
    return <EmptyState>Ayet bazlı nüzûl verisi bulunamadı.</EmptyState>;
  }

  const isSurahScope = context.scope === "surah";

  return (
    <div className="space-y-3">
      <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800">
        {isSurahScope ? "Sûre bilgisi / nüzûl metadata" : "Ayet bazlı nüzûl"}
      </span>
      {context.summary ? (
        <p className="whitespace-pre-line text-sm leading-7 text-stone-800">{context.summary}</p>
      ) : (
        <p className="text-sm text-stone-700">
          Sûre düzeyi metadata mevcut; ayet bazlı nüzûl özeti bulunamadı.
        </p>
      )}
      {isSurahScope ? <EmptyState>Ayet bazlı nüzûl verisi bulunamadı.</EmptyState> : null}
    </div>
  );
}

function FidelityBlock({
  fidelity,
  hiddenSourcesToOmit = []
}: {
  fidelity: FidelityAnalysis | null;
  hiddenSourcesToOmit?: string[];
}) {
  if (fidelity?.status !== "available") {
    return (
      <EmptyState>
        Meal karşılaştırması için yeterli temiz veri yok.
      </EmptyState>
    );
  }

  const cleanComparisons = fidelity.comparisons.filter(isCleanComparison);
  const omittedHiddenSources = new Set(hiddenSourcesToOmit);
  const filteredSources = [
    ...new Set(
      fidelity.comparisons
        .filter((comparison) => {
          return (
            comparison.status === "available" &&
            !isCleanComparison(comparison) &&
            !omittedHiddenSources.has(comparison.sourceName)
          );
        })
        .map((comparison) => comparison.sourceName)
    )
  ].sort((left, right) => left.localeCompare(right, "tr"));

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-700">
        Karşılaştırma verisi mevcut. Bu bölüm kaynaklar arası meal metinlerini listeler; otomatik
        bir doğruluk puanı olarak yorumlanmamalıdır.
      </p>
      <p className="text-sm text-stone-600">
        {cleanComparisons.length} temiz karşılaştırma gösteriliyor; {filteredSources.length} kaynak
        kalite filtresi nedeniyle gizlendi.
      </p>
      {filteredSources.length > 0 ? (
        <details className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
          <summary className="cursor-pointer font-medium text-stone-700">
            Gizlenen kaynak listesini göster
          </summary>
          <p className="mt-2 leading-6">{filteredSources.join(", ")}</p>
        </details>
      ) : null}
      {cleanComparisons.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {cleanComparisons.map((comparison) => (
            <article
              className="rounded-md border border-stone-200 bg-stone-50 p-4"
              key={`${comparison.sourceName}-${comparison.text}`}
            >
              <h3 className="mb-2 text-sm font-semibold text-stone-700">
                {comparison.sourceName}
              </h3>
              <p className="text-sm leading-6 text-stone-800">{comparison.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>
          Karşılaştırma verisi mevcut; ancak gösterilecek temiz karşılaştırma kaydı bulunamadı.
        </EmptyState>
      )}
    </div>
  );
}

function AnalysisEngineBlock({
  analysis,
  emphasizeSummary,
  showDebugDetails,
  preview,
  showEmptyState
}: {
  analysis: AyahAnalysisEngineV1 | null;
  emphasizeSummary: boolean;
  showDebugDetails: boolean;
  preview: ProvenAnalysisPreview | null;
  showEmptyState: boolean;
}) {
  if (analysis === null) {
    return showEmptyState ? (
      <EmptyState>Bu ayet icin yardimci tema sinyali henuz uretilemedi.</EmptyState>
    ) : null;
  }

  const hasParticipants = Boolean(
    analysis.participants.speaker || analysis.participants.addressee
  );
  const filteredThemes = filterHelperThemes({ analysis, preview });
  const hasThemes = filteredThemes.length > 0;
  const showSummary = Boolean(analysis.summary) && (emphasizeSummary || showDebugDetails);
  const participantSignals = [
    analysis.participants.speaker ? `Konusan: ${analysis.participants.speaker}` : null,
    analysis.participants.addressee ? `Muhatap: ${analysis.participants.addressee}` : null
  ].filter((value): value is string => value !== null);
  const hasSignals = hasThemes || participantSignals.length > 0 || showSummary;

  if (!hasSignals && !showEmptyState) {
    return null;
  }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-stone-700">Tema ve Katilimci Sinyalleri</h3>
          <p className="text-sm leading-6 text-stone-600">
            Bu bolum, ayette one cikan tema ve muhatap sinyallerini yardimci bilgi olarak
            gosterir.
          </p>
        </div>
        <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600">
          Yardimci katman
        </span>
      </div>

      {!hasSignals ? (
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Bu bolumde gosterilecek yardimci sinyal bulunmuyor.
        </p>
      ) : null}

      {showSummary ? (
        <div className="mt-4 rounded-md border border-stone-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {emphasizeSummary ? "Ozet" : "Gelistirici ozeti"}
          </p>
          <p className="mt-2 text-sm leading-7 text-stone-800">{analysis.summary}</p>
        </div>
      ) : null}

      {hasThemes ? (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Temalar
          </h4>
          <div className="flex flex-wrap gap-2">
          {filteredThemes.map((theme) => (
            <span
              className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700"
              key={theme}
            >
              {theme}
            </span>
          ))}
        </div>
        </div>
      ) : null}

      {participantSignals.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Katilimcilar
          </h4>
          <div className="flex flex-wrap gap-2">
            {participantSignals.map((signal) => (
              <span
                className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700"
                key={signal}
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {showDebugDetails ? (
        <p className="mt-4 border-t border-stone-200 pt-3 text-xs text-stone-500">
          Legacy engine: AnalysisEngineV1
        </p>
      ) : null}
    </div>
  );
}

function SemanticSummaryCard({
  semanticSummary,
  showEmptyState
}: {
  semanticSummary: SelectedSemanticProviderSummary | null;
  showEmptyState: boolean;
}) {
  if (!semanticSummary?.selectedSummary) {
    return showEmptyState ? (
      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4">
        <h3 className="text-sm font-semibold text-stone-700">Kısa Anlam Özeti</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Bu ayet için kısa anlam özeti henüz hazır değil.
        </p>
      </div>
    ) : null;
  }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <h3 className="text-sm font-semibold text-stone-700">Kısa Anlam Özeti</h3>
      <p className="mt-2 text-sm leading-7 text-stone-900">{semanticSummary.selectedSummary}</p>
    </div>
  );
}

function isEnglishText(text: string): boolean {
  return /\b(?:the|and|of|to|in|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|shall|can|for|on|with|at|by|from|or|but|not|it|its|this|that|these|those|he|she|they|we|you|I|me|him|her|them|us)\b/iu.test(text) ||
    /^[a-z][a-z\s,'-]*$/iu.test(text);
}

function RawWordTranslationCard({ wordAnalyses }: { wordAnalyses: WordAnalysis[] }) {
  if (wordAnalyses.length === 0) {
    return null;
  }

  const parts = wordAnalyses.map((word) => {
    const meaning = word.meaning?.text?.trim();
    if (meaning && !isEnglishText(meaning)) {
      return meaning;
    }
    return word.arabic || `[${word.wordIndex}]`;
  });

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-900">Ham Kelime Çevirisi</h3>
      <p className="mt-1 text-xs text-stone-500">
        Kelimelerin sırasıyla doğrudan anlamları, yorum yapılmadan
      </p>
      <p className="mt-3 text-sm leading-7 text-stone-700">{parts.join(" ") + "."}</p>
    </div>
  );
}

function RawMeaningSummaryCard({ wordAnalyses }: { wordAnalyses: WordAnalysis[] }) {
  const meanings = wordAnalyses
    .map((word) => word.meaning?.text?.trim())
    .filter((m): m is string => typeof m === "string" && m.length > 0 && !isEnglishText(m));

  if (meanings.length === 0) return null;

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-900">Ham Anlam Özeti</h3>
      <p className="mt-1 text-xs text-stone-500">Kelimelerin sırasıyla doğrudan anlamları</p>
      <p className="mt-3 text-sm leading-7 text-stone-700">{meanings.join(" ") + "."}</p>
    </div>
  );
}

function AiMeaningSummaryCard({ summary }: { summary: string | null }) {
  if (!summary) return null;
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-900">Anlam Özeti</h3>
      <p className="mt-2 text-sm leading-6 text-stone-700">{summary}</p>
    </div>
  );
}

function ProvenAnalysisCard({ preview }: { preview: ProvenAnalysisPreview | null }) {
  if (preview === null) {
    return null;
  }

  const hasWeakCorrespondenceSection = preview.weakCorrespondencesPreview.length > 0;
  const hasEvidenceNotesSection = preview.evidenceNotesPreview.length > 0;
  const hasSourceStatusSection =
    Boolean(preview.sourceStatus.mutedText) ||
    preview.sourceStatus.available.length > 0 ||
    preview.sourceStatus.missing.length > 0;

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-900">Kanıtlı Analiz</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Bu bölüm, ayetin mealleri, kelime verileri ve mevcut kaynak sinyalleri üzerinden
        üretilen kontrollü bir ön analizdir.
      </p>

      {preview.mainMeaningAxisPreview.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Ana anlam ekseni
          </h4>
          {preview.mainMeaningAxisPreview.map((item) => (
            <p className="text-sm leading-7 text-stone-900" key={item}>
              {item}
            </p>
          ))}
        </div>
      ) : null}

      {preview.keyTermsPreview.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Anahtar terimler
          </h4>
          <div className="flex flex-wrap gap-2">
            {preview.keyTermsPreview.map((term) => (
              <span
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700"
                key={term}
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {preview.translationDifferencesPreview.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Mealler arası dikkat çeken farklar
          </h4>
          <ul className="space-y-2 text-sm leading-6 text-stone-800">
            {preview.translationDifferencesPreview.map((item) => (
              <li className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasWeakCorrespondenceSection ? (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Dikkat isteyen karşılık alanları
          </h4>
          <ul className="space-y-2 text-sm leading-6 text-stone-800">
            {preview.weakCorrespondencesPreview.map((item) => (
              <li className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasEvidenceNotesSection ? (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Kanıt notları
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-stone-500">
            {preview.evidenceNotesPreview.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasSourceStatusSection ? (
        <div className="mt-3 text-xs leading-5 text-stone-500">
          {preview.sourceStatus.mutedText ? (
            <p>{preview.sourceStatus.mutedText}</p>
          ) : (
            <p>
              {[...preview.sourceStatus.available, ...preview.sourceStatus.missing]
                .slice(0, 2)
                .join(" ")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function buildAyahDetailDebugPayload({
  detail,
  filteredTranslationSources,
  hiddenSourcesToOmit,
  includeCopyForValidator,
  primarySelection,
  primarySourceName,
  readingTrResult,
  semanticSummary,
  sectionStatuses,
  wordAnalysisSource
}: {
  detail: Awaited<ReturnType<typeof getAyahDetail>>;
  filteredTranslationSources: string[];
  hiddenSourcesToOmit: string[];
  includeCopyForValidator: boolean;
  primarySelection: PrimaryTranslationSelection;
  primarySourceName: string | null;
  readingTrResult: ReturnType<typeof normalizeTransliterationToReadingTrDetailed>;
  semanticSummary: SelectedSemanticProviderSummary | null;
  sectionStatuses: SectionStatuses;
  wordAnalysisSource: WordAnalysisSource;
}): AyahDetailDebugPayload {
  const meaningOverrides: AyahDetailDebugPayload["fallback_override_status"]["meaningOverrides"] =
    [];

  const meanings = detail.wordAnalyses.map((word) => {
    const overrideText = getMeaningOverride(word);
    const rawText = word.meaning?.text ?? null;

    if (overrideText) {
      meaningOverrides.push({
        index: word.wordIndex,
        arabic: word.arabic,
        rawText,
        overrideText
      });
    }

    return {
      index: word.wordIndex,
      text: getWordMeaningDisplayText(word),
      rawText,
      source: word.meaning?.source ?? null,
      status: word.meaning?.status ?? "missing",
      usedOverride: overrideText !== null,
      overrideText
    };
  });

  const debugPayload: AyahDetailDebugPayload = {
    id: detail.ayah.id,
    arabicText: detail.ayah.arabicText,
    arabicTokens: detail.wordAnalyses.map((word) => word.arabic),
    analysisTokens: detail.wordAnalyses.map((word) => ({
      index: word.wordIndex,
      arabic: word.arabic,
      morphology: word.morphology,
      transliteration: word.transliteration,
      status: word.status
    })),
    roots: detail.wordAnalyses.map((word) => ({
      index: word.wordIndex,
      root: word.root,
      rootExplanationText: word.rootExplanation?.text ?? null,
      rootExplanationStatus: word.rootExplanationStatus,
      rootExplanationMissingReason: word.rootExplanationMissingReason
    })),
    meanings,
    reading_tr: readingTrResult,
    fallback_override_status: {
      wordAnalysisSource,
      detailStatus: detail.status,
      ayahStatus: detail.ayah.status,
      primaryTranslation: {
        source: primarySourceName,
        isFallback: primarySelection.isFallback,
        note: primarySelection.note
      },
      meaningOverrides,
      hiddenSourcesToOmit,
      filteredTranslationSources,
      sectionStatuses
    }
  };

  if (semanticSummary !== null) {
    debugPayload.semanticSummary = {
      status: semanticSummary.status,
      selectedSummary: semanticSummary.selectedSummary,
      selectedSource: semanticSummary.selectedSource,
      severity: semanticSummary.severity,
      reason: semanticSummary.reason,
      warnings: [...semanticSummary.warnings],
      rawSummary: semanticSummary.rawSummary
    };
  }

  if (includeCopyForValidator) {
    debugPayload.copyForValidator = buildValidatorCopyPayload(detail);
  }

  return debugPayload;
}

function AyahDetailDebugPanel({ payload }: { payload: AyahDetailDebugPayload }) {
  return (
    <section className="rounded-md border border-dashed border-amber-300 bg-amber-50 p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-stone-950">Dev Debug: Render Data</h2>
      <pre className="max-h-[520px] overflow-auto rounded-md bg-stone-950 p-4 text-xs leading-5 text-stone-50">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const surahId = parsePositiveInteger(params.surahId);
  const ayahNumber = parsePositiveInteger(params.ayahNumber);

  if (surahId === null || ayahNumber === null) {
    return <ErrorState message="Sûre veya ayet numarası pozitif tam sayı olmalı." />;
  }

  const surahs = await getSurahs();
  const surahFullTafsir = getSurahFullTafsir(surahId);
  const currentSurah = surahs.find((surah) => surah.id === surahId) ?? null;

  if (currentSurah === null || !currentSurah.verseCount || ayahNumber > currentSurah.verseCount) {
    return <ErrorState message="Bu sûre/ayet adresi için veri yok." />;
  }

  const debugQueryEnabled = getSingleQueryValue(searchParams?.debug) === "1";
  const experimentalUiEnabled =
    process.env.QURAN_APP_ENABLE_EXPERIMENTAL_QUERY === "1" ||
    process.env.QURAN_APP_ENABLE_EXPERIMENTAL_QUERY === "true";
  const showExperimentalControls = debugQueryEnabled || experimentalUiEnabled;
  const wordAnalysisSource = resolveWordAnalysisSource(
    searchParams?.wa_source,
    searchParams?.debug
  );
  let detail: Awaited<ReturnType<typeof getAyahDetail>>;
  try {
    detail = await getAyahDetail(surahId, ayahNumber, { wordAnalysisSource });
  } catch (err) {
    console.error(`[Page] getAyahDetail ${surahId}:${ayahNumber} başarısız:`, err);
    return <ErrorState message="Ayet verisi yüklenemedi. Lütfen sayfayı yenileyin." />;
  }
  const verseKey = `${surahId}:${ayahNumber}`;
  const analysis = await getAyahAnalysisEngine(verseKey);
  const readingTrResult = normalizeTransliterationToReadingTrDetailed(detail.ayah.transliteration);
  const translationSourceQualities = getTranslationSourceQualities(detail.translations);
  const displayableTranslations = getDisplayableTranslations(translationSourceQualities);
  const primarySelection = getPrimaryTranslationSelection(translationSourceQualities);
  const primaryTranslation = primarySelection.translation;
  const isDevelopment = process.env.NODE_ENV === "development";
  const showDeveloperDebug = isDevelopment && showExperimentalControls;
  const primarySourceName = primaryTranslation ? getTranslationSourceName(primaryTranslation) : null;
  let semanticSummary: SelectedSemanticProviderSummary = buildUnavailableSemanticSummary(
    "no_result",
    "semantic summary not attempted"
  );
  let provenAnalysisPreview: ProvenAnalysisPreview | null = null;
  let aiMeaningSummary: string | null = null;

  try {
    semanticSummary = await getSelectedSemanticSummaryForPage({
      analysis,
      detail,
      primaryTranslation,
      verseKey
    });
  } catch (error) {
    semanticSummary = buildUnavailableSemanticSummary(
      "provider_error",
      "semantic summary page integration failed"
    );

    if (isDevelopment) {
      console.error("SEMANTIC_SUMMARY_PAGE_ERROR", error);
    }
  }

  try {
    const verseAnalysisContext = await buildVerseAnalysisContext(surahId, ayahNumber, { useRootExplanationsV2: true });
    provenAnalysisPreview = buildVerseAnalysisPreview(verseAnalysisContext, { sourceStatus: "mapped" });
    aiMeaningSummary = verseAnalysisContext.aiMeaningSummary;
  } catch (error) {
    provenAnalysisPreview = null;

    if (isDevelopment) {
      console.error("PROVEN_ANALYSIS_PREVIEW_ERROR", error);
    }
  }

  const hiddenSourcesToOmit =
    primarySelection.isFallback && primarySourceName ? [primarySourceName] : [];
  const filteredTranslationSources = getFilteredTranslationSources(
    translationSourceQualities,
    hiddenSourcesToOmit
  );
  const sectionStatuses = getSectionStatuses({
    ayahStatus: detail.ayah.status,
    hasTransliteration: Boolean(detail.ayah.transliteration),
    primarySelection,
    displayableTranslationCount: displayableTranslations.length,
    filteredTranslationCount: filteredTranslationSources.length,
    words: detail.wordAnalyses,
    tafsir: detail.tafsirSummary,
    revelationContext: detail.revelationContext,
    fidelity: detail.fidelityAnalysis
  });
  const wordAnalysisNote =
    wordAnalysisSource === "canonical"
      ? "Kelimeler tek tek gösterilir; tür, anlam ve kök bilgileri aynı satırda verilir."
      : "Bu görünüm kelime parçalarını segment bazlı gösterir; karşılaştırma amacıyla korunur.";
  const previousAyah = getPreviousAyah(surahs, surahId, ayahNumber);
  const nextAyah = getNextAyah(surahs, currentSurah, ayahNumber);
  const ayahDetailDebugPayload = buildAyahDetailDebugPayload({
    detail,
    filteredTranslationSources,
    hiddenSourcesToOmit,
    includeCopyForValidator: showDeveloperDebug,
    primarySelection,
    primarySourceName,
    readingTrResult,
    semanticSummary,
    sectionStatuses,
    wordAnalysisSource
  });

  if (showDeveloperDebug) {
    console.log("AYAH_DETAIL_DEBUG", ayahDetailDebugPayload);
  }

  const tabItems: AyahDetailTabItem[] = [
    {
      id: "meal",
      label: "Meal",
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-950">Ana Meal</h2>
            <StatusBadge status={sectionStatuses.primaryTranslation} />
          </div>
          <p className="text-sm text-stone-600">{primarySelection.note}</p>
          {primaryTranslation?.text ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-stone-600">
                {getTranslationSourceName(primaryTranslation)}
              </p>
              <p className="text-lg leading-8 text-stone-900">{primaryTranslation.text}</p>
            </div>
          ) : (
            <EmptyState>Ana meal icin temiz veri yok.</EmptyState>
          )}
        </div>
      )
    },
    {
      id: "word-analysis",
      label: "Kelime Analizi",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">
                {wordAnalysisSource === "canonical"
                  ? "Kelime Bazli Morfolojik Analiz"
                  : "Morfolojik Segment Analizi"}
              </h2>
              <StatusBadge status={sectionStatuses.wordAnalysis} />
            </div>
            <p className="text-sm text-stone-600">{wordAnalysisNote}</p>
          </div>
          <WordAnalysisTable words={detail.wordAnalyses} />
          <div className="border-t border-stone-200 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-stone-950">Kelime Anlamlari</h3>
              <StatusBadge status={sectionStatuses.wordMeanings} />
            </div>
            <WordMeaningSummary words={detail.wordAnalyses} />
          </div>
        </div>
      )
    },
    {
      id: "roots",
      label: "Kokler",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">
                Kok Bilgisi ve Kok Aciklamasi
              </h2>
              <StatusBadge status={sectionStatuses.rootExplanations} />
            </div>
            <p className="text-sm text-stone-600">
              Kok icermeyen kelimeler ile aciklamasi eksik kokler ayri gosterilir.
            </p>
          </div>
          <RootExplanationSummary words={detail.wordAnalyses} />
          <UniqueRootList words={detail.wordAnalyses} />
        </div>
      )
    },
    {
      id: "analysis-engine",
      label: "Analiz",
      content: (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-950">Analiz</h2>
            <StatusBadge status={analysis === null ? "missing" : "ready"} />
          </div>
          <RawWordTranslationCard wordAnalyses={detail.wordAnalyses} />
          <RawMeaningSummaryCard wordAnalyses={detail.wordAnalyses} />
          <AiMeaningSummaryCard summary={aiMeaningSummary} />
          <ProvenAnalysisCard preview={provenAnalysisPreview} />
          <AnalysisEngineBlock
            analysis={analysis}
            emphasizeSummary={provenAnalysisPreview === null}
            showDebugDetails={showDeveloperDebug}
            preview={provenAnalysisPreview}
            showEmptyState={provenAnalysisPreview === null}
          />
        </div>
      )
    },
    {
      id: "other-translations",
      label: "Diger Mealler",
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-950">Diger Turkce Mealler</h2>
            <StatusBadge status={sectionStatuses.otherTranslations} />
          </div>
          <OtherTranslations
            displayableTranslations={displayableTranslations}
            filteredSources={filteredTranslationSources}
            primaryTranslation={primaryTranslation}
          />
        </div>
      )
    }
  ];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-stone-500">İlk gerçek ayet detay ekranı</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">
                {detail.surah?.turkishName.text ?? "Sûre adı bulunamadı"}
              </h1>
              <p className="mt-2 text-sm text-stone-600">
                Sûre {detail.surah?.id ?? surahId} · Ayet {detail.ayah.verseNumber}
              </p>
              <div className="mt-4">
                <AyahJumpForm initialSurahId={surahId} initialAyahNumber={ayahNumber} />
              </div>
            </div>
            <StatusBadge status={sectionStatuses.page} />
          </div>
        </header>

        <SurahAboutAccordion
          revelationOrder={currentSurah.revelationOrder}
          revelationPlace={currentSurah.revelationPlace}
          tafsir={surahFullTafsir}
        />

        <AyahNavigation previous={previousAyah} next={nextAyah} />

        {showDeveloperDebug ? (
          <AyahDetailDebugPanel payload={ayahDetailDebugPayload} />
        ) : null}

        {showExperimentalControls ? (
          <WordAnalysisDebugToggle
            ayahNumber={ayahNumber}
            currentSource={wordAnalysisSource}
            searchParams={searchParams}
            surahId={surahId}
          />
        ) : null}

        <SectionCard title="Arapça Metin" status={sectionStatuses.arabicText}>
          {detail.ayah.arabicText ? (
            <p className="text-right text-4xl leading-[2.25] text-stone-950" dir="rtl" lang="ar">
              {detail.ayah.arabicText}
            </p>
          ) : (
            <EmptyState />
          )}
        </SectionCard>

        <SectionCard
          title="Okunuş"
          status={sectionStatuses.transliteration}
          note="Ayetin Türkçe okunuşu."
        >
          {detail.ayah.transliteration ? (
            <div className="space-y-4">
              <p className="text-lg leading-8 text-stone-900">
                {readingTrResult?.output ?? detail.ayah.transliteration}
              </p>
              {showExperimentalControls ? (
                <details className="rounded-md border border-stone-200 bg-stone-50 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-stone-700">
                    Teknik okunuşu göster
                  </summary>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Ham transliteration
                  </p>
                  <p className="mt-1 text-sm leading-7 text-stone-700">
                    {detail.ayah.transliteration}
                  </p>
                  {readingTrResult?.suspiciousMatches.length ? (
                    <p className="mt-2 text-xs text-stone-600">
                      Şüpheli dönüşüm izleri: {readingTrResult.suspiciousMatches.join(", ")}
                    </p>
                  ) : null}
                </details>
              ) : null}
            </div>
          ) : (
            <EmptyState />
          )}
        </SectionCard>

        <SectionCard
          title="Ana Meal"
          status={sectionStatuses.primaryTranslation}
          note={primarySelection.note}
        >
          {primaryTranslation?.text ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-stone-600">
                {getTranslationSourceName(primaryTranslation)}
              </p>
              <p className="text-lg leading-8 text-stone-900">{primaryTranslation.text}</p>
            </div>
          ) : (
            <EmptyState>Ana meal için temiz veri yok.</EmptyState>
          )}
        </SectionCard>

        <AyahDetailTabs tabs={tabItems} />

        <SectionCard
          title="Tefsir"
          status={sectionStatuses.tafsir}
        >
          <TafsirBlock tafsir={detail.tafsirSummary} />
        </SectionCard>

        <SectionCard
          title="Nüzûl Bağlamı"
          status={sectionStatuses.revelationContext}
        >
          <RevelationBlock context={detail.revelationContext} />
        </SectionCard>

        <SectionCard
          title="Meal Tutarlılığı"
          status={sectionStatuses.fidelity}
        >
          <FidelityBlock
            fidelity={detail.fidelityAnalysis}
            hiddenSourcesToOmit={hiddenSourcesToOmit}
          />
        </SectionCard>
      </div>
    </main>
  );
}
