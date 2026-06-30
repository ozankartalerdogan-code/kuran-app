import { NextRequest, NextResponse } from "next/server";
import { dbAll } from "../../../lib/dbUtils";

export const dynamic = "force-dynamic";

interface VerseRow {
  verse_key:           string;
  surah_id:            number;
  ayah_number:         number;
  primary_translation: string | null;
  arabic_text:         string | null;
  reading_tr:          string | null;
  temalar:             string | null;
  adi_turkce:          string | null;
}

const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;
const BATCH_SIZE = 200;

export async function GET(req: NextRequest) {
  const keysParam = req.nextUrl.searchParams.get("keys") ?? "";
  const keys = keysParam
    .split(",")
    .map((k) => k.trim())
    .filter((k) => VERSE_KEY_RE.test(k));

  if (keys.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const rows: VerseRow[] = [];

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => "?").join(",");
      const batchRows = await dbAll<VerseRow>(
        `SELECT v.verse_key, v.surah_id, v.ayah_number, v.primary_translation,
                v.arabic_text, v.reading_tr, v.temalar, s.adi_turkce
         FROM verses v
         LEFT JOIN sureler s ON s.id = v.surah_id
         WHERE v.verse_key IN (${placeholders})`,
        ...batch
      );
      rows.push(...batchRows);
    }

    const resultMap = new Map(
      rows.map((row) => {
        let tagArr: string[] = [];
        try { tagArr = JSON.parse(row.temalar ?? "[]") as string[]; }
        catch { /* ignore */ }
        return [
          row.verse_key,
          {
            verse_key:   row.verse_key,
            surah_id:    row.surah_id,
            ayah_number: row.ayah_number,
            surah_name:  row.adi_turkce,
            arabic_text: row.arabic_text,
            reading_tr:  row.reading_tr,
            meal:        row.primary_translation,
            ana_tema:    tagArr[0] ?? null,
            alt_taglar:  tagArr.slice(1),
          },
        ];
      })
    );

    const ordered = keys.map((k) => resultMap.get(k)).filter(Boolean);
    return NextResponse.json(ordered);
  } catch (err) {
    console.error("[favorites-verses] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
