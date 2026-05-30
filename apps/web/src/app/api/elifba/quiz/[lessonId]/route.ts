export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { dbAll } from "../../../../../lib/dbUtils";

type QuizRow = {
  quiz_id:     number;
  lesson_id:   number;
  soru_tipi:   string;
  soru:        string;
  secenekler:  string;
  dogru_cevap: string;
  ipucu:       string | null;
  zorluk:      number;
};

export type QuizSoru = Omit<QuizRow, "secenekler"> & { secenekler: string[] };

export async function GET(
  _req: Request,
  { params }: { params: { lessonId: string } },
) {
  const lessonId = Number(params.lessonId);
  if (!Number.isInteger(lessonId) || lessonId < 1)
    return NextResponse.json({ error: "Geçersiz ders ID" }, { status: 400 });

  const rows = await dbAll<QuizRow>(
    "SELECT quiz_id, lesson_id, soru_tipi, soru, secenekler, dogru_cevap, ipucu, zorluk FROM elifba_quiz WHERE lesson_id = ? ORDER BY quiz_id",
    lessonId,
  );

  const parsed: QuizSoru[] = rows.map((r) => {
    let secenekler: string[] = [];
    try { secenekler = JSON.parse(r.secenekler) as string[]; }
    catch { secenekler = []; }
    return { ...r, secenekler };
  });

  return NextResponse.json(parsed);
}
