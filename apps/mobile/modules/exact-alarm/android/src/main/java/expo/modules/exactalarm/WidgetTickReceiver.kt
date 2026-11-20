package expo.modules.exactalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/** One non-wakeup tick; headless JS schedules the next tick after rendering. */
class WidgetTickReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != tickAction(context) &&
      intent.action != Intent.ACTION_TIME_CHANGED &&
      intent.action != Intent.ACTION_TIMEZONE_CHANGED &&
      intent.action != Intent.ACTION_MY_PACKAGE_REPLACED &&
      intent.action != AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED) return

    val manager = AppWidgetManager.getInstance(context)
    for (name in arrayOf("NamazSerit", "NamazOdak")) {
      // react-native-android-widget/app.plugin.js: default provider package.
      val provider = try {
        Class.forName("${context.packageName}.widget.$name")
      } catch (e: ClassNotFoundException) {
        continue
      }
      val component = ComponentName(context, provider)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isEmpty()) continue
      context.sendBroadcast(Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
        .setComponent(component)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids))
    }
    // No installed prayer widgets => no JS task and no successor alarm.
  }

  companion object {
    private const val REQUEST_CODE = 7202

    private fun tickAction(context: Context) = "${context.packageName}.WIDGET_TICK"

    internal fun pendingIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
      context,
      REQUEST_CODE,
      Intent(context, WidgetTickReceiver::class.java).setAction(tickAction(context)),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
