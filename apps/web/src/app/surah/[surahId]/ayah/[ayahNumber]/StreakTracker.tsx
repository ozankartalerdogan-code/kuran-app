"use client";

import { useEffect } from "react";
import { updateStreak } from "../../../../../lib/streakUtils";

export function StreakTracker() {
  useEffect(() => {
    updateStreak();
  }, []);

  return null;
}
