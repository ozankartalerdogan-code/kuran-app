import React, { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import {
  canScheduleExactAlarms,
  isPrayerWidgetAvailable,
  openExactAlarmSettings,
  reconcilePrayerWidget,
} from "../modules/prayer-widget";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: c.accent }]}>{title}</Text>
      {children}
    </View>
  );
}

function Step({ n, text, c }: { n: number; text: string; c: AppColors }) {
  return (
    <View style={s.stepRow}>
      <View style={[s.stepBadge, { backgroundColor: c.accent }]}>
        <Text style={s.stepBadgeText}>{n}</Text>
      </View>
      <Text style={[s.stepText, { color: c.textSecondary }]}>{text}</Text>
    </View>
  );
}

// Canlı geri sayımın exact alarm izni durumu kartı.
// Otomatik sistem ekranı AÇILMAZ: kullanıcı butona bastığında ikinci bir onay
// penceresi gösterilmeden doğrudan Android'in "Alarmlar ve hatırlatıcılar" ayarı
// açılır; uygulamaya dönüşte durum yeniden okunur ve widget tazelenir. API 31
// öncesinde bu izin kavramı olmadığından kart hiç gösterilmez (bkz. çağıran taraf).
function CanliSayacKarti({ c }: { c: AppColors }) {
  const [izinVar, setIzinVar] = useState(() => canScheduleExactAlarms());

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      // Sistem ayarından dönüş — durumu yeniden kontrol et, görünümü tazele.
      setIzinVar(canScheduleExactAlarms());
      reconcilePrayerWidget();
    });
    return () => sub.remove();
  }, []);

  const izinIste = useCallback(() => {
    const acildi = openExactAlarmSettings();
    if (!acildi) {
      Alert.alert(
        "Ayarlar açılamadı",
        "“Alarmlar ve hatırlatıcılar” ayarını cihazınızın uygulama ayarlarından manuel olarak açabilirsiniz.",
        [{ text: "Tamam" }],
      );
    }
  }, []);

  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 10 }]}>
      {izinVar ? (
        <>
          <Text style={[s.cardTitle, { color: c.accent }]}>Canlı geri sayım aktif</Text>
          <Text style={[s.paragraph, { color: c.textSecondary, marginTop: 4 }]}>
            Namaz vakti widget'ı sıradaki vakte kalan süreyi saniye saniye gösteriyor.
          </Text>
        </>
      ) : (
        <>
          <Text style={[s.cardTitle, { color: "#b45309" }]}>Canlı geri sayım kapalı</Text>
          <Text style={[s.paragraph, { color: c.textSecondary, marginTop: 4 }]}>
            Namaz vakti widget'ı şu anda yalnızca sıradaki vakti ve saatini gösteriyor. Sıradaki vakte kalan süreyi
            saniye saniye görmek için Android'in “Alarmlar ve hatırlatıcılar” erişimini açın.
          </Text>
          <Text style={[s.smallText, { color: c.textMuted }]}>
            Bu erişim yalnızca widget sayacının vakit değişimlerinde zamanında yenilenmesi için kullanılır.
          </Text>
          <Pressable
            onPress={izinIste}
            accessibilityRole="button"
            style={({ pressed }) => [s.permButton, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={s.permButtonText}>Canlı sayacı etkinleştir</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export default function WidgetEkleScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";
  // Native modül ancak yeni build'de var — eski build'de namaz widget'ı bölümü
  // gösterilmez (widget da eklenemezdi zaten), yalnız Emir Ayetleri anlatılır.
  const namazWidgetVar = isAndroid && isPrayerWidgetAvailable;
  // Exact alarm izni kavramı yalnız Android 12 (API 31) ve üzerinde var;
  // altındaki sürümlerde kart hiç gösterilmez.
  const canliSayacKartiVar = namazWidgetVar && typeof Platform.Version === "number" && Platform.Version >= 31;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.pageTitle, { color: c.text }]}>Ana Ekran Widget'ları</Text>

        {namazWidgetVar ? (
          <Section title="Namaz Vakitleri">
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[s.paragraph, { color: c.textSecondary }]}>
                Sıradaki namaz vaktini ve kalan süreyi ana ekranında gösterir. Vakit girdiğinde sayaç kendiliğinden bir
                sonraki vakte geçer; dokununca uygulamadaki namaz ekranı açılır.
              </Text>
            </View>
            {canliSayacKartiVar ? <CanliSayacKarti c={c} /> : null}
          </Section>
        ) : null}

        <Section title="Emir Ayetleri">
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.paragraph, { color: c.textSecondary }]}>
              Kur'an'dan emir kipiyle gelen ayetleri (Allah'ın emirleri) ana ekranında gösteren bir widget. İçerik günde 6 kez
              otomatik değişir; ayete dokununca uygulamada açılır, widget üstündeki ↻ ile de anında farklı bir ayet
              gösterebilirsin.
            </Text>
          </View>
        </Section>

        {isAndroid ? (
          <Section title="Nasıl Eklerim?">
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Step n={1} text="Telefonunun ana ekranında boş bir alana basılı tut." c={c} />
              <Step n={2} text="Açılan menüden “Widget'lar” (veya “Bileşenler”) seçeneğine dokun." c={c} />
              <Step n={3} text="Listede “Kuran Yolu” uygulamasını bul." c={c} />
              <Step
                n={4}
                text={
                  namazWidgetVar
                    ? "“Namaz Vakitleri” veya “Emir Ayetleri” widget'ını ana ekrana sürükle."
                    : "“Emir Ayetleri” widget'ını ana ekrana sürükle."
                }
                c={c}
              />
            </View>
          </Section>
        ) : (
          <Section title="Yakında">
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[s.paragraph, { color: c.textSecondary }]}>
                Ana ekran widget'ı şu an yalnızca Android'de mevcut. iOS desteği ayrı bir güncellemede planlanıyor.
              </Text>
            </View>
          </Section>
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  pageTitle: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  paragraph: { fontSize: 14, lineHeight: 22 },
  smallText: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  permButton: { marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  permButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
