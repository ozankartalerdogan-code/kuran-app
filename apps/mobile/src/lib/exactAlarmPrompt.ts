import { beginOverlay, isOverlayBusy } from "../tour/overlayBusy";
import { Alert, AppState } from "react-native";
import { storage } from "./storage";
import { NOTIF_KEY, DAILY_VERSE_KEY } from "./namazNotifications";
import { canScheduleExactAlarms, openExactAlarmSettings } from "../../modules/exact-alarm";
import { getStrings } from "../i18n";
import personalStrings from "../i18n/strings/personal";

const PROMPTED_KEY = "exactAlarmPrompted";

/** Bildirimlerden biri açık ve Android tam zamanlı alarma izin vermiyorsa true. */
export async function needsExactAlarmPermission(): Promise<boolean> {
  if (canScheduleExactAlarms() !== false) return false;
  const [pv, dv] = await Promise.all([
    storage.getString(NOTIF_KEY),
    storage.getString(DAILY_VERSE_KEY),
  ]);
  return pv === "1" || dv === "1";
}

// "Alarmlar ve hatırlatıcılar" iznini gerekçesiyle BİR KEZ sorar. Reddedilirse
// tekrar sorulmaz (Bildirimler ekranındaki kart kalır); bildirimler yine gelir,
// yalnız Android birkaç dakika–1 saat geciktirebilir. İzin verilince
// schedStamp değiştiği için bir sonraki ön plana gelişte alarmlar yeniden kurulur.
export async function maybePromptExactAlarm(): Promise<void> {
  if (AppState.currentState !== "active" || isOverlayBusy()) return;
  if (!(await needsExactAlarmPermission())) return;
  if ((await storage.getString(PROMPTED_KEY)) === "1") return;
  if (AppState.currentState !== "active" || isOverlayBusy()) return;
  const end = beginOverlay();
  try { await storage.setString(PROMPTED_KEY, "1"); } catch (error) { end(); throw error; }
  if (AppState.currentState !== "active") {
    await storage.remove(PROMPTED_KEY).finally(end);
    return;
  }
  const t = getStrings(personalStrings);
  Alert.alert(t.exactPromptTitle, t.exactPromptBody, [
    { text: t.exactLater, style: "cancel", onPress: end },
    { text: t.exactAllow, onPress: () => { end(); openExactAlarmSettings(); } },
  ], { cancelable: true, onDismiss: end });
}
