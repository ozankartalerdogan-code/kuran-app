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

export type ElifbaSrsBox = 1 | 2 | 3;
export type ElifbaSrsEntry = { box: ElifbaSrsBox; wrong: number; lastTs: number };
export type ElifbaSrsMap = Record<string, ElifbaSrsEntry>;
export type ElifbaLessonBadge = "none" | "pass" | "master" | "crown";

const SRS_KEY_PATTERN = /^[A-Za-z0-9:_-]+$/;
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isValidSrsKey(key: string): boolean {
  return key.length > 0 && key.length <= 64 && SRS_KEY_PATTERN.test(key) && !UNSAFE_KEYS.has(key);
}

function toNonNegativeRounded(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

export function parseElifbaSrs(raw: unknown): ElifbaSrsMap {
  if (!isPlainObject(raw)) return {};

  const result: ElifbaSrsMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isValidSrsKey(key) || !isPlainObject(value)) continue;

    const box = value.box;
    if (box !== 1 && box !== 2 && box !== 3) continue;

    result[key] = {
      box,
      wrong: toNonNegativeRounded(value.wrong),
      lastTs: toNonNegativeRounded(value.lastTs),
    };
  }

  return result;
}

export function updateElifbaSrs(
  map: ElifbaSrsMap,
  itemId: string,
  isCorrect: boolean,
  nowSec: number,
): ElifbaSrsMap {
  const next: ElifbaSrsMap = { ...map };
  const prev = map[itemId];

  if (isCorrect) {
    if (!prev) return next;
    next[itemId] = {
      box: Math.min(prev.box + 1, 3) as ElifbaSrsBox,
      wrong: prev.wrong,
      lastTs: nowSec,
    };
    return next;
  }

  next[itemId] = {
    box: 1,
    wrong: (prev?.wrong ?? 0) + 1,
    lastTs: nowSec,
  };
  return next;
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

export function selectQuizQuestionsWithSrs<T extends { quiz_id: number }>(
  pool: T[],
  srs: ElifbaSrsMap,
  count: number,
  rng: () => number = Math.random,
): T[] {
  if (count <= 0) return [];

  const seenIds = new Set<number>();
  const unique: T[] = [];
  for (const item of pool) {
    if (seenIds.has(item.quiz_id)) continue;
    seenIds.add(item.quiz_id);
    unique.push(item);
  }

  if (unique.length <= count) return shuffleCopy(unique, rng);

  const box1: T[] = [];
  const box2: T[] = [];
  for (const item of unique) {
    const box = srs[`q:${item.quiz_id}`]?.box;
    if (box === 1) box1.push(item);
    else if (box === 2) box2.push(item);
  }

  const picked: T[] = [];
  picked.push(...shuffleCopy(box1, rng).slice(0, 5));
  picked.push(...shuffleCopy(box2, rng).slice(0, 3));

  const pickedIds = new Set(picked.map((item) => item.quiz_id));
  const rest = shuffleCopy(
    unique.filter((item) => {
      const box = srs[`q:${item.quiz_id}`]?.box;
      return box !== 1 && box !== 2;
    }),
    rng,
  );

  for (const item of rest) {
    if (picked.length >= count) break;
    picked.push(item);
    pickedIds.add(item.quiz_id);
  }

  if (picked.length < count) {
    const fallback = shuffleCopy(
      unique.filter((item) => !pickedIds.has(item.quiz_id)),
      rng,
    );
    for (const item of fallback) {
      if (picked.length >= count) break;
      if (pickedIds.has(item.quiz_id)) continue;
      picked.push(item);
      pickedIds.add(item.quiz_id);
    }
  }

  return shuffleCopy(picked.slice(0, count), rng);
}

export function computeLessonBadge(score: number, total: number, box1Count: number): ElifbaLessonBadge {
  if (
    !Number.isFinite(score) ||
    !Number.isFinite(total) ||
    !Number.isFinite(box1Count) ||
    total <= 0
  ) {
    return "none";
  }

  const s = (score * 15) / total;
  if (s < 10) return "none";
  if (s < 13) return "pass";
  if (s < 15) return "master";
  return box1Count === 0 ? "crown" : "master";
}
