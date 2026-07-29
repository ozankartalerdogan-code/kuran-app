import React from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { tajweedPartsFromSpans, type TajweedSpan } from "../lib/tajweed";

// Tecvid bölme/renk mantığı SAF modülde (lib/tajweed.ts) — test edilir.
//
// Metin HER ZAMAN canonical Tanzil metnidir; tecvid yalnız renk katar.
// Eskiden AlQuran markup metni basılıyordu: o metin canonical'dan farklı
// (6236 ayetin 4280'inde) ve grup sınırları harf ile harekesinin arasından
// geçtiği için ayrı <Text>'e düşen işaret Android'de noktalı daire olarak
// çiziliyordu (ekranda renkli benek). Span'lar canonical koordinatlarda gelir.

export function TajweedText({
  text,
  spans,
  style,
}: {
  text: string;
  spans?: readonly TajweedSpan[];
  style?: StyleProp<TextStyle>;
}) {
  const parcalar = spans?.length ? tajweedPartsFromSpans(text, spans) : null;
  return (
    <Text style={style} selectable>
      {parcalar
        ? parcalar.map((p, i) =>
            p.color
              ? <Text key={i} style={{ color: p.color }}>{p.t}</Text>
              : p.t,
          )
        : text}
    </Text>
  );
}
