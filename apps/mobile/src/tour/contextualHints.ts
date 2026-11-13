export type ContextualHint = {
  id: string; targetId: string; screen: string; priority: number; contentVersion: number;
};
// Kimlikler ve içerik sürümleri cihazdaki görülme kaydının sözleşmesidir.
export const CONTEXTUAL_HINTS: readonly ContextualHint[] = [
  { id: "surahInteraction", targetId: "surah.reader", screen: "surah", priority: 1, contentVersion: 1 },
  { id: "ayahTabs", targetId: "ayah.tabs", screen: "ayah", priority: 1, contentVersion: 1 },
  { id: "lessonProgress", targetId: "lesson.next", screen: "ders-detay", priority: 1, contentVersion: 1 },
  { id: "rootMap", targetId: "root.heatmap", screen: "root-detail", priority: 1, contentVersion: 1 },
];
