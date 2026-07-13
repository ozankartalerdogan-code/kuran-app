package expo.modules.prayerwidget

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.TimeZone

/**
 * React Native → native köprüsü. Uygulamanın MEVCUT vakit verisini (Aladhan
 * kaynaklı, JS'te hesaplanmış epoch timestamp'ler) native depoya aktarır ve
 * widget'ı tazeler. Native tarafta vakit HESAPLANMAZ (tek doğruluk kaynağı JS).
 */
class PrayerWidgetModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PrayerWidget")

    /** Programı doğrula+sakla ve hemen yeniden çiz. Bozuk JSON'da hata fırlatır (eldeki veri korunur). */
    Function("setSchedule") { json: String ->
      PrayerWidgetStore.write(context, json)
      PrayerWidgetReconciler.safeReconcile(context)
    }

    /** Her olayda çağrılabilir idempotent tazeleme (uygulama açılışı, izin dönüşü vb.). */
    Function("reconcile") {
      PrayerWidgetReconciler.safeReconcile(context)
    }

    /** Ana ekranda bu provider'dan en az bir widget örneği var mı? (Yoksa JS ağ isteği yapmaz.) */
    Function("hasWidgets") {
      PrayerWidgetReconciler.hasWidgets(context)
    }

    /** Saklı program eksik/bayat/dilim-uyumsuz mu? (JS'in yeniden gönderme kararı için.) */
    Function("needsData") {
      PrayerWidgetReconciler.needsData(context)
    }

    /** Exact alarm erişimi (API 31 öncesi her zaman true — izin kavramı yok). */
    Function("canScheduleExactAlarms") {
      PrayerWidgetReconciler.canUseExactAlarms(context)
    }

    /**
     * JS timestamp üretirken bu kimliği saklar; reconcile aynı kaynakla
     * (TimeZone.getDefault) karşılaştırır — iki taraf asla ayrışmaz.
     */
    Function("getTimezone") {
      TimeZone.getDefault().id
    }

    /**
     * Sistemin "Alarmlar ve hatırlatıcılar" ayarını açar (yalnız API 31+ ve
     * yalnız kullanıcı istediğinde çağrılır — otomatik açılmaz). Dönüş: ekran
     * açılabildi mi.
     */
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < 31) return@Function false
      try {
        val intent = Intent(
          Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
          Uri.parse("package:" + context.packageName),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      } catch (t: Throwable) {
        false
      }
    }
  }
}
