export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet } from "../../../../lib/dbUtils";
import { cleanMealText } from "../../../../lib/cleanMeal";
import { getThemeCodeVariants, mapLegacyCode } from "../../../../lib/themes";
const PAGE_SIZE = 50;
const MAX_TAG   = 100;
const MAX_PAGE  = 200;

interface TagFilterRow {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  arabic_text: string | null;
  reading_tr:  string | null;
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
    arabic_text: string | null;
    reading_tr:  string | null;
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
    return NextResponse.json({ type: "error", message: "tag parametresi gerekli" }, { status: 400 });
  }

  const rawPage = parseInt(params.get("page") ?? "1", 10);
  const page    = Math.min(Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1, MAX_PAGE);
  const offset  = (page - 1) * PAGE_SIZE;

  try {
    // Eski (legacy) kodları güncel koda çevir; UI eski veya yeni kodu gönderebilir.
    const mappedTag = mapLegacyCode(tag);
    const looksLikeAnaTema =
      /^[A-G]\d_/i.test(tag) ||
      (mappedTag !== null && /^[A-G]\d_/i.test(mappedTag));
    const isAnaTema =
      looksLikeAnaTema ||
      (await dbGet("SELECT 1 FROM verse_tags WHERE ana_tema = ? LIMIT 1", tag.toUpperCase())) !== undefined ||
      (mappedTag !== null &&
        (await dbGet("SELECT 1 FROM verse_tags WHERE ana_tema = ? LIMIT 1", mappedTag.toUpperCase())) !== undefined);

    let tagType: "ana_tema" | "alt_tag";
    let countRow: CountRow | undefined;
    let rows: TagFilterRow[];

    if (isAnaTema) {
      tagType = "ana_tema";

      const upper   = tag.toUpperCase();
      const isExact = upper.includes("_") && !upper.endsWith("_");

      if (isExact) {
        // Güncel kod + bu koda taşınan tüm eski kodlar birlikte sorgulanır.
        const variants = getThemeCodeVariants(tag);
        if (variants.length === 0) {
          countRow = { total: 0 };
          rows = [];
        } else {
          const placeholders = variants.map(() => "?").join(", ");
          countRow = await dbGet<CountRow>(
            `SELECT COUNT(*) AS total FROM verse_tags WHERE ana_tema IN (${placeholders})`,
            ...variants
          );
          rows = await dbAll<TagFilterRow>(`
              SELECT v.verse_key, v.surah_id, v.ayah_number,
                     s.adi_turkce AS surah_name,
                     v.arabic_text, v.reading_tr,
                     COALESCE(yt.text, v.literal_ceviri, v.primary_translation) AS meal,
                     vt.ana_tema, vt.alt_taglar
              FROM   verse_tags vt
              JOIN   verses v ON v.verse_key = vt.verse_key
              JOIN   sureler s ON s.id = v.surah_id
              LEFT JOIN translations yt ON yt.verse_key = v.verse_key
                     AND (yt.source = 'yazir' OR yt.source LIKE '%#yazir')
              WHERE  vt.ana_tema IN (${placeholders})
              ORDER  BY v.surah_id, v.ayah_number
              LIMIT  ? OFFSET ?
            `, ...variants, PAGE_SIZE, offset);
        }
      } else {
        const base        = (mappedTag ?? tag).toUpperCase();
        const likePattern = base.endsWith("_") ? `${base}%` : `${base}_%`;

        countRow = await dbGet<CountRow>(
          "SELECT COUNT(*) AS total FROM verse_tags WHERE ana_tema LIKE ?",
          likePattern
        );
        rows = await dbAll<TagFilterRow>(`
            SELECT v.verse_key, v.surah_id, v.ayah_number,
                   s.adi_turkce AS surah_name,
                   v.arabic_text, v.reading_tr,
                   COALESCE(yt.text, v.literal_ceviri, v.primary_translation) AS meal,
                   vt.ana_tema, vt.alt_taglar
            FROM   verse_tags vt
            JOIN   verses v ON v.verse_key = vt.verse_key
            JOIN   sureler s ON s.id = v.surah_id
            LEFT JOIN translations yt ON yt.verse_key = v.verse_key
                   AND (yt.source = 'yazir' OR yt.source LIKE '%#yazir')
            WHERE  vt.ana_tema LIKE ?
            ORDER  BY v.surah_id, v.ayah_number
            LIMIT  ? OFFSET ?
          `, likePattern, PAGE_SIZE, offset);
      }

    } else {
      // verse_tag_items junction tablosu — json_each full scan yerine index lookup
      tagType = "alt_tag";
      const needles = [
        ...new Set(
          getThemeCodeVariants(tag).map((code) => code.toLocaleLowerCase("tr-TR"))
        ),
      ];

      if (needles.length === 0) {
        countRow = { total: 0 };
        rows = [];
      } else {
        const placeholders = needles.map(() => "?").join(", ");

        countRow = await dbGet<CountRow>(`
            SELECT COUNT(*) AS total
            FROM   verse_tag_items
            WHERE  tag IN (${placeholders})
          `, ...needles);
        rows = await dbAll<TagFilterRow>(`
            SELECT v.verse_key, v.surah_id, v.ayah_number,
                   s.adi_turkce AS surah_name,
                   v.arabic_text, v.reading_tr,
                   COALESCE(yt.text, v.literal_ceviri, v.primary_translation) AS meal,
                   vt.ana_tema, vt.alt_taglar
            FROM   verse_tag_items vi
            JOIN   verses v ON v.verse_key = vi.verse_key
            JOIN   sureler s ON s.id = v.surah_id
            JOIN   verse_tags vt ON vt.verse_key = vi.verse_key
            LEFT JOIN translations yt ON yt.verse_key = v.verse_key
                   AND (yt.source = 'yazir' OR yt.source LIKE '%#yazir')
            WHERE  vi.tag IN (${placeholders})
            ORDER  BY v.surah_id, v.ayah_number
            LIMIT  ? OFFSET ?
          `, ...needles, PAGE_SIZE, offset);
      }
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
        arabic_text: r.arabic_text,
        reading_tr:  r.reading_tr,
        meal:        cleanMealText(r.meal),
        ana_tema:    r.ana_tema,
        alt_taglar: (() => {
          try { return r.alt_taglar ? JSON.parse(r.alt_taglar) as string[] : []; }
          catch { return []; }
        })(),
      })),
    }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });

  } catch (err) {
    console.error("[tags/filter] hata:", err);
    return NextResponse.json({ type: "error", message: "Sunucu hatası" }, { status: 500 });
  }
}
