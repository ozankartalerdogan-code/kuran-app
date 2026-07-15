// GEÇİCİ TEŞHİS MODÜLÜ JS yüzü (H varyantı). Native view YENİ EAS build gerektirir —
// mevcut dev client/eski build'de requireNativeViewManager throw eder; prayer-widget
// ile aynı build-gated guard deseni: modül yoksa bileşen null döner, uygulama çökmez.
import React, { useState } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";

export type TajweedColorRange = { start: number; end: number; color: string };

type NativeProps = {
  text: string;
  ranges: TajweedColorRange[];
  /** Seçili ayet vurgusu vb. — BackgroundColorSpan (metric etkilemez). */
  highlightRanges?: TajweedColorRange[];
  fontSize?: number;
  lineHeight?: number;
  /** RN Text maxFontSizeMultiplier muadili — sistem yazı ölçeğini sınırlar (0/undefined = sınırsız). */
  maxFontSizeMultiplier?: number;
  textColor?: string;
  /** "justify" yalnız Android API 26+; altında sağa hizalı kalır. */
  textAlign?: "right" | "justify";
  selectable?: boolean;
  onMeasured?: (e: { nativeEvent: { height: number } }) => void;
  /** Dokunulan karakterin UTF-16 indeksi (mushaf'ta ayet seçimi için). */
  onCharPress?: (e: { nativeEvent: { index: number } }) => void;
  style?: StyleProp<ViewStyle>;
};

let NativeView: React.ComponentType<NativeProps> | null = null;
if (Platform.OS === "android") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { requireNativeViewManager } = require("expo-modules-core");
    NativeView = requireNativeViewManager("TajweedText");
  } catch {
    NativeView = null; // eski build — H varyantı görünmez, diğer bloklar etkilenmez
  }
}

export const isTajweedNativeAvailable = NativeView !== null;

/**
 * Tek Android TextView + tek SpannableStringBuilder + yalnız ForegroundColorSpan.
 * Yoga native içerik yüksekliğini bilemediği için native taraf ölçtüğü yüksekliği
 * onMeasured ile bildirir; burada style.height olarak geri uygulanır.
 */
export function TajweedNativeText({
  onCharPress,
  ...props
}: Omit<NativeProps, "onMeasured" | "style" | "onCharPress"> & {
  onCharPress?: (index: number) => void;
}) {
  const [height, setHeight] = useState(10);
  if (!NativeView) return null;
  return (
    <NativeView
      // RN, native içeriden gelen requestLayout'u güvenilir işlemez: metin/boyut
      // değişince view'ı remount ederiz → taze onLayout + onMeasured garanti
      // (yoksa A± büyütmede/sayfa verisi değişiminde yükseklik bayat kalıp metin kırpılır).
      key={`${props.fontSize ?? ""}:${props.lineHeight ?? ""}:${props.text}`}
      {...props}
      style={{ width: "100%", height }}
      onMeasured={(e) => {
        const h = Math.ceil(e.nativeEvent.height);
        if (h > 0 && h !== height) setHeight(h);
      }}
      onCharPress={onCharPress ? (e) => onCharPress(e.nativeEvent.index) : undefined}
    />
  );
}
