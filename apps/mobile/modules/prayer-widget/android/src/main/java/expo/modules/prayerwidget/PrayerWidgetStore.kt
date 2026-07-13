package expo.modules.prayerwidget

import android.content.Context
import org.json.JSONObject

/**
 * React Native tarafından gönderilen namaz vakti programının native deposu.
 *
 * Tek doğruluk kaynağı UYGULAMADIR (Aladhan + mevcut fetchPrayerDays): burada
 * hiçbir vakit HESAPLANMAZ, yalnız JS'in verdiği epoch timestamp'ler saklanır
 * ve okunur. Küçük JSON için SharedPreferences yeterli — veritabanı bilerek yok.
 */
object PrayerWidgetStore {
  private const val PREFS_NAME = "expo.modules.prayerwidget.store"
  private const val KEY_SCHEDULE = "schedule_json"

  data class PrayerEntry(val id: String, val label: String, val timestamp: Long)

  data class Schedule(
    val generatedAt: Long,
    val timezone: String,
    /** Tüm günlerin vakitleri tek düz listede, timestamp'e göre artan sıralı. */
    val prayers: List<PrayerEntry>,
  )

  /**
   * JSON'u doğrulayıp saklar; biçim bozuksa IllegalArgumentException fırlatır
   * (bozuk veri hiç yazılmaz, elde ne varsa korunur).
   */
  fun write(context: Context, json: String) {
    requireNotNull(parse(json)) { "PrayerWidget: schedule JSON is invalid" }
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_SCHEDULE, json)
      .apply()
  }

  /** Saklanan programı okur; yoksa veya bozuksa null (güvenli fallback görünümüne yol açar). */
  fun read(context: Context): Schedule? {
    return try {
      val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(KEY_SCHEDULE, null) ?: return null
      parse(raw)
    } catch (t: Throwable) {
      null
    }
  }

  private fun parse(json: String): Schedule? {
    return try {
      val root = JSONObject(json)
      val generatedAt = root.optLong("generatedAt", 0L)
      val timezone = root.optString("timezone", "")
      val days = root.optJSONArray("days") ?: return null
      if (generatedAt <= 0L || timezone.isEmpty()) return null

      val prayers = ArrayList<PrayerEntry>()
      for (i in 0 until days.length()) {
        val day = days.optJSONObject(i) ?: continue
        val dayPrayers = day.optJSONArray("prayers") ?: continue
        for (j in 0 until dayPrayers.length()) {
          val p = dayPrayers.optJSONObject(j) ?: continue
          val id = p.optString("id", "")
          val label = p.optString("label", "")
          val timestamp = p.optLong("timestamp", 0L)
          if (id.isEmpty() || label.isEmpty() || timestamp <= 0L) continue
          prayers.add(PrayerEntry(id, label, timestamp))
        }
      }
      if (prayers.isEmpty()) return null
      prayers.sortBy { it.timestamp }
      Schedule(generatedAt, timezone, prayers)
    } catch (t: Throwable) {
      null
    }
  }
}
