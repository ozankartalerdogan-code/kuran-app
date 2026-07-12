/**
 * /gizlilik — Gizlilik Politikası (uygulama içi)
 * Web'deki /privacy sayfasıyla aynı içerik; çevrimdışı erişilebilir.
 * İçerik değişirse İKİ tarafı da güncelle: apps/web/src/app/privacy/page.tsx
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, type AppColors } from "../src/hooks/useColors";
import { READING_MAX_WIDTH } from "../src/lib/layout";

const LAST_UPDATED = "12 Temmuz 2026";
const CONTACT_MAIL = "kuranyolu.iletisim@gmail.com";

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

export default function GizlilikScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: "Gizlilik Politikası" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.h1, { color: c.text }]}>Gizlilik Politikası</Text>
        <Text style={[s.updated, { color: c.textMuted }]}>Son Güncelleme: {LAST_UPDATED}</Text>

        <View style={[s.metaBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.meta, { color: c.textSecondary }]}>
            <Text style={s.bold}>Geliştirici:</Text> Kartal Studio{"\n"}
            <Text style={s.bold}>İletişim:</Text> {CONTACT_MAIL}{"\n"}
            <Text style={s.bold}>Uygulama:</Text> Kuran Yolu - İslam'ı Öğren
          </Text>
        </View>

        <Section title="1. Toplanan Veriler">
          <Text style={[s.p, s.subhead, { color: c.text }]}>Firebase Analytics aracılığıyla otomatik toplanan:</Text>
          <Bullet c={c}>Uygulama kullanım istatistikleri (hangi ekranlar açıldı)</Bullet>
          <Bullet c={c}>Cihaz türü ve işletim sistemi versiyonu</Bullet>
          <Bullet c={c}>Uygulama versiyonu</Bullet>
          <Bullet c={c}>Anonim kullanıcı kimliği</Bullet>

          <Text style={[s.p, s.subhead, { color: c.text }]}>Cihazınızda saklanan ve bulut yedeğine dahil edilen:</Text>
          <Bullet c={c}>Favori ayetler</Bullet>
          <Bullet c={c}>Kişisel notlar</Bullet>
          <Bullet c={c}>Hatim takibi ve okuma konumu (yer imi)</Bullet>
          <Bullet c={c}>Ders ve elifba ilerlemesi</Bullet>
          <Bullet c={c}>Günlük seri (streak) bilgisi</Bullet>
          <Bullet c={c}>Bazı uygulama tercihleri (gece modu, yazı boyutu, tecvid)</Bullet>

          <P c={c}>
            Bu veriler öncelikle cihazınızda saklanır. Favori veya not eklenmiş ayetlerin meal ve ayet
            bilgilerini gösterebilmek için ilgili ayet anahtarları uygulama API'sine iletilebilir.
          </P>

          <P c={c}>
            <Text style={s.bold}>Bulut yedekleme (Firebase):</Text> Yukarıdaki veriler, uygulamayı kaldırıp
            yeniden kurduğunuzda veya yeni bir cihaza geçtiğinizde ilerlemenizin kaybolmaması için Google
            Firebase (Cloud Firestore) altyapısında yedeklenir. Bu yedek; ad-soyad, e-posta veya telefon
            numarası gibi hiçbir kimlik bilgisi istenmeden oluşturulan anonim bir kimlikle (Firebase Anonymous
            Authentication) eşleştirilir. Yedeğinize erişim, güvenlik kurallarıyla yalnızca sizin anonim
            kimliğinizle sınırlandırılmıştır; iletim HTTPS ile şifrelenir. Not metinleriniz dahil yedek içeriği
            reklam, profilleme veya analitik amaçla kullanılmaz, üçüncü taraflarla paylaşılmaz. Yedeğinizin
            silinmesini istediğinizde aşağıdaki iletişim adresinden talep edebilirsiniz.
          </P>
          <P c={c}>
            <Text style={s.bold}>Android sistem yedeği:</Text> Ayrıca Android'in sistem yedekleme özelliği
            açıksa bu cihaz-içi veriler, cihazınızın bağlı olduğu Google Drive hesabınıza da otomatik
            yedeklenebilir. Bu yedek Google tarafından yönetilir ve cihaz ayarlarınızdan kapatılabilir.
          </P>
          <P c={c}>
            <Text style={s.bold}>Konum verisi:</Text> Namaz vakitleri ve kıble yönü için yaklaşık (şehir düzeyi)
            konum kullanılır; hassas (GPS) konum kullanılmaz. Kıble yönü tamamen cihazınızda hesaplanır. Namaz
            vakitlerini hesaplamak için yaklaşık konumunuz, üçüncü taraf Aladhan.com servisine gönderilir. Konum
            verisi bizim sunucularımızda saklanmaz.
          </P>
          <P c={c}>
            <Text style={s.bold}>Arama verisi:</Text> Uygulama içindeki arama özelliği kullanıldığında, arama
            sorgusu yalnızca arama sonuçlarını getirmek amacıyla uygulama sunucusuna iletilebilir. Arama sorguları
            reklam hedefleme veya kullanıcı profili oluşturma amacıyla kullanılmaz; Firebase Analytics'e arama
            metni gönderilmez.
          </P>
          <P c={c}>
            <Text style={s.bold}>Reklam kimliği:</Text> Uygulama reklam içermez ve reklam kimliğinizi (Advertising ID)
            toplamaz.
          </P>
          <P c={c}>
            <Text style={s.bold}>Mikrofon:</Text> Uygulama mikrofon erişimi istemez ve ses kaydı yapmaz.
          </P>
        </Section>

        <Section title="2. Verilerin Kullanımı">
          <P c={c}>Toplanan veriler yalnızca şu amaçlarla kullanılır:</P>
          <Bullet c={c}>Uygulama performansını iyileştirmek</Bullet>
          <Bullet c={c}>Hata tespiti ve düzeltme</Bullet>
          <Bullet c={c}>Kullanıcı deneyimini geliştirmek</Bullet>
          <P c={c}><Text style={s.bold}>Verileriniz asla üçüncü taraflara satılmaz.</Text></P>
        </Section>

        <Section title="3. Üçüncü Taraf Hizmetler">
          <P c={c}>Uygulama aşağıdaki üçüncü taraf hizmetleri kullanır:</P>
          <Bullet c={c}>Firebase Analytics — Kullanım istatistikleri</Bullet>
          <Bullet c={c}>Firebase Authentication — Bulut yedeğin size özel eşleştirilmesi için anonim kimlik</Bullet>
          <Bullet c={c}>Cloud Firestore — Bulut yedek depolama</Bullet>
          <Bullet c={c}>Sentry — Hata raporlama</Bullet>
          <Bullet c={c}>Aladhan.com — Namaz vakitleri API</Bullet>
          <Bullet c={c}>Turso — Veritabanı</Bullet>
        </Section>

        <Section title="4. Veri Güvenliği">
          <Bullet c={c}>Tüm API iletişimleri HTTPS üzerinden şifrelenir</Bullet>
          <Bullet c={c}>Kullanıcı hesabı istenmez; ad-soyad, e-posta veya telefon numarası toplanmaz</Bullet>
          <Bullet c={c}>Not metinleriniz cihazınızda ve yalnızca size özel, anonim kimlikle korunan bulut yedeğinizde saklanır; başka hiçbir amaçla kullanılmaz</Bullet>
          <Bullet c={c}>Favori veya notlu ayetlerin ayet anahtarları yalnızca ilgili ayet bilgisini göstermek için API'ye iletilebilir</Bullet>
        </Section>

        <Section title="5. Çocukların Gizliliği">
          <P c={c}>
            Uygulama 13 yaş altı çocuklara yönelik değildir. 13 yaş altı kullanıcılardan bilerek veri toplamıyoruz.
          </P>
        </Section>

        <Section title="6. KVKK Hakları">
          <P c={c}>6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:</P>
          <Bullet c={c}>Verilerinize erişim hakkı</Bullet>
          <Bullet c={c}>Verilerinizin düzeltilmesini talep hakkı</Bullet>
          <Bullet c={c}>Verilerinizin silinmesini talep hakkı</Bullet>
        </Section>

        <Section title="7. Değişiklikler">
          <P c={c}>
            Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişikliklerde uygulama içinde bildirim yapılır.
          </P>
        </Section>

        <Section title="8. İletişim">
          <P c={c}>Sorularınız ve KVKK talepleriniz için:</P>
          <TouchableOpacity
            style={[s.mailBtn, { backgroundColor: c.accent + "20" }]}
            onPress={() => Linking.openURL(`mailto:${CONTACT_MAIL}`)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="E-posta gönder"
          >
            <Text style={[s.mailBtnText, { color: c.accent }]}>{CONTACT_MAIL}</Text>
          </TouchableOpacity>
        </Section>
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
});
