import React, { useMemo } from "react";
import { Text, StyleSheet, type StyleProp, type TextStyle } from "react-native";
import {
  RENK,
  codePointSpansToUtf16Ranges,
  groupCanonicalTextByWord,
  type QuranCodePointSpan,
} from "../lib/tajweed";
import { TajweedNativeText, isTajweedNativeAvailable } from "../../modules/tajweed-text";

type Suffix = { text: string; color: string };

/** Render only canonical Tanzil text; generated tajweed ranges affect color. */
export function TajweedText({
  text,
  spans,
  style,
  suffix,
}: {
  text: string;
  spans: QuranCodePointSpan[];
  style?: StyleProp<TextStyle>;
  suffix?: Suffix;
}) {
  // Bağımlılıklar suffix nesnesinin kimliğine değil alanlarına bakar: çağıranlar
  // suffix'i satır içi literal olarak veriyor (her render'da yeni nesne) ve
  // nesne kimliğine bağlansaydı memo hiçbir zaman tutmazdı.
  const suffixText = suffix?.text;
  const suffixColor = suffix?.color;
  const nativePayload = useMemo(() => {
    const ranges = codePointSpansToUtf16Ranges(text, spans);
    if (suffixText === undefined || suffixColor === undefined) return { fullText: text, ranges };
    ranges.push({ start: text.length, end: text.length + suffixText.length, color: suffixColor });
    return { fullText: text + suffixText, ranges };
  }, [text, spans, suffixText, suffixColor]);

  if (isTajweedNativeAvailable) {
    const flat = StyleSheet.flatten(style) ?? {};
    const { fullText, ranges } = nativePayload;
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

  const words = groupCanonicalTextByWord(text, spans);
  return (
    <Text style={style} selectable>
      {words.map((word, index) =>
        word.code && RENK[word.code]
          ? <Text key={index} style={{ color: RENK[word.code] }}>{word.t}</Text>
          : <Text key={index}>{word.t}</Text>,
      )}
      {suffix ? <Text style={{ color: suffix.color }}>{suffix.text}</Text> : null}
    </Text>
  );
}
