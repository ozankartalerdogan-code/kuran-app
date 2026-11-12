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
// Bu modül yalnız izin durumunu okur ve kullanıcıyı ilgili ayar ekranına götürür.
class ExactAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context yok")

  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

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
