import { NextRequest, NextResponse } from "next/server";
import { getApiDb } from "../../../lib/dbUtils";

export const dynamic = "force-dynamic";

interface VerseRow {
  verse_key: string;
  surah_id: number;
  ayah_number: number;
  primary_translation: string | null;
  temalar: string | null;
  adi_turkce: string | null;
}

const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;

export async function GET(req: NextRequest) {
  const keysParam = req.nextUrl.searchParams.get("keys") ?? "";
  const keys = keysParam
    .split(",")
    .map((k) => k.trim())
    .filter((k) => VERSE_KEY_RE.test(k))
    .slice(0, 100);

  if (keys.length === 0) {
    return NextResponse.json([]);
  }

  const placeholders = keys.map(() => "?").join(",");
  const db = getApiDb();

  const rows = db
    .prepare(
      `SELECT v.verse_key, v.surah_id, v.ayah_number, v.primary_translation, v.temalar,
              s.adi_turkce
       FROM verses v
       LEFT JOIN sureler s ON s.id = v.surah_id
       WHERE v.verse_key IN (${placeholders})`
    )
    .all(...keys) as unknown as VerseRow[];

  const resultMap = new Map(
    rows.map((row) => {
      let tagArr: string[] = [];
      try {
        tagArr = JSON.parse(row.temalar ?? "[]") as string[];
      } catch { /* ignore */ }

      return [
        row.verse_key,
        {
          verse_key:   row.verse_key,
          surah_id:    row.surah_id,
          ayah_number: row.ayah_number,
          surah_name:  row.adi_turkce,
          meal:        row.primary_translation,
          ana_tema:    tagArr[0] ?? null,
          alt_taglar:  tagArr.slice(1),
        },
      ];
    })
  );

  const ordered = keys.map((k) => resultMap.get(k)).filter(Boolean);
  return NextResponse.json(ordered);
}
