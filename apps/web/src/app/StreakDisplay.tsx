"use client";

import { useEffect, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import { updateStreak, type StreakData } from "../lib/streakUtils";

export function StreakDisplay() {
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    const data = updateStreak();
    setStreak(data);
  }, []);

  if (!streak || streak.currentStreak === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800/40 dark:bg-orange-950/20">
      <div className="flex items-center gap-2">
        <Flame aria-hidden="true" className="h-5 w-5 text-orange-500 dark:text-orange-400" strokeWidth={2} />
        <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
          {streak.currentStreak} günlük seri!
        </span>
      </div>
      {streak.longestStreak > 1 && (
        <div className="flex items-center gap-1.5 text-xs text-orange-600/70 dark:text-orange-400/60">
          <Trophy aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Rekor: {streak.longestStreak} gün</span>
        </div>
      )}
    </div>
  );
}
