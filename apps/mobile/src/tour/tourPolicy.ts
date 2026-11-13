export const APP_TOUR_VERSION = 7;
export type GuideStatus = "eligible" | "legacyHandled" | "existingUser" | "offerDismissed" | "skipped" | "completed";
export type GuideState = { version: number; status: GuideStatus };
const statuses: GuideStatus[] = ["eligible", "legacyHandled", "existingUser", "offerDismissed", "skipped", "completed"];

export function resolveGuideState(raw: string | null, legacy: string | null, onboarded: boolean): GuideState {
  if (raw !== null) {
    try {
      const value = JSON.parse(raw);
      if (value && Number.isInteger(value.version) && value.version > 0 && statuses.includes(value.status)) {
        if (value.status === "eligible" && legacy !== null) return { version: APP_TOUR_VERSION, status: "legacyHandled" };
        return { version: value.version, status: value.status };
      }
    } catch { /* Bozuk kayıt yeni kullanıcı daveti üretmez. */ }
    return { version: APP_TOUR_VERSION, status: "existingUser" };
  }
  return { version: APP_TOUR_VERSION, status: legacy !== null ? "legacyHandled" : onboarded ? "existingUser" : "eligible" };
}

export function shouldOfferGuide(state: GuideState | null, onboarded: boolean): boolean {
  return onboarded && state?.status === "eligible";
}

export type HintContext = {
  enabled: boolean; existingUser: boolean; focused: boolean; dataReady: boolean;
  targetVisible: boolean; overlayOpen: boolean; hintsThisVisit: number;
  hintsThisSession: number; interactedSinceGuide: boolean; seenVersion: number; contentVersion: number;
};
// Otomatik gösterim politika testleri doğrulandıktan sonra açılmıştır.
export const AUTOMATIC_HINTS_ENABLED = true;
export function shouldShowHint(c: HintContext): boolean {
  return c.enabled && !c.existingUser && c.focused && c.dataReady &&
    c.targetVisible && !c.overlayOpen && c.hintsThisVisit < 1 && c.hintsThisSession < 2 &&
    c.interactedSinceGuide && c.seenVersion < c.contentVersion;
}

export function isExistingGuideUser(state: GuideState | null): boolean {
  return !state || state.status === "legacyHandled" || state.status === "existingUser";
}
export function canOpenHint(c: Pick<HintContext, "focused" | "dataReady" | "targetVisible" | "overlayOpen">): boolean {
  return c.focused && c.dataReady && c.targetVisible && !c.overlayOpen;
}
export function hintTargetVisible(target: { x: number; y: number; width: number; height: number },
  viewport: { x: number; y: number; width: number; height: number }): boolean {
  if (target.width <= 0 || target.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return false;
  const intersectionHeight = Math.max(0, Math.min(target.y + target.height, viewport.y + viewport.height) -
    Math.max(target.y, viewport.y));
  const intersectionWidth = Math.max(0, Math.min(target.x + target.width, viewport.x + viewport.width) -
    Math.max(target.x, viewport.x));
  return intersectionHeight >= Math.min(target.height, Math.max(48, viewport.height * 0.25)) &&
    intersectionWidth >= Math.min(target.width, viewport.width) - 1;
}
export function hintAutoAnchorVisible(anchor: import("./tourGeometry").Rect | null,
  bounds: import("./tourGeometry").Rect): boolean {
  return !!anchor && anchor.width > 0 && anchor.height > 0 && anchor.x >= bounds.x &&
    anchor.y >= bounds.y && anchor.x + anchor.width <= bounds.x + bounds.width &&
    anchor.y + anchor.height < bounds.y + bounds.height;
}

export function readSeenHints(raw: string | null, hints: readonly { id: string; contentVersion: number }[]): Record<string, number> {
  if (raw === null) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) return parseSeenHints(value);
  } catch { /* Bozuk kayıt otomatik ipuçlarını yeniden açmaz. */ }
  return Object.fromEntries(hints.map(hint => [hint.id, hint.contentVersion]));
}

export function parseSeenHints(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => Number.isInteger(value) && Number(value) > 0));
}

// Sayaçlar yalnız kabul edilen gerçek gösterimde değişir; arka plan dönüşü bu nesneyi yenilemez.
export class HintSession {
  seen: Record<string, number> = {};
  count = 0;
  interactedSinceGuide = true;

  show(hint: { id: string; contentVersion: number },
    context: Omit<HintContext, "hintsThisSession" | "interactedSinceGuide" | "seenVersion" | "contentVersion">,
    manual: boolean): boolean {
    if (!canOpenHint(context)) return false;
    if (!manual) {
      if (!shouldShowHint({ ...context, hintsThisSession: this.count,
        interactedSinceGuide: this.interactedSinceGuide, seenVersion: this.seen[hint.id] ?? 0,
        contentVersion: hint.contentVersion })) return false;
      this.seen = { ...this.seen, [hint.id]: hint.contentVersion };
      this.count += 1;
    }
    return true;
  }
}
