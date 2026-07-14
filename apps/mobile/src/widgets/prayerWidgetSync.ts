// Namaz vakti widget'ının native deposunu uygulamanın MEVCUT vakit verisiyle
// besler (tek doğruluk kaynağı: fetchPrayerDays → Aladhan; native tarafta
// hesaplama yok). _layout.tsx her açılışta + öne gelişte çağırır.
//
// Ağ isteği yalnız gerektiğinde yapılır: native modül yoksa, hiç widget örneği
// eklenmemişse ya da veri hâlâ tazeyse (bugün senkronlandı VE 24 saatten fazla
// penceresi var) hiçbir şey çalışmaz. Bildirim planlamasından bilinçli olarak
// bağımsızdır — bildirimler kapalıyken de widget çalışmalı.
import { storage } from "../lib/storage";
import {
  fetchPrayerDays,
  getLocationSilent,
  VAKITLER,
  type DayTimes,
} from "../lib/namazNotifications";
import {
  getPrayerWidgetTimezone,
  hasPrayerWidgets,
  isPrayerWidgetAvailable,
  prayerWidgetNeedsData,
  reconcilePrayerWidget,
  setPrayerWidgetSchedule,
  type PrayerWidgetSchedule,
} from "../../modules/prayer-widget";

const SYNC_DAY_KEY = "prayerWidgetSyncDay";

function localDayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// DayTimes ("HH:mm" duvar saatleri) → native programın epoch timestamp'leri.
// Date(y,m,d,h,min) cihazın yerel saat dilimiyle çözülür; aynı dilimin kimliği
// (native getTimezone) programla birlikte saklanır — dilim sonradan değişirse
// native taraf veriyi geçersiz sayıp güvenli görünüme döner.
function buildSchedule(days: DayTimes[], timezone: string): PrayerWidgetSchedule {
  return {
    generatedAt: Date.now(),
    timezone,
    days: days.map(({ date, times }) => ({
      date: localDayStr(date),
      prayers: VAKITLER.flatMap(({ key, label }) => {
        const raw = times[key];
        const m = typeof raw === "string" ? raw.match(/^(\d{1,2}):(\d{2})/) : null;
        if (!m) return [];
        const at = new Date(date);
        at.setHours(Number(m[1]), Number(m[2]), 0, 0);
        return [{ id: key, label, timestamp: at.getTime() }];
      }),
    })),
  };
}

// Eşzamanlı çağrıları serileştir (mount + AppState "active" yarışı —
// ensureNotificationsFresh ile aynı desen).
let inFlight: Promise<void> | null = null;

export function syncPrayerWidget(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = syncInner().finally(() => { inFlight = null; });
  return inFlight;
}

async function syncInner(): Promise<void> {
  if (!isPrayerWidgetAvailable) return;

  // Her açılışta ucuz yeniden hesap: izin/saat değişiklikleri veriye
  // dokunmadan da görünümü düzeltir.
  reconcilePrayerWidget();

  if (!hasPrayerWidgets()) return;

  const today = localDayStr(new Date());
  const [lastSync, needsData] = [await storage.getString(SYNC_DAY_KEY), prayerWidgetNeedsData()];
  if (lastSync === today && !needsData) return;

  const timezone = getPrayerWidgetTimezone();
  if (!timezone) return;

  const coords = await getLocationSilent();
  // Geçerli canlı/kayıtlı koordinat yoksa native taraftaki mevcut statik güvenli
  // görünümü koru; İstanbul için yeni ve yanlış bir program yazma.
  if (!coords) return;
  const { lat, lng } = coords;
  const days = await fetchPrayerDays(lat, lng); // 7 günlük mevcut takvim yolu
  if (!days || days.length === 0) return;

  const schedule = buildSchedule(days, timezone);
  if (schedule.days.every((d) => d.prayers.length === 0)) return;

  setPrayerWidgetSchedule(schedule); // native: doğrula + sakla + yeniden çiz
  await storage.setString(SYNC_DAY_KEY, today);
}
