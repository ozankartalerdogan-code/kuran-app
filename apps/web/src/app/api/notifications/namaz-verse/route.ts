export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { dbGet } from "../../../../lib/dbUtils";
import { cleanMealText } from "../../../../lib/cleanMeal";

interface NamazVerseRow {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  arabic_text: string | null;
  primary_translation: string | null;
  yazir_text: string | null;
}

export type NamazVerseResponse = {
  vakit: string | null;
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  arabic_text: string | null;
  translation: string | null;
};

function randomOffset(total: number): number {
  return total > 1 ? Math.floor(Math.random() * total) : 0;
}

export async function GET(req: NextRequest) {
  const vakit = req.nextUrl.searchParams.get("vakit")?.toLocaleLowerCase("tr") ?? null;

  let vakitTags: string[] = [];
  if (vakit === "sabah") {
    vakitTags = ["sabır", "huşu", "fecr", "sabah", "dua"];
  } else if (vakit === "cuma") {
    vakitTags = ["cuma", "cemaat"];
  }

  let verse: NamazVerseRow | undefined;

  // Aşama 1: Vakit-spesifik — verse_tag_items üzerinden index lookup (LIKE yerine)
  if (vakitTags.length > 0) {
    const inPlaceholders = vakitTags.map(() => "?").join(",");

    const countRow = await dbGet<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM verse_tag_items ti_namaz
       WHERE ti_namaz.tag = 'namaz'
         AND EXISTS (
           SELECT 1 FROM verse_tag_items ti_vakit
           WHERE ti_vakit.verse_key = ti_namaz.verse_key
             AND ti_vakit.tag IN (${inPlaceholders})
         )`,
      ...vakitTags,
    );
    const total = countRow?.total ?? 0;

    if (total > 0) {
      verse = await dbGet<NamazVerseRow>(
        `SELECT v.verse_key, v.surah_id, v.ayah_number, v.arabic_text, v.primary_translation,
                MAX(CASE WHEN (yt.source = 'yazir' OR yt.source LIKE '%#yazir') THEN yt.text END) AS yazir_text
         FROM verse_tag_items ti_namaz
         JOIN verses v ON v.verse_key = ti_namaz.verse_key
         LEFT JOIN translations yt ON yt.verse_key = v.verse_key
         WHERE ti_namaz.tag = 'namaz'
           AND EXISTS (
             SELECT 1 FROM verse_tag_items ti_vakit
             WHERE ti_vakit.verse_key = ti_namaz.verse_key
               AND ti_vakit.tag IN (${inPlaceholders})
           )
         GROUP BY v.verse_key
         ORDER BY ti_namaz.verse_key
         LIMIT 1 OFFSET ?`,
        ...vakitTags, randomOffset(total),
      );
    }
  }

  // Aşama 2: Fallback — tüm namaz etiketli ayetler
  if (!verse) {
    const countRow = await dbGet<{ total: number }>(
      `SELECT COUNT(*) AS total FROM verse_tag_items WHERE tag = 'namaz'`,
    );
    const total = countRow?.total ?? 0;

    verse = await dbGet<NamazVerseRow>(
      `SELECT v.verse_key, v.surah_id, v.ayah_number, v.arabic_text, v.primary_translation,
              MAX(CASE WHEN (yt.source = 'yazir' OR yt.source LIKE '%#yazir') THEN yt.text END) AS yazir_text
       FROM verse_tag_items ti
       JOIN verses v ON v.verse_key = ti.verse_key
       LEFT JOIN translations yt ON yt.verse_key = v.verse_key
       WHERE ti.tag = 'namaz'
       GROUP BY v.verse_key
       ORDER BY ti.verse_key
       LIMIT 1 OFFSET ?`,
      randomOffset(total),
    );
  }

  if (!verse) {
    return NextResponse.json({ error: "Namaz temalı ayet bulunamadı" }, { status: 404 });
  }

  const translationText = cleanMealText(verse.yazir_text ?? verse.primary_translation);

  const body: NamazVerseResponse = {
    vakit,
    verse_key: verse.verse_key,
    surah_id: verse.surah_id,
    ayah_number: verse.ayah_number,
    arabic_text: verse.arabic_text,
    translation: translationText,
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
