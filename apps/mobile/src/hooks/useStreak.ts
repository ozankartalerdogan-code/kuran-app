import { useState, useEffect } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

type StreakData = {
  lastDate:   string | null; // "YYYY-MM-DD"
  current:    number;
  longest:    number;
};

const DEFAULT: StreakData = { lastDate: null, current: 0, longest: 0 };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000,
  );
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>(DEFAULT);

  useEffect(() => {
    (async () => {
      const saved = (await storage.getJSON<StreakData>(STORAGE_KEYS.streak)) ?? DEFAULT;
      const today  = todayStr();

      let next: StreakData;

      if (!saved.lastDate) {
        // İlk kez giriş
        next = { lastDate: today, current: 1, longest: 1 };
      } else if (saved.lastDate === today) {
        // Bugün zaten sayıldı — değiştirme
        next = saved;
      } else {
        const diff = diffDays(saved.lastDate, today);
        if (diff === 1) {
          // Dünden beri ara vermeden geldi
          const current = saved.current + 1;
          next = {
            lastDate: today,
            current,
            longest: Math.max(current, saved.longest),
          };
        } else {
          // Ara verildi — seriyi sıfırla
          next = {
            lastDate: today,
            current:  1,
            longest:  saved.longest,
          };
        }
      }

      await storage.setJSON(STORAGE_KEYS.streak, next);
      setStreak(next);
    })();
  }, []);

  return streak; // { current, longest, lastDate }
}
