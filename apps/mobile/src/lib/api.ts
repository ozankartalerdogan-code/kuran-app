import { storage } from "./storage";
import { API_BASE_URL } from "./runtimeConfig";

const API_BASE = API_BASE_URL;

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      signal: signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body?.error ?? body?.message ?? "";
      } catch {
        /* gövde JSON değilse boş bırak */
      }
      const msg = detail
        ? `HTTP ${res.status}: ${detail}`
        : `HTTP ${res.status}: ${path}`;

      let retryAfter: number | undefined;
      if (res.status === 429) {
        const ra = res.headers.get("Retry-After");
        if (ra) {
          const parsed = parseInt(ra, 10);
          if (!isNaN(parsed)) retryAfter = parsed;
        }
      }

      throw new ApiError(res.status, msg, retryAfter);
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError(0, `Geçersiz JSON yanıtı: ${path}`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ApiError(408, `Zaman aşımı: ${path}`);
    }
    throw err;
  }
}

async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    // timeout: 10 sn → 15 sn → 22.5 sn
    const timeoutMs = TIMEOUT_MS * Math.pow(1.5, attempt);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);

      const isLast = attempt === retries;

      // 429 Retry-After varsa onu bekle
      if (
        err instanceof ApiError &&
        err.status === 429 &&
        err.retryAfter !== undefined &&
        !isLast
      ) {
        const waitMs = err.retryAfter * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      const isRetryable =
        err instanceof ApiError
          ? err.status >= 500 || err.status === 408 || err.status === 429
          : true;

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
  root: string;
  meaning_tr: string;
  frequency: number;
};

export type RootDetail = {
  root: string;
  meaningTr: string;
  distribution: Record<number, number>;
  derivedWords: Array<{
    word: string;
    meaning: string;
    surahId: number;
    ayahNumber: number;
  }>;
};

export type FavoriteVerse = {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
  meal: string | null;
  ana_tema: string | null;
  alt_taglar: string[];
};

export type ElifbaDers = {
  id: number;
  baslik: string;
  konu_sirasi: number;
  seviye: string;
  harf_sayisi: number;
};

export type ElifbaHarf = {
  harf_id: number;
  harf_adi: string;
  harf_sesi: string;
  tek_basina: string;
  basta: string;
  ortada: string;
  sonda: string;
  mahrec: string;
  kalin_ince: string;
  grup: string;
};

export type ElifbaQuizSoru = {
  quiz_id: number;
  lesson_id: number;
  soru: string;
  secenekler: string[];
  dogru_cevap: string;
  ipucu: string | null;
  zorluk: number;
};

export type TagFilterResult = {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
  reading_tr: string | null;
  meal: string | null;
};

export type TagFilterResponse = {
  type: "tag_results";
  tag: string;
  tagType: "ana_tema" | "alt_tag";
  results: TagFilterResult[];
  total: number;
  page: number;
  pages: number;
};

export type SearchResponse =
  | { type: "none" }
  | { type: "surah"; surahId: number; surahName: string }
  | {
      type: "verses";
      results: VerseResult[];
      total: number;
      suggestedSurah?: SuggestedSurah;
    }
  | { type: "tag"; tag: string; count: number };

export type VerseResult = {
  verse_key: string;
  meal: string | null;
  surah_name: string | null;
};

export type VerseItem = {
  ayahNumber: number;
  meal: string | null;
  reading: string | null;
  literal: string | null;
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

// Mushaf sayfa görünümü — /api/mushaf?page=N (604 sayfalık Medine düzeni)
export type MushafPageResponse = {
  page: number;
  juz: number;
  verses: {
    surahId: number;
    ayahNumber: number;
    /** Canonical Tanzil metni — ekranda basılan budur. */
    arabic: string | null;
    /** ESKİ yol: AlQuran markup'ı. Artık render'da KULLANILMIYOR (bkz. tajweedSpans). */
    tajweed: string | null;
    /** Tecvid renkleri, `arabic` üzerinde KOD NOKTASI koordinatlarıyla. */
    tajweedSpans?: { startCp: number; endCp: number; rule: string; color: string }[];
  }[];
  surahs: { id: number; name: string; arabicName: string }[];
};

export type DailyVerseItem = {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
  arabic_text: string | null;
  reading_tr: string | null;
  meal: string | null;
};

export type DailyResponse = {
  verse: DailyVerseItem | null;
  dua: DailyVerseItem | null;
};

export type TafsirResponse = {
  content: string | null;
  simplifiedContent?: string | null;
  availableModes?: Array<"original" | "simplified">;
};

export type AyahDetailResponse = {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  arabicName: string;
  verseCount: number;
  /** Canonical Tanzil metni — ekranda basılan budur. */
  arabicText: string | null;
  /** ESKİ yol: AlQuran markup'ı. Artık render'da KULLANILMIYOR (bkz. tajweedSpans). */
  arabicTajweed: string | null;
  /** Tecvid renkleri, `arabicText` üzerinde KOD NOKTASI koordinatlarıyla. */
  tajweedSpans?: { startCp: number; endCp: number; rule: string; color: string }[];
  readingTr: string | null;
  meal: string | null;
  literalCeviri: string | null;
  farkAnalizi: string | null;
  anaTema: string | null;
  altTaglar: string[];
  translations: { source: string; text: string | null }[];
  rootMeanings: Record<string, string>;
  words: {
    wordIndex: number;
    arabic: string | null;
    meaningTr: string | null;
    pos: string | null;
    root: string | null;
    lemma: string | null;
    morphology: string | null;
  }[];
  prevAyah: { surahId: number; ayahNumber: number } | null;
  nextAyah: { surahId: number; ayahNumber: number } | null;
};

// ── Offline cache yardımcıları ────────────────────────────────────────────────

const CACHE_TTL_STATIC = 7 * 24 * 60 * 60 * 1000;  // 7 gün (statik veri)
const CACHE_TTL_DAILY  = 24 * 60 * 60 * 1000;        // 1 gün

// Cache sürümü — artırınca tüm eski yerel cache'ler geçersiz olur.
// (v2: gloss/literal/fark analizi büyük veri güncellemesi)
const CACHE_VERSION = "v4"; // v4: AsyncStorage → MMKV geçişi, eski cache biçimi geçersiz
const vkey = (k: string) => `${CACHE_VERSION}_${k}`;
// Diğer modüllerin (örn. useDailyContent) aynı sürümlü anahtarı hardcode etmeden
// okuyabilmesi için dışa açılır — sürüm ileride tekrar artınca burada da otomatik değişir.
export const dailyCacheVkey = vkey;

// Günün ayeti/duası cache anahtarı — YEREL gün (UTC değil). toISOString() UTC
// gününü verir; Türkiye'de (UTC+3) gece 00:00–03:00 arası hâlâ dünkü içerik
// gösterilir/yenilenmezdi. useStreak ve namazNotifications da yerel gün kullanır.
export function dailyCacheKey(d = new Date()): string {
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `cache_daily_${day}`;
}

// Uçuştaki (in-flight) istekler — aynı anahtar için eşzamanlı iki çağrı tek ağ
// isteğini paylaşır. Örn. link pressIn prefetch'i + ekran mount'u aynı ayeti
// isterse yalnız 1 fetch olur (çift indirmeyi ve boşa API maliyetini önler).
const inflight = new Map<string, Promise<unknown>>();

async function withCache<T>(
  rawKey: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const key = vkey(rawKey);
  // Önce cache dene
  try {
    const cached = await storage.getJSON<{ ts: number; data: T }>(key);
    if (cached && Date.now() - cached.ts < ttl) return cached.data;
  } catch { /* ignore */ }

  // Uçuşta aynı istek varsa onu paylaş
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    // Network'ten al, cache'e yaz
    const data = await fetcher();
    storage.setJSON(key, { ts: Date.now(), data }).catch(() => {});
    return data;
  })();
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

async function withCacheFallback<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    return await withCache(key, ttl, fetcher);
  } catch (err) {
    // Network hata → cache'den sun (eski olsa bile) — aynı sürümlü anahtar
    try {
      const cached = await storage.getJSON<{ ts: number; data: T }>(vkey(key));
      if (cached) return cached.data;
    } catch { /* ignore */ }
    throw err;
  }
}

// ── API çağrıları ─────────────────────────────────────────────────────────────

export const api = {
  surahs: {
    list: () =>
      withCacheFallback(
        "cache_surahs",
        CACHE_TTL_STATIC,
        () => withRetry((signal) => request<SurahListItem[]>("/surahs", undefined, signal)),
      ),
  },

  search: {
    query: (q: string) =>
      withRetry((signal) =>
        request<SearchResponse>(
          `/search?q=${encodeURIComponent(q)}`,
          undefined,
          signal,
        ),
      ),
  },

  verses: {
    bySurah: (surahId: number) =>
      withCacheFallback(
        `cache_verses_${surahId}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<VerseListResponse>(`/verses?surah_id=${surahId}`, undefined, signal),
        ),
      ),
  },

  mushaf: {
    // v=4: render artık canonical `arabic` + `tajweedSpans` kullanıyor (markup
    // metni değil). tajweedSpans eski cihaz cache'inde YOK; sürüm artırılmazsa
    // eski kayıtlar renksiz ve yanlış metinle sunulurdu.
    // Parametre CDN cache'ini, anahtar da yerel MMKV cache'ini yeniler.
    page: (page: number) =>
      withCacheFallback(
        `cache_mushaf_v4_p${page}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<MushafPageResponse>(`/mushaf?page=${page}&v=4`, undefined, signal),
        ),
      ),
  },

  ayah: {
    // v2: render artık canonical `arabicText` + `tajweedSpans` kullanıyor.
    // tajweedSpans sürümsüz dönemde cache'lenmiş kayıtlarda YOK; anahtar
    // sürümlenmezse o kayıtlar tecvidsiz sunulurdu.
    get: (surahId: number, ayahNumber: number) =>
      withCacheFallback(
        `cache_ayah_v2_${surahId}_${ayahNumber}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<AyahDetailResponse>(
            `/ayah?surah_id=${surahId}&ayah_number=${ayahNumber}`,
            undefined,
            signal,
          ),
        ),
      ),
  },

  tags: {
    // Tag içeriği statiktir (bir temaya bağlı ayetler değişmez) → 7 gün cache +
    // ağ hatasında eski cache'ten sun. Manevi Sığınak, İsm-i Azam, Namaz Rehberi,
    // Namaz ekranları bunu kullanır; her kategoride ağ beklemesi biter.
    filter: (tag: string, page = 1) =>
      withCacheFallback(
        `cache_tags_${tag}_p${page}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<TagFilterResponse>(
            `/tags/filter?tag=${encodeURIComponent(tag)}&page=${page}`,
            undefined,
            signal,
          ),
        ),
      ),
  },

  roots: {
    list: () =>
      // statik liste — 7 gün yerel cache, tekrar açılışlar anında
      withCacheFallback(
        "cache_roots_list",
        CACHE_TTL_STATIC,
        () =>
          withRetry((signal) =>
            request<unknown>("/roots", undefined, signal).then((r) => {
              if (Array.isArray(r)) return r as RootItem[];
              if (r && typeof r === "object" && "roots" in r)
                return (r as { roots: RootItem[] }).roots ?? [];
              return [];
            }),
          ),
      ),
    detail: (root: string) =>
      // kök detayı — 7 gün yerel cache (statik)
      withCacheFallback(
        `cache_root_${root}`,
        CACHE_TTL_STATIC,
        () =>
          withRetry((signal) =>
            request<RootDetail>(
              `/root/${encodeURIComponent(root)}`,
              undefined,
              signal,
            ),
          ),
      ),
  },

  favorites: {
    // Ayet meta verisi (meal/sure adı/tema) statiktir → aynı favori/not seti
    // için 7 gün cache. Favoriler ve Notlar ekranlarını hızlandırır; set
    // değişince (favori ekle/çıkar) anahtar değişir, doğal olarak yenilenir.
    fetch: (keys: string[]) =>
      withCacheFallback(
        `cache_fav_${[...keys].sort().join("_")}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<FavoriteVerse[]>(
            `/favorites-verses?keys=${keys.map(encodeURIComponent).join(",")}`,
            undefined,
            signal,
          ),
        ),
      ),
  },

  tafsir: {
    // Tefsir statiktir → 7 gün yerel cache + ağ hatasında eski cache'ten sun.
    // (Sadeleştirilmiş metin ayrıca gömülü fallback'e sahip; bu, orijinali de offline tutar.)
    get: (surahId: number) =>
      withCacheFallback(
        `cache_tafsir_${surahId}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<TafsirResponse>(
            `/tafsir/${surahId}`,
            undefined,
            signal,
          ),
        ),
      ),
  },

  daily: {
    get: () =>
      withCacheFallback(
        dailyCacheKey(),
        CACHE_TTL_DAILY,
        () => withRetry((signal) => request<DailyResponse>("/daily", undefined, signal)),
      ),
    /** Belirli günün ayet/duası (YYYY-MM-DD) — 7 günlük bildirim planı için; önbelleksiz. */
    forDate: (date: string) =>
      withRetry((signal) => request<DailyResponse>(`/daily?date=${encodeURIComponent(date)}`, undefined, signal)),
  },

  notifications: {
    namazVerse: (vakit?: string) =>
      withRetry((signal) =>
        request<{
          vakit: string | null;
          verse_key: string;
          surah_id: number;
          ayah_number: number;
          arabic_text: string | null;
          translation: string | null;
        }>(
          `/notifications/namaz-verse${vakit ? `?vakit=${encodeURIComponent(vakit)}` : ""}`,
          undefined,
          signal,
        ),
      ),
  },

  mood: {
    random: (tag: string, exclude?: string) =>
      withRetry((signal) =>
        request<{
          verse_key: string;
          surah_id: number;
          ayah_number: number;
          surah_name: string | null;
          arabic_text: string | null;
          meal: string | null;
        }>(
          `/mood/random?tag=${encodeURIComponent(tag)}${exclude ? `&exclude=${encodeURIComponent(exclude)}` : ""}`,
          undefined,
          signal,
        ),
      ),
  },

  elifba: {
    // Elif-Ba içeriği statiktir → 7 gün yerel cache + ağ hatasında eski cache'ten sun.
    // (Ses dosyaları CDN'den ayrı gelir; bu yalnız metin/harf/quiz verisini offline tutar.)
    dersler: () =>
      withCacheFallback(
        "cache_elifba_dersler",
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<ElifbaDers[]>("/elifba/dersler", undefined, signal),
        ),
      ),
    harfler: (dersId: number) =>
      withCacheFallback(
        `cache_elifba_harfler_${dersId}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<ElifbaHarf[]>(
            `/elifba/dersler/${dersId}/harfler`,
            undefined,
            signal,
          ),
        ),
      ),
    quiz: (lessonId: number) =>
      withCacheFallback(
        `cache_elifba_quiz_${lessonId}`,
        CACHE_TTL_STATIC,
        () => withRetry((signal) =>
          request<ElifbaQuizSoru[]>(
            `/elifba/quiz/${lessonId}`,
            undefined,
            signal,
          ),
        ),
      ),
  },
};

/**
 * Ayet verisini önden ısıtır (cache'e yazar) — liste/link satırlarının
 * onPressIn'inde çağrılır; parmak değince fetch başlar, bırakınca ayet
 * sayfası çoğu zaman hazır olur. Hata yutulur (sadece ısıtma).
 */
export function prefetchAyah(surahId: number, ayahNumber: number): void {
  if (!surahId || !ayahNumber) return;
  void api.ayah.get(surahId, ayahNumber).catch(() => {});
}