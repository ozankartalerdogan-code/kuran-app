import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Switch, Alert, Linking,
} from "react-native";
import * as Location from "expo-location";
import { useState, useEffect, memo } from "react";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, prefetchAyah, type TagFilterResult } from "../src/lib/api";
import {
  requestNotificationPermission,
  fetchPrayerTimes,
  scheduleNamazNotifications,
  cancelNamazNotifications,
} from "../src/lib/namazNotifications";
import { storage } from "../src/lib/storage";

import { useTourTarget } from "../src/tour/AppTourProvider";
const NOTIF_KEY = "namazNotifEnabled";
// Bildirimlerin en son hangi gün planlandığı (YYYY-MM-DD) — günde bir kez yeniden planlamak için.
const SCHED_DAY_KEY = "namazNotifSchedDay";
const ISTANBUL = { lat: 41.0082, lng: 28.9784 };

function localDayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// İzin SORMADAN mevcut izni okuyarak konum getirir (sessiz arka plan yenilemesi için).
async function getUserLocationSilent(): Promise<{ lat: number; lng: number; isFallback: boolean }> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return { ...ISTANBUL, isFallback: true };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) return { ...ISTANBUL, isFallback: true };
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, isFallback: false };
  } catch {
    return { ...ISTANBUL, isFallback: true };
  }
}

async function getUserLocation(): Promise<{ lat: number; lng: number; isFallback: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Konum İzni",
        "Konum izni verilmedi. Namaz vakitleri İstanbul için gösterilecek.",
        [{ text: "Tamam" }],
      );
      return { ...ISTANBUL, isFallback: true };
    }
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (!pos || !("coords" in pos)) {
      return { ...ISTANBUL, isFallback: true };
    }
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, isFallback: false };
  } catch {
    return { ...ISTANBUL, isFallback: true };
  }
}

// ── Namaz Vakitleri Tablosu ───────────────────────────────────────────────────

const VAKIT_KEYS: Record<string, { surahId: number; ayahNumber: number; label: string }[]> = {
  sabah:   [
    { surahId: 17, ayahNumber: 78,  label: "17:78"  },
    { surahId: 20, ayahNumber: 130, label: "20:130" },
    { surahId: 50, ayahNumber: 39,  label: "50:39"  },
  ],
  ogle:    [
    { surahId: 30, ayahNumber: 18,  label: "30:18"  },
    { surahId: 17, ayahNumber: 78,  label: "17:78"  },
  ],
  ikindi:  [
    { surahId: 2,  ayahNumber: 238, label: "2:238"  },
    { surahId: 20, ayahNumber: 130, label: "20:130" },
    { surahId: 50, ayahNumber: 39,  label: "50:39"  },
  ],
  aksam:   [
    { surahId: 11, ayahNumber: 114, label: "11:114" },
    { surahId: 30, ayahNumber: 17,  label: "30:17"  },
  ],
  yatsi:   [
    { surahId: 24, ayahNumber: 58,  label: "24:58"  },
    { surahId: 17, ayahNumber: 78,  label: "17:78"  },
    { surahId: 11, ayahNumber: 114, label: "11:114" },
  ],
  teheccud: [
    { surahId: 17, ayahNumber: 79,  label: "17:79"    },
    { surahId: 73, ayahNumber: 2,   label: "73:2-3"   },
    { surahId: 25, ayahNumber: 64,  label: "25:64"    },
    { surahId: 51, ayahNumber: 17,  label: "51:17-18" },
  ],
};

// Üst motto ayeti — Nisâ 4:103 (Arapça + meal)
const MOTTO = {
  surahId: 4,
  ayahNumber: 103,
  label: "Nisâ 4:103",
  arabic: "فَإِذَا قَضَيْتُمُ ٱلصَّلَوٰةَ فَٱذْكُرُوا۟ ٱللَّهَ قِيَـٰمًا وَقُعُودًا وَعَلَىٰ جُنُوبِكُمْ ۚ فَإِذَا ٱطْمَأْنَنتُمْ فَأَقِيمُوا۟ ٱلصَّلَوٰةَ ۚ إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَـٰبًا مَّوْقُوتًا",
  meal: "Namazı kıldıktan sonra; ayakta, otururken ve yan yatarken Allah'ı anın. Güvene kavuştuğunuzda namazı gereğince kılın. Şüphesiz namaz, müminlere belirli vakitlerde farz kılınmıştır.",
};

const VAKIT_META = [
  { id: "sabah",    ikon: "🌅", ad: "Sabah",    bg: "#f0f9ff", border: "#38bdf8", badge: "#bae6fd", badgeText: "#0c4a6e" },
  { id: "ogle",     ikon: "☀️", ad: "Öğle",     bg: "#fffbeb", border: "#fbbf24", badge: "#fde68a", badgeText: "#78350f" },
  { id: "ikindi",   ikon: "🌤️", ad: "İkindi",   bg: "#fff7ed", border: "#fb923c", badge: "#fed7aa", badgeText: "#7c2d12" },
  { id: "aksam",    ikon: "🌆", ad: "Akşam",    bg: "#fff1f2", border: "#f87171", badge: "#fecaca", badgeText: "#7f1d1d" },
  { id: "yatsi",    ikon: "🌙", ad: "Yatsı",    bg: "#eef2ff", border: "#818cf8", badge: "#c7d2fe", badgeText: "#3730a3" },
  { id: "teheccud", ikon: "🌌", ad: "Teheccüd", bg: "#f5f3ff", border: "#a78bfa", badge: "#ddd6fe", badgeText: "#4c1d95" },
];

const SURE_ADI: Record<number, string> = {
  2:"Bakara", 4:"Nisâ", 11:"Hûd", 17:"İsrâ", 20:"Tâhâ",
  24:"Nûr", 25:"Furkân", 30:"Rûm", 40:"Mü'min", 50:"Kâf",
  51:"Zâriyât", 52:"Tûr", 73:"Müzzemmil", 76:"İnsân", 78:"Nebe",
};

function VakitTablosu() {
  const allVakitVerse = VAKIT_KEYS;

  return (
    <>
    {/* Üst Motto — Nisâ 4:103 ayet + meal */}
    <TouchableOpacity
      style={vt.motto}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: "/ayah/[surahId]/[ayahNumber]", params: { surahId: MOTTO.surahId, ayahNumber: MOTTO.ayahNumber } })}
      accessibilityRole="button"
      accessibilityLabel={`${MOTTO.label} ayetini aç`}
    >
      <View style={vt.mottoHead}>
        <Text style={vt.mottoEtiket}>Namaz Vakitlere Bağlı Bir Farzdır</Text>
        <View style={vt.mottoKey}><Text style={vt.mottoKeyText}>{MOTTO.label}</Text></View>
      </View>
      <Text style={vt.mottoArabic}>{MOTTO.arabic}</Text>
      <Text style={vt.mottoMeal}>“{MOTTO.meal}”</Text>
    </TouchableOpacity>

    <View style={vt.kapsam}>
      {/* Başlık */}
      <View style={vt.baslik}>
        <Text style={vt.baslikIkon}>🕐</Text>
        <Text style={vt.baslikMetin}>Namaz Vakitleri & Teheccüd</Text>
        <View style={vt.adetBadge}>
          <Text style={vt.adetText}>
            {Object.values(allVakitVerse).reduce((s, a) => s + a.length, 0)} ayet
          </Text>
        </View>
      </View>
      {/* Her vakit */}
      {VAKIT_META.map((m, i) => {
        const verses = allVakitVerse[m.id] ?? [];
        if (verses.length === 0) return null;
        return (
          <View key={m.id} style={[vt.vakitSatir, i > 0 && vt.vakitSatirBorder]}>
            {/* Sol — vakit adı */}
            <View style={[vt.vakitSol, { backgroundColor: m.bg, borderLeftColor: m.border }]}>
              <Text style={{ fontSize: 22 }}>{m.ikon}</Text>
              <View style={[vt.vakitBadge, { backgroundColor: m.badge }]}>
                <Text style={[vt.vakitBadgeText, { color: m.badgeText }]}>{m.ad}</Text>
              </View>
              <Text style={vt.vakitAdet}>{verses.length} ayet</Text>
            </View>
            {/* Sağ — ayetler */}
            <View style={vt.vakitSag}>
              {verses.map((v: { surahId: number; ayahNumber: number; label: string }) => (
                <TouchableOpacity key={v.label} style={vt.ayetRow}
                  onPress={() => router.push({ pathname: "/ayah/[surahId]/[ayahNumber]", params: { surahId: v.surahId, ayahNumber: v.ayahNumber } })} activeOpacity={0.7}
                  accessibilityRole="button" accessibilityLabel={`${SURE_ADI[v.surahId] ?? `Sure ${v.surahId}`}, ${v.label} ayetini aç`}>
                  <View style={vt.keyBadge}><Text style={vt.keyText}>{v.label}</Text></View>
                  <Text style={vt.sureName}>{SURE_ADI[v.surahId] ?? `Sure ${v.surahId}`}</Text>
                  <Text style={vt.arrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </View>
    </>
  );
}

const NAMAZ_TAGS = [
  { tag: "namaz-genel",    label: "Genel Namaz Emirleri", emoji: "🕌", desc: "98 ayet — namaz emri, kılma şekli, tesbihat" },
  { tag: "namaz-vakit",    label: "Namaz Vakitleri",       emoji: "🕐", desc: "12 ayet — sabah, öğle, ikindi, akşam, yatsı" },
  { tag: "namaz-husu",     label: "Huşu",                  emoji: "🤲", desc: "8 ayet — kalp huzuru, derin teslimiyet" },
  { tag: "namaz-teheccud", label: "Teheccüd Namazı",       emoji: "🌙", desc: "10 ayet — gece namazı, seçkin kulluk" },
  { tag: "namaz-cuma",     label: "Cuma Namazı",           emoji: "📿", desc: "2 ayet — Cuma emri ve önemi" },
  { tag: "namaz-abdest",   label: "Abdest",                emoji: "💧", desc: "2 ayet — temizlik ve abdest hükmü" },
  { tag: "namaz-korku",    label: "Korku Namazı",          emoji: "⚔️", desc: "2 ayet — savaş ve tehlike anında namaz" },
  { tag: "namaz-sefer",    label: "Seferi Namaz",          emoji: "🚶", desc: "1 ayet — yolculukta kısaltma" },
] as const;

const NamazAccordion = memo(function NamazAccordion({ tag, label, emoji, desc }: { tag: string; label: string; emoji: string; desc: string }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [verses, setVerses]   = useState<TagFilterResult[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError]     = useState(false);

  const fetchVerses = async () => {
    setLoading(true);
    setError(false);
    try { const r = await api.tags.filter(tag); setVerses(r.results); }
    catch { setError(true); }
    setLoading(false);
    setFetched(true);
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) await fetchVerses();
  };

  return (
    <View style={styles.accordion}>
      <TouchableOpacity style={styles.accordionHeader} onPress={toggle} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.accordionTitle}>{label}</Text>
          <Text style={styles.accordionDesc}>{desc}</Text>
        </View>
        <Text style={styles.accordionChev}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.accordionBody}>
          {loading ? (
            <ActivityIndicator color="#059669" style={{ marginVertical: 10 }} />
          ) : error ? (
            <View style={styles.accordionError}>
              <Text style={styles.accordionErrorText}>İçerik yüklenemedi. Lütfen tekrar deneyin.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchVerses} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Tekrar dene">
                <Text style={styles.retryBtnText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          ) : fetched && verses.length === 0 ? (
            <Text style={styles.accordionEmpty}>İçerik bulunamadı.</Text>
          ) : verses.map((item) => (
            <TouchableOpacity key={item.verse_key} style={styles.verseCard}
              onPressIn={() => prefetchAyah(item.surah_id, item.ayah_number)}
              onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)} activeOpacity={0.75}
              accessibilityRole="button" accessibilityLabel={`${item.surah_name ?? item.verse_key}, ayeti aç`}>
              <View style={styles.verseHeader}>
                <View style={styles.keyBadge}><Text style={styles.keyText}>{item.verse_key}</Text></View>
                {item.surah_name && <Text style={styles.surahLabel}>{item.surah_name}</Text>}
              </View>
              {item.reading_tr && <Text style={styles.readingText} numberOfLines={2}>{item.reading_tr}</Text>}
              {item.meal && <Text style={styles.mealText} numberOfLines={2}>{item.meal}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

export default function NamazScreen() {
  const insets = useSafeAreaInsets();
  const namazTarget = useTourTarget("namaz.main");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    storage.getString(NOTIF_KEY).then(async (v) => {
      const enabled = v === "1";
      setNotifEnabled(enabled);
      if (!enabled) return;

      // DAILY tetikleyici saat:dakikayı sabitler; vakitler günden güne kaydığı için
      // bildirimler açıkken günde bir kez sessizce (izin sormadan) yeniden planla.
      const today = localDayStr();
      const lastDay = await storage.getString(SCHED_DAY_KEY);
      if (lastDay === today) return; // bugün zaten planlandı

      try {
        const { lat, lng, isFallback } = await getUserLocationSilent();
        if (cancelled) return;
        const times = await fetchPrayerTimes(lat, lng);
        if (cancelled || !times) return;
        await scheduleNamazNotifications(times);
        await storage.setString(SCHED_DAY_KEY, today);
        if (!cancelled) setUsingFallback(isFallback);
      } catch { /* sessiz — eldeki planlama korunur */ }
    });

    return () => { cancelled = true; };
  }, []);

  async function toggleNotif(val: boolean) {
    setNotifLoading(true);
    try {
      if (val) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          // İzin reddedildi/engellendi → sistem penceresi tekrar çıkmayabilir; ayarlara tek dokunuş.
          Alert.alert(
            "Bildirim İzni Gerekli",
            "Namaz vakti bildirimleri için bildirim iznine ihtiyaç var. Ayarlardan \"Bildirimler\"i açabilirsiniz.",
            [
              { text: "Vazgeç", style: "cancel" },
              { text: "Ayarları Aç", onPress: () => { void Linking.openSettings(); } },
            ],
          );
          setNotifLoading(false);
          return;
        }

        const { lat, lng, isFallback } = await getUserLocation();
        setUsingFallback(isFallback);

        const times = await fetchPrayerTimes(lat, lng);
        if (!times) {
          Alert.alert("Hata", "Namaz vakitleri alınamadı. Lütfen internet bağlantınızı kontrol edin.");
          setNotifLoading(false);
          return;
        }

        await scheduleNamazNotifications(times);
        await storage.setString(NOTIF_KEY, "1");
        await storage.setString(SCHED_DAY_KEY, localDayStr()); // bugün planlandı → mount tekrar çekmesin
        setNotifEnabled(true);

        const locationMsg = isFallback
          ? "Konum izni verilmediği için namaz vakitleri İstanbul'a göre hesaplandı."
          : "Namaz vakitleri bulunduğunuz konuma göre hesaplandı.";
        Alert.alert("Bildirimler Açık", `Her gün her namaz vaktinden 5 dakika önce hatırlatma, 3 dakika önce de namaz temalı bir ayet gönderilecek.\n\n${locationMsg}`);
      } else {
        await cancelNamazNotifications();
        await storage.setString(NOTIF_KEY, "0");
        await storage.remove(SCHED_DAY_KEY); // tekrar açılınca yeniden planlansın
        setNotifEnabled(false);
        setUsingFallback(false);
      }
    } catch {
      Alert.alert("Hata", "İşlem başarısız. Lütfen tekrar deneyin.");
    } finally {
      setNotifLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Namaz Hakkında" }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        {/* Namaz Vakti Bildirimleri */}
        <View {...namazTarget} style={styles.notifCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>🔔 Namaz Vakti Bildirimleri</Text>
            <Text style={styles.notifSub}>
              {notifEnabled
                ? usingFallback
                  ? "İstanbul için bildirim planlandı (konum izni verilmedi)"
                  : "Bulunduğunuz konum için bildirim planlandı"
                : "Her namaz vakti için bildirim al"}
            </Text>
          </View>
          {notifLoading
            ? <ActivityIndicator color="#059669" />
            : <Switch
                value={notifEnabled}
                onValueChange={toggleNotif}
                trackColor={{ false: "#d4d4d4", true: "#6ee7b7" }}
                thumbColor={notifEnabled ? "#059669" : "#f5f5f5"}
              />
          }
        </View>

        {/* Namaz Vakitleri Tablosu */}
        <VakitTablosu />

        {/* Accordion kategoriler */}
        <View style={styles.accordionList}>
          {NAMAZ_TAGS.map((t) => (
            <NamazAccordion key={t.tag} tag={t.tag} label={t.label} emoji={t.emoji} desc={t.desc} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f5f0e8" },
  notifCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    margin: 12, padding: 14,
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#d1fae5",
  },
  notifTitle: { fontSize: 14, fontWeight: "600", color: "#1c1917", marginBottom: 2 },
  notifSub:   { fontSize: 12, color: "#78716c" },
  grid:      { flexDirection:"row", flexWrap:"wrap", gap:10, padding:12 },
  catCard:   {
    width:"30.5%", backgroundColor:"#fff", borderRadius:12, padding:12,
    alignItems:"center", gap:6, borderWidth:1.5, borderColor:"#e7e5e4",
  },
  catCardActive: { backgroundColor:"#f0fdf4", borderColor:"#059669" },
  catEmoji:  { fontSize:24 },
  catLabel:  { fontSize:11, fontWeight:"600", color:"#1c1917", textAlign:"center" },
  catDesc:   { fontSize:9, color:"#78716c", textAlign:"center", lineHeight:13, marginTop:1 },
  centered:  { flex:1, alignItems:"center", justifyContent:"center", padding:32 },
  noResult:  { color:"#78716c", fontSize:14 },
  verseList: { paddingHorizontal:12, paddingBottom:32 },
  verseCard: {
    backgroundColor:"#fff", borderRadius:12, padding:14,
    borderWidth:1, borderColor:"#e7e5e4",
  },
  verseHeader: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:8 },
  keyBadge:    { backgroundColor:"#d1fae5", borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  keyText:     { fontSize:11, fontWeight:"700", color:"#065f46" },
  surahLabel:  { fontSize:12, color:"#78716c" },
  readingText: { fontSize:13, color:"#1c1917", fontStyle:"italic", lineHeight:20, marginTop:2 },
  mealText:    { fontSize:11, lineHeight:17, color:"#57534e", marginTop:1 },

  accordionList:   { margin:12, marginTop:8, gap:8 },
  accordion:       { backgroundColor:"#fff", borderRadius:14, borderWidth:1, borderColor:"#e7e5e4", overflow:"hidden" },
  accordionHeader: { flexDirection:"row", alignItems:"center", gap:10, padding:14 },
  accordionTitle:  { fontSize:13, fontWeight:"700", color:"#1c1917" },
  accordionDesc:   { fontSize:11, color:"#78716c", marginTop:1 },
  accordionChev:   { fontSize:14, color:"#059669" },
  accordionBody:   { borderTopWidth:1, borderTopColor:"#f5f5f4", padding:10, gap:6 },
  accordionError:     { alignItems:"center", paddingVertical:12, gap:8 },
  accordionErrorText: { fontSize:12, color:"#dc2626", textAlign:"center" },
  accordionEmpty:     { fontSize:12, color:"#78716c", textAlign:"center", paddingVertical:10 },
  retryBtn:           { backgroundColor:"#059669", borderRadius:8, paddingHorizontal:16, paddingVertical:7 },
  retryBtnText:       { fontSize:12, fontWeight:"600", color:"#fff" },
});

// ── Vakit Tablosu Stilleri ────────────────────────────────────────────────────
const vt = StyleSheet.create({
  // Üst motto kartı
  motto:         { margin:12, marginBottom:0, borderRadius:16, borderWidth:1, borderColor:"#a7f3d0", backgroundColor:"#ecfdf5", padding:14 },
  mottoHead:     { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:8 },
  mottoEtiket:   { flex:1, fontSize:10, fontWeight:"700", color:"#059669", textTransform:"uppercase", letterSpacing:0.5 },
  mottoKey:      { backgroundColor:"#d1fae5", borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  mottoKeyText:  { fontSize:10, fontWeight:"700", color:"#047857" },
  mottoArabic:   { fontSize:20, lineHeight:36, color:"#1c1917", textAlign:"right", writingDirection:"rtl", fontFamily:"Amiri", marginBottom:8 },
  mottoMeal:     { fontSize:13, lineHeight:20, color:"#57534e", fontStyle:"italic" },
  kapsam:        { margin:12, marginBottom:0, borderRadius:16, borderWidth:1, borderColor:"#e7e5e4", overflow:"hidden", backgroundColor:"#fafaf9" },
  baslik:        { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#fff", paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#e7e5e4" },
  baslikIkon:    { fontSize:16 },
  baslikMetin:   { flex:1, fontSize:11, fontWeight:"700", color:"#78716c", textTransform:"uppercase", letterSpacing:0.5 },
  adetBadge:     { backgroundColor:"#f0fdf4", borderRadius:12, paddingHorizontal:8, paddingVertical:2 },
  adetText:      { fontSize:10, fontWeight:"600", color:"#059669" },
  vakitSatir:    { flexDirection:"row" },
  vakitSatirBorder: { borderTopWidth:1, borderTopColor:"#e7e5e4" },
  vakitSol:      { width:72, borderLeftWidth:4, paddingHorizontal:8, paddingVertical:10, alignItems:"center", gap:4 },
  vakitBadge:    { borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  vakitBadgeText:{ fontSize:10, fontWeight:"700" },
  vakitAdet:     { fontSize:9, color:"#a8a29e" },
  vakitSag:      { flex:1, paddingVertical:6, paddingRight:8 },
  ayetRow:       { flexDirection:"row", alignItems:"center", gap:6, paddingVertical:5, paddingHorizontal:4 },
  keyBadge:      { backgroundColor:"#f5f5f4", borderRadius:5, paddingHorizontal:5, paddingVertical:2 },
  keyText:       { fontSize:9, fontWeight:"700", color:"#78716c", fontFamily:"monospace" },
  sureName:      { flex:1, fontSize:12, color:"#1c1917" },
  arrow:         { fontSize:14, color:"#d1d5db" },
});
