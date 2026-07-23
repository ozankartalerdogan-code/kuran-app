"use client";

import { useEffect } from "react";

export function WordAnalysisTargetScroller({ wordIndex }: { wordIndex: number }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const targets = document.querySelectorAll<HTMLElement>(`[data-word-target="${wordIndex}"]`);
      const target = Array.from(targets).find((element) => element.getClientRects().length > 0);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [wordIndex]);

  return null;
}
