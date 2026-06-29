export const dynamic = "force-dynamic";
export const preferredRegion = "fra1"; // DB (eu-west-1) + TR kullanıcılara yakın → düşük gecikme
import { NextResponse } from "next/server";
import { dbGet } from "../../../lib/dbUtils";
import { cleanMealText } from "../../../lib/cleanMeal";

function getDailyOffset(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const now  = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % total;
}

interface VerseRow {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  surah_name: string | null;
  arabic_text: string | null;
  reading_tr: string | null;
  meal: string | null;
}

export type DailyResponse = {
  verse: VerseRow | null;
  dua:   VerseRow | null;
};

export async function GET() {
  const [totalRow, duaTotalRow] = await Promise.all([
    dbGet<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM verses
       WHERE arabic_text IS NOT NULL AND reading_tr IS NOT NULL AND literal_ceviri IS NOT NULL`
    ).catch(() => undefined),
    dbGet<{ cnt: number }>(
      `SELECT COUNT(DISTINCT vti.verse_key) AS cnt
       FROM   verse_tag_items vti
       JOIN   verses v ON v.verse_key = vti.verse_key
       WHERE  vti.tag LIKE 'dua-%'
         AND  v.arabic_text IS NOT NULL
         AND  v.reading_tr  IS NOT NULL
         AND  v.literal_ceviri IS NOT NULL`
    ).catch(() => undefined),
  ]);

  const total    = totalRow?.cnt    ?? 4000;
  const duaTotal = duaTotalRow?.cnt ?? 255;
  const offset    = getDailyOffset(total);
  const duaOffset = getDailyOffset(duaTotal);

  const [verse, dua] = await Promise.all([
    dbGet<VerseRow>(
      `SELECT v.verse_key, v.surah_id, v.ayah_number,
              s.adi_turkce AS surah_name,
              v.arabic_text, v.reading_tr,
              COALESCE(yt.text, v.literal_ceviri, v.primary_translation) AS meal
       FROM   verses v
       JOIN   sureler s ON s.id = v.surah_id
       LEFT JOIN translations yt ON yt.verse_key = v.verse_key
              AND (yt.source = 'yazir' OR yt.source LIKE '%#yazir')
       WHERE  v.arabic_text IS NOT NULL AND v.reading_tr IS NOT NULL AND v.literal_ceviri IS NOT NULL
       ORDER  BY v.verse_key
       LIMIT 1 OFFSET ?`,
      offset
    ).catch(() => undefined),
    dbGet<VerseRow>(
      `SELECT vti.verse_key, v.surah_id, v.ayah_number,
              s.adi_turkce AS surah_name,
              v.arabic_text, v.reading_tr,
              COALESCE(yt.text, v.literal_ceviri, v.primary_translation) AS meal
       FROM   verse_tag_items vti
       JOIN   verses    v  ON v.verse_key = vti.verse_key
       LEFT JOIN sureler s ON s.id = v.surah_id
       LEFT JOIN translations yt ON yt.verse_key = v.verse_key
              AND (yt.source = 'yazir' OR yt.source LIKE '%#yazir')
       WHERE  vti.tag LIKE 'dua-%'
         AND  v.arabic_text IS NOT NULL
         AND  v.reading_tr  IS NOT NULL
         AND  v.literal_ceviri IS NOT NULL
       GROUP  BY vti.verse_key
       ORDER  BY vti.verse_key
       LIMIT  1 OFFSET ?`,
      duaOffset
    ).catch(() => undefined),
  ]);

  const body: DailyResponse = {
    verse: verse ? { ...verse, meal: cleanMealText(verse.meal) } : null,
    dua:   dua   ? { ...dua,   meal: cleanMealText(dua.meal)   } : null,
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
