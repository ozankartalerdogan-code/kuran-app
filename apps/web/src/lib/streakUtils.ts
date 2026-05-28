export interface StreakData {
  lastReadDate: string; // "YYYY-MM-DD"
  currentStreak: number;
  longestStreak: number;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getStreak(): StreakData {
  try {
    const raw = localStorage.getItem("streak");
    if (!raw) return { lastReadDate: "", currentStreak: 0, longestStreak: 0 };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { lastReadDate: "", currentStreak: 0, longestStreak: 0 };
  }
}

export function updateStreak(): StreakData {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const data = getStreak();

  if (data.lastReadDate === today) {
    return data; // already counted today
  }

  let newStreak: number;
  if (data.lastReadDate === yesterday) {
    newStreak = data.currentStreak + 1;
  } else if (data.lastReadDate === "") {
    newStreak = 1;
  } else {
    newStreak = 1; // streak broken
  }

  const updated: StreakData = {
    lastReadDate: today,
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, data.longestStreak),
  };

  localStorage.setItem("streak", JSON.stringify(updated));
  return updated;
}
