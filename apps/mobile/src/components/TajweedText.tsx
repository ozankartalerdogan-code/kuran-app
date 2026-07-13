import React from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { RENK, parseTajweed } from "../lib/tajweed";

// Tecvid ayrıştırma + renk/lejant SAF modülde (lib/tajweed.ts) — test edilir.

export function TajweedText({ markup, style }: { markup: string; style?: StyleProp<TextStyle> }) {
  const segs = parseTajweed(markup);
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
