package expo.modules.prayerwidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

/**
 * "Namaz Vakitleri" ana ekran widget provider'ı. Tüm yaşam döngüsü olayları tek
 * merkeze (reconcileAndRender) gider — burada durum/zincir mantığı tutulmaz.
 * Emir Ayetleri widget'ının provider'ından (react-native-android-widget'ın
 * RNWidgetProvider türevi) tamamen bağımsızdır.
 */
class PrayerWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    PrayerWidgetReconciler.safeReconcile(context)
  }

  override fun onEnabled(context: Context) {
    PrayerWidgetReconciler.safeReconcile(context)
  }

  override fun onDisabled(context: Context) {
    // Son örnek kaldırıldı — yalnız BU widget'ın alarmı iptal edilir; başka
    // widget'ların (Emir Ayetleri) veya bildirimlerin alarm/verisine dokunulmaz.
    try {
      PrayerWidgetReconciler.cancelAlarm(context)
    } catch (t: Throwable) {
      // launcher sürecini asla düşürme
    }
  }
}
