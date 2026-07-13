package expo.modules.prayerwidget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Vakit girişinde tetiklenen exact alarmın hedefi. Uzun iş/ağ isteği YOK:
 * yalnız yeniden hesapla-çiz (sıradaki vakti bulur, widget'ı günceller,
 * sonraki tek alarmı kurar — hepsi reconcile içinde).
 */
class PrayerWidgetAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != PrayerWidgetReconciler.ACTION_PRAYER_TRANSITION) return
    PrayerWidgetReconciler.safeReconcile(context)
  }
}
