export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import type { SearchResponse, SuggestedSurah } from "./search-types";
import { dbAll, dbGet } from "../../../lib/dbUtils";

export type { SearchResponse };

const VERSE_LIMIT = 30;
const MAX_Q_LEN   = 150;

interface SurahRow    { id: number; adi_turkce: string; adi_arapca: string }
interface CountRow    { total: number }
interface VerseRow    { verse_key: string; meal: string | null; surah_name: string | null; arabic_text: string | null; reading_tr: string | null }
interface TagCountRow { total: number }

// ── Arama sorgusu normalizasyonu (Türkçe karakter esnekliği) ─────────────────

/**
 * Kullanıcının yazdığı arama terimini ASCII‑güvenli ve karşılaştırmaya
 * uygun hale getirir.  NFD ayrıştırma + combining diacritic temizliği
 * ile ş→s, ç→c, ğ→g, ü→u, ö→o, î→i, â→a dönüşümü yapar.
 * Sadece "ı" (dotless i) NFD ile ayrışmadığı için özel olarak ele alınır.
 */
function sanitizeSearchQuery(q: string): string {
  return q
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

/**
 * Aynı sorgunun hem orijinal (Türkçe karakterler korunmuş) hem de
 * ASCII‑normalleştirilmiş varyantlarını döner.  Tekil kalması için
 * Set ile birleştirilir.
 */
function expandSearchPatterns(q: string): string[] {
  const original = q.toLocaleLowerCase("tr-TR").trim();
  const ascii = sanitizeSearchQuery(q);
  return [...new Set([original, ascii])];
}

// ── FTS5 sorgu temizleyici ────────────────────────────────────────────────────

function escapeFts(q: string): string {
  return q
    .replace(/["*^()-]/g, " ")
    .replace(/\b(AND|OR|NOT)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Sure eşleştirme ───────────────────────────────────────────────────────────

function normalizeTR(text: string): string {
  return sanitizeSearchQuery(text);
}

function findSurahMatch(q: string, surahs: SurahRow[]): SurahRow | null {
  const norm = normalizeTR(q);
  for (const s of surahs) if (normalizeTR(s.adi_turkce) === norm) return s;
  if (q.length >= 3) {
    for (const s of surahs) if (normalizeTR(s.adi_turkce).startsWith(norm)) return s;
    for (const s of surahs) if (s.adi_arapca.includes(q)) return s;
  }
  return null;
}

// ── Tag eşleştirme ────────────────────────────────────────────────────────────

interface TagMatch { tag: string; tagType: "ana_tema" | "alt_tag"; count: number }

async function findTagMatch(q: string): Promise<TagMatch | null> {
  const upper = q.toUpperCase();
  const lower = q.toLocaleLowerCase("tr-TR");

  const exact = await dbGet<CountRow>(
    "SELECT COUNT(*) AS total FROM verse_tags WHERE ana_tema = ?", upper
  );
  if ((exact?.total ?? 0) > 0) {
    return { tag: upper, tagType: "ana_tema", count: exact?.total ?? 0 };
  }

  if (/^[A-Ga-g]\d$/i.test(q)) {
    const prefix = await dbGet<CountRow>(
      "SELECT COUNT(*) AS total FROM verse_tags WHERE ana_tema LIKE ?", `${upper}_%`
    );
    if ((prefix?.total ?? 0) > 0) {
      return { tag: `${upper}_%`, tagType: "ana_tema", count: prefix?.total ?? 0 };
    }
  }

  const altTag = await dbGet<TagCountRow>(
    "SELECT COUNT(*) AS total FROM verse_tag_items WHERE tag = ?", lower
  );
  if ((altTag?.total ?? 0) > 0) {
    return { tag: lower, tagType: "alt_tag", count: altTag?.total ?? 0 };
  }

  return null;
}

// ── FTS5 metin araması ────────────────────────────────────────────────────────

async function searchFts(q: string): Promise<{ results: VerseRow[]; total: number }> {
  // Orijinal + ASCII‑normalleştirilmiş varyantları dene
  const patterns = expandSearchPatterns(q);
  const ftsQueries = patterns
    .map(p => escapeFts(p))
    .filter(Boolean)
    .map(safe => `"${safe}"*`);

  if (ftsQueries.length === 0) return { results: [], total: 0 };

  const allResults: VerseRow[] = [];
  let total = 0;

  for (const ftsQuery of ftsQueries) {
    try {
      const countRow = await dbGet<CountRow>(
        "SELECT COUNT(*) AS total FROM ayet_fts WHERE ayet_fts MATCH ?", ftsQuery
      );
      const cnt = countRow?.total ?? 0;
      if (cnt === 0) continue;

      total += cnt;

      const rows = await dbAll<VerseRow>(`
          SELECT f.verse_key, v.literal_ceviri AS meal, s.adi_turkce AS surah_name,
                 v.arabic_text, v.reading_tr
          FROM   ayet_fts f
          JOIN   sureler s ON s.id = CAST(substr(f.verse_key, 1, instr(f.verse_key, ':') - 1) AS INTEGER)
          JOIN   verses v ON v.verse_key = f.verse_key
          WHERE  ayet_fts MATCH ?
          ORDER  BY bm25(ayet_fts, 0, 0, 10, 5, 5)
          LIMIT  ?
        `, ftsQuery, VERSE_LIMIT);
      allResults.push(...rows);
    } catch {
      // FTS hatasında LIKE fallback'e geç
      return searchLikeFallback(q);
    }
  }

  // Duplicate verse_key'leri temizle (aynı ayet iki varyantla da eşleşebilir)
  const seen = new Set<string>();
  const unique: VerseRow[] = [];
  for (const r of allResults) {
    if (!seen.has(r.verse_key)) {
      seen.add(r.verse_key);
      unique.push(r);
    }
  }

  return { results: unique.slice(0, VERSE_LIMIT), total };
}

async function searchLikeFallback(q: string): Promise<{ results: VerseRow[]; total: number }> {
  // LIKE ile de hem orijinal hem ASCII varyantları dene
  const patterns = expandSearchPatterns(q).map(p => `%${p}%`);

  const allResults: VerseRow[] = [];
  let total = 0;

  for (const pattern of patterns) {
    const countRow = await dbGet<CountRow>(
      "SELECT COUNT(*) AS total FROM verses WHERE literal_ceviri LIKE ?", pattern
    );
    const cnt = countRow?.total ?? 0;
    total += cnt;

    const rows = await dbAll<VerseRow>(`
        SELECT v.verse_key, v.literal_ceviri AS meal, s.adi_turkce AS surah_name,
               v.arabic_text, v.reading_tr
        FROM   verses v
        JOIN   sureler s ON s.id = v.surah_id
        WHERE  v.literal_ceviri LIKE ?
        ORDER  BY v.surah_id, v.ayah_number
        LIMIT  ?
      `, pattern, VERSE_LIMIT);
    allResults.push(...rows);
  }

  // Duplicate temizliği
  const seen = new Set<string>();
  const unique: VerseRow[] = [];
  for (const r of allResults) {
    if (!seen.has(r.verse_key)) {
      seen.add(r.verse_key);
      unique.push(r);
    }
  }

  return { results: unique.slice(0, VERSE_LIMIT), total };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse>> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  if (q.length < 2 || q.length > MAX_Q_LEN) {
    return NextResponse.json({ type: "none" });
  }

  try {
    const surahs = await dbAll<SurahRow>(
      "SELECT id, adi_turkce, adi_arapca FROM sureler ORDER BY id"
    );
    const surahMatch = findSurahMatch(q, surahs);

    if (surahMatch && normalizeTR(surahMatch.adi_turkce) === normalizeTR(q)) {
      let ftsResults: VerseRow[] = [];
      let ftsTotal = 0;
      if (q.length >= 3) {
        const fts = await searchFts(q);
        ftsResults = fts.results;
        ftsTotal   = fts.total;
      }

      if (ftsResults.length > 0) {
        return NextResponse.json({
          type:           "verses",
          results:        ftsResults,
          total:          ftsTotal,
          suggestedSurah: { id: surahMatch.id, name: surahMatch.adi_turkce },
        });
      }
      return NextResponse.json({
        type:      "surah",
        surahId:   surahMatch.id,
        surahName: surahMatch.adi_turkce,
      });
    }

    const tagMatch = await findTagMatch(q);
    if (tagMatch) {
      if (tagMatch.tagType === "alt_tag") {
        const verseRows = await dbAll<VerseRow>(`
            SELECT vti.verse_key, v.literal_ceviri AS meal, s.adi_turkce AS surah_name,
                   v.arabic_text, v.reading_tr
            FROM   verse_tag_items vti
            JOIN   verses v ON v.verse_key = vti.verse_key
            JOIN   sureler s ON s.id = v.surah_id
            WHERE  vti.tag = ?
            ORDER  BY v.surah_id, v.ayah_number
            LIMIT  ?
          `, tagMatch.tag, VERSE_LIMIT);
        if (verseRows.length > 0) {
          return NextResponse.json({ type: "verses", results: verseRows, total: tagMatch.count });
        }
      }
      return NextResponse.json({
        type:    "tag",
        tag:     tagMatch.tag,
        tagType: tagMatch.tagType,
        count:   tagMatch.count,
      });
    }

    if (q.length >= 3) {
      const { results, total } = await searchFts(q);

      if (results.length > 0) {
        const suggestedSurah: SuggestedSurah | undefined = surahMatch
          ? { id: surahMatch.id, name: surahMatch.adi_turkce }
          : undefined;
        return NextResponse.json({ type: "verses", results, total, suggestedSurah });
      }

      if (surahMatch) {
        return NextResponse.json({
          type:      "surah",
          surahId:   surahMatch.id,
          surahName: surahMatch.adi_turkce,
        });
      }

      return NextResponse.json({ type: "none" });
    }

    return NextResponse.json({ type: "none" });

  } catch (err) {
    console.error("[search] hata:", err);
    return NextResponse.json({ type: "none" });
  }
}
