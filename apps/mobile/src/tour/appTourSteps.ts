export const APP_TOUR_STEPS = [
  { id: "quran", targetId: "tab.kuran" },
  { id: "learn", targetId: "tab.ogren" },
  { id: "more", targetId: "tab.daha-fazla" },
] as const;
export type AppTourStep = typeof APP_TOUR_STEPS[number];
