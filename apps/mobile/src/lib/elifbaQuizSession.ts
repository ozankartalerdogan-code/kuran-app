import type { ElifbaSrsMap } from "./elifbaProgress";

export type QuizQuestion = {
  quiz_id: number;
  lesson_id: number;
  soru: string;
  exerciseArabic?: string;
  secenekler: string[];
  dogru_cevap: string;
  ipucu: string | null;
  zorluk: number;
};

export type AnswerState = {
  answeredIds: number[];
  score: number;
  srs: ElifbaSrsMap;
};

export function normalizeQuizQuestions(pool: readonly QuizQuestion[]): QuizQuestion[] {
  return pool
    .map((soru) => {
      const secenekler = Array.isArray(soru.secenekler)
        ? soru.secenekler.filter(
            (secenek): secenek is string =>
              typeof secenek === "string" && secenek.trim().length > 0,
          )
        : [];
      const uniqueSecenekler = Array.from(new Set(secenekler));
      if (
        !soru.soru ||
        !soru.dogru_cevap ||
        uniqueSecenekler.length < 2 ||
        !uniqueSecenekler.includes(soru.dogru_cevap)
      ) {
        return null;
      }
      return { ...soru, secenekler: uniqueSecenekler };
    })
    .filter((soru): soru is QuizQuestion => soru !== null);
}

export function answerOnce(
  state: AnswerState,
  q: QuizQuestion,
  answer: string,
  nowSec: number,
  updateSrs: (
    map: ElifbaSrsMap,
    id: string,
    correct: boolean,
    ts: number,
  ) => ElifbaSrsMap,
): AnswerState {
  if (state.answeredIds.includes(q.quiz_id)) return state;
  if (!q.secenekler.includes(answer)) return state;

  const correct = answer === q.dogru_cevap;
  return {
    answeredIds: [...state.answeredIds, q.quiz_id],
    score: state.score + (correct ? 1 : 0),
    srs: updateSrs(state.srs, `q:${q.quiz_id}`, correct, nowSec),
  };
}
