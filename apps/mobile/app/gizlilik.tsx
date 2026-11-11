/**
 * /gizlilik — Gizlilik Politikası (uygulama içi)
 * Web'deki /privacy sayfasıyla aynı içerik; çevrimdışı erişilebilir.
 * İçerik değişirse İKİ tarafı da güncelle: apps/web/src/app/privacy/page.tsx
 * Gövde metni src/data/content/gizlilik.json (+ .en.json) içindedir.
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { useStrings, fmt } from "../src/i18n";
import layoutStrings from "../src/i18n/strings/layout";
import { localizedData, useLocalizedData } from "../src/i18n/localizedData";
import gizlilikTr from "../src/data/content/gizlilik.json";
import {
  cloudBackupAvailable,
  deleteCloudBackup,
  enableCloudBackup,
  isCloudBackupDisabled,
} from "../src/lib/cloudBackup";

const CONTACT_MAIL = "kuranyolu.iletisim@gmail.com";

interface Parca { metin: string; kalin?: boolean }
interface Oge { tip: string; metin?: string; parcalar?: Parca[] }
interface GizlilikData {
  sonGuncelleme: string;
  tarih: string;
  meta: { gelistirici: string; gelistiriciAdi: string; iletisim: string; uygulama: string; uygulamaAdi: string };
  bolumler: { baslik: string; ogeler: Oge[] }[];
  eposta: { etiket: string; bulunamadiBaslik: string; bulunamadiMesaj: string };
  yedek: {
    kapaliParcalar: Parca[];
    yenidenAc: string;
    acilamadiBaslik: string;
    acilamadiMesaj: string;
    silOnayBaslik: string;
    silOnayMesaj: string;
    vazgec: string;
    sil: string;
    silindiBaslik: string;
    silindiMesaj: string;
    silinemediBaslik: string;
    silinemediMesaj: string;
    yedegimiSil: string;
  };
}

const pickGizlilik = localizedData(
  gizlilikTr as unknown as GizlilikData,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/content/gizlilik.en.json"),
);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={s.section}>
      <Text style={[s.h2, { color: c.accent }]}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children, c }: { children: React.ReactNode; c: AppColors }) {
  return <Text style={[s.p, { color: c.textSecondary }]}>{children}</Text>;
}

function Bullet({ children, c }: { children: React.ReactNode; c: AppColors }) {
  return (
    <View style={s.bulletRow}>
      <Text style={[s.bulletDot, { color: c.accent }]}>•</Text>
      <Text style={[s.p, s.bulletText, { color: c.textSecondary }]}>{children}</Text>
    </View>
  );
}

// Parçalar tek boşlukla birleştirilir; kalın parçalar kalın yazılır.
function Parcalar({ parcalar }: { parcalar: Parca[] }) {
  return (
    <>
      {parcalar.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 ? " " : null}
          {p.kalin ? <Text style={s.bold}>{p.metin}</Text> : p.metin}
        </React.Fragment>
      ))}
    </>
  );
}

// Play/App Store hesap-veri silme gereksinimi: bulut yedeği + anonim hesap
// uygulama İÇİNDEN silinebilmeli. Eski build'de (native modül yok) hiç görünmez.
function CloudBackupControls({ c, t }: { c: AppColors; t: GizlilikData["yedek"] }) {
  const [state, setState] = useState<"loading" | "active" | "disabled" | "busy">("loading");
  const danger = c.isDark ? "#f87171" : "#dc2626";

  useEffect(() => {
    isCloudBackupDisabled()
      .then((d) => setState(d ? "disabled" : "active"))
      .catch(() => setState("active"));
  }, []);

  if (!cloudBackupAvailable || state === "loading") return null;
  if (state === "busy") return <ActivityIndicator style={s.backupBusy} color={c.accent} />;

  if (state === "disabled") {
    return (
      <>
        <P c={c}>
          <Parcalar parcalar={t.kapaliParcalar} />
        </P>
        <TouchableOpacity
          style={[s.backupBtn, { borderColor: c.accent }]}
          onPress={async () => {
            setState("busy");
            try {
              await enableCloudBackup();
              setState("active");
            } catch {
              // Beklenmedik hata (initCloudBackup'tan sızan) — sonsuz spinner'da kalma.
              setState("disabled");
              Alert.alert(t.acilamadiBaslik, t.acilamadiMesaj);
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.yenidenAc}
        >
          <Text style={[s.backupBtnText, { color: c.accent }]}>{t.yenidenAc}</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <TouchableOpacity
      style={[s.backupBtn, { borderColor: danger }]}
      onPress={() => {
        Alert.alert(
          t.silOnayBaslik,
          t.silOnayMesaj,
          [
            { text: t.vazgec, style: "cancel" },
            {
              text: t.sil,
              style: "destructive",
              onPress: async () => {
                setState("busy");
                const ok = await deleteCloudBackup();
                setState(ok ? "disabled" : "active");
                if (ok) {
                  Alert.alert(t.silindiBaslik, t.silindiMesaj);
                } else {
                  Alert.alert(t.silinemediBaslik, t.silinemediMesaj);
                }
              },
            },
          ],
        );
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t.yedegimiSil}
    >
      <Text style={[s.backupBtnText, { color: danger }]}>{t.yedegimiSil}</Text>
    </TouchableOpacity>
  );
}

export default function GizlilikScreen() {
  const c = useColors();
  const ls = useStrings(layoutStrings);
  const D = useLocalizedData(pickGizlilik);
  const insets = useSafeAreaInsets();

  const renderOge = (o: Oge, i: number) => {
    const icerik = o.parcalar ? <Parcalar parcalar={o.parcalar} /> : o.metin;
    switch (o.tip) {
      case "altbaslik":
        return <Text key={i} style={[s.p, s.subhead, { color: c.text }]}>{o.metin}</Text>;
      case "madde":
        return <Bullet key={i} c={c}>{o.metin}</Bullet>;
      case "yedekKontrol":
        return <CloudBackupControls key={i} c={c} t={D.yedek} />;
      case "eposta":
        return (
          <TouchableOpacity
            key={i}
            style={[s.mailBtn, { backgroundColor: c.accent + "20" }]}
            // Posta uygulaması yoksa openURL reddedilir — sessiz hata yerine bilgi ver.
            onPress={() => {
              Linking.openURL(`mailto:${CONTACT_MAIL}`).catch(() => {
                Alert.alert(D.eposta.bulunamadiBaslik, fmt(D.eposta.bulunamadiMesaj, { email: CONTACT_MAIL }));
              });
            }}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={D.eposta.etiket}
          >
            <Text style={[s.mailBtnText, { color: c.accent }]}>{CONTACT_MAIL}</Text>
          </TouchableOpacity>
        );
      default:
        return <P key={i} c={c}>{icerik}</P>;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: ls.privacy }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.h1, { color: c.text }]}>{ls.privacy}</Text>
        <Text style={[s.updated, { color: c.textMuted }]}>{D.sonGuncelleme}: {D.tarih}</Text>

        <View style={[s.metaBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.meta, { color: c.textSecondary }]}>
            <Text style={s.bold}>{D.meta.gelistirici}:</Text> {D.meta.gelistiriciAdi}{"\n"}
            <Text style={s.bold}>{D.meta.iletisim}:</Text> {CONTACT_MAIL}{"\n"}
            <Text style={s.bold}>{D.meta.uygulama}:</Text> {D.meta.uygulamaAdi}
          </Text>
        </View>

        {D.bolumler.map((b, bi) => (
          <Section key={bi} title={b.baslik}>
            {b.ogeler.map(renderOge)}
          </Section>
        ))}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content:    { padding: 16, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  h1:         { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  updated:    { fontSize: 13, marginBottom: 20 },
  metaBox:    { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  meta:       { fontSize: 13, lineHeight: 21 },
  bold:       { fontWeight: "700" },
  section:    { marginTop: 24 },
  h2:         { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  p:          { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  subhead:    { fontWeight: "700", marginTop: 4 },
  bulletRow:  { flexDirection: "row", alignItems: "flex-start", marginBottom: 4, paddingRight: 4 },
  bulletDot:  { fontSize: 14, lineHeight: 22, marginRight: 8 },
  bulletText: { flex: 1, marginBottom: 0 },
  mailBtn:    { marginTop: 6, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  mailBtnText:{ fontSize: 14, fontWeight: "600" },
  backupBtn:     { marginTop: 4, marginBottom: 12, borderRadius: 8, borderWidth: 1.5, paddingVertical: 11, alignItems: "center" },
  backupBtnText: { fontSize: 14, fontWeight: "700" },
  backupBusy:    { marginVertical: 14 },
});
