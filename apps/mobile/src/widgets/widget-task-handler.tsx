// Android widget yaşam döngüsü (eklenme/yeniden boyutlanma/periyodik güncelleme/
// tıklama) burada tek noktadan handle edilir. Native taraf bunu headless JS görevi
// olarak tetikler — index.js'te registerWidgetTaskHandler ile kaydedilir.
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { getWidgetInfo } from "react-native-android-widget";
import { cancelWidgetTick } from "../../modules/exact-alarm";
import { planPrayerWidgetTick } from "./widgetTick";
import { buildEmirWidgetRepresentation } from "./EmirAyetWidget";
import { currentEmirAyet, randomEmirAyet, WIDGET_NAME } from "./emirRotation";
import { PRAYER_WIDGET_NAMES, readNamazWidgetData } from "./namazWidgetData";
import { buildNamazWidgetRepresentation } from "./NamazWidget";
import { applyWidgetTheme, readWidgetThemePreference } from "./widgetTheme";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    const prayerName = PRAYER_WIDGET_NAMES.find(name => name === props.widgetInfo.widgetName);
    if (prayerName) {
      if (["WIDGET_ADDED", "WIDGET_UPDATE", "WIDGET_RESIZED"].includes(props.widgetAction)) {
        const [data, pref] = await Promise.all([readNamazWidgetData(), readWidgetThemePreference()]);
        props.renderWidget(applyWidgetTheme(buildNamazWidgetRepresentation(prayerName, data, props.widgetInfo.height), pref));
        planPrayerWidgetTick(data);
      } else if (props.widgetAction === "WIDGET_DELETED") {
        const remaining = (await Promise.all(PRAYER_WIDGET_NAMES.map(name => getWidgetInfo(name)))).flat();
        // Some launchers may still report the ID whose deletion is in flight.
        if (!remaining.some(info => info.widgetId !== props.widgetInfo.widgetId)) cancelWidgetTick();
      }
      return;
    }
    if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

    switch (props.widgetAction) {
      case "WIDGET_ADDED":
      case "WIDGET_UPDATE":
      case "WIDGET_RESIZED": {
        const pref = await readWidgetThemePreference();
        props.renderWidget(applyWidgetTheme(buildEmirWidgetRepresentation(currentEmirAyet(), props.widgetInfo.height), pref));
        break;
      }
      case "WIDGET_CLICK": {
        // OPEN_URI (gövde tıklaması) burada asla görünmez — native taraf JS'e
        // hiç dönmeden uygulamayı doğrudan açar. Yalnız özel "REFRESH_AYET"
        // (widget üstündeki ↻ ikonu) buraya düşer.
        if (props.clickAction === "REFRESH_AYET") {
          const pref = await readWidgetThemePreference();
          props.renderWidget(applyWidgetTheme(buildEmirWidgetRepresentation(randomEmirAyet(), props.widgetInfo.height), pref));
        }
        break;
      }
      case "WIDGET_DELETED":
      default:
        break;
    }
  } catch (error) {
    // Log only (logcat ReactNativeJS) so an empty widget is diagnosable.
    console.warn("[widget]", props.widgetInfo.widgetName, props.widgetAction, error);
    // Headless görevde sessiz kal — widget bir sonraki tetiklemede (periyodik
    // güncelleme veya uygulama açılışı) tekrar denenir, uygulamayı etkilemez.
  }
}
