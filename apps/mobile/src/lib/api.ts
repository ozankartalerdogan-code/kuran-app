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
      headers: { "Content-Type": "application/json", ...init?.headers },
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

export type SearchResponse =
  | { type: "none" }
  | { type: "surah"; surahId: number; surahName: string }
  | { type: "verses"; results: VerseResult[]; total: number }
  | { type: "tag"; tag: string; count: number };

export type VerseResult = {
  verse_key: string;
  meal: string | null;
  surah_name: string | null;
};

export type VerseItem = {
  ayahNumber: number;
  meal: string | null;
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

export type AyahDetailResponse = {
  verseKey:   string;
  surahId:    number;
  ayahNumber: number;
  surahName:  string;
  arabicName: string;
  verseCount: number;
  arabicText: string | null;
  meal:       string | null;
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

  elifba: {
    dersler: () =>
      withRetry(() => request<unknown[]>("/elifba/dersler")),
    quiz: (lessonId: number) =>
      withRetry(() => request<unknown[]>(`/elifba/quiz/${lessonId}`)),
  },
};
