type SlotRedis = {
  set(key: string, value: string, options: { nx: true; ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

export async function acquireDiyanetSlot(
  redis: SlotRedis | null,
  limiter: { limit(key: string): Promise<{ success: boolean; reason?: string }> } | null,
  cityId: number,
  startYmd: string,
): Promise<boolean | (() => Promise<void>)> {
  if (!redis || !limiter) return true; // Local development without Redis.

  const lockKey = `diyanet:lock:${cityId}:${startYmd}`;
  try {
    const locked = await redis.set(lockKey, "1", { nx: true, ex: 15 });
    if (!locked) return false;

    const result = await limiter.limit("global");
    if (!result.success || result.reason === "timeout") {
      await redis.del(lockKey).catch(() => undefined);
      return false;
    }

    return async () => {
      await redis.del(lockKey).catch(() => undefined);
    };
  } catch {
    // An unverified shared budget must never authorize an upstream call.
    // Any acquired lock expires after 15 seconds.
    return false;
  }
}
