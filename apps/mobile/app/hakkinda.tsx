import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";

const APP_VERSION = Constants.expoConfig?.version ?? "—";

const SOURCES = [
  { icon: "🕌", name: "Tanzil.net",                desc: "Kuran metni (Uthmani yazım)",                url: "https://tanzil.net" },
  { icon: "🔬", name: "Quranic Corpus",             desc: "Kelime kökü ve morfoloji analizi",           url: "https://corpus.quran.com" },
  { icon: "✨", name: "AlQuran.cloud",              desc: "Tecvid renklendirme verileri",               url: "https://alquran.cloud" },
  { icon: "📚", name: "Sunnah.com",                desc: "Hadis kaynakları (Buhari, Müslim)",          url: "https://sunnah.com" },
  { icon: "🏛️", name: "Diyanet İşleri Başkanlığı", desc: "Türkçe meal ve namaz bilgileri",            url: "https://diyanet.gov.tr" },
  { icon: "📖", name: "TDV İslam Ansiklopedisi",    desc: "Peygamber kıssaları ve fıkhi bilgiler",     url: "https://islamansiklopedisi.org.tr" },
  { icon: "🕐", name: "Aladhan.com",                desc: "Namaz vakitleri API",                        url: "https://aladhan.com" },
];

export default function HakkindaScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.sectionTitle, { color: c.accent }]}>📖 Kaynaklar & Referanslar</Text>
        {SOURCES.map((src) => (
          <TouchableOpacity
            key={src.name}
            style={[s.sourceCard, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => { Haptics.selectionAsync(); Linking.openURL(src.url); }}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={`${src.name}: ${src.desc}`}
            accessibilityHint="Web sitesini açar"
          >
            <Text style={s.sourceIcon}>{src.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.sourceName, { color: c.text }]}>{src.name}</Text>
              <Text style={[s.sourceDesc, { color: c.textMuted }]}>{src.desc}</Text>
            </View>
            <Text style={[s.arrow, { color: c.textMuted }]}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={[s.sectionTitle, { color: c.accent, marginTop: 24 }]}>ℹ️ Uygulama Hakkında</Text>
        <View style={[s.infoBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.infoRow}>
            <Text style={[s.infoLabel, { color: c.textMuted }]}>Versiyon</Text>
            <Text style={[s.infoValue, { color: c.text }]}>{APP_VERSION}</Text>
          </View>
          <View style={[s.infoRow, s.infoRowBorder, { borderColor: c.border }]}>
            <Text style={[s.infoLabel, { color: c.textMuted }]}>Geliştirici</Text>
            <Text style={[s.infoValue, { color: c.text }]}>Bağımsız geliştirici</Text>
          </View>
          <Text style={[s.infoNote, { color: c.textMuted, borderTopColor: c.border }]}>
            Bu uygulama reklamsız ve ücretsizdir.{"\n\n"}
            İçerikler güvenilir İslami kaynaklardan derlenerek mezhep görüşleri ve hadis sıhhat notlarıyla zenginleştirilmiştir.
          </Text>
        </View>

        <Text style={[s.sectionTitle, { color: c.accent, marginTop: 24 }]}>📬 İletişim & Geri Bildirim</Text>
        <View style={[s.infoBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.contactNote, { color: c.textMuted }]}>Öneri ve geri bildirimleriniz için:</Text>
          <TouchableOpacity
            style={[s.mailBtn, { backgroundColor: c.accent + "20" }]}
            onPress={() => Linking.openURL("mailto:kuranyolu.iletisim@gmail.com")}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="E-posta gönder"
          >
            <Text style={[s.mailBtnText, { color: c.accent }]}>kuranyolu.iletisim@gmail.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content:       { padding: 16, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  sectionTitle:  { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  sourceCard:    { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  sourceIcon:    { fontSize: 22 },
  sourceName:    { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  sourceDesc:    { fontSize: 12, lineHeight: 17 },
  arrow:         { fontSize: 20 },
  infoBox:       { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  infoRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: { borderTopWidth: 1 },
  infoLabel:     { fontSize: 13 },
  infoValue:     { fontSize: 13, fontWeight: "600" },
  infoNote:      { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1 },
  contactNote:   { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  mailBtn:       { marginHorizontal: 14, marginBottom: 14, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  mailBtnText:   { fontSize: 13, fontWeight: "600" },
});
