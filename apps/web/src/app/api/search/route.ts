import { DatabaseSync } from "node:sqlite";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import type { SearchResponse } from "./search-types";
import { dbAll } from "../../../lib/dbUtils";

export type { SearchResponse };

const dbPath = path.join(process.cwd(), "..", "..", "data", "app.db");

interface SurahRow {
  id: number;
  adi_turkce: string;
  adi_arapca: string;
}

function normalizeTurkish(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/ı/gu, "i")
    .trim();
}

function findSurahMatch(q: string, surahs: SurahRow[]): SurahRow | null {
  const norm = normalizeTurkish(q);

  for (const s of surahs) {
    if (normalizeTurkish(s.adi_turkce) === norm) return s;
  }

  for (const s of surahs) {
    if (normalizeTurkish(s.adi_turkce).startsWith(norm)) return s;
  }

  for (const s of surahs) {
    if (s.adi_arapca.includes(q)) return s;
  }

  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  if (q.length < 3) {
    return NextResponse.json({ type: "none" });
  }

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const allSurahs = dbAll<SurahRow>(
      db.prepare("SELECT id, adi_turkce, adi_arapca FROM sureler ORDER BY id")
    );
    db.close();

    const match = findSurahMatch(q, allSurahs);

    if (match) {
      return NextResponse.json({ type: "surah", surahId: match.id, surahName: match.adi_turkce });
    }

    return NextResponse.json({ type: "none" });
  } catch (err) {
    console.error("[search] hata:", err, "| dbPath:", dbPath, "| q:", q);
    return NextResponse.json({ type: "none" });
  }
}
