export const API_LIMIT = 200;
const WINDOW_MS = 60_000;
const MAX_ENTRIES = 5000;

type LimitResult = {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
  reason?: string;
};

/** Per-instance safety net; Redis remains the shared production limiter. */
export function createApiRateLimit(
  redis: { limit(ip: string): Promise<LimitResult> } | null,
  now = Date.now,
) {
  const entries = new Map<string, { count: number; reset: number }>();

  function fallback(ip: string): LimitResult {
    const time = now();
    let entry = entries.get(ip);
    if (!entry || time >= entry.reset) {
      if (!entry && entries.size >= MAX_ENTRIES) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      entry = { count: 0, reset: time + WINDOW_MS };
      entries.set(ip, entry);
    }
    const success = entry.count < API_LIMIT;
    if (success) entry.count++;
    return {
      success,
      limit: API_LIMIT,
      reset: entry.reset,
      remaining: API_LIMIT - entry.count,
    };
  }

  return async (ip: string): Promise<LimitResult> => {
    if (redis) {
      try {
        const result = await redis.limit(ip);
        if (result.reason !== "timeout") return result;
      } catch {
        // Do not log Redis errors: they may contain credentials or request data.
      }
    }
    return fallback(ip);
  };
}
