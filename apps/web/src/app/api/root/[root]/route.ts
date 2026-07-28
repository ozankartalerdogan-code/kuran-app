export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getRootDetailFromDb } from "../../../../lib/getRootDetailFromDb";
import type { RootDetail } from "../../../../types/rootDetail";

export async function GET(
  _request: Request,
  { params }: { params: { root: string } }
): Promise<NextResponse<RootDetail | { error: string }>> {
  const { root: encodedRoot } = params;

  try {
    const root = decodeURIComponent(encodedRoot);
    const detail = await getRootDetailFromDb(root);

    if (!detail) {
      return NextResponse.json({ error: "Root not found" }, { status: 404 });
    }

    return NextResponse.json(detail, {
      headers: {
        // kök detayı statik — agresif CDN cache, her tıklamada ağır sorgu çalışmasın
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[root] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
