import { storage, STORAGE_KEYS } from "../lib/storage";
import { APP_TOUR_VERSION } from "./appTourSteps";

export async function hasCompletedAppTour(): Promise<boolean> {
  const value = await storage.getString(STORAGE_KEYS.appTour);
  return value === String(APP_TOUR_VERSION);
}

export async function completeAppTour(): Promise<void> {
  await storage.setString(STORAGE_KEYS.appTour, String(APP_TOUR_VERSION));
}

export async function resetAppTour(): Promise<void> {
  await storage.remove(STORAGE_KEYS.appTour);
}
