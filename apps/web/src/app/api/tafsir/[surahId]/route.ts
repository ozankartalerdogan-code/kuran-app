export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { dbGet } from "../../../../lib/dbUtils";

interface TafsirRow { content: string | null }

export async function GET(
  _req: NextRequest,
  { params }: { params: { surahId: string } }
): Promise<NextResponse> {
  const id = parseInt(params.surahId, 10);
  if (!Number.isFinite(id) || id < 1 || id > 114) {
    return NextResponse.json({ content: null }, { status: 400 });
  }

  try {
    const row = await dbGet<TafsirRow>(
      "SELECT content FROM surah_tafsir WHERE surah_id = ? AND source = 'elmalili' LIMIT 1",
      id
    );

    return NextResponse.json(
      { content: row?.content ?? null },
      {
        headers: {
          // tefsir statik (Elmalılı) — agresif CDN edge cache; max-age değil s-maxage paylaşımlı cache'i tetikler
          "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[tafsir] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
