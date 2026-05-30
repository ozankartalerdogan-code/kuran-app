export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { dbGet } from "../../../../lib/dbUtils";

interface RandomVerseRow {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  arabic_text: string | null;
  meal:        string | null;
}

export interface MoodRandomResponse {
  verse_key:   string;
  surah_id:    number;
  ayah_number: number;
  surah_name:  string | null;
  arabic_text: string | null;
  meal:        string | null;
}

export type MoodRandomError = { error: string };

/**
 * GET /api/mood/random?tag=sabır
 * GET /api/mood/random?tag=D1_AILE_HUKUKU&exclude=2:286,3:1
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<MoodRandomResponse | MoodRandomError>> {
  const params  = new URL(req.url).searchParams;
  const tag     = params.get("tag")?.trim() ?? "";
  const exclude = params.get("exclude") ?? "";

  if (!tag || tag.length > 100) {
    return NextResponse.json({ error: "tag parametresi gerekli" }, {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const excludeKeys = exclude
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 20);


  try {
    const isAnaTema =
      /^[A-G]\d_/i.test(tag) ||
      (await dbGet("SELECT 1 FROM verse_tags WHERE ana_tema = ? LIMIT 1", tag.toUpperCase())) !== undefined;

    const placeholders = excludeKeys.length
      ? `AND v.verse_key NOT IN (${excludeKeys.map(() => "?").join(",")})`
      : "";

    let row: RandomVerseRow | undefined;

    if (isAnaTema) {
      const upper       = tag.toUpperCase();
      const isExact     = upper.includes("_") && !upper.endsWith("_");
      const likePattern = upper.endsWith("_") ? `${upper}%` : isExact ? upper : `${upper}_%`;
      const cmp         = isExact ? "= ?" : "LIKE ?";
      const bindVal     = isExact ? upper : likePattern;

      row = await dbGet<RandomVerseRow>(`
          SELECT v.verse_key, v.surah_id, v.ayah_number,
                 s.adi_turkce AS surah_name,
                 v.arabic_text,
                 v.primary_translation AS meal
          FROM   verse_tags vt
          JOIN   verses  v  ON v.verse_key = vt.verse_key
          JOIN   sureler s  ON s.id = v.surah_id
          WHERE  vt.ana_tema ${cmp}
          ${placeholders}
          ORDER  BY RANDOM()
          LIMIT  1
        `, bindVal,
        ...excludeKeys);
    } else {
      const needle = tag.toLocaleLowerCase("tr-TR");

      row = await dbGet<RandomVerseRow>(`
          SELECT v.verse_key, v.surah_id, v.ayah_number,
                 s.adi_turkce AS surah_name,
                 v.arabic_text,
                 v.primary_translation AS meal
          FROM   verse_tag_items vi
          JOIN   verses  v  ON v.verse_key = vi.verse_key
          JOIN   sureler s  ON s.id = v.surah_id
          WHERE  vi.tag = ?
          ${placeholders}
          ORDER  BY RANDOM()
          LIMIT  1
        `, needle,
        ...excludeKeys);
    }

    if (!row) {
      return NextResponse.json({ error: "Bu etiket için ayet bulunamadı" }, {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
    }

    return NextResponse.json({
      verse_key:   row.verse_key,
      surah_id:    row.surah_id,
      ayah_number: row.ayah_number,
      surah_name:  row.surah_name,
      arabic_text: row.arabic_text,
      meal:        row.meal,
    }, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("[mood/random] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
