package expo.modules.prayerwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Sistemin merkezi: her olayda (widget güncellemesi, alarm, boot, saat/dilim
 * değişimi, JS veri gönderimi) gerçek zamana ve saklanan programa göre durumu
 * SIFIRDAN hesaplar — receiver'larda "Akşam'dan sonra Yatsı" gibi zincir mantığı
 * bilerek yok. İdempotenttir: art arda kaç kez çağrılırsa çağrılsın aynı sonucu
 * üretir ve tek exact alarmı günceller/iptal eder.
 */
object PrayerWidgetReconciler {
  private const val TAG = "PrayerWidget"

  /** Bildirim alarmlarıyla (expo-notifications) çakışmayan, bize özel action + requestCode. */
  const val ACTION_PRAYER_TRANSITION = "expo.modules.prayerwidget.ACTION_PRAYER_TRANSITION"
  private const val ALARM_REQUEST_CODE = 260714
  private const val CLICK_REQUEST_CODE = 260715

  /**
   * Alarm, vakit girişinden yarım saniye SONRAYA kurulur: reconcile o anda
   * "timestamp > now" süzgeciyle bir SONRAKİ vakti seçer. Chronometer 0'a inince
   * en fazla ~0,5 sn "00:00 kaldı" görünür; negatif değer hiçbir zaman çizilmez
   * (Chronometer eksi işaretini ancak -1 sn'den itibaren gösterir).
   */
  private const val ALARM_SLACK_MS = 500L

  /** Receiver/Module girişlerinin tek kapısı — istisna asla dışarı sızmaz (launcher/uygulama çökmez). */
  fun safeReconcile(context: Context) {
    try {
      reconcileAndRender(context.applicationContext)
    } catch (t: Throwable) {
      Log.w(TAG, "reconcile failed", t)
    }
  }

  private fun reconcileAndRender(context: Context) {
    val manager = AppWidgetManager.getInstance(context) ?: return
    val ids = manager.getAppWidgetIds(ComponentName(context, PrayerWidgetProvider::class.java))
    if (ids == null || ids.isEmpty()) {
      // Hiç widget örneği kalmadı — yalnız KENDİ alarmımızı iptal et.
      cancelAlarm(context)
      return
    }

    val schedule = PrayerWidgetStore.read(context)
    val now = System.currentTimeMillis()

    // Veri yok/bozuk → güvenli mesaj; tahmin üretme, sayaç çalıştırma.
    if (schedule == null) {
      renderAll(context, manager, ids, message(context))
      cancelAlarm(context)
      return
    }

    // Saat dilimi, program üretildiğindekinden farklı → saklı duvar-saati
    // timestamp'leri artık yanlış. Yanlış vakit göstermeye devam etme.
    if (schedule.timezone != TimeZone.getDefault().id) {
      renderAll(context, manager, ids, message(context))
      cancelAlarm(context)
      return
    }

    // Sıradaki vakit: gerçek "şimdi"den kesin gelecekte olan ilk kayıt.
    // Süresi geçmişler (negatif kalan) doğal olarak atlanır.
    val next = schedule.prayers.firstOrNull { it.timestamp > now }
    if (next == null) {
      // Bütün vakitler geçmiş (son günün vakitleri bitmiş) → güvenli mesaj.
      renderAll(context, manager, ids, message(context))
      cancelAlarm(context)
      return
    }

    val canExact = canUseExactAlarms(context)
    if (canExact && Build.VERSION.SDK_INT >= 24) {
      // Canlı geri sayım: gerçek Android Chronometer. Taban, epoch kalan süreden
      // elapsedRealtime'a çevrilir — çizimi launcher süreci yapar, bizde saniyelik
      // hiçbir iş çalışmaz; ekran kapanıp açılınca da doğru süreden devam eder.
      val remainingMillis = next.timestamp - now
      val base = SystemClock.elapsedRealtime() + remainingMillis
      renderAll(context, manager, ids, chronometer(context, next.label, base))
      val armed = scheduleAlarm(context, next.timestamp + ALARM_SLACK_MS)
      if (!armed) {
        // İzin görünürde vardı ama alarm kurulamadı (yarış: tam bu sırada
        // kaldırılmış olabilir) → sayaç vakit geçişinde takılı kalmasın,
        // statik görünüme dön.
        renderAll(context, manager, ids, staticNext(context, next.label, next.timestamp))
      }
    } else {
      // Exact alarm erişimi yok: yaklaşık/yanlış sayaç YOK — statik ve her an
      // doğru olan "sıradaki vakit + saati" göster. Inexact alarmla sayaç taklidi
      // bilerek yapılmıyor; ilerletme updatePeriodMillis + sistem olaylarına kalır.
      renderAll(context, manager, ids, staticNext(context, next.label, next.timestamp))
      cancelAlarm(context)
    }
  }

  // ── Görünümler ────────────────────────────────────────────────────────────────

  private fun baseViews(context: Context): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.prayer_widget)
    views.setOnClickPendingIntent(R.id.prayer_widget_root, clickPendingIntent(context))
    return views
  }

  /** Canlı sayaç: "Sıradaki vakit: Akşam" + Chronometer "01:24:36 kaldı". */
  private fun chronometer(context: Context, label: String, base: Long): RemoteViews {
    val views = baseViews(context)
    views.setTextViewText(
      R.id.prayer_widget_title,
      context.getString(R.string.prayer_widget_title_next) + ": " + label,
    )
    views.setChronometerCountDown(R.id.prayer_widget_chrono, true)
    views.setChronometer(
      R.id.prayer_widget_chrono,
      base,
      context.getString(R.string.prayer_widget_chrono_format),
      true,
    )
    views.setViewVisibility(R.id.prayer_widget_chrono, View.VISIBLE)
    views.setViewVisibility(R.id.prayer_widget_static, View.GONE)
    return views
  }

  /** Statik güvenli görünüm: "Sıradaki vakit" + "Akşam 20:41". */
  private fun staticNext(context: Context, label: String, timestamp: Long): RemoteViews {
    val views = baseViews(context)
    val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
    views.setTextViewText(R.id.prayer_widget_title, context.getString(R.string.prayer_widget_title_next))
    views.setTextViewText(R.id.prayer_widget_static, "$label $time")
    views.setViewVisibility(R.id.prayer_widget_chrono, View.GONE)
    views.setViewVisibility(R.id.prayer_widget_static, View.VISIBLE)
    return views
  }

  /** Veri yok/bitmiş/saat dilimi uyuşmuyor: "…uygulamayı açın". */
  private fun message(context: Context): RemoteViews {
    val views = baseViews(context)
    views.setTextViewText(R.id.prayer_widget_title, context.getString(R.string.prayer_widget_label))
    views.setTextViewText(R.id.prayer_widget_static, context.getString(R.string.prayer_widget_open_app))
    views.setViewVisibility(R.id.prayer_widget_chrono, View.GONE)
    views.setViewVisibility(R.id.prayer_widget_static, View.VISIBLE)
    return views
  }

  private fun renderAll(context: Context, manager: AppWidgetManager, ids: IntArray, views: RemoteViews) {
    // Aynı provider'ın TÜM örnekleri birlikte güncellenir.
    try {
      manager.updateAppWidget(ids, views)
    } catch (t: Throwable) {
      Log.w(TAG, "updateAppWidget failed", t)
    }
  }

  /** Widget'a dokununca mevcut deep link ile namaz ekranı açılır (yeni rota icat edilmedi). */
  private fun clickPendingIntent(context: Context): PendingIntent {
    var intent = Intent(Intent.ACTION_VIEW, Uri.parse("kuranyolu://namaz"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (intent.resolveActivity(context.packageManager) == null) {
      intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent() // çözülemezse dokunuş sessizce no-op olur, widget yine de çizilir
    }
    return PendingIntent.getActivity(
      context,
      CLICK_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  // ── Exact alarm ───────────────────────────────────────────────────────────────

  /** API 31 öncesinde exact alarm için özel izin yoktur; 31+ gerçek durumu sorar. */
  fun canUseExactAlarms(context: Context): Boolean {
    return try {
      if (Build.VERSION.SDK_INT >= 31) {
        val am = context.getSystemService(AlarmManager::class.java) ?: return false
        am.canScheduleExactAlarms()
      } else {
        true
      }
    } catch (t: Throwable) {
      false
    }
  }

  private fun alarmPendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, PrayerWidgetAlarmReceiver::class.java)
      .setAction(ACTION_PRAYER_TRANSITION)
    return PendingIntent.getBroadcast(
      context,
      ALARM_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  /**
   * Yalnız SIRADAKİ vakit için TEK exact alarm kurar. Aynı PendingIntent
   * (sabit requestCode + action) kullanıldığından yeni kurulum öncekinin
   * yerine geçer; yine de yarım durumlara karşı önce açıkça iptal edilir.
   */
  private fun scheduleAlarm(context: Context, triggerAtMillis: Long): Boolean {
    return try {
      val am = context.getSystemService(AlarmManager::class.java) ?: return false
      val pi = alarmPendingIntent(context)
      am.cancel(pi)
      // canScheduleExactAlarms çağıran tarafta doğrulandı; yarışa karşı
      // SecurityException yine de yakalanır.
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
      true
    } catch (t: Throwable) {
      Log.w(TAG, "scheduleAlarm failed", t)
      false
    }
  }

  fun cancelAlarm(context: Context) {
    try {
      val am = context.getSystemService(AlarmManager::class.java) ?: return
      am.cancel(alarmPendingIntent(context))
    } catch (t: Throwable) {
      Log.w(TAG, "cancelAlarm failed", t)
    }
  }

  // ── JS senkronizasyonu için yardımcılar ──────────────────────────────────────

  fun hasWidgets(context: Context): Boolean {
    return try {
      val manager = AppWidgetManager.getInstance(context) ?: return false
      val ids = manager.getAppWidgetIds(ComponentName(context, PrayerWidgetProvider::class.java))
      ids != null && ids.isNotEmpty()
    } catch (t: Throwable) {
      false
    }
  }

  /**
   * JS'in yeni program göndermesi gerekiyor mu? Veri yoksa, saat dilimi
   * uyuşmuyorsa veya kalan pencere 24 saatin altına indiyse true.
   */
  fun needsData(context: Context): Boolean {
    val schedule = PrayerWidgetStore.read(context) ?: return true
    if (schedule.timezone != TimeZone.getDefault().id) return true
    val last = schedule.prayers.lastOrNull() ?: return true
    return last.timestamp < System.currentTimeMillis() + 24L * 60 * 60 * 1000
  }
}
