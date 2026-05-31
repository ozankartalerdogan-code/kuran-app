// EXPO_PUBLIC_ prefix: Expo build sürecinde bundle'a gömülür
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "https://kuranapp.vercel.app/api/v1";

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...init?.headers, "Content-Type": "application/json; charset=utf-8", "Accept": "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}: ${path}`);
    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError(408, `Zaman aşımı: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries;
      const isRetryable =
        err instanceof ApiError ? err.status >= 500 || err.status === 408 : true;
      if (isLast || !isRetryable) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

// ── Tipler ────────────────────────────────────────────────────────────────────

export type SurahListItem = {
  id: number;
  name: string;
  arabicName: string;
  translit: string;
  verseCount: number;
  revelationPlace: "Mekke" | "Medine";
};

export type SuggestedSurah = { id: number; name: string };

export type RootItem = {
  root:       string;
  meaning_tr: string;
  frequency:  number;
};

export type RootDetail = {
  root:        string;
  meaningTr:   string;
  distribution: Record<number, number>;
  derivedWords: Array<{
    word:       string;
    meaning:    string;
    surahId:    number;
    ayahNumber: number;
  }>;
};

export type FavoriteVerse = {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  meal:        string | null;
  ana_tema:    string | null;
  alt_taglar:  string[];
};

export type ElifbaDers = {
  id:          number;
  baslik:      string;
  konu_sirasi: number;
  seviye:      string;
  harf_sayisi: number;
};

export type ElifbaHarf = {
  harf_id:    number;
  harf_adi:   string;
  harf_sesi:  string;
  tek_basina: string;
  basta:      string;
  ortada:     string;
  sonda:      string;
  mahrec:     string;
  kalin_ince: string;
  grup:       string;
};

export type ElifbaQuizSoru = {
  quiz_id:     number;
  lesson_id:   number;
  soru:        string;
  secenekler:  string[];
  dogru_cevap: string;
  ipucu:       string | null;
  zorluk:      number;
};

export type TagFilterResult = {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  reading_tr:  string | null;
  meal:        string | null;
};

export type TagFilterResponse = {
  type:    "tag_results";
  tag:     string;
  tagType: "ana_tema" | "alt_tag";
  results: TagFilterResult[];
  total:   number;
  page:    number;
  pages:   number;
};

export type SearchResponse =
  | { type: "none" }
  | { type: "surah"; surahId: number; surahName: string }
  | { type: "verses"; results: VerseResult[]; total: number; suggestedSurah?: SuggestedSurah }
  | { type: "tag"; tag: string; count: number };

export type VerseResult = {
  verse_key: string;
  meal: string | null;
  surah_name: string | null;
};

export type VerseItem = {
  ayahNumber: number;
  meal:       string | null;
  reading:    string | null;
  literal:    string | null;
};

export type VerseListResponse = {
  surah: {
    id: number;
    name: string;
    arabicName: string;
    verseCount: number;
    revelationPlace: "Mekke" | "Medine";
  };
  verses: VerseItem[];
};

export type DailyVerseItem = {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  arabic_text: string | null;
  reading_tr:  string | null;
  meal:        string | null;
};

export type DailyResponse = {
  verse: DailyVerseItem | null;
  dua:   DailyVerseItem | null;
};

export type AyahDetailResponse = {
  verseKey:      string;
  surahId:       number;
  ayahNumber:    number;
  surahName:     string;
  arabicName:    string;
  verseCount:    number;
  arabicText:    string | null;
  readingTr:     string | null;
  meal:          string | null;
  literalCeviri: string | null;
  farkAnalizi:   string | null;
  anaTema:       string | null;
  altTaglar:     string[];
  translations:  { source: string; text: string | null }[];
  rootMeanings:  Record<string, string>;
  words: {
    wordIndex:  number;
    arabic:     string | null;
    meaningTr:  string | null;
    pos:        string | null;
    root:       string | null;
  }[];
  prevAyah: { surahId: number; ayahNumber: number } | null;
  nextAyah: { surahId: number; ayahNumber: number } | null;
};

// ── API çağrıları ─────────────────────────────────────────────────────────────

export const api = {
  surahs: {
    list: () =>
      withRetry(() => request<SurahListItem[]>("/surahs")),
  },

  search: {
    query: (q: string) =>
      withRetry(() => request<SearchResponse>(`/search?q=${encodeURIComponent(q)}`)),
  },

  verses: {
    bySurah: (surahId: number) =>
      withRetry(() => request<VerseListResponse>(`/verses?surah_id=${surahId}`)),
  },

  ayah: {
    get: (surahId: number, ayahNumber: number) =>
      withRetry(() =>
        request<AyahDetailResponse>(
          `/ayah?surah_id=${surahId}&ayah_number=${ayahNumber}`,
        ),
      ),
  },

  tags: {
    filter: (tag: string, page = 1) =>
      withRetry(() =>
        request<TagFilterResponse>(
          `/tags/filter?tag=${encodeURIComponent(tag)}&page=${page}`,
        ),
      ),
  },

  roots: {
    list: () =>
      withRetry(() => request<unknown>("/roots").then(r => {
        if (Array.isArray(r)) return r as RootItem[];
        if (r && typeof r === "object" && "roots" in r) return (r as { roots: RootItem[] }).roots ?? [];
        return [];
      })),
    detail: (root: string) =>
      withRetry(() => request<RootDetail>(`/root/${encodeURIComponent(root)}`)),
  },

  favorites: {
    fetch: (keys: string[]) =>
      withRetry(() =>
        request<FavoriteVerse[]>(
          `/favorites-verses?keys=${keys.map(encodeURIComponent).join(",")}`,
        ),
      ),
  },

  tafsir: {
    get: (surahId: number) =>
      withRetry(() => request<{ content: string | null }>(`/tafsir/${surahId}`)),
  },

  daily: {
    get: () =>
      withRetry(() => request<DailyResponse>("/daily")),
  },

  mood: {
    random: (tag: string, exclude?: string) =>
      withRetry(() =>
        request<{
          verse_key: string;
          surah_id: number;
          ayah_number: number;
          surah_name: string | null;
          arabic_text: string | null;
          meal: string | null;
        }>(
          `/mood/random?tag=${encodeURIComponent(tag)}${exclude ? `&exclude=${encodeURIComponent(exclude)}` : ""}`,
        ),
      ),
  },

  elifba: {
    dersler: () =>
      withRetry(() => request<ElifbaDers[]>("/elifba/dersler")),
    harfler: (dersId: number) =>
      withRetry(() => request<ElifbaHarf[]>(`/elifba/dersler/${dersId}/harfler`)),
    quiz: (lessonId: number) =>
      withRetry(() => request<ElifbaQuizSoru[]>(`/elifba/quiz/${lessonId}`)),
  },
};
