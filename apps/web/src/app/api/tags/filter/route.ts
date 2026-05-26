import { type NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, getApiDb } from "../../../../lib/dbUtils";
const PAGE_SIZE = 50;
const MAX_TAG   = 100;

interface TagFilterRow {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  meal:        string | null;
  ana_tema:    string | null;
  alt_taglar:  string | null;
}

interface CountRow { total: number }

export interface TagFilterResponse {
  type:    "tag_results";
  tag:     string;
  tagType: "ana_tema" | "alt_tag";
  results: Array<{
    verse_key:   string;
    surah_id:    number;
    ayah_number: number;
    surah_name:  string | null;
    meal:        string | null;
    ana_tema:    string | null;
    alt_taglar:  string[];
  }>;
  total: number;
  page:  number;
  pages: number;
}

export type TagFilterErrorResponse = { type: "error"; message: string };

/**
 * GET /api/tags/filter?tag=F1_PEYGAMBER_KISSALARI
 * GET /api/tags/filter?tag=namaz
 * GET /api/tags/filter?tag=F1
 * GET /api/tags/filter?tag=namaz&page=2
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TagFilterResponse | TagFilterErrorResponse>> {
  const params = new URL(request.url).searchParams;
  const tag    = params.get("tag")?.trim() ?? "";

  // Bulgu 3: uzunluk sınırı
  if (!tag || tag.length > MAX_TAG) {
    return NextResponse.json({ type: "error", message: "tag parametresi gerekli" });
  }

  // Bulgu 2: NaN-safe sayfa ayrıştırma
  const rawPage = parseInt(params.get("page") ?? "1", 10);
  const page    = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const offset  = (page - 1) * PAGE_SIZE;

  const db = getApiDb();
  try {
    const isAnaTema =
      /^[A-G]\d_/i.test(tag) ||
      db.prepare("SELECT 1 FROM verse_tags WHERE ana_tema = ? LIMIT 1")
        .get(tag.toUpperCase()) !== undefined;

    let tagType: "ana_tema" | "alt_tag";
    let countRow: CountRow | undefined;
    let rows: TagFilterRow[];

    if (isAnaTema) {
      tagType = "ana_tema";

      const upper       = tag.toUpperCase();
      const isExact     = upper.includes("_") && !upper.endsWith("_");
      const likePattern = upper.endsWith("_") ? `${upper}%`
                        : isExact              ? upper
                        :                       `${upper}_%`;
      const bindVal     = isExact ? upper : likePattern;
      const cmp         = isExact ? "= ?" : "LIKE ?";

      countRow = dbGet<CountRow>(
        db.prepare(`SELECT COUNT(*) AS total FROM verse_tags WHERE ana_tema ${cmp}`),
        bindVal
      );
      rows = dbAll<TagFilterRow>(
        db.prepare(`
          SELECT v.verse_key, v.surah_id, v.ayah_number,
                 s.adi_turkce AS surah_name,
                 v.primary_translation AS meal,
                 vt.ana_tema, vt.alt_taglar
          FROM   verse_tags vt
          JOIN   verses v ON v.verse_key = vt.verse_key
          JOIN   sureler s ON s.id = v.surah_id
          WHERE  vt.ana_tema ${cmp}
          ORDER  BY v.surah_id, v.ayah_number
          LIMIT  ? OFFSET ?
        `),
        bindVal, PAGE_SIZE, offset
      );

    } else {
      // verse_tag_items junction tablosu — json_each full scan yerine index lookup
      tagType = "alt_tag";
      const needle = tag.toLocaleLowerCase("tr-TR");

      countRow = dbGet<CountRow>(
        db.prepare(`
          SELECT COUNT(*) AS total
          FROM   verse_tag_items
          WHERE  tag = ?
        `),
        needle
      );
      rows = dbAll<TagFilterRow>(
        db.prepare(`
          SELECT v.verse_key, v.surah_id, v.ayah_number,
                 s.adi_turkce AS surah_name,
                 v.primary_translation AS meal,
                 vt.ana_tema, vt.alt_taglar
          FROM   verse_tag_items vi
          JOIN   verses v ON v.verse_key = vi.verse_key
          JOIN   sureler s ON s.id = v.surah_id
          JOIN   verse_tags vt ON vt.verse_key = vi.verse_key
          WHERE  vi.tag = ?
          ORDER  BY v.surah_id, v.ayah_number
          LIMIT  ? OFFSET ?
        `),
        needle, PAGE_SIZE, offset
      );
    }

    const total = countRow?.total ?? 0;
    const pages = Math.ceil(total / PAGE_SIZE) || 1;

    return NextResponse.json({
      type: "tag_results",
      tag,
      tagType,
      total,
      page,
      pages,
      results: rows.map((r) => ({
        verse_key:   r.verse_key,
        surah_id:    r.surah_id,
        ayah_number: r.ayah_number,
        surah_name:  r.surah_name,
        meal:        r.meal,
        ana_tema:    r.ana_tema,
        alt_taglar: (() => {
          try { return r.alt_taglar ? JSON.parse(r.alt_taglar) as string[] : []; }
          catch { return []; }
        })(),
      })),
    });

  } catch (err) {
    console.error("[tags/filter] hata:", err);
    return NextResponse.json({ type: "error", message: "Sunucu hatası" });
  }
}
