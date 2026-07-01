/**
 * AyahLinkedText — ders metnindeki iki tür bağlantıyı tıklanabilir yapar:
 *  1) Kur'an ayet referansları ("5/6", "33:21")  → /ayah/{sure}/{ayet}
 *  2) Uygulama-içi token'lar {{link:KEY|metin}}   → INTERNAL_LINKS[KEY] route'u
 * Bağlantı yoksa düz <Text> gibi davranır (ekstra maliyet yok). Bilinmeyen
 * token KEY'i → düz metin (bozuk link sızmaz).
 */
import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { router } from "expo-router";
import { parseAyahRefs } from "../lib/ayahRefs";
import { splitInternalTokens, resolveInternalLink } from "../lib/internalLinks";
import { api } from "../lib/api";

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  linkColor?: string;
};

const linkTextStyle = (color: string): TextStyle => ({
  color,
  fontWeight: "700",
  textDecorationLine: "underline",
});

export function AyahLinkedText({ children, style, linkColor = "#c9a84c" }: Props) {
  const text = children ?? "";
  const parts = splitInternalTokens(text);

  // Hiç bağlantı yoksa (token de ayet ref de) → tek Text.
  const hasLink =
    parts.some((p) => p.type === "link" && resolveInternalLink(p.key)) ||
    parts.some((p) => p.type === "text" && parseAyahRefs(p.value).some((s) => s.type === "ayah"));
  if (!hasLink) return <Text style={style}>{text}</Text>;

  const nodes: React.ReactNode[] = [];
  parts.forEach((part, pi) => {
    if (part.type === "link") {
      const href = resolveInternalLink(part.key);
      if (!href) { nodes.push(part.label); return; } // bilinmeyen key → düz metin
      nodes.push(
        <Text
          key={`l${pi}`}
          style={linkTextStyle(linkColor)}
          onPress={() => router.push(href as never)}
          accessibilityRole="link"
          accessibilityLabel={`${part.label} — aç`}
        >
          {part.label}
        </Text>,
      );
      return;
    }
    // Düz metin parçası → içindeki ayet ref'lerini linkle.
    parseAyahRefs(part.value).forEach((seg, si) => {
      if (seg.type === "ayah") {
        nodes.push(
          <Text
            key={`a${pi}-${si}`}
            style={linkTextStyle(linkColor)}
            onPressIn={() => { api.ayah.get(seg.surahId, seg.ayahNumber).catch(() => {}); }}
            onPress={() => router.push(`/ayah/${seg.surahId}/${seg.ayahNumber}`)}
            accessibilityRole="link"
            accessibilityLabel={`${seg.surahId}. sure ${seg.ayahNumber}. ayete git`}
          >
            {seg.value}
          </Text>,
        );
      } else {
        nodes.push(<Text key={`t${pi}-${si}`}>{seg.value}</Text>);
      }
    });
  });

  return <Text style={style}>{nodes}</Text>;
}
