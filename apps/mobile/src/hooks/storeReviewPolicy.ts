export const REVIEW_WAIT_MS = 3_000;
export const REVIEW_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export function parseLastAsked(raw: string | null | undefined, nowMs: number): number | null {
  if (raw == null || raw.trim() === '') return null;
  if (raw === 'true') return nowMs;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function shouldRequestReview(c: {
  opens: number; rated: boolean; lastAskedMs: number | null; nowMs: number;
  completed: boolean; eligible: boolean; waitedMs: number;
}): boolean {
  return c.opens >= 3 && !c.rated && c.completed && c.eligible && c.waitedMs >= REVIEW_WAIT_MS
    && (c.lastAskedMs === null || !Number.isFinite(c.lastAskedMs)
      || c.nowMs < c.lastAskedMs || c.nowMs - c.lastAskedMs >= REVIEW_INTERVAL_MS);
}

// Tamamlanma fırsatı yalnız sonuç ekranı açıkken geçerlidir; sonradan kuyruğa alınmaz.
const listeners = new Set<() => () => void>();
export function subscribeReviewCompletion(listener: () => () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyReviewCompletion() {
  const cleanups = [...listeners].map(listener => listener());
  return () => cleanups.forEach(cleanup => cleanup());
}

export function isStreakReviewMoment(
  prev: { lastDate: string | null; current: number },
  next: { lastDate: string | null; current: number },
): boolean {
  return prev.lastDate !== null && prev.lastDate !== next.lastDate
    && next.current === prev.current + 1 && next.current >= 3;
}
