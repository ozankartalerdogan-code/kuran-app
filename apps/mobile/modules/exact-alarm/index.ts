import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

interface ExactAlarmNative {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
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
