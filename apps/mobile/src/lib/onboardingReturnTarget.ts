import type { Href } from "expo-router";
import { isValidAyahRef, isValidSurahId } from "./ayahRefs.ts";

export const ONBOARDING_RETURN_TARGET_KEY = "onboarding_return_target";
type OnboardingReturnTarget = Extract<Href, string>;

type ReturnTargetStorage = {
  getString(key: string): Promise<string | null>;
  setString(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

const STATIC_TARGETS = new Set([
  "/bildirimler",
  "/dersler",
  "/dualar",
  "/elifba",
  "/elifba/harf-i-tarif",
  "/esma",
  "/favoriler",
  "/gizlilik",
  "/hadisler",
  "/hakkinda",
  "/hatim",
  "/ibadet-rehberi",
  "/kible",
  "/manevi-siginak",
  "/manevi-siginak/ismi-azam",
  "/mubarek-gunler",
  "/mushaf",
  "/mushaf-sayfa",
  "/namaz",
  "/namaz-rehberi",
  "/ne-ogreneyim",
  "/notlar",
  "/peygamber-kissalari",
  "/root",
  "/search",
  "/siyer",
  "/surah",
  "/sure-listesi",
  "/widget-ekle",
]);

export function getValidOnboardingReturnTarget(raw: unknown): OnboardingReturnTarget | null {
  if (typeof raw !== "string" || raw.length === 0 || raw !== raw.trim()) return null;
  if (STATIC_TARGETS.has(raw)) return raw as OnboardingReturnTarget;

  let match = raw.match(/^\/surah\/(\d+)$/);
  if (match && isValidSurahId(Number(match[1]))) return raw as OnboardingReturnTarget;

  match = raw.match(/^\/(?:ayah|mushaf)\/(\d+)\/(\d+)$/);
  if (match && isValidAyahRef(Number(match[1]), Number(match[2]))) {
    return raw as OnboardingReturnTarget;
  }

  match = raw.match(/^\/surah\/(\d+)\/ayah\/(\d+)$/);
  if (match && isValidAyahRef(Number(match[1]), Number(match[2]))) {
    return raw as OnboardingReturnTarget;
  }

  match = raw.match(/^\/tafsir\/(\d+)$/);
  if (match && isValidSurahId(Number(match[1]))) return raw as OnboardingReturnTarget;

  return null;
}

export async function saveOnboardingReturnTarget(
  raw: unknown,
  targetStorage: ReturnTargetStorage,
): Promise<void> {
  const target = getValidOnboardingReturnTarget(raw);
  if (target) {
    await targetStorage.setString(ONBOARDING_RETURN_TARGET_KEY, target);
  } else {
    await targetStorage.remove(ONBOARDING_RETURN_TARGET_KEY);
  }
}

export async function consumeOnboardingReturnTarget(
  targetStorage: ReturnTargetStorage,
): Promise<OnboardingReturnTarget | null> {
  const raw = await targetStorage.getString(ONBOARDING_RETURN_TARGET_KEY);
  await targetStorage.remove(ONBOARDING_RETURN_TARGET_KEY);
  return getValidOnboardingReturnTarget(raw);
}
