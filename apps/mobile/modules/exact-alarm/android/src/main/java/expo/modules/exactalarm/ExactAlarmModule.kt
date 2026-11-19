package expo.modules.exactalarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Namaz bildirimleri expo-notifications ile kurulur; o da canScheduleExactAlarms()
// true ise setExactAndAllowWhileIdle, değilse ertelenebilir setAndAllowWhileIdle kullanır.
// Widget tick'i ise RTC kullanır: cihazı uyandırmaz ve Doze'u aşmaz.
class ExactAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context yok")

  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    Function("scheduleWidgetTick") { atMs: Double ->
      require(atMs.isFinite() && atMs >= 0) { "Invalid widget tick time" }
      val ctx = context
      val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val pending = WidgetTickReceiver.pendingIntent(ctx)
      val triggerAt = atMs.toLong()
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
        try {
          am.setExact(AlarmManager.RTC, triggerAt, pending)
        } catch (e: SecurityException) {
          // İzin kontrolünden sonra izin geri alınmış olabilir.
          am.set(AlarmManager.RTC, triggerAt, pending)
        }
      } else {
        am.set(AlarmManager.RTC, triggerAt, pending)
      }
    }

    Function("cancelWidgetTick") {
      val ctx = context
      val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      am.cancel(WidgetTickReceiver.pendingIntent(ctx))
    }

    // Android 12 öncesinde izin gerekmez (her zaman tam zamanlı).
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      am.canScheduleExactAlarms()
    }

    // "Alarmlar ve hatırlatıcılar" ekranını bu uygulama için açar.
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
        .setData(Uri.parse("package:" + context.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}
