import React, { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";

const APP_VERSION = Constants.expoConfig?.version ?? "-";
const CONTACT_MAIL = "kuranyolu.iletisim@gmail.com";
const TANZIL_URL = "https://tanzil.net/";
const QAC_URL = "https://corpus.quran.com/";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();

  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: c.accent }]}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children, c }: { children: React.ReactNode; c: AppColors }) {
  return <Text style={[s.paragraph, { color: c.textSecondary }]}>{children}</Text>;
}

// İnce, kartsız akordiyon — yalnız üst/alt ince çizgi, arka plan/kenarlık yok.
function SourcesAccordion({ c }: { c: AppColors }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    void Haptics.selectionAsync();
    setOpen((o) => !o);
  };

  return (
    <View style={[s.accordion, { borderTopColor: c.border, borderBottomColor: c.border }]}>
      <TouchableOpacity
        style={s.accordionHeader}
        onPress={toggle}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Kaynaklar ve kullanım açıklamaları"
        accessibilityHint={open ? "Açıklamaları gizler" : "Açıklamaları gösterir"}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[s.accordionTitle, { color: c.textSecondary }]}>Kaynaklar ve kullanım açıklamaları</Text>
        <Text style={[s.accordionChevron, { color: c.textMuted }]}>{open ? "▴" : "▾"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.accordionBody}>
          <Paragraph c={c}>
            <Text style={s.bold}>Kur'an-ı Kerim Arapça metni:</Text>
          </Paragraph>
          <Paragraph c={c}>
            Tanzil Quran Text — Uthmani 1.1, CC BY 3.0 lisansıyla ve Tanzil.net kaynak gösterilerek sunulur.
            Kur'an metni indirilen kanonik Unicode dizisi korunarak değiştirilmeden kullanılmaktadır.
          </Paragraph>
          <Paragraph c={c}>
            <Text style={s.bold}>Meal ve orijinal tefsir kaynağı:</Text> Elmalılı Hamdi Yazır, Hak Dini Kur'an Dili.
          </Paragraph>
          <Paragraph c={c}>
            Sade tefsir açıklamaları, Elmalılı Hamdi Yazır'ın orijinal tefsir metni esas alınarak Kuran Yolu için daha anlaşılır
            bir dille yeniden düzenlenmiştir. Bu açıklamalar bilgilendirme amaçlıdır; fetva niteliği taşımaz.
          </Paragraph>
          <Paragraph c={c}>
            Kelime kökleri ve morfolojik çözümlemelerde Quranic Arabic Corpus verilerinden yararlanılmıştır. Türkçe
            anlamlandırma, kök düzeltmeleri, veri temizliği ve kullanıcı dostu morfoloji gösterimi Kuran Yolu analiz altyapısı ile
            ayrıca hazırlanmıştır.
          </Paragraph>
          <Paragraph c={c}>
            Hadis içeriklerinde klasik hadis kaynaklarından yararlanılmıştır. Açıklama ve sunum metinleri Kuran Yolu için
            sadeleştirilmiş bilgilendirme diliyle hazırlanmıştır.
          </Paragraph>
        </View>
      )}
    </View>
  );
}

export default function HakkindaScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  async function openExternalUrl(url: string) {
    try {
      void Haptics.selectionAsync();
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Bağlantı açılamadı", "Bu bağlantı şu anda cihazınızda açılamıyor.");
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.warn("Failed to open external URL", error);
      Alert.alert("Bağlantı açılamadı", "Lütfen daha sonra tekrar deneyin.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.pageTitle, { color: c.text }]}>Kaynaklar ve Açıklamalar</Text>

        <Section title="Tanzil Quran Text">
          <TouchableOpacity
            style={[s.sourceCard, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => void openExternalUrl(TANZIL_URL)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="Tanzil Quran Text bağlantısı"
            accessibilityHint="Web sitesini açar"
          >
            <Text style={s.sourceIcon}>🕌</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.sourceName, { color: c.text }]}>Tanzil Quran Text</Text>
              <Text style={[s.sourceDesc, { color: c.textMuted }]}>Uthmani 1.1 · CC BY 3.0</Text>
              <Text style={[s.sourceDesc, { color: c.textMuted }]}>{TANZIL_URL}</Text>
            </View>
            <Text style={[s.arrow, { color: c.textMuted }]}>›</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Quranic Arabic Corpus">
          <TouchableOpacity
            style={[s.sourceCard, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => void openExternalUrl(QAC_URL)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="Quranic Arabic Corpus bağlantısı"
            accessibilityHint="Web sitesini açar"
          >
            <Text style={s.sourceIcon}>🔬</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.sourceName, { color: c.text }]}>Quranic Arabic Corpus</Text>
              <Text style={[s.sourceDesc, { color: c.textMuted }]}>{QAC_URL}</Text>
            </View>
            <Text style={[s.arrow, { color: c.textMuted }]}>›</Text>
          </TouchableOpacity>
        </Section>

        <SourcesAccordion c={c} />

        <Section title="Uygulama Hakkında">
          <View style={[s.metaBox, { backgroundColor: c.card, borderColor: c.border }]}> 
            <View style={s.infoRow}>
              <Text style={[s.infoLabel, { color: c.textMuted }]}>Versiyon</Text>
              <Text style={[s.infoValue, { color: c.text }]}>{APP_VERSION}</Text>
            </View>
            <View style={[s.infoRow, s.infoRowBorder, { borderColor: c.border }]}> 
              <Text style={[s.infoLabel, { color: c.textMuted }]}>Geliştirici</Text>
              <Text style={[s.infoValue, { color: c.text }]}>Bağımsız geliştirici</Text>
            </View>
            <Text style={[s.infoNote, { color: c.textMuted, borderTopColor: c.border }]}> 
              Bu bölümde yer alan kaynak ve açıklamalar kullanıcıya şeffaf referans sunmak için hazırlanmıştır. Metinler
              bilgilendirme amaçlıdır.
            </Text>
          </View>
        </Section>

        <Section title="İletişim & Geri Bildirim">
          <View style={[s.metaBox, { backgroundColor: c.card, borderColor: c.border }]}> 
            <Text style={[s.contactNote, { color: c.textMuted }]}>Öneri ve geri bildirimleriniz için:</Text>
            <TouchableOpacity
              style={[s.mailBtn, { backgroundColor: c.accent + "20" }]}
              onPress={() => void openExternalUrl(`mailto:${CONTACT_MAIL}`)}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel="E-posta gönder"
            >
              <Text style={[s.mailBtnText, { color: c.accent }]}>{CONTACT_MAIL}</Text>
            </TouchableOpacity>
          </View>
        </Section>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  pageTitle: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  paragraph: { fontSize: 14, lineHeight: 22, paddingHorizontal: 2, marginBottom: 12 },
  // Kartsız ince akordiyon: yalnız üst/alt kıl çizgi, dolgu/kenarlık/radius yok.
  accordion: {
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 2,
  },
  accordionTitle: { fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },
  accordionChevron: { fontSize: 12, marginLeft: 8 },
  accordionBody: { paddingTop: 2, paddingBottom: 4 },
  bold: { fontWeight: "700" },
  sourceCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  sourceIcon: { fontSize: 22 },
  sourceName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  sourceDesc: { fontSize: 12, lineHeight: 17 },
  arrow: { fontSize: 20 },
  metaBox: { borderRadius: 12, borderWidth: 1, overflow: "hidden", paddingVertical: 14 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: { borderTopWidth: 1 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: "600" },
  infoNote: { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1 },
  contactNote: { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingTop: 0, paddingBottom: 8 },
  mailBtn: { marginHorizontal: 14, marginBottom: 0, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  mailBtnText: { fontSize: 13, fontWeight: "600" },
});
