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
  // YEREL tarih (UTC değil) — namazNotifications.localDayStr ile tutarlı.
  // toISOString() UTC gününü verir; Türkiye'de (UTC+3) seri "günü" saat 03:00'te
  // dönerdi ve gece 00:00–03:00 arası okuyan kullanıcı bunu bir önceki güne
  // sayardı → hak edilmiş seri gece yarısı civarı kırılabilirdi.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

// record=true (varsayılan): bugünü "okundu" sayar ve seriyi ilerletip KAYDEDER —
// yalnız gerçek okuma ekranları (ayet detayı) kullanmalı.
// record=false: salt gösterim — hiçbir şey yazmaz. Ana sayfa bunu kullanır;
// eskiden ana sayfa da kaydettiği için uygulamayı açmak "okuma" sayılıyordu.
export function useStreak(options?: { record?: boolean }): UseStreakResult {
  const record = options?.record ?? true;
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

      if (!record) {
        // Salt gösterim: seri hâlâ "canlı" mı? Dün veya bugün okunduysa mevcut
        // değer geçerli; daha eskiyse kopmuştur → 0 göster (ama kaydı bozma,
        // rekor korunur; yazma yalnız gerçek okumada olur).
        const alive =
          !!safe.lastDate && diffDays(safe.lastDate, today) <= 1;
        setStreak(alive ? safe : { ...safe, current: 0 });
        return;
      }

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
  }, [record]);

  useEffect(() => {
    compute();
  }, [compute]);

  const refresh = useCallback(async () => {
    await compute();
  }, [compute]);

  return { streak, loading, error, refresh };
}
