export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import type { SearchResponse, SuggestedSurah } from "./search-types";
import { dbAll, dbGet } from "../../../lib/dbUtils";
import { sanitizeSearchQuery, expandSearchPatterns, escapeFts, stripSurahSuffix } from "../../../lib/ftsQuery";

export type { SearchResponse };

const VERSE_LIMIT = 30;
const MAX_Q_LEN   = 150;

interface SurahRow    { id: number; adi_turkce: string; adi_arapca: string }
interface CountRow    { total: number }
interface VerseRow    { verse_key: string; meal: string | null; surah_name: string | null; arabic_text: string | null; reading_tr: string | null }
interface TagCountRow { total: number }

// Arama sorgusu normalizasyonu + FTS5 temizleyici: ../../../lib/ftsQuery

// ── Sure eşleştirme ───────────────────────────────────────────────────────────

function normalizeTR(text: string): string {
  return sanitizeSearchQuery(text);
}

function findSurahMatch(q: string, surahs: SurahRow[]): SurahRow | null {
  // "Bakara" ve "Bakara Suresi" iki türlü de eşleşsin: sondaki "suresi/sure"
  // ekini soyulmuş varyantı da dene. Önce ham sorgu, sonra soyulmuş.
  const stripped = stripSurahSuffix(q);
  const candidates = stripped && stripped !== q ? [q, stripped] : [q];
  for (const cand of candidates) {
    const norm = normalizeTR(cand);
    for (const s of surahs) if (normalizeTR(s.adi_turkce) === norm) return s;
    if (cand.length >= 3) {
      for (const s of surahs) if (normalizeTR(s.adi_turkce).startsWith(norm)) return s;
      for (const s of surahs) if (s.adi_arapca.includes(cand)) return s;
    }
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

const SEARCH_CACHE = {
  headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
} as const;

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse>> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  if (q.length < 2 || q.length > MAX_Q_LEN) {
    return NextResponse.json({ type: "none" }, SEARCH_CACHE);
  }

  try {
    const surahs = await dbAll<SurahRow>(
      "SELECT id, adi_turkce, adi_arapca FROM sureler ORDER BY id"
    );
    const surahMatch = findSurahMatch(q, surahs);

    if (surahMatch && (
      normalizeTR(surahMatch.adi_turkce) === normalizeTR(q) ||
      normalizeTR(surahMatch.adi_turkce) === normalizeTR(stripSurahSuffix(q))
    )) {
      // Sure adı TAM eşleşti → doğrudan sureye git. Burada KASITLI olarak FTS
      // metin araması yapılmıyor: sure adları (nur, fetih, yusuf, ihlas, kevser…)
      // çoğunlukla ayet çevirilerinde de geçen sıradan kelimeler — önceki
      // davranış "herhangi bir tesadüfi metin eşleşmesi varsa onu göster"
      // diyordu ve kullanıcıyı sureye götürmek yerine alakasız ayetlere
      // düşürüyordu (canlıda doğrulandı: "nur"→39, "ihlas"→6, "yusuf"→72
      // alakasız/kısmen alakasız sonuç, sureye hiç gidilemiyordu).
      return NextResponse.json({
        type:      "surah",
        surahId:   surahMatch.id,
        surahName: surahMatch.adi_turkce,
      }, SEARCH_CACHE);
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
          return NextResponse.json({ type: "verses", results: verseRows, total: tagMatch.count }, SEARCH_CACHE);
        }
      }
      return NextResponse.json({
        type:    "tag",
        tag:     tagMatch.tag,
        tagType: tagMatch.tagType,
        count:   tagMatch.count,
      }, SEARCH_CACHE);
    }

    if (q.length >= 3) {
      const { results, total } = await searchFts(q);

      if (results.length > 0) {
        const suggestedSurah: SuggestedSurah | undefined = surahMatch
          ? { id: surahMatch.id, name: surahMatch.adi_turkce }
          : undefined;
        return NextResponse.json({ type: "verses", results, total, suggestedSurah }, SEARCH_CACHE);
      }

      if (surahMatch) {
        return NextResponse.json({
          type:      "surah",
          surahId:   surahMatch.id,
          surahName: surahMatch.adi_turkce,
        }, SEARCH_CACHE);
      }

      return NextResponse.json({ type: "none" }, SEARCH_CACHE);
    }

    return NextResponse.json({ type: "none" }, SEARCH_CACHE);

  } catch (err) {
    console.error("[search] hata:", err);
    return NextResponse.json({ type: "none" });
  }
}
