package expo.modules.tajweedtext

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.text.Layout
import android.text.Spannable
import android.text.SpannableStringBuilder
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.util.TypedValue
import android.view.GestureDetector
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.TextView
import androidx.core.widget.TextViewCompat
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher
import java.security.MessageDigest
import expo.modules.kotlin.views.ExpoView
import kotlin.math.roundToInt

/**
 * GEÇİCİ TEŞHİS VIEW'I (H varyantı) — RN nested-Text yerine TEK Android TextView:
 * tam Arapça metin tek string, tek SpannableStringBuilder, renk aralıklarına
 * YALNIZ ForegroundColorSpan (metric etkileyen hiçbir span yok). Amaç, harf
 * bitişmesinin (shaping) tek Spannable içinde bozulup bozulmadığını görmek.
 * Font/boyut/satır yüksekliği/RTL ana TextView'a BİR KEZ uygulanır.
 */
class TajweedColorRange : Record {
  @Field var start: Int = 0
  @Field var end: Int = 0
  @Field var color: String = "#000000"
}

class TajweedTextView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // Yoga native çocuğun içerik yüksekliğini bilemez; ölçülen yüksekliği JS'e
  // bildiririz, JS style.height'ı günceller (yalnız değişince — döngü yok).
  private val onMeasured by EventDispatcher()
  // Dokunulan karakterin UTF-16 indeksi (mushaf'ta "dokun → hangi ayet" için).
  // Native TextView readback proof: SHA-256 plus direct input equality.
  private val onTextVerified by EventDispatcher()
  private val onCharPress by EventDispatcher()
  private var lastDispatchedHeight = -1

  private var arabicText: String = ""
  private var ranges: List<TajweedColorRange> = emptyList()
  private var highlightRanges: List<TajweedColorRange> = emptyList()

  private val textView = TextView(context).apply {
    layoutDirection = View.LAYOUT_DIRECTION_RTL
    textDirection = View.TEXT_DIRECTION_RTL
    gravity = Gravity.START // RTL'de START = sağ kenar (üretimdeki textAlign:"right" paritesi)
    typeface = try {
      Typeface.createFromAsset(context.assets, "fonts/UthmanicHafs.ttf")
    } catch (_: Exception) {
      Typeface.DEFAULT // asset eksikse sistem fontu — test yine anlamlı, sadece hat farklı
    }
  }

  // Tek dokunuş → karakter ofseti. Listener false döner ki selectable (uzun
  // basış) davranışı bozulmasın; detector yalnız gözlemler.
  private val tapDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
    override fun onSingleTapUp(e: MotionEvent): Boolean {
      if (textView.layout == null) return false
      val x = e.x - textView.totalPaddingLeft + textView.scrollX
      val y = e.y - textView.totalPaddingTop + textView.scrollY
      val line = textView.layout.getLineForVertical(y.toInt())
      val index = textView.layout.getOffsetForHorizontal(line, x)
      if (index in 0..arabicText.length) onCharPress(mapOf("index" to index))
      return false
    }
  })

  init {
    // clickable olmayan TextView, ACTION_DOWN'a false döndüğü için sonraki
    // MOVE/UP eventleri hiç gelmez → onSingleTapUp asla ateşlenmez. clickable=true
    // event akışını açık tutar; listener yalnız gözlemler (false döner), böylece
    // selectable (uzun basış) davranışı da bozulmaz.
    textView.isClickable = true
    textView.setOnTouchListener { _, event ->
      tapDetector.onTouchEvent(event)
      false // TextView kendi davranışını (seçim vb.) sürdürsün
    }
    addView(textView)
  }

  fun setAlign(mode: String) {
    // "justify" yalnız API 26+ (altında sağa hizalı kalır — mushaf'ta kabul edilebilir düşüş).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      textView.justificationMode = if (mode == "justify") {
        Layout.JUSTIFICATION_MODE_INTER_WORD
      } else {
        Layout.JUSTIFICATION_MODE_NONE
      }
      requestLayout()
    }
  }

  fun setSelectable(value: Boolean) {
    textView.setTextIsSelectable(value)
  }

  fun setHighlightRanges(next: List<TajweedColorRange>) {
    highlightRanges = next
    applySpannable()
  }

  fun setArabicText(text: String) {
    arabicText = text
    applySpannable()
  }

  fun setRanges(next: List<TajweedColorRange>) {
    ranges = next
    applySpannable()
  }

  private var fontSizeSp = 14f
  private var lineHeightSp = 0f
  private var maxFontMult = 0f // 0 = sınırsız (RN allowFontScaling varsayılanıyla aynı)

  fun setFontSizeSp(size: Float) {
    fontSizeSp = size
    applyMetrics()
  }

  fun setLineHeightSp(lineHeight: Float) {
    lineHeightSp = lineHeight
    applyMetrics()
  }

  fun setMaxFontSizeMultiplier(value: Float) {
    maxFontMult = value
    applyMetrics()
  }

  /**
   * VARSAYILAN YOL (maxMult=0): saf SP — cihazda görsel olarak DOĞRULANMIŞ
   * build'deki kodla birebir aynı davranış (sistemin kendi SP dönüşümü,
   * Android 14+ non-lineer ölçek dahil). Tavan yalnız maxFontSizeMultiplier
   * açıkça verilir VE sistem ölçeği onu aşarsa devreye girer; o dalda fontSize
   * ve lineHeight aynı çarpanı kullanır ki satırlar üst üste binmesin.
   */
  private fun applyMetrics() {
    val dm = context.resources.displayMetrics
    val systemScale = context.resources.configuration.fontScale
    val capped = maxFontMult > 0f && systemScale > maxFontMult
    val sizePx = if (capped) {
      fontSizeSp * maxFontMult * dm.density
    } else {
      TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, fontSizeSp, dm)
    }
    textView.setTextSize(TypedValue.COMPLEX_UNIT_PX, sizePx)
    if (lineHeightSp > 0f) {
      val lhPx = if (capped) {
        lineHeightSp * maxFontMult * dm.density
      } else {
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, lineHeightSp, dm)
      }
      TextViewCompat.setLineHeight(textView, lhPx.roundToInt())
    }
    requestLayout()
  }

  fun setTextColorStr(color: String) {
    parseColorOrNull(color)?.let { textView.setTextColor(it) }
  }

  /**
   * Tam metinden TEK SpannableStringBuilder kurar; renk aralıklarına yalnız
   * ForegroundColorSpan, vurgu aralıklarına yalnız BackgroundColorSpan uygular
   * (ikisi de metric ETKİLEMEZ). Metne hiçbir karakter EKLENMEZ/ÇIKARILMAZ.
   * start/end UTF-16 indeksleri [0, length] aralığına kelepçelenir; ters/boş
   * veya rengi bozuk aralıklar sessizce atlanır (çökme yok, metin daima tam).
   */
  private fun applySpannable() {
    val sb = SpannableStringBuilder(arabicText)
    val len = sb.length
    for (r in ranges) {
      val start = r.start.coerceIn(0, len)
      val end = r.end.coerceIn(0, len)
      if (start >= end) continue
      val color = parseColorOrNull(r.color) ?: continue
      sb.setSpan(ForegroundColorSpan(color), start, end, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
    for (r in highlightRanges) {
      val start = r.start.coerceIn(0, len)
      val end = r.end.coerceIn(0, len)
      if (start >= end) continue
      val color = parseColorOrNull(r.color) ?: continue
      sb.setSpan(BackgroundColorSpan(color), start, end, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
    textView.setText(sb, TextView.BufferType.SPANNABLE)
    requestLayout()
    val readback = textView.text.toString()
    val digest = MessageDigest.getInstance("SHA-256")
      .digest(readback.toByteArray(Charsets.UTF_8))
      .joinToString("") { "%02x".format(it) }
    onTextVerified(mapOf(
      "sha256" to digest,
      "matchesInput" to (readback == arabicText),
      "utf16Length" to readback.length,
      "codePointLength" to readback.codePointCount(0, readback.length),
    ))
  }

  private fun parseColorOrNull(value: String): Int? = try {
    Color.parseColor(value)
  } catch (_: IllegalArgumentException) {
    null
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    val width = right - left
    if (width <= 0) return
    textView.measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
    )
    textView.layout(0, 0, width, textView.measuredHeight)
    val desired = textView.measuredHeight
    if (desired != lastDispatchedHeight) {
      lastDispatchedHeight = desired
      val density = context.resources.displayMetrics.density
      onMeasured(mapOf("height" to desired / density))
    }
  }
}

class TajweedTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TajweedText")

    View(TajweedTextView::class) {
      Events("onMeasured", "onCharPress", "onTextVerified")

      Prop("text") { view: TajweedTextView, text: String ->
        view.setArabicText(text)
      }
      Prop("ranges") { view: TajweedTextView, ranges: List<TajweedColorRange> ->
        view.setRanges(ranges)
      }
      Prop("highlightRanges") { view: TajweedTextView, ranges: List<TajweedColorRange> ->
        view.setHighlightRanges(ranges)
      }
      Prop("fontSize") { view: TajweedTextView, size: Float ->
        view.setFontSizeSp(size)
      }
      Prop("lineHeight") { view: TajweedTextView, lineHeight: Float ->
        view.setLineHeightSp(lineHeight)
      }
      Prop("maxFontSizeMultiplier") { view: TajweedTextView, value: Float ->
        view.setMaxFontSizeMultiplier(value)
      }
      Prop("textColor") { view: TajweedTextView, color: String ->
        view.setTextColorStr(color)
      }
      Prop("textAlign") { view: TajweedTextView, mode: String ->
        view.setAlign(mode)
      }
      Prop("selectable") { view: TajweedTextView, value: Boolean ->
        view.setSelectable(value)
      }
    }
  }
}
