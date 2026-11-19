export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { dbAll } from "../../../../lib/dbUtils";
import { mapLegacyCode } from "../../../../lib/themes";

interface ThemeCountRow {
  ana_tema: string;
  total: number;
}

export interface ThemeCountsResponse {
  counts: Record<string, number>;
}

export async function GET(): Promise<NextResponse<ThemeCountsResponse | { type: "error"; message: string }>> {
  try {
    const rows = await dbAll<ThemeCountRow>(`
      SELECT ana_tema, COUNT(*) AS total
      FROM   verse_tags
      WHERE  ana_tema IS NOT NULL
      GROUP  BY ana_tema
    `);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      const code = mapLegacyCode(row.ana_tema);
      if (code === null) continue;
      counts[code] = (counts[code] ?? 0) + Number(row.total);
    }

    return NextResponse.json({ counts }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[tags/counts] hata:", err);
    return NextResponse.json({ type: "error", message: "Sunucu hatası" }, { status: 500 });
  }
}
