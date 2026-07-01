/**
 * AyahLinkedText — içindeki Kur'an ayet referanslarını ("5/6", "33:21")
 * tıklanabilir linke çevirir; dokununca ilgili ayet detayına gider.
 * Referans yoksa düz <Text> gibi davranır (ekstra maliyet yok).
 */
import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { router } from "expo-router";
import { parseAyahRefs } from "../lib/ayahRefs";
import { api } from "../lib/api";

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  linkColor?: string;
};

export function AyahLinkedText({ children, style, linkColor = "#c9a84c" }: Props) {
  const segments = parseAyahRefs(children ?? "");

  // Hızlı yol: hiç referans yoksa tek Text.
  if (!segments.some((s) => s.type === "ayah")) {
    return <Text style={style}>{children}</Text>;
  }

  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.type === "ayah" ? (
          <Text
            key={i}
            style={{ color: linkColor, fontWeight: "700", textDecorationLine: "underline" }}
            // Parmak değince veriyi ısıt → bırakınca sayfa çoğu zaman hazır.
            onPressIn={() => { api.ayah.get(seg.surahId, seg.ayahNumber).catch(() => {}); }}
            onPress={() => router.push(`/ayah/${seg.surahId}/${seg.ayahNumber}`)}
            accessibilityRole="link"
            accessibilityLabel={`${seg.surahId}. sure ${seg.ayahNumber}. ayete git`}
          >
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        ),
      )}
    </Text>
  );
}
