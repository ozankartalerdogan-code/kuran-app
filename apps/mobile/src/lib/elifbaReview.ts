import type {
  ElifbaLessonBadge,
  ElifbaQuizScore,
  ElifbaSrsMap,
} from "./elifbaProgress";

export type LessonBadgeComputer = (
  score: number,
  total: number,
  box1Count: number,
) => ElifbaLessonBadge;

export function indexLessonQuestions(
  pools: readonly (readonly { quiz_id: number; lesson_id: number }[])[],
): Record<string, number> {
  const catalog: Record<string, number> = {};
  const conflicts = new Set<string>();

  for (const pool of pools) {
    for (const question of pool) {
      const key = `q:${question.quiz_id}`;
      const knownLesson = catalog[key];
      if (knownLesson === undefined) {
        catalog[key] = question.lesson_id;
      } else if (knownLesson !== question.lesson_id) {
        conflicts.add(key);
      }
    }
  }

  for (const key of conflicts) delete catalog[key];
  return catalog;
}

export function countLessonWrong(
  srs: ElifbaSrsMap,
  catalog: Record<string, number>,
  lessonId: number,
): number {
  let count = 0;
  for (const [key, indexedLesson] of Object.entries(catalog)) {
    if (indexedLesson !== lessonId) continue;
    if (srs[key]?.box === 1) count += 1;
  }
  return count;
}

function shuffleCopy<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function selectWrongReview<T extends { quiz_id: number }>(
  pool: readonly T[],
  srs: ElifbaSrsMap,
  count: number,
  rng: () => number,
): T[] {
  if (count <= 0) return [];

  const seen = new Set<number>();
  const box1: T[] = [];
  for (const item of pool) {
    if (seen.has(item.quiz_id)) continue;
    seen.add(item.quiz_id);
    if (srs[`q:${item.quiz_id}`]?.box === 1) box1.push(item);
  }

  return shuffleCopy(box1, rng).slice(0, count);
}

export function resolveLessonBadge(
  score: ElifbaQuizScore | null | undefined,
  box1Count: number,
  catalogComplete: boolean,
  computeBadge: LessonBadgeComputer,
): ElifbaLessonBadge {
  if (!score) return "none";
  const badge = computeBadge(score.score, score.total, box1Count);
  if (!catalogComplete && badge === "crown") return "master";
  return badge;
}
