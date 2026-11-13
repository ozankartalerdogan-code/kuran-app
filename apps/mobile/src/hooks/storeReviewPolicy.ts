export const REVIEW_WAIT_MS = 12_000;

export function shouldRequestReview(c: {
  opens: number; asked: boolean; completed: boolean; eligible: boolean; waitedMs: number;
}): boolean {
  return c.opens >= 3 && !c.asked && c.completed && c.eligible && c.waitedMs >= REVIEW_WAIT_MS;
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
