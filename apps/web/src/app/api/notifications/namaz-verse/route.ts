export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet } from "../../../../lib/dbUtils";
import { cleanMealText } from "../../../../lib/cleanMeal";

interface NamazVerseRow {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  arabic_text: string | null;
  primary_translation: string | null;
}

interface TranslationRow {
  source: string;
  text: string | null;
}

export type NamazVerseResponse = {
  vakit: string | null;
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  arabic_text: string | null;
  translation: string | null;
};

export async function GET(req: NextRequest) {
  const vakit = req.nextUrl.searchParams.get("vakit")?.toLocaleLowerCase("tr") ?? null;

  const baseWhere = `(t.ana_tema = 'namaz' OR t.alt_taglar LIKE '%namaz%')`;

  // Vakit-specific alt_tag önceliklendirme
  let vakitTags: string[] = [];
  if (vakit === "sabah") {
    vakitTags = ["sabır", "huşu", "fecr", "sabah", "dua"];
  } else if (vakit === "cuma") {
    vakitTags = ["cuma", "cemaat"];
  }

  let verse: NamazVerseRow | undefined;

  // Aşama 1: Vakit-spesifik etiketlerle daraltılmış havuz
  if (vakitTags.length > 0) {
    const likeConditions = vakitTags.map(() => `t.alt_taglar LIKE ?`).join(" OR ");
    verse = await dbGet<NamazVerseRow>(
      `SELECT v.verse_key, v.surah_id, v.ayah_number, v.arabic_text, v.primary_translation
       FROM verses v
       LEFT JOIN verse_tags t ON v.verse_key = t.verse_key
       WHERE ${baseWhere} AND (${likeConditions})
       ORDER BY RANDOM()
       LIMIT 1`,
      ...vakitTags.map((tag) => `%${tag}%`),
    );
  }

  // Aşama 2: Fallback — vakit-spesifik eşleşme yoksa veya vakit parametresi gelmediyse temel namaz havuzu
  if (!verse) {
    verse = await dbGet<NamazVerseRow>(
      `SELECT v.verse_key, v.surah_id, v.ayah_number, v.arabic_text, v.primary_translation
       FROM verses v
       LEFT JOIN verse_tags t ON v.verse_key = t.verse_key
       WHERE ${baseWhere}
       ORDER BY RANDOM()
       LIMIT 1`,
    );
  }

  if (!verse) {
    return NextResponse.json({ error: "Namaz temalı ayet bulunamadı" }, { status: 404 });
  }

  // Translation: Yazır öncelikli, yoksa primary_translation
  const translationRows = await dbAll<TranslationRow>(
    `SELECT source, text FROM translations
     WHERE verse_key = ?
     AND (source = 'yazir' OR source LIKE '%#yazir')`,
    verse.verse_key,
  );

  const yazirRow = translationRows.find(
    (t) => (t.source ?? "").split("#").at(-1) === "yazir",
  );
  const translationText = cleanMealText(yazirRow?.text ?? verse.primary_translation);

  const body: NamazVerseResponse = {
    vakit,
    verse_key: verse.verse_key,
    surah_id: verse.surah_id,
    ayah_number: verse.ayah_number,
    arabic_text: verse.arabic_text,
    translation: translationText,
  };

  return NextResponse.json(body, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}