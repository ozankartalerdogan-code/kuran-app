export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { dbAll, dbGet } from "../../../../lib/dbUtils";
import type { RootDetail } from "../../../../types/rootDetail";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ root: string }> }
): Promise<NextResponse<RootDetail | { error: string }>> {
  const { root: encodedRoot } = await params;
  const root = decodeURIComponent(encodedRoot);

  try {
    const rootInfo = await dbGet<{ root: string; meaning_tr: string }>(
      "SELECT root, meaning_tr FROM root_meanings WHERE root = ?",
      root
    );

    if (!rootInfo) {
      return NextResponse.json({ error: "Root not found" }, { status: 404 });
    }

    const distRows = await dbAll<{ surah_id: number; count: number }>(`
      SELECT CAST(SUBSTR(verse_key, 1, INSTR(verse_key, ':') - 1) AS INTEGER) AS surah_id,
             COUNT(*) AS count
      FROM   words
      WHERE  root = ?
      GROUP  BY surah_id`, root);

    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 114; i++) distribution[i] = 0;
    for (const row of distRows) distribution[row.surah_id] = row.count;

    const derivedRows = await dbAll<{
      arabic:     string;
      meaning_tr: string | null;
      verse_key:  string;
    }>(`
      SELECT DISTINCT arabic, meaning_tr, verse_key
      FROM   words
      WHERE  root = ?
      ORDER  BY arabic, verse_key
      LIMIT  200`, root);

    const derivedWords = derivedRows.map((row) => {
      const [s, a] = (row.verse_key ?? "1:1").split(":").map(Number);
      return { word: row.arabic, meaning: row.meaning_tr ?? "", surahId: s, ayahNumber: a };
    });

    return NextResponse.json({
      root: rootInfo.root,
      meaningTr: rootInfo.meaning_tr,
      distribution,
      derivedWords,
    });
  } catch (err) {
    console.error("[root] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}