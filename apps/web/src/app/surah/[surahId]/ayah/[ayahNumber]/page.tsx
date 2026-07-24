export const dynamic = "force-dynamic";
import {
  normalizeTransliterationToReadingTrDetailed
} from "@quran-app/core";
import type { WordAnalysisSource } from "@quran-app/core";
import { getAyahDetailFromDb } from "../../../../../lib/getAyahDetailFromDb";
import { dbAll, dbGet } from "../../../../../lib/dbUtils";
import { NUZUL } from "../../../../../data/nuzul";
import { cleanMealText } from "../../../../../lib/cleanMeal";
import type { Metadata } from "next";
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
import { BookOpen } from "lucide-react";
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
import { CollapsibleArea } from "../../../../../components/CollapsibleArea";
import { AyahJumpForm } from "./AyahJumpForm";
import { WordAnalysisTargetScroller } from "./WordAnalysisTargetScroller";
import { parseTargetWordIndex } from "../../../../../lib/wordTarget";
import { SurahAboutAccordion } from "./SurahAboutAccordion";
import { translatePosTr } from "@quran-app/core";
import { arapRakam, ayetinSayfasi } from "../../../../../lib/mushafSayfaUtils";
import { NoteEditor, StreakTracker } from "./ClientOnlyAyahTools";
import { FavoriteButton } from "../../../../../components/FavoriteButton";
import { ShareButton } from "./ShareButton";

type SectionStatus = "ready" | "partially_ready" | "missing";

interface PageSearchParams {
  debug?: string | string[];
  reading_source?: string | string[];
  word?: string | string[];
  wa_source?: string | string[];
}

interface PageProps {
  params: Promise<{
    surahId: string;
    ayahNumber: string;
  }>;
  searchParams?: Promise<PageSearchParams>;
}

// Ayete özel paylaşım/önizleme metadata'sı (WhatsApp/Telegram/sosyal kartı).
// Olmadan tüm ayet linkleri layout'taki jenerik "Kuran Yolu" kartını gösteriyordu.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const surahId    = Number(resolvedParams.surahId);
  const ayahNumber = Number(resolvedParams.ayahNumber);
  if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) return {};

  const verseKey = `${surahId}:${ayahNumber}`;
  try {
    const row = await dbGet<{ surahName: string | null; meal: string | null }>(
      `SELECT s.adi_turkce AS surahName,
              COALESCE(yt.text, v.primary_translation) AS meal
       FROM   verses v
       JOIN   sureler s ON s.id = v.surah_id
       LEFT   JOIN translations yt ON yt.verse_key = v.verse_key
              AND (yt.source = 'yazir' OR yt.source LIKE '%#yazir')
       WHERE  v.verse_key = ?
       LIMIT  1`,
      verseKey,
    );
    if (!row) return {};

    const surahName = row.surahName ?? `Sure ${surahId}`;
    const title     = `${surahName} ${ayahNumber}. Ayet`;
    const meal      = cleanMealText(row.meal) ?? "";
    const desc      = (meal.length > 200 ? meal.slice(0, 199) + "…" : meal)
                      || "Kur'an-ı Kerim meali, kelime analizi ve kök açıklamaları.";
    const ogImage   = `/api/share/${encodeURIComponent(verseKey)}`;

    return {
      title,
      description: desc,
      alternates: { canonical: `/surah/${surahId}/ayah/${ayahNumber}` },
      openGraph: {
        title, description: desc, type: "article",
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: { card: "summary_large_image", title, description: desc, images: [ogImage] },
    };
  } catch {
    return {};
  }
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
  diyanet: "Karşılaştırma meali 1",
  yazir:   "Elmalılı H. Yazır",
  bulac:   "Karşılaştırma meali 2",
  vakfi:   "Karşılaştırma meali 3",
  ozturk:  "Karşılaştırma meali 4",
};
const statusClasses: Record<SectionStatus, string> = {
  ready: "border-navy-200 bg-navy-50 text-navy-800",
  partially_ready: "border-gold-200 bg-gold-50 text-gold-800",
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
  searchParams: PageSearchParams | undefined;
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
  const label = translatePosTr(morphology);
  return (
    <span className="inline-flex leading-tight" aria-label={`Kelime türü: ${label}`}>
      {label}
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

// Veri durumu rozetleri iç-veri jargonu olduğu için yalnızca geliştirici
// (debug) modunda gösterilir; son kullanıcı arayüzünde gizlenir.
function StatusBadge({ status, show = false }: { status: SectionStatus; show?: boolean }) {
  if (!show) return null;
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
  note,
  showStatus = false,
  tone = "default"
}: {
  title: string;
  status: SectionStatus;
  children: ReactNode;
  note?: string;
  showStatus?: boolean;
  /** "parchment": Arapça metin için altın çerçeveli kâğıt dokusu */
  tone?: "default" | "parchment";
}) {
  const toneClasses =
    tone === "parchment"
      ? "border-gold-200 bg-[#fdfbf4]"
      : "border-stone-200 bg-white";
  return (
    <section className={`rounded-2xl border p-5 shadow-card ${toneClasses}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
        <StatusBadge status={status} show={showStatus} />
      </div>
      {note ? <p className="mb-4 text-sm text-stone-600">{note}</p> : null}
      {children}
    </section>
  );
}

/** Mushaf kartındaki bölümler arası ince altın ayraç */
function GoldDivider() {
  return (
    <div aria-hidden="true" className="mx-auto my-5 flex items-center justify-center gap-2">
      <span className="h-px w-10 bg-gold-400/50" />
      <span className="h-1 w-1 rotate-45 bg-gold-500/70" />
      <span className="h-px w-10 bg-gold-400/50" />
    </div>
  );
}

function EmptyState({ children = "Veri yok" }: { children?: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
      {children}
    </p>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen px-4 py-10 text-stone-950 sm:px-6 lg:px-8">
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
  return SOURCE_DISPLAY_NAMES[key] ?? (key || "Kaynak bilgisi mevcut değil");
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
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-navy-800 shadow-sm transition-colors hover:border-navy-300 hover:bg-navy-50"
          href={`/surah/${previous.surahId}/ayah/${previous.ayahNumber}`}
        >
          {previous.label}
        </Link>
      ) : (
        <span className="rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-500">
          Önceki ayet yok
        </span>
      )}
      {next ? (
        <Link
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-navy-800 shadow-sm transition-colors hover:border-navy-300 hover:bg-navy-50"
          href={`/surah/${next.surahId}/ayah/${next.ayahNumber}`}
        >
          {next.label}
        </Link>
      ) : (
        <span className="rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-500">
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
  searchParams: PageSearchParams | undefined;
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
  const baseClass = "rounded-xl border px-3 py-1.5 text-xs font-medium";
  const activeClass = "border-stone-900 bg-stone-900 text-white";
  const inactiveClass = "border-stone-300 bg-white text-stone-700 hover:bg-stone-50";

  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
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

function WordAnalysisTable({
  words,
  targetWordIndex,
}: {
  words: WordAnalysis[];
  targetWordIndex: number | null;
}) {
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
            data-word-target={word.wordIndex === targetWordIndex ? word.wordIndex : undefined}
            className={`rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm ${word.wordIndex === targetWordIndex ? "ring-2 ring-gold-400 ring-offset-2" : ""}`}
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
                data-word-target={word.wordIndex === targetWordIndex ? word.wordIndex : undefined}
                className={`border-b border-stone-100 align-top ${word.wordIndex === targetWordIndex ? "bg-gold-50 dark:bg-gold-950/20" : ""}`}
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
                <td className="py-3 pr-4 text-stone-700">
                  {word.root ? <Link href={`/root/${encodeURIComponent(word.root)}`}>{word.root}</Link> : getRootDisplayText(word)}
                </td>
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

interface UniqueRootSummary {
  root: string;
  explanation: string | null;
  count: number;
}

// Mobildeki app/ayah/[surahId]/[ayahNumber].tsx ile aynı Arapça alfabetik sıralama.
const arCollator = new Intl.Collator("ar");

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

  return Array.from(rootSummaries.values()).sort((a, b) => arCollator.compare(a.root, b.root));
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
          className="rounded-xl border border-stone-200 bg-stone-50 p-4"
          key={rootSummary.root}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <Link
              className="text-2xl leading-8 text-stone-950 hover:text-navy-700"
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
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
  detail: Awaited<ReturnType<typeof getAyahDetailFromDb>>;
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
    arabicTokens: detail.wordAnalyses.map((word: WordAnalysis) => word.arabic),
    analysisTokens: detail.wordAnalyses.map((word: WordAnalysis) => ({
      index: word.wordIndex,
      arabic: word.arabic,
      morphology: word.morphology,
      transliteration: word.transliteration,
      status: word.status
    })),
    roots: detail.wordAnalyses.map((word: WordAnalysis) => ({
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
    <section className="rounded-xl border border-dashed border-gold-300 bg-gold-50 p-5 shadow-sm">
      <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Dev Debug: Render Data</h2>
      <pre className="max-h-[520px] overflow-auto rounded-xl bg-stone-950 p-4 text-xs leading-5 text-stone-50">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const surahId = parsePositiveInteger(resolvedParams.surahId);
  const ayahNumber = parsePositiveInteger(resolvedParams.ayahNumber);

  if (surahId === null || ayahNumber === null) {
    return <ErrorState message="Sûre veya ayet numarası pozitif tam sayı olmalı." />;
  }

  interface SurahNavRow { id: number; ayet_sayisi: number; adi_turkce: string; arabicName: string | null; tur: string; }
  const surahs = (await dbAll<SurahNavRow>(
    "SELECT id, ayet_sayisi, adi_turkce, adi_arapca AS arabicName, tur FROM sureler ORDER BY id"
  )).map((s) => ({
    id: s.id,
    verseCount: s.ayet_sayisi,
    turkishName: { language: "tr" as const, source: null, text: s.adi_turkce, status: "available" as const },
    arabicName: s.arabicName,
    revelationType: null,
    revelationPlace: s.tur === "medinan" ? "Medine" : "Mekke",
    revelationOrder: NUZUL[s.id] ?? null,
    shortIntroduction: null, status: "available" as const,
  }));

  // getSurahFullTafsir kaldırıldı — Bakara için 1.5MB, accordion lazy fetch ile alıyor
  const currentSurah = surahs.find((surah) => surah.id === surahId) ?? null;

  if (currentSurah === null || !currentSurah.verseCount || ayahNumber > currentSurah.verseCount) {
    return <ErrorState message="Bu sûre/ayet adresi için veri yok." />;
  }

  const isDevelopment = process.env.NODE_ENV === "development";
  // ?debug=1 yalnızca development'ta etkili — production'da deneysel/teknik
  // paneller görünmesin. QURAN_APP_ENABLE_EXPERIMENTAL_QUERY env değişkeni
  // bilinçli bir deploy-zamanı anahtarı olduğu için ortamdan bağımsız kalır.
  const debugQueryEnabled = isDevelopment && getSingleQueryValue(resolvedSearchParams?.debug) === "1";
  const experimentalUiEnabled =
    process.env.QURAN_APP_ENABLE_EXPERIMENTAL_QUERY === "1" ||
    process.env.QURAN_APP_ENABLE_EXPERIMENTAL_QUERY === "true";
  const showExperimentalControls = debugQueryEnabled || experimentalUiEnabled;
  const wordAnalysisSource = resolveWordAnalysisSource(
    resolvedSearchParams?.wa_source,
    resolvedSearchParams?.debug
  );
  let detail: Awaited<ReturnType<typeof getAyahDetailFromDb>>;
  try {
    detail = await getAyahDetailFromDb(surahId, ayahNumber);
  } catch (err) {
    console.error(`[Page] getAyahDetail ${surahId}:${ayahNumber} başarısız:`, err);
    return <ErrorState message="Ayet verisi yüklenemedi. Lütfen sayfayı yenileyin." />;
  }
  const _verseKey = `${surahId}:${ayahNumber}`;
  // getAyahAnalysisEngine kaldırıldı — getAyahDetail'i ikinci kez çekerek ~2s gecikmeye yol açıyordu.
  const requestedWordIndex = parseTargetWordIndex(resolvedSearchParams?.word);
  const targetWordIndex = requestedWordIndex !== null && detail.wordAnalyses.some(
    (word) => word.wordIndex === requestedWordIndex,
  ) ? requestedWordIndex : null;
  const readingTrResult = normalizeTransliterationToReadingTrDetailed(detail.ayah.transliteration);
  const activeTranslations = detail.translations.filter((t) => {
    const key = t.source?.split("#").at(-1) ?? "";
    return preferredPrimarySources.includes(key);
  });
  const translationSourceQualities = getTranslationSourceQualities(activeTranslations);
  const displayableTranslations = getDisplayableTranslations(translationSourceQualities);
  const primarySelection = getPrimaryTranslationSelection(translationSourceQualities);
  const primaryTranslation = primarySelection.translation;
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
      id: "word-analysis",
      label: "Kelime Analizi",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-navy-900">
                {wordAnalysisSource === "canonical"
                  ? "Kelime Bazlı Morfolojik Analiz"
                  : "Morfolojik Segment Analizi"}
              </h2>
              <StatusBadge status={sectionStatuses.wordAnalysis} show={showDeveloperDebug} />
            </div>
            <p className="text-sm text-stone-600">{wordAnalysisNote}</p>
          </div>
          {targetWordIndex !== null && <WordAnalysisTargetScroller wordIndex={targetWordIndex} />}
          <CollapsibleArea
            itemCount={detail.wordAnalyses.length}
            minItems={10}
            collapsedHeight={520}
            showLabel="Tüm kelimeleri göster"
            initiallyOpen={targetWordIndex !== null}
          >
            <WordAnalysisTable words={detail.wordAnalyses} targetWordIndex={targetWordIndex} />
          </CollapsibleArea>
          <div className="border-t border-stone-200 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-navy-900">Kelime Anlamları</h3>
              <StatusBadge status={sectionStatuses.wordMeanings} show={showDeveloperDebug} />
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
              <h2 className="font-display text-lg font-semibold text-navy-900">
                Kök Bilgisi ve Kök Açıklaması
              </h2>
              <StatusBadge status={sectionStatuses.rootExplanations} show={showDeveloperDebug} />
            </div>
            <p className="text-sm text-stone-600">
              Kök içermeyen kelimeler ile açıklaması eksik kökler ayrı gösterilir.
            </p>
          </div>
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
            <h2 className="font-display text-lg font-semibold text-navy-900">Analiz</h2>
            <StatusBadge status={detail.ayah.literalCeviri ? "ready" : "partially_ready"} show={showDeveloperDebug} />
          </div>
          {detail.ayah.hamAnlamOzeti ? (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Literal Çeviri</h3>
              <p className="mt-1 text-xs text-stone-500">
                Kelimelerin orijinal sırasına birebir sadık, Türkçe dil bilgisine uygun çeviri
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-700">{detail.ayah.literalCeviri}</p>
            </div>
          ) : null}
          {detail.ayah.farkAnalizi ? (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Tema Etiketleri</h3>
              <p className="mt-1 text-xs text-stone-500">
                Tıklayarak aynı temadaki tüm ayetleri görün
              </p>
              {detail.ayah.anaTema ? (
                <div className="mt-3">
                  <Link
                    href={`/search?tag=${encodeURIComponent(detail.ayah.anaTema)}`}
                    className="inline-flex items-center rounded-xl border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-100"
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
    <main className="min-h-screen px-4 py-10 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card sm:p-6">
          <nav aria-label="İçerik yolu" className="mb-3 flex items-center gap-1.5 text-xs text-stone-500">
            <Link href="/surah" className="hover:text-navy-700 hover:underline">
              Sureler
            </Link>
            <span aria-hidden="true">›</span>
            <span className="font-medium text-stone-700">
              {detail.surah?.turkishName.text ?? `Sure ${surahId}`}
            </span>
            <span aria-hidden="true">›</span>
            <span>{ayahNumber}. Ayet</span>
          </nav>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">
                {detail.surah?.turkishName.text ?? "Sûre adı bulunamadı"}
              </h1>
              <div aria-hidden="true" className="mt-2.5 h-0.5 w-12 rounded-full bg-gold-400" />
              <p className="mt-2 text-sm text-stone-600">
                Sûre {detail.surah?.id ?? surahId} · Ayet {detail.ayah.verseNumber}
              </p>
              <div className="mt-3 sm:mt-4">
                <AyahJumpForm initialSurahId={surahId} initialAyahNumber={ayahNumber} surahs={surahs} />
              </div>
            </div>
            <StatusBadge status={sectionStatuses.page} show={showDeveloperDebug} />
          </div>
        </header>

        {/* Gezinme, accordion altından header'ın hemen altına taşındı —
            sayfaya girer girmez önceki/sonraki ayete geçilebilsin */}
        <AyahNavigation previous={previousAyah} next={nextAyah} />

        <SurahAboutAccordion
          surahId={surahId}
          revelationOrder={currentSurah.revelationOrder}
          revelationPlace={currentSurah.revelationPlace}
        />

        {showDeveloperDebug ? (
          <AyahDetailDebugPanel payload={ayahDetailDebugPayload} />
        ) : null}

        {showExperimentalControls ? (
          <WordAnalysisDebugToggle
            ayahNumber={ayahNumber}
            currentSource={wordAnalysisSource}
            searchParams={resolvedSearchParams}
            surahId={surahId}
          />
        ) : null}

        {/* ── MUSHAF KARTI: Arapça + okunuş + Elmalılı meali tek kâğıtta ──
            Mobildeki "tam mushaf görünümü" referans alındı: altın sure başlığı
            bandı, altın ﴿ayet rakamı﴾, eylemler kâğıdın üzerinde. */}
        <section className="rounded-2xl border border-gold-300/60 bg-[#fdfbf4] p-3 shadow-card dark:border-gold-800/40 dark:bg-stone-900 sm:p-5">
          <div className="rounded-xl border border-gold-300/40 px-4 py-5 dark:border-gold-800/30 sm:px-6">
            {/* Altın sure başlığı bandı */}
            <div className="mb-6 rounded-lg border border-gold-300/70 bg-gradient-to-b from-gold-100/70 to-gold-50/20 py-2.5 text-center dark:border-gold-700/50 dark:from-gold-950/30 dark:to-transparent">
              {currentSurah.arabicName ? (
                <p dir="rtl" lang="ar" className="text-xl leading-relaxed text-navy-950 dark:text-stone-50">
                  {currentSurah.arabicName}
                </p>
              ) : null}
              <p className="mt-0.5 text-xs font-bold tracking-wide text-gold-700 dark:text-gold-400">
                {surahId}. {detail.surah?.turkishName.text ?? `Sure ${surahId}`} Suresi · {ayahNumber}. Ayet
              </p>
            </div>

            {/* Arapça metin + altın ayet rakamı */}
            {detail.ayah.arabicText ? (
              <p className="text-right text-3xl leading-[2.3] text-navy-950 dark:text-stone-50 sm:text-4xl" dir="rtl" lang="ar">
                {detail.ayah.arabicText}
                <span className="text-gold-600 dark:text-gold-500"> ﴿{arapRakam(ayahNumber)}﴾ </span>
              </p>
            ) : (
              <EmptyState />
            )}

            {/* Okunuş */}
            {detail.ayah.transliteration ? (
              <>
                <GoldDivider />
                <p className="text-center font-display text-base italic leading-8 text-stone-600 dark:text-stone-400">
                  {detail.ayah.readingTr ?? readingTrResult?.output ?? detail.ayah.transliteration}
                </p>
                {showExperimentalControls ? (
                  <details className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-stone-700">
                      Teknik okunuşu göster
                    </summary>
                    {detail.ayah.readingTr ? (
                      <p className="mt-2 text-xs text-stone-500">
                        Kaynak: Kuran Yolu sade açıklama
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
              </>
            ) : null}

            {/* Meal — yalnızca Elmalılı (temiz değilse otomatik yedek kaynak) */}
            <GoldDivider />
            {primaryTranslation?.text ? (
              <div>
                <p className="text-lg leading-8 text-stone-900 dark:text-stone-100 sm:text-xl sm:leading-9">
                  {primaryTranslation.text}
                </p>
                <p className="mt-3 text-right text-xs font-semibold tracking-wide text-gold-700 dark:text-gold-400">
                  — {getTranslationSourceName(primaryTranslation)}
                </p>
                {primarySelection.isFallback ? (
                  <p className="mt-1 text-right text-[11px] text-stone-500">{primarySelection.note}</p>
                ) : null}
              </div>
            ) : (
              <EmptyState>Ana meal için temiz veri yok.</EmptyState>
            )}
          </div>

          {/* Eylemler — kâğıdın üzerinde */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gold-200/60 pt-3 dark:border-gold-800/30">
            <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
              <FavoriteButton verseKey={`${surahId}:${ayahNumber}`} size="lg" />
              <span className="text-sm text-stone-500 dark:text-stone-400">Favori</span>
            </div>
            <ShareButton
              verseKey={`${surahId}:${ayahNumber}`}
              meal={primaryTranslation?.text ?? null}
              surahName={detail.surah?.turkishName.text ?? null}
              surahId={surahId}
              ayahNumber={ayahNumber}
            />
            <Link
              href={`/mushaf-sayfa/${ayetinSayfasi(surahId, ayahNumber)}`}
              className="flex items-center gap-1.5 rounded-lg border border-gold-300 bg-gold-50 px-3 py-1.5 text-sm font-medium text-gold-800 shadow-sm transition-colors hover:bg-gold-100 dark:border-gold-700 dark:bg-gold-950/30 dark:text-gold-400"
            >
              <BookOpen aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} /> Mushafta Aç
            </Link>
          </div>
        </section>

        <AyahDetailTabs tabs={tabItems} />

        <NoteEditor verseKey={`${surahId}:${ayahNumber}`} />

        <StreakTracker />

        {/* Uzun sayfanın sonunda da gezinme — yukarı kaydırmadan sonraki ayete geç */}
        <AyahNavigation previous={previousAyah} next={nextAyah} />

      </div>
    </main>
  );
}
