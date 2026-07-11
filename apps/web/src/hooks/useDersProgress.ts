"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DersProgress = {
  "görülen": number;
  toplam: number;
  quizBitti: boolean;
};

export type AllDersProgress = Record<string, DersProgress>;

const STORAGE_KEY = "derslerProgress";

function readProgress(): AllDersProgress {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as AllDersProgress : {};
  } catch {
    return {};
  }
}

function writeProgress(progress: AllDersProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage bazı tarayıcı modlarında kapalı olabilir; ders akışı yine çalışmalı.
  }
}

export function useDersProgress() {
  const [progress, setProgress] = useState<AllDersProgress>({});
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  const load = useCallback(() => {
    const data = readProgress();
    setProgress(data);
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (hydratedRef.current && Object.keys(progress).length > 0) {
      writeProgress(progress);
    }
  }, [progress]);

  const updateProgress = useCallback((dersId: string, görülen: number, toplam: number) => {
    setProgress((prev) => {
      const cur = prev[dersId];
      if (cur && cur["görülen"] >= görülen && cur.toplam === toplam) return prev;
      return {
        ...prev,
        [dersId]: { "görülen": görülen, toplam, quizBitti: cur?.quizBitti ?? false },
      };
    });
  }, []);

  const setQuizBitti = useCallback((dersId: string) => {
    setProgress((prev) => {
      const cur = prev[dersId];
      if (cur?.quizBitti) return prev;
      return {
        ...prev,
        [dersId]: { ...(cur ?? { "görülen": 0, toplam: 0 }), quizBitti: true },
      };
    });
  }, []);

  return { progress, hydrated, load, updateProgress, setQuizBitti };
}