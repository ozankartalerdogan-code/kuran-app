package expo.modules.prayerwidget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Sistem olaylarında widget'ı gerçeğe göre düzeltir:
 * • BOOT_COMPLETED — yeniden başlatmada elapsedRealtime tabanı ve kurulu alarmlar
 *   geçersizleşir; epoch timestamp'lerden yeni taban hesaplanıp alarm yeniden
 *   kurulur, uygulamanın açılması BEKLENMEZ.
 * • MY_PACKAGE_REPLACED — uygulama güncellemesi de alarmları düşürür.
 * • TIME_SET / TIMEZONE_CHANGED — eski Chronometer tabanına güvenilmez; dilim
 *   uyuşmazlığında reconcile güvenli mesaja döner.
 * • SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED — izin verildiğinde canlı
 *   sayaç kendiliğinden devreye girer (izin geri alınırsa sistem uygulamayı
 *   durdurur; ilk ulaşılabilir olayda yine buradan statik moda dönülür).
 */
class PrayerWidgetSystemReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
      -> PrayerWidgetReconciler.safeReconcile(context)
    }
  }
}
