import React, { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SOURCE_LICENSE_CONTENT, getSourceLicenseLinks } from "../../../packages/core/src/presentation/sourceLicenses";
import { SOURCE_LICENSE_CONTENT_EN, getSourceLicenseLinksEn } from "../../../packages/core/src/presentation/sourceLicensesEn";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useStrings, getStrings, fmt, useLang, type Lang, caps } from "../src/i18n";
import hakkindaStrings from "../src/i18n/strings/hakkinda";

// İngilizce arayüzde kaynak/lisans metninin AI destekli İngilizce sürümü (sourceLicensesEn.ts).
function licenseContent(lang: Lang) {
  return lang === "en" ? SOURCE_LICENSE_CONTENT_EN : SOURCE_LICENSE_CONTENT;
}
function licenseLinks(lang: Lang, linkIds: readonly string[]) {
  return lang === "en" ? getSourceLicenseLinksEn(linkIds) : getSourceLicenseLinks(linkIds);
}

const APP_VERSION = Constants.expoConfig?.version ?? "-";
const CONTACT_MAIL = "kuranyolu.iletisim@gmail.com";

async function openExternalUrl(url: string) {
  const t = getStrings(hakkindaStrings);
  try {
    void Haptics.selectionAsync();
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(t.linkFailTitle, t.linkFailBody);
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    if (__DEV__) {
      console.warn("Failed to open external URL", error);
    }
    Alert.alert(t.linkFailTitle, t.linkFailRetry);
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();

  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: c.accent }]}>{caps(title)}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children, c }: { children: React.ReactNode; c: AppColors }) {
  return <Text style={[s.paragraph, { color: c.textSecondary }]}>{children}</Text>;
}

// İnce, kartsız akordiyon başlığı — açıldığında her kaynak ayrı kart olarak listelenir.
function SourcesAccordion({ c }: { c: AppColors }) {
  const t = useStrings(hakkindaStrings);
  const [open, setOpen] = useState(true);

  const toggle = () => {
    void Haptics.selectionAsync();
    setOpen((o) => !o);
  };

  const lang = useLang();
  return (
    <View style={[s.accordion, { borderTopColor: c.border, borderBottomColor: c.border }]}>
      <TouchableOpacity
        style={s.accordionHeader}
        onPress={toggle}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t.sourcesA11y}
        accessibilityHint={open ? t.hideHint : t.showHint}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[s.accordionTitle, { color: c.textSecondary }]}>{t.sources}</Text>
        <Text style={[s.accordionChevron, { color: c.textMuted }]}>{open ? "▴" : "▾"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.accordionBody}>
          {licenseContent(lang).sections.map((sourceSection) => (
            <View
              key={sourceSection.id}
              style={[s.sourceCard, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <Text style={[s.sourceSectionTitle, { color: c.text }]}>{sourceSection.title}</Text>
              <Paragraph c={c}>{sourceSection.body}</Paragraph>
              {licenseLinks(lang, sourceSection.linkIds).map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={[s.sourceLink, { borderTopColor: c.border }]}
                  onPress={() => void openExternalUrl(link.url)}
                  activeOpacity={0.65}
                  accessibilityRole="link"
                  accessibilityLabel={fmt(t.linkA11y, { title: link.title })}
                >
                  <Text style={[s.sourceLinkText, { color: c.accent }]}>
                    {link.title}{link.license ? ` · ${link.license}` : ""}
                  </Text>
                  <Text style={[s.sourceLinkArrow, { color: c.textMuted }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function HakkindaScreen() {
  const c = useColors();
  const t = useStrings(hakkindaStrings);
  const insets = useSafeAreaInsets();
  const lic = licenseContent(useLang());

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        // Üst boşluk kaydırılan içeriğin dışında: metin durum çubuğunun altına girmesin.
        style={{ flex: 1, backgroundColor: c.bg, marginTop: insets.top }}
        contentContainerStyle={[s.content, { paddingTop: 20, paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.pageTitle, { color: c.text }]}>{lic.title}</Text>
        <Text style={[s.pageIntro, { color: c.textMuted }]}>{lic.intro}</Text>

        <SourcesAccordion c={c} />

        <Section title={t.aboutApp}>
          <View style={[s.metaBox, { backgroundColor: c.card, borderColor: c.border }]}> 
            <View style={s.infoRow}>
              <Text style={[s.infoLabel, { color: c.textMuted }]}>{t.version}</Text>
              <Text style={[s.infoValue, { color: c.text }]}>{APP_VERSION}</Text>
            </View>
            <View style={[s.infoRow, s.infoRowBorder, { borderColor: c.border }]}> 
              <Text style={[s.infoLabel, { color: c.textMuted }]}>{t.developer}</Text>
              <Text style={[s.infoValue, { color: c.text }]}>{t.indie}</Text>
            </View>
            <Text style={[s.infoNote, { color: c.textMuted, borderTopColor: c.border }]}> 
              {t.aboutNote}
            </Text>
          </View>
        </Section>

        <Section title={t.contact}>
          <View style={[s.metaBox, { backgroundColor: c.card, borderColor: c.border }]}> 
            <Text style={[s.contactNote, { color: c.textMuted }]}>{t.contactNote}</Text>
            <TouchableOpacity
              style={[s.mailBtn, { backgroundColor: c.accent + "20" }]}
              onPress={() => void openExternalUrl(`mailto:${CONTACT_MAIL}`)}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={t.emailA11y}
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
  pageIntro: { fontSize: 14, lineHeight: 21, marginTop: -10, marginBottom: 4 },
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
  sourceCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  sourceSectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sourceLinkText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  sourceLinkArrow: { marginLeft: 8, fontSize: 18 },
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
