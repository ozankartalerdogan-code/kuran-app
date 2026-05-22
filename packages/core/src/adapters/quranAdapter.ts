import type { Ayah, NormalizedArabicAyah, NormalizedSurahMeta, Surah } from "@quran-app/types";
import { getAyahTranslations, getAyahTransliteration, getAyahReadingTr } from "./translationAdapter";
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

// Surahs compute once per process — 11MB tafsir JSON + 114x regex işlemi.
// Hata durumunda cache temizlenir; bir sonraki istek yeniden dener.
let _surahsCache: Promise<Surah[]> | null = null;

export async function readSurahsFromLocalData(): Promise<Surah[]> {
  if (_surahsCache) return _surahsCache;

  _surahsCache = (async (): Promise<Surah[]> => {
    const [metadata, revCtxMap, tafsirMap] = await Promise.all([
      loadSurahMetadata(),
      revelationContextMapPromise,
      tafsirMapPromise
    ]);

    return metadata.map((record) => {
      const revCtx       = revCtxMap.get(record.surahId);
      const tafsirText   = tafsirMap.get(record.surahId) ?? null;
      const revelationPlace =
        revCtx?.revelationType === "mekki"  ? "Mekke"  :
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
        verseCount:         record.verseCount,
        revelationType:     record.revelationType,
        revelationPlace,
        revelationOrder:    revCtx?.revelationOrder ?? record.revelationOrder ?? null,
        shortIntroduction:  tafsirText ? buildShortIntroduction(tafsirText) : null,
        status:             record.status
      };
    });
  })().catch((err) => {
    _surahsCache = null; // reject olursa cache temizle; bir sonraki istek yeniden dener
    throw err;
  });

  return _surahsCache;
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
  const [translations, transliteration, readingTr] = await Promise.all([
    getAyahTranslations(surahId, ayahNumber),
    getAyahTransliteration(surahId, ayahNumber),
    getAyahReadingTr(surahId, ayahNumber),
  ]);
  const arabicText = verseRecord?.arabicText ?? null;

  const verseKey = `${surahId}:${ayahNumber}`;
  const verseRow = dbGet<{
    literal_ceviri:  string | null;
    ham_anlam_ozeti: string | null;
    fark_analizi:    string | null;
    temalar:         string | null;
    ana_tema:        string | null;
    alt_taglar:      string | null;
  }>(
    getAppDb().prepare(`
      SELECT v.literal_ceviri, v.ham_anlam_ozeti, v.fark_analizi, v.temalar,
             vt.ana_tema, vt.alt_taglar
      FROM   verses v
      LEFT   JOIN verse_tags vt ON vt.verse_key = v.verse_key
      WHERE  v.verse_key = ?
    `),
    verseKey
  );

  let temalar: string[] | null = null;
  if (verseRow?.temalar) {
    try { temalar = JSON.parse(verseRow.temalar) as string[]; } catch { temalar = null; }
  }

  let altTaglar: string[] | null = null;
  if (verseRow?.alt_taglar) {
    try { altTaglar = JSON.parse(verseRow.alt_taglar) as string[]; } catch { altTaglar = null; }
  }

  return {
    id: surahId * 1000 + ayahNumber,
    surahId,
    verseNumber: ayahNumber,
    arabicText,
    transliteration,
    readingTr,
    translations,
    literalCeviri:  verseRow?.literal_ceviri  ?? null,
    hamAnlamOzeti:  verseRow?.ham_anlam_ozeti  ?? null,
    farkAnalizi:    verseRow?.fark_analizi     ?? null,
    temalar,
    anaTema:    verseRow?.ana_tema  ?? null,
    altTaglar,
    status: arabicText !== null || translations.length > 0 ? "available" : "missing"
  };
}

export const quranDataSources = {
  surahSource,
  verseSource
} as const;
