export type HintId = "surahInteraction" | "ayahTabs" | "lessonProgress" | "rootMap";
export type ContextualHint = {
  id: HintId; targetId: string; contentVersion: number;
};
// Kimlikler ve içerik sürümleri cihazdaki görülme kaydının sözleşmesidir.
export const CONTEXTUAL_HINTS: Record<HintId, ContextualHint> = {
  surahInteraction: { id: "surahInteraction", targetId: "surah.reader", contentVersion: 1 },
  ayahTabs: { id: "ayahTabs", targetId: "ayah.tabs", contentVersion: 1 },
  lessonProgress: { id: "lessonProgress", targetId: "lesson.next", contentVersion: 1 },
  rootMap: { id: "rootMap", targetId: "root.heatmap", contentVersion: 1 },
};
