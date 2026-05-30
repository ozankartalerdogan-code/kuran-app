export const dynamic = "force-dynamic";
import {
  getAyahDetail,
  getSurahs,
  normalizeTransliterationToReadingTrDetailed
} from "@quran-app/core";
import type { WordAnalysisSource } from "@quran-app/core";
import type {
  AvailabilityStatus,
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
import { MORPH_LABELS, MORPH_ABBR } from "../../../../../lib/morphologyLabels";
import dynamicImport from "next/dynamic";
import { FavoriteButton } from "../../../../../components/FavoriteButton";
import { AudioPlayer } from "../../../../../components/AudioPlayer";
import { ShareButton } from "./ShareButton";

const NoteEditor    = dynamicImport(() => import("./NoteEditor").then((m) => m.NoteEditor),    { ssr: false });
const StreakTracker = dynamicImport(() => import("./StreakTracker").then((m) => m.StreakTracker), { ssr: false });

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

const primaryReferenceSource = "yazir";
const preferredPrimarySources = ["yazir", "diyanet", "bulac", "vakfi", "ozturk"];

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  diyanet: "Diyanet İşleri",
  yazir:   "Elmalılı H. Yazır",
  bulac:   "Ali Bulaç",
  vakfi:   "Diyanet Vakfı",
  ozturk:  "Yaşar Nuri Öztürk",
};
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

function MorphBadge({ morphology }: { morphology: string | null }) {
  if (!morphology) return <span className="text-stone-400">—</span>;
  const abbr = MORPH_ABBR[morphology] ?? morphology;
  const label = MORPH_LABELS[morphology] ?? morphology;
  const hasLabel = label !== abbr;
  return (
    <span className="inline-flex flex-col leading-tight">
      <span>
        {abbr}
        {hasLabel && (
          <span className="hidden sm:inline text-stone-500"> ({label})</span>
        )}
      </span>
      {hasLabel && (
        <span className="text-[10px] text-stone-400 sm:hidden">{label}</span>
      )}
    </span>
  );
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
  const key = translation.source?.split("#").at(-1) ?? "";
  return SOURCE_DISPLAY_NAMES[key] ?? (key || "bilinmeyen kaynak");
}

function getTranslationSourceKey(translation: Pick<Translation, "source">): string {
  return translation.source?.split("#").at(-1) ?? "";
}

function getTranslationBySource(translations: Translation[], source: string): Translation | null {
  return translations.find((translation) => getTranslationSourceKey(translation) === source) ?? null;
}

function getPrimaryTranslationSelection(
  qualities: TranslationSourceQuality[]
): PrimaryTranslationSelection {
  const translations = qualities.map((quality) => quality.translation);
  const referenceQuality =
    qualities.find((quality) => getTranslationSourceKey(quality.translation) === primaryReferenceSource) ?? null;
  const referenceTranslation = referenceQuality?.translation ?? null;

  const primaryDisplayName = SOURCE_DISPLAY_NAMES[primaryReferenceSource] ?? primaryReferenceSource;

  if (referenceQuality?.isClean) {
    return {
      translation: referenceQuality.translation,
      note: `Ana meal olarak ${primaryDisplayName} gösteriliyor.`,
      isFallback: false
    };
  }

  for (const source of preferredPrimarySources) {
    if (source === primaryReferenceSource) {
      continue;
    }

    const matched = getTranslationBySource(translations, source);

    if (matched && isCleanTranslation(matched)) {
      const fallbackName = SOURCE_DISPLAY_NAMES[source] ?? source;
      return {
        translation: matched,
        note: referenceTranslation
          ? `${primaryDisplayName} bu ayette temiz görüntülenemediği için ${fallbackName} gösteriliyor.`
          : `${primaryDisplayName} bu ayette bulunamadığı için ${fallbackName} gösteriliyor.`,
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
    <>
      {/* ── Mobil: kart görünümü ── */}
      <div className="space-y-3 sm:hidden">
        {words.map((word, index) => (
          <div
            key={`m-${index + 1}-${word.arabic ?? "missing"}`}
            className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-400">#{index + 1}</span>
              <span className="text-xl leading-8 text-stone-950" dir="rtl" lang="ar">
                {word.arabic ?? "Metin yok"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-stone-400">Tür</dt>
                <dd className="mt-0.5 text-stone-700"><MorphBadge morphology={word.morphology} /></dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-stone-400">Anlam</dt>
                <dd className="mt-0.5 text-stone-700"><WordMeaning word={word} /></dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-stone-400">Kök</dt>
                <dd className="mt-0.5 text-stone-700">{getRootDisplayText(word)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="font-semibold uppercase tracking-wide text-stone-400">Kök açıklaması</dt>
                <dd className="mt-0.5 text-stone-700"><RootExplanation word={word} /></dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* ── Masaüstü: tablo görünümü ── */}
      <div className="hidden overflow-x-auto sm:block">
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
                  <MorphBadge morphology={word.morphology} />
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
    </>
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
    return <EmptyState>Bu ayet için kök bilgisi bulunamadı.</EmptyState>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {roots.map((rootSummary) => (
        <article
          className="rounded-md border border-stone-200 bg-stone-50 p-4"
          key={rootSummary.root}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <Link
              className="text-2xl leading-8 text-stone-950 hover:text-emerald-700"
              dir="rtl"
              href={`/root/${encodeURIComponent(rootSummary.root)}`}
              lang="ar"
              title={`${rootSummary.root} kök sayfasını aç`}
            >
              {rootSummary.root}
            </Link>
            <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600">
              {rootSummary.count} kelime
            </span>
          </div>
          <p className="text-sm leading-6 text-stone-800">
            {rootSummary.explanation ?? "Kök açıklaması yok"}
          </p>
        </article>
      ))}
    </div>
  );
}

function isEnglishText(text: string): boolean {
  return /\b(?:the|and|of|to|in|a|an|is|are|was|were|have|has)\b/iu.test(text) ||
    /^[a-z][a-z\s,'-]*$/iu.test(text);
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
  // getSurahFullTafsir kaldırıldı — Bakara için 1.5MB, accordion lazy fetch ile alıyor
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
  const _verseKey = `${surahId}:${ayahNumber}`;
  // getAyahAnalysisEngine kaldırıldı — getAyahDetail'i ikinci kez çekerek ~2s gecikmeye yol açıyordu.
  const readingTrResult = normalizeTransliterationToReadingTrDetailed(detail.ayah.transliteration);
  const activeTranslations = detail.translations.filter((t) => {
    const key = t.source?.split("#").at(-1) ?? "";
    return preferredPrimarySources.includes(key);
  });
  const translationSourceQualities = getTranslationSourceQualities(activeTranslations);
  const displayableTranslations = getDisplayableTranslations(translationSourceQualities);
  const primarySelection = getPrimaryTranslationSelection(translationSourceQualities);
  const primaryTranslation = primarySelection.translation;
  const isDevelopment = process.env.NODE_ENV === "development";
  const showDeveloperDebug = isDevelopment && showExperimentalControls;
  const primarySourceName = primaryTranslation ? getTranslationSourceName(primaryTranslation) : null;
  // semanticSummary ve provenAnalysisPreview kaldırıldı —
  // UI'da gösterilmiyordu, her yüklemede Gemini API çağrısı yaparak 3-5s gecikmeye yol açıyordu.
  const semanticSummary: SelectedSemanticProviderSummary = buildUnavailableSemanticSummary(
    "no_result",
    "disabled"
  );

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



  const tabItems: AyahDetailTabItem[] = [
    {
      id: "meal",
      label: "Mealler",
      content: (
        <div className="space-y-6">
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
              <EmptyState>Ana meal için temiz veri yok.</EmptyState>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">Diğer Türkçe Mealler</h2>
              <StatusBadge status={sectionStatuses.otherTranslations} />
            </div>
            <OtherTranslations
              displayableTranslations={displayableTranslations}
              filteredSources={filteredTranslationSources}
              primaryTranslation={primaryTranslation}
            />
          </div>
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
                  ? "Kelime Bazlı Morfolojik Analiz"
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
      label: "Kökler",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">
                Kök Bilgisi ve Kök Açıklaması
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
            <StatusBadge status={detail.ayah.literalCeviri ? "ready" : "partially_ready"} />
          </div>
          {detail.ayah.hamAnlamOzeti ? (
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Ham Kelime Çevirisi</h3>
              <p className="mt-1 text-xs text-stone-500">
                Kelimelerin sırasıyla doğrudan anlamları, yorum yapılmadan
              </p>

              <p className="mt-3 text-sm leading-7 text-stone-700">
                {detail.ayah.hamAnlamOzeti}
              </p>
            </div>
          ) : (
            <RawMeaningSummaryCard wordAnalyses={detail.wordAnalyses} />
          )}
          {detail.ayah.literalCeviri ? (
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Literal Çeviri</h3>
              <p className="mt-1 text-xs text-stone-500">
                Kelimelerin orijinal sırasına birebir sadık, Türkçe dil bilgisine uygun çeviri
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-700">{detail.ayah.literalCeviri}</p>
            </div>
          ) : null}
          {detail.ayah.farkAnalizi ? (
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Fark Analizi</h3>
              <p className="mt-1 text-xs text-stone-500">
                Literal çeviri ile meal arasındaki anlam farkının incelemesi
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-700">
                {detail.ayah.farkAnalizi}
              </p>
            </div>
          ) : null}
          {(detail.ayah.anaTema || (detail.ayah.altTaglar && detail.ayah.altTaglar.length > 0)) ? (
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Tema Etiketleri</h3>
              <p className="mt-1 text-xs text-stone-500">
                Tıklayarak aynı temadaki tüm ayetleri görün
              </p>
              {detail.ayah.anaTema ? (
                <div className="mt-3">
                  <Link
                    href={`/search?tag=${encodeURIComponent(detail.ayah.anaTema)}`}
                    className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    {detail.ayah.anaTema.replace(/_/g, " ")}
                  </Link>
                </div>
              ) : null}
              {detail.ayah.altTaglar && detail.ayah.altTaglar.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.ayah.altTaglar.map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?tag=${encodeURIComponent(tag)}`}
                      className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )
    },
  ];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">
                {detail.surah?.turkishName.text ?? "Sûre adı bulunamadı"}
              </h1>
              <p className="mt-2 text-sm text-stone-600">
                Sûre {detail.surah?.id ?? surahId} · Ayet {detail.ayah.verseNumber}
              </p>
              <div className="mt-4">
                <AyahJumpForm initialSurahId={surahId} initialAyahNumber={ayahNumber} surahs={surahs} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <StatusBadge status={sectionStatuses.page} />
              <div className="flex w-full flex-col gap-2">
                <div className="min-h-[44px] w-full">
                  <AudioPlayer surahId={surahId} variant="detail" />
                </div>
                <div className="flex min-h-[44px] w-full items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 dark:border-stone-700 dark:bg-stone-800">
                  <FavoriteButton verseKey={`${surahId}:${ayahNumber}`} size="lg" />
                  <span className="text-sm text-stone-500 dark:text-stone-400">Favori</span>
                </div>
                <div className="min-h-[44px] w-full">
                  <ShareButton
                    verseKey={`${surahId}:${ayahNumber}`}
                    meal={primaryTranslation?.text ?? null}
                    surahName={detail.surah?.turkishName.text ?? null}
                    surahId={surahId}
                    ayahNumber={ayahNumber}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <SurahAboutAccordion
          surahId={surahId}
          revelationOrder={currentSurah.revelationOrder}
          revelationPlace={currentSurah.revelationPlace}
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
                {detail.ayah.readingTr ?? readingTrResult?.output ?? detail.ayah.transliteration}
              </p>
              {showExperimentalControls ? (
                <details className="rounded-md border border-stone-200 bg-stone-50 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-stone-700">
                    Teknik okunuşu göster
                  </summary>
                  {detail.ayah.readingTr ? (
                    <p className="mt-2 text-xs text-stone-500">
                      Kaynak: AI (Gemini) — Ham transliteration aşağıda
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Ham transliteration
                  </p>
                  <p className="mt-1 text-sm leading-7 text-stone-700">
                    {detail.ayah.transliteration}
                  </p>
                  {!detail.ayah.readingTr && readingTrResult?.suspiciousMatches.length ? (
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

        <AyahDetailTabs tabs={tabItems} />

        <NoteEditor verseKey={`${surahId}:${ayahNumber}`} />

        <StreakTracker />

      </div>
    </main>
  );
}
