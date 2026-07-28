import React from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { RENK, parseTajweed, segmentsFromSpans, type TajweedSpan } from "../lib/tajweed";

// Tecvid ayrıştırma + renk/lejant SAF modülde (lib/tajweed.ts) — test edilir.

type Props = {
  style?: StyleProp<TextStyle>;
  /** Canonical Tanzil metni — span'larla birlikte kullanılır (tercih edilen yol). */
  text?: string | null;
  /** Canonical tajweed_spans satırları. */
  spans?: readonly TajweedSpan[] | null;
  /** ESKİ kaynak: AlQuran.cloud ham markup'ı — yalnız span yoksa yedek. */
  markup?: string | null;
};

/**
 * Canonical span'lar varsa onlarla, yoksa eski ham markup'la renklendirir.
 * Her iki yol da aynı segment şeklini ürettiği için render kodu tektir ve
 * renkler iki yolda da RENK tablosundan gelir.
 */
export function TajweedText({ style, text, spans, markup }: Props) {
  const segs =
    text && spans && spans.length > 0
      ? segmentsFromSpans(text, spans)
      : markup
        ? parseTajweed(markup)
        : text
          ? [{ code: null as string | null, t: text }]
          : [];

  return (
    <Text style={style} selectable>
      {segs.map((s, i) =>
        s.code && RENK[s.code]
          ? <Text key={i} style={{ color: RENK[s.code] }}>{s.t}</Text>
          : <Text key={i}>{s.t}</Text>,
      )}
    </Text>
  );
}
