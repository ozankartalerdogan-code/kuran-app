export type PrayerNotificationStatusKind =
  | "disabled"
  | "permission-denied"
  | "location-unavailable"
  | "scheduled";

export type PrayerNotificationStatus = {
  kind: PrayerNotificationStatusKind;
  message: string;
};

export function getPrayerNotificationStatus(opts: {
  preferenceEnabled: boolean;
  osPermissionGranted: boolean;
  scheduleUnavailable: boolean;
}): PrayerNotificationStatus {
  if (!opts.preferenceEnabled) {
    return {
      kind: "disabled",
      message: "Her namaz vakti için, içinde namaz temalı ayet bulunan hatırlatma",
    };
  }
  if (!opts.osPermissionGranted) {
    return {
      kind: "permission-denied",
      message: "Sistem bildirim izni kapalı — hiçbir bildirim ulaşmaz. Ayarlardan tekrar açabilirsiniz.",
    };
  }
  if (opts.scheduleUnavailable) {
    return {
      kind: "location-unavailable",
      message: "Konum alınamadığı için namaz bildirimleri şu anda planlanamadı. Konum iznini açtıktan sonra tekrar denenecektir.",
    };
  }
  return {
    kind: "scheduled",
    message: "Bulunduğunuz konum için bildirim planlandı",
  };
}
