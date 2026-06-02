export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll } from "../../../../lib/dbUtils";

interface TafsirRow { content: string | null }

export async function GET(
  _req: NextRequest,
  { params }: { params: { surahId: string } }
): Promise<NextResponse> {
  const id = parseInt(params.surahId, 10);
  if (!Number.isFinite(id) || id < 1 || id > 114) {
    return NextResponse.json({ content: null }, { status: 400 });
  }

  const row = await dbGet<TafsirRow>(
    "SELECT content FROM surah_tafsir WHERE surah_id = ? AND source = 'elmalili' LIMIT 1",
    id
  );

  return NextResponse.json(
    { content: row?.content ?? null },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } }
  );
}
