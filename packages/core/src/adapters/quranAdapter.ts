import type { Ayah, NormalizedArabicAyah, NormalizedSurahMeta, Surah } from "@quran-app/types";
import { getAyahTranslations } from "./translationAdapter";
import { getAyahTransliteration } from "./translationAdapter";
import { getRelativeDataPath, readJsonFile, dbGet } from "./shared";
import { getAppDb } from "./appDb";

const surahSource = getRelativeDataPath("normalized", "surah-meta.json");
const verseSource = getRelativeDataPath("normalized", "arabic.json");

interface RevelationContextEntry {
  surahId: number;
  revelationType: "mekki" | "medeni" | null;
  revelationOrder: number | null;
}

interface TafsirEntry {
  surahId: number;
  text: string | null;
}

const arabicIndexPromise: Promise<Map<string, NormalizedArabicAyah>> = readJsonFile<
  NormalizedArabicAyah[]
>("normalized", "arabic.json").then(
  (records) =>
    new Map(records.map((record) => [`${record.surahId}:${record.ayahNumber}`, record]))
);

const revelationContextMapPromise: Promise<Map<number, RevelationContextEntry>> =
  readJsonFile<RevelationContextEntry[]>("revelation-context", "surah", "index.json").then(
    (entries) => new Map(entries.map((e) => [e.surahId, e]))
  );

const tafsirMapPromise: Promise<Map<number, string>> =
  readJsonFile<TafsirEntry[]>("tafsir", "surah", "index.json").then(
    (entries) => new Map(entries.filter((e) => e.text).map((e) => [e.surahId, e.text as string]))
  );

const ARABIC_SCRIPT_RE = /\p{Script=Arabic}/u;

function buildShortIntroduction(raw: string): string {
  // Strip header block (e.g. "2-BAKARA:\n---...\n")
  const withoutHeader = raw.replace(/^[\s\S]*?-{10,}[^\n]*\n+/, "").trim();

  // Normalize whitespace
  const normalized = withoutHeader.replace(/\s+/g, " ");

  // Split into sentences at sentence-ending punctuation followed by space
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Start from the first sentence that:
  //   - contains no Arabic script characters
  //   - does not start with a quote (stripped Arabic artifact like `" " Bulunduğu...`)
  const startsWithLetter = /^[A-ZÇĞİÖŞÜa-zçğıöşü0-9(]/;
  // Empty-quote artifact left behind when Arabic was stripped: "" or " " etc.
  const hasEmptyQuotes = /"\s*"/;
  const firstTurkishIdx = sentences.findIndex(
    (s) => !ARABIC_SCRIPT_RE.test(s) && startsWithLetter.test(s) && !hasEmptyQuotes.test(s)
  );
  if (firstTurkishIdx < 0) return "";

  const preview = sentences.slice(firstTurkishIdx).join(" ");
  if (preview.length <= 300) return preview;
  const cut = preview.slice(0, 300);
  return cut.replace(/\s+\S*$/, "…");
}

async function loadSurahMetadata(): Promise<NormalizedSurahMeta[]> {
  return readJsonFile<NormalizedSurahMeta[]>("normalized", "surah-meta.json");
}

async function loadArabicAyahIndex(): Promise<Map<string, NormalizedArabicAyah>> {
  return arabicIndexPromise;
}

export async function readSurahsFromLocalData(): Promise<Surah[]> {
  const [metadata, revCtxMap, tafsirMap] = await Promise.all([
    loadSurahMetadata(),
    revelationContextMapPromise,
    tafsirMapPromise
  ]);

  return metadata.map((record) => {
    const revCtx = revCtxMap.get(record.surahId);
    const tafsirText = tafsirMap.get(record.surahId) ?? null;
    const revelationPlace =
      revCtx?.revelationType === "mekki" ? "Mekke" :
      revCtx?.revelationType === "medeni" ? "Medine" : null;

    return {
      id: record.surahId,
      arabicName: record.arabicName,
      turkishName: {
        language: "tr",
        source: surahSource,
        text: record.turkishName,
        status: record.turkishName === null ? "missing" : "available"
      },
      verseCount: record.verseCount,
      revelationType: record.revelationType,
      revelationPlace,
      revelationOrder: revCtx?.revelationOrder ?? record.revelationOrder ?? null,
      shortIntroduction: tafsirText ? buildShortIntroduction(tafsirText) : null,
      status: record.status
    };
  });
}

export async function readSurahByIdFromLocalData(surahId: number): Promise<Surah | null> {
  const surahs = await readSurahsFromLocalData();

  return surahs.find((surah) => surah.id === surahId) ?? null;
}

export function getSurahFullTafsir(surahId: number): string | null {
  const row = dbGet<{ content: string }>(
    getAppDb().prepare("SELECT content FROM surah_tafsir WHERE surah_id = ? AND source = 'elmalili'"),
    surahId
  );
  return row?.content ?? null;
}

export async function readAyahFromLocalData(
  surahId: number,
  ayahNumber: number
): Promise<Ayah> {
  const verseIndex = await loadArabicAyahIndex();
  const verseRecord = verseIndex.get(`${surahId}:${ayahNumber}`) ?? null;
  const translations = await getAyahTranslations(surahId, ayahNumber);
  const transliteration = await getAyahTransliteration(surahId, ayahNumber);
  const arabicText = verseRecord?.arabicText ?? null;

  return {
    id: surahId * 1000 + ayahNumber,
    surahId,
    verseNumber: ayahNumber,
    arabicText,
    transliteration,
    translations,
    status: arabicText !== null || translations.length > 0 ? "available" : "missing"
  };
}

export const quranDataSources = {
  surahSource,
  verseSource
} as const;
