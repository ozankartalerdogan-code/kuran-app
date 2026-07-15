import React from "react";
import { Text, StyleSheet, StyleProp, TextStyle } from "react-native";
import { RENK, parseTajweed, segmentsToRanges, groupSegmentsByWord } from "../lib/tajweed";
import { TajweedNativeText, isTajweedNativeAvailable } from "../../modules/tajweed-text";

// Tecvid ayrıştırma + renk/lejant SAF modülde (lib/tajweed.ts) — test edilir.
//
// RENDER YOLU (Android nested-Text shaping bug'ı — cihazda A/B ile kanıtlandı:
// kelime İÇİNE denk gelen her nested-Text sınırı Arapça harf bitişmesini kırar):
// 1) Android + yeni build: native tek-TextView/tek-Spannable renderer — harf
//    düzeyi renk hassasiyeti TAM, shaping bozulmaz.
// 2) Fallback (iOS / eski build): kelime-bazlı nested Text — kelime içinde asla
//    bölünme olmaz; renk kelime düzeyine iner (bilinçli ödün, metin bütünlüğü önce).

type Suffix = { text: string; color: string };

export function TajweedText({
  markup,
  style,
  suffix,
}: {
  markup: string;
  style?: StyleProp<TextStyle>;
  /** Mushaf tarzı ayet numarası (﴿٥﴾) — native yolda aynı string'e renkli aralık olarak eklenir. */
  suffix?: Suffix;
}) {
  const segs = parseTajweed(markup);

  if (isTajweedNativeAvailable) {
    const flat = StyleSheet.flatten(style) ?? {};
    const { text, ranges } = segmentsToRanges(segs);
    let fullText = text;
    if (suffix) {
      ranges.push({ start: fullText.length, end: fullText.length + suffix.text.length, color: suffix.color });
      fullText += suffix.text;
    }
    return (
      <TajweedNativeText
        text={fullText}
        ranges={ranges}
        fontSize={typeof flat.fontSize === "number" ? flat.fontSize : undefined}
        lineHeight={typeof flat.lineHeight === "number" ? flat.lineHeight : undefined}
        textColor={typeof flat.color === "string" ? flat.color : undefined}
        textAlign={flat.textAlign === "justify" ? "justify" : "right"}
        selectable
      />
    );
  }

  const kelimeler = groupSegmentsByWord(segs);
  return (
    <Text style={style} selectable>
      {kelimeler.map((s, i) =>
        s.code && RENK[s.code]
          ? <Text key={i} style={{ color: RENK[s.code] }}>{s.t}</Text>
          : <Text key={i}>{s.t}</Text>,
      )}
      {suffix ? <Text style={{ color: suffix.color }}>{suffix.text}</Text> : null}
    </Text>
  );
}
