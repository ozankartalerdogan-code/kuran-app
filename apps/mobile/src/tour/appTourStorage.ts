import { storage, STORAGE_KEYS } from "../lib/storage";
import { APP_TOUR_VERSION, resolveGuideState, type GuideState, type GuideStatus } from "./tourPolicy";

export async function loadGuideState(): Promise<{ state: GuideState; onboarded: boolean }> {
  const [raw, legacy, done] = await Promise.all([
    storage.getString(STORAGE_KEYS.guideState), storage.getString(STORAGE_KEYS.appTour),
    storage.getString(STORAGE_KEYS.onboarding),
  ]);
  const state = resolveGuideState(raw, legacy, done === "1");
  await storage.setJSON(STORAGE_KEYS.guideState, state).catch(() => {});
  return { state, onboarded: done === "1" };
}
export async function saveGuideStatus(status: GuideStatus): Promise<GuideState> {
  const state = { version: APP_TOUR_VERSION, status };
  await storage.setJSON(STORAGE_KEYS.guideState, state);
  return state;
}
