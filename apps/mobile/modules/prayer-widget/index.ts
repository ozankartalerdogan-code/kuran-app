// Namaz vakti widget'ının JS yüzü. Native modül YENİ EAS build gerektirir —
// mevcut dev client/eski build'de requireNativeModule throw eder; storage/Sentry/
// Emir widget'ıyla aynı build-gated desen: modül yoksa her şey sessiz no-op.
import { Platform } from "react-native";

// Bkz. namazNotifications.VAKITLER — id'ler Aladhan anahtarlarıdır (Fajr, Sunrise…),
// label'lar uygulamadaki Türkçe adlar (İmsak, Güneş…). Hangi vakitlerin dahil
// olduğuna native taraf karar VERMEZ; JS ne gönderirse o gösterilir.
export type PrayerWidgetScheduleDay = {
  date: string; // YYYY-MM-DD (yerel gün)
  prayers: Array<{ id: string; label: string; timestamp: number }>;
};

export type PrayerWidgetSchedule = {
  generatedAt: number;
  timezone: string; // native getTimezone()'dan alınır — iki taraf aynı kaynağı kullanır
  days: PrayerWidgetScheduleDay[];
};

type PrayerWidgetNativeModule = {
  setSchedule: (json: string) => void;
  reconcile: () => void;
  hasWidgets: () => boolean;
  needsData: () => boolean;
  canScheduleExactAlarms: () => boolean;
  getTimezone: () => string;
  openExactAlarmSettings: () => boolean;
};

let native: PrayerWidgetNativeModule | null = null;
if (Platform.OS === "android") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { requireNativeModule } = require("expo");
    native = requireNativeModule("PrayerWidget");
  } catch {
    native = null; // eski build — widget özelliği görünmez, uygulama etkilenmez
  }
}

export const isPrayerWidgetAvailable = native !== null;

export function setPrayerWidgetSchedule(schedule: PrayerWidgetSchedule): void {
  native?.setSchedule(JSON.stringify(schedule));
}

export function reconcilePrayerWidget(): void {
  native?.reconcile();
}

export function hasPrayerWidgets(): boolean {
  return native?.hasWidgets() ?? false;
}

export function prayerWidgetNeedsData(): boolean {
  return native?.needsData() ?? false;
}

export function canScheduleExactAlarms(): boolean {
  return native?.canScheduleExactAlarms() ?? false;
}

export function getPrayerWidgetTimezone(): string | null {
  return native?.getTimezone() ?? null;
}

export function openExactAlarmSettings(): boolean {
  return native?.openExactAlarmSettings() ?? false;
}
