import { useState, useEffect, useCallback } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

type StreakData = {
  lastDate:   string | null; // "YYYY-MM-DD"
  current:    number;
  longest:    number;
};

export interface UseStreakResult {
  streak: StreakData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT: StreakData = { lastDate: null, current: 0, longest: 0 };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000,
  );
}

/** Geçerli bir StreakData objesi mi? */
function isValidStreakData(data: unknown): data is StreakData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    (d.lastDate === null || typeof d.lastDate === "string") &&
    typeof d.current === "number" &&
    typeof d.longest === "number"
  );
}

export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState<StreakData>(DEFAULT);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await storage.getJSON<StreakData>(STORAGE_KEYS.streak, DEFAULT);
      // undefined/null tutarlılığı
      const safe: StreakData = isValidStreakData(saved)
        ? saved
        : DEFAULT;
      const today = todayStr();

      let next: StreakData;

      if (!safe.lastDate) {
        next = { lastDate: today, current: 1, longest: 1 };
      } else if (safe.lastDate === today) {
        next = safe;
      } else {
        const diff = diffDays(safe.lastDate, today);
        if (diff === 1) {
          const current = safe.current + 1;
          next = {
            lastDate: today,
            current,
            longest: Math.max(current, safe.longest),
          };
        } else {
          next = {
            lastDate: today,
            current: 1,
            longest: safe.longest,
          };
        }
      }

      await storage.setJSON(STORAGE_KEYS.streak, next);
      setStreak(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Streak yüklenemedi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    compute();
  }, [compute]);

  const refresh = useCallback(async () => {
    await compute();
  }, [compute]);

  return { streak, loading, error, refresh };
}
