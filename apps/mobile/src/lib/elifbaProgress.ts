export type ElifbaProgress = Record<string, number[]>;
export type ElifbaQuizScore = { score: number; total: number };
export type ElifbaQuizScores = Record<string, ElifbaQuizScore>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeStorageKey(key: string): boolean {
  return /^\d+$/.test(key);
}

export function parseElifbaProgress(raw: unknown): ElifbaProgress {
  if (!isPlainObject(raw)) return {};

  const progress: ElifbaProgress = {};
  for (const [lessonId, value] of Object.entries(raw)) {
    if (!isSafeStorageKey(lessonId) || !Array.isArray(value)) continue;

    const seenIds = value
      .filter((item): item is number => Number.isInteger(item) && item > 0)
      .filter((item, index, arr) => arr.indexOf(item) === index);

    if (seenIds.length > 0) progress[lessonId] = seenIds;
  }

  return progress;
}

export function parseElifbaQuizScores(raw: unknown): ElifbaQuizScores {
  if (!isPlainObject(raw)) return {};

  const scores: ElifbaQuizScores = {};
  for (const [lessonId, value] of Object.entries(raw)) {
    if (!isSafeStorageKey(lessonId) || !isPlainObject(value)) continue;

    const score = value.score;
    const total = value.total;
    if (
      Number.isFinite(score) &&
      Number.isFinite(total) &&
      typeof score === "number" &&
      typeof total === "number" &&
      score >= 0 &&
      total > 0
    ) {
      scores[lessonId] = {
        score: Math.min(Math.round(score), Math.round(total)),
        total: Math.round(total),
      };
    }
  }

  return scores;
}
