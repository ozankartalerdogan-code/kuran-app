export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { dbAll, dbGet, dbRun } from "../../../lib/dbUtils";
import type { RootItem } from "../../../types/root";

export async function GET(): Promise<NextResponse<{ roots: RootItem[] }>> {

  const rows = await dbAll<RootItem>(`
      SELECT r.root, r.meaning_tr, COUNT(w.id) as frequency
      FROM root_meanings r
      LEFT JOIN words w ON w.root = r.root
      GROUP BY r.root
      ORDER BY frequency DESC
      LIMIT 200
    `);

  return NextResponse.json({ roots: rows });
}