import { Alert, type AlertButton, type AlertOptions } from "react-native";
import { getStrings } from "../i18n";
import tourStrings from "../i18n/strings/tour";
import { beginOverlay } from "./overlayBusy";

// Yerel iletişim kutusunun bütün kapanış yolları ortak engeli kaldırır.
export function overlayAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
  const end = beginOverlay();
  try {
    Alert.alert(title, message, (buttons ?? [{ text: getStrings(tourStrings).acknowledge }]).map(button => ({
      ...button,
      onPress: () => { end(); button.onPress?.(); },
    })), { ...options, onDismiss: () => { end(); options?.onDismiss?.(); } });
  } catch (error) { end(); throw error; }
}
