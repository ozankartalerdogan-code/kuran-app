import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

interface ExactAlarmNative {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
  scheduleWidgetTick?(atMs: number): void;
  cancelWidgetTick?(): void;
}

// Eski build'lerde (modül yokken) ve iOS'ta null döner; çağıranlar "bilinmiyor" sayar.
const native = Platform.OS === "android" ? requireOptionalNativeModule<ExactAlarmNative>("ExactAlarm") : null;

/** true: tam zamanlı; false: Android erteleyebilir; null: bilinmiyor / gerekmiyor (iOS, eski build). */
export function canScheduleExactAlarms(): boolean | null {
  try { return native ? native.canScheduleExactAlarms() : null; } catch { return null; }
}

/** Bu uygulamanın "Alarmlar ve hatırlatıcılar" ayarını açar. Açılamazsa false. */
export function openExactAlarmSettings(): boolean {
  try { return native ? native.openExactAlarmSettings() : false; } catch { return false; }
}

/** Non-wakeup RTC tick; older builds and iOS silently ignore it. */
export function scheduleWidgetTick(atMs: number): void {
  try { native?.scheduleWidgetTick?.(atMs); } catch { /* native unavailable */ }
}

export function cancelWidgetTick(): void {
  try { native?.cancelWidgetTick?.(); } catch { /* native unavailable */ }
}
