export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { dbGet } from "../../../../lib/dbUtils";
import { SIMPLIFIED_TAFSIR } from "../simplifiedContent";

interface TafsirRow { content: string | null }
type TafsirMode = "original" | "simplified";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surahId: string }> }
): Promise<NextResponse> {
  const { surahId } = await params;
  const id = parseInt(surahId, 10);
  if (!Number.isFinite(id) || id < 1 || id > 114) {
    return NextResponse.json({ content: null, simplifiedContent: null, availableModes: ["original"] }, { status: 400 });
  }

  try {
    const row = await dbGet<TafsirRow>(
      "SELECT content FROM surah_tafsir WHERE surah_id = ? AND source = 'elmalili' LIMIT 1",
      id
    );
    const simplifiedContent = SIMPLIFIED_TAFSIR[id] ?? null;
    const availableModes: TafsirMode[] = simplifiedContent
      ? ["original", "simplified"]
      : ["original"];

    return NextResponse.json(
      {
        content: row?.content ?? null,
        simplifiedContent,
        availableModes,
      },
      {
        headers: {
          // tefsir statik (Elmalili) - agresif CDN edge cache
          "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[tafsir] hata:", err);
    return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  }
}