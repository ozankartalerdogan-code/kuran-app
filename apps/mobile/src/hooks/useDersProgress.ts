import { useState, useEffect, useCallback, useRef } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";

export type DersProgress = {
  gorülen: number;
  toplam: number;
  quizBitti: boolean;
};

type AllProgress = Record<string, DersProgress>;

export function useDersProgress() {
  const [progress, setProgress] = useState<AllProgress>({});
  // İlk load bitmeden storage'a yazma → mount anındaki kısmi güncellemenin
  // (örn. updateProgress(…,0,…)) depolanmış veriyi ezme yarışını önler.
  const hydratedRef = useRef(false);

  const load = useCallback(async () => {
    const data = await storage.getJSON<AllProgress>(STORAGE_KEYS.derslerProgress, {});
    setProgress(data ?? {});
    hydratedRef.current = true;
  }, []);

  useEffect(() => { load(); }, [load]);

  // AsyncStorage yazımı state updater dışında — StrictMode çift çağırma sorununu önler.
  // Yalnızca hidrasyon (ilk load) tamamlandıktan sonra yazılır.
  useEffect(() => {
    if (hydratedRef.current && Object.keys(progress).length > 0) {
      storage.setJSON(STORAGE_KEYS.derslerProgress, progress);
    }
  }, [progress]);

  const updateProgress = useCallback((dersId: string, gorülen: number, toplam: number) => {
    setProgress(prev => {
      const cur = prev[dersId];
      if (cur && cur.gorülen >= gorülen && cur.toplam === toplam) return prev;
      return {
        ...prev,
        [dersId]: { gorülen, toplam, quizBitti: cur?.quizBitti ?? false },
      };
    });
  }, []);

  const setQuizBitti = useCallback((dersId: string) => {
    setProgress(prev => {
      const cur = prev[dersId];
      if (cur?.quizBitti) return prev;
      return {
        ...prev,
        [dersId]: { ...(cur ?? { gorülen: 0, toplam: 0 }), quizBitti: true },
      };
    });
  }, []);

  return { progress, load, updateProgress, setQuizBitti };
}
