import { DatabaseSync } from "node:sqlite";
import { type NextRequest, NextResponse } from "next/server";
import type { SearchResponse, SuggestedSurah } from "./search-types";
import { dbAll, dbGet, getApiDb } from "../../../lib/dbUtils";

export type { SearchResponse };

const VERSE_LIMIT = 30;
const MAX_Q_LEN   = 150;

interface SurahRow    { id: number; adi_turkce: string; adi_arapca: string }
interface CountRow    { total: number }
interface VerseRow    { verse_key: string; meal: string | null }
interface TagCountRow { total: number }

// ── FTS5 sorgu temizleyici ────────────────────────────────────────────────────

function escapeFts(q: string): string {
  return q
    .replace(/["*^()-]/g, " ")               // FTS5 özel karakterler
    .replace(/\b(AND|OR|NOT)\b/gi, " ")      // boolean operatörler
    .replace(/\s+/g, " ")
    .trim();
}

// ── Sure eşleştirme ───────────────────────────────────────────────────────────

function normalizeTR(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/ı/gu, "i")
    .trim();
}

// Prefix eşleşmesi için min 3 karakter; tam eşleşme her zaman kabul edilir.
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

function findTagMatch(q: string, db: DatabaseSync): TagMatch | null {
  const upper = q.toUpperCase();
  const lower = q.toLocaleLowerCase("tr-TR");

  const exact = dbGet<CountRow>(
    db.prepare("SELECT COUNT(*) AS total FROM verse_tags WHERE ana_tema = ?"),
    upper
  );
  if ((exact?.total ?? 0) > 0) {
    return { tag: upper, tagType: "ana_tema", count: exact?.total ?? 0 };
  }

  if (/^[A-Ga-g]\d$/i.test(q)) {
    const prefix = dbGet<CountRow>(
      db.prepare("SELECT COUNT(*) AS total FROM verse_tags WHERE ana_tema LIKE ?"),
      `${upper}_%`
    );
    if ((prefix?.total ?? 0) > 0) {
      return { tag: `${upper}_%`, tagType: "ana_tema", count: prefix?.total ?? 0 };
    }
  }

  // junction tablo — json_each full scan yerine index lookup
  const altTag = dbGet<TagCountRow>(
    db.prepare("SELECT COUNT(*) AS total FROM verse_tag_items WHERE tag = ?"),
    lower
  );
  if ((altTag?.total ?? 0) > 0) {
    return { tag: lower, tagType: "alt_tag", count: altTag?.total ?? 0 };
  }

  return null;
}

// ── FTS5 metin araması ────────────────────────────────────────────────────────

function searchFts(
  q: string,
  db: DatabaseSync
): { results: VerseRow[]; total: number } {
  const safe = escapeFts(q);
  if (!safe) return { results: [], total: 0 };

  const ftsQuery = `"${safe}"*`;

  try {
    const countRow = dbGet<CountRow>(
      db.prepare("SELECT COUNT(*) AS total FROM ayet_fts WHERE ayet_fts MATCH ?"),
      ftsQuery
    );
    const total = countRow?.total ?? 0;
    if (total === 0) return { results: [], total: 0 };

    const results = dbAll<VerseRow>(
      db.prepare(`
        SELECT f.verse_key, f.meal
        FROM   ayet_fts f
        WHERE  ayet_fts MATCH ?
        ORDER  BY bm25(ayet_fts, 0, 0, 10, 5, 5)
        LIMIT  ?
      `),
      ftsQuery, VERSE_LIMIT
    );
    return { results, total };
  } catch {
    return searchLikeFallback(q, db);
  }
}

// LIKE fallback — FTS kullanılamadığında devreye girer

function searchLikeFallback(
  q: string,
  db: DatabaseSync
): { results: VerseRow[]; total: number } {
  const pattern = `%${q}%`;
  const countRow = dbGet<CountRow>(
    db.prepare("SELECT COUNT(*) AS total FROM verses WHERE primary_translation LIKE ?"),
    pattern
  );
  const results = dbAll<VerseRow>(
    db.prepare(`
      SELECT verse_key, primary_translation AS meal
      FROM   verses
      WHERE  primary_translation LIKE ?
      ORDER  BY surah_id, ayah_number
      LIMIT  ?
    `),
    pattern, VERSE_LIMIT
  );
  return { results, total: countRow?.total ?? 0 };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse>> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  // Bulgu 3: uzunluk sınırı
  if (q.length < 2 || q.length > MAX_Q_LEN) {
    return NextResponse.json({ type: "none" });
  }

  // Singleton bağlantı — her istekte yeniden açılmaz
  const db = getApiDb();
  try {
    const surahs = dbAll<SurahRow>(
      db.prepare("SELECT id, adi_turkce, adi_arapca FROM sureler ORDER BY id")
    );
    const surahMatch = findSurahMatch(q, surahs);

    // Tam sure adı eşleşmesi — tag'lerden önce değerlendirilir
    if (surahMatch && normalizeTR(surahMatch.adi_turkce) === normalizeTR(q)) {
      let ftsResults: VerseRow[] = [];
      let ftsTotal = 0;
      if (q.length >= 3) {
        const fts = searchFts(q, db);
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

    // Tag eşleşmesi
    const tagMatch = findTagMatch(q, db);
    if (tagMatch) {
      if (tagMatch.tagType === "alt_tag") {
        const verseRows = dbAll<VerseRow>(
          db.prepare(`
            SELECT vti.verse_key, v.primary_translation AS meal
            FROM   verse_tag_items vti
            JOIN   verses v ON v.verse_key = vti.verse_key
            WHERE  vti.tag = ?
            ORDER  BY v.surah_id, v.ayah_number
            LIMIT  ?
          `),
          tagMatch.tag, VERSE_LIMIT
        );
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

    // FTS5 metin araması (min 3 karakter)
    if (q.length >= 3) {
      const { results, total } = searchFts(q, db);

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
  // Singleton — db.close() çağrılmaz, process boyunca açık kalır
}
