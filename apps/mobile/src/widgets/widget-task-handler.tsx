// Android widget yaşam döngüsü (eklenme/yeniden boyutlanma/periyodik güncelleme/
// tıklama) burada tek noktadan handle edilir. Native taraf bunu headless JS görevi
// olarak tetikler — index.js'te registerWidgetTaskHandler ile kaydedilir.
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { buildEmirWidgetRepresentation } from "./EmirAyetWidget";
import { currentEmirAyet, randomEmirAyet, WIDGET_NAME } from "./emirRotation";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  // Bu görev şu an tek bir widget türü için kayıtlı, ama ileride ikinci bir
  // widget eklenirse yanlış bileşeni render etmesin diye ada göre erken çıkış.
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

  try {
    switch (props.widgetAction) {
      case "WIDGET_ADDED":
      case "WIDGET_UPDATE":
      case "WIDGET_RESIZED": {
        props.renderWidget(buildEmirWidgetRepresentation(currentEmirAyet()));
        break;
      }
      case "WIDGET_CLICK": {
        // OPEN_URI (gövde tıklaması) burada asla görünmez — native taraf JS'e
        // hiç dönmeden uygulamayı doğrudan açar. Yalnız özel "REFRESH_AYET"
        // (widget üstündeki ↻ ikonu) buraya düşer.
        if (props.clickAction === "REFRESH_AYET") {
          props.renderWidget(buildEmirWidgetRepresentation(randomEmirAyet()));
        }
        break;
      }
      case "WIDGET_DELETED":
      default:
        break;
    }
  } catch {
    // Headless görevde sessiz kal — widget bir sonraki tetiklemede (periyodik
    // güncelleme veya uygulama açılışı) tekrar denenir, uygulamayı etkilemez.
  }
}
