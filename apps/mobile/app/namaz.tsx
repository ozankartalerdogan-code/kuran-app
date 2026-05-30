import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Switch, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { router, Stack } from "expo-router";
import { api, type TagFilterResult } from "../src/lib/api";
import {
  requestNotificationPermission,
  fetchPrayerTimes,
  scheduleNamazNotifications,
  cancelNamazNotifications,
} from "../src/lib/namazNotifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_KEY = "namazNotifEnabled";
const ISTANBUL = { lat: 41.0082, lng: 28.9784 };

// ── Namaz Vakitleri Tablosu ───────────────────────────────────────────────────

const VAKIT_KEYS: Record<string, { surahId: number; ayahNumber: number; label: string }[]> = {
  sabah:   [
    { surahId: 17, ayahNumber: 78,  label: "17:78"  },
    { surahId: 20, ayahNumber: 130, label: "20:130" },
    { surahId: 52, ayahNumber: 48,  label: "52:48"  },
    { surahId: 11, ayahNumber: 114, label: "11:114" },
  ],
  ogle:    [{ surahId: 30, ayahNumber: 17, label: "30:17" }],
  ikindi:  [
    { surahId: 2,  ayahNumber: 238, label: "2:238"  },
    { surahId: 50, ayahNumber: 39,  label: "50:39"  },
  ],
  aksam:   [
    { surahId: 40, ayahNumber: 55,  label: "40:55"  },
    { surahId: 76, ayahNumber: 25,  label: "76:25"  },
  ],
  yatsi:   [
    { surahId: 4,  ayahNumber: 103, label: "4:103"  },
    { surahId: 24, ayahNumber: 58,  label: "24:58"  },
    { surahId: 78, ayahNumber: 9,   label: "78:9"   },
  ],
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
  24:"Nûr", 30:"Rûm", 40:"Mü'min", 50:"Kâf", 52:"Tûr",
  76:"İnsân", 78:"Nebe",
};

function VakitTablosu({ teheccudVerses }: { teheccudVerses: { surahId: number; ayahNumber: number; label: string }[] }) {
  const allVakitVerse = {
    ...VAKIT_KEYS,
    teheccud: teheccudVerses,
  };

  return (
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
              {verses.map((v) => (
                <TouchableOpacity key={v.label} style={vt.ayetRow}
                  onPress={() => router.push(`/ayah/${v.surahId}/${v.ayahNumber}` as any)} activeOpacity={0.7}>
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

function NamazAccordion({ tag, label, emoji, desc }: { tag: string; label: string; emoji: string; desc: string }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [verses, setVerses]   = useState<TagFilterResult[]>([]);
  const [fetched, setFetched] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) {
      setLoading(true);
      try { const r = await api.tags.filter(tag); setVerses(r.results); }
      catch {}
      setLoading(false);
      setFetched(true);
    }
  };

  return (
    <View style={styles.accordion}>
      <TouchableOpacity style={styles.accordionHeader} onPress={toggle} activeOpacity={0.75}>
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
          ) : verses.map((item) => (
            <TouchableOpacity key={item.verse_key} style={styles.verseCard}
              onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)} activeOpacity={0.75}>
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
}

export default function NamazScreen() {
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [teheccudVerses, setTeheccudVerses] = useState<{ surahId: number; ayahNumber: number; label: string }[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((v) => setNotifEnabled(v === "1"));
    // Teheccüd ayetlerini yükle
    api.tags.filter("namaz-teheccud").then(res => {
      setTeheccudVerses(res.results.map(r => ({
        surahId: r.surah_id,
        ayahNumber: r.ayah_number,
        label: r.verse_key,
      })));
    }).catch(() => {});
  }, []);

  async function toggleNotif(val: boolean) {
    setNotifLoading(true);
    try {
      if (val) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert("İzin Gerekli", "Bildirim izni verilmedi. Ayarlardan açabilirsiniz.");
          setNotifLoading(false);
          return;
        }
        const times = await fetchPrayerTimes(ISTANBUL.lat, ISTANBUL.lng);
        if (!times) {
          Alert.alert("Hata", "Namaz vakitleri alınamadı.");
          setNotifLoading(false);
          return;
        }
        await scheduleNamazNotifications(times);
        await AsyncStorage.setItem(NOTIF_KEY, "1");
        setNotifEnabled(true);
        Alert.alert("Bildirimler Açık", "Bugünkü namaz vakitleri için bildirim planlandı.");
      } else {
        await cancelNamazNotifications();
        await AsyncStorage.setItem(NOTIF_KEY, "0");
        setNotifEnabled(false);
      }
    } catch {
      Alert.alert("Hata", "İşlem başarısız.");
    } finally {
      setNotifLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Namaz Hakkında" }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Namaz Vakti Bildirimleri */}
        <View style={styles.notifCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>🔔 Namaz Vakti Bildirimleri</Text>
            <Text style={styles.notifSub}>
              {notifEnabled ? "Bugünkü vakitler için bildirim planlandı (İstanbul)" : "Her namaz vakti için bildirim al"}
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
        <VakitTablosu teheccudVerses={teheccudVerses} />

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
  container: { flex:1, backgroundColor:"#f7f1e4" },
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
});

// ── Vakit Tablosu Stilleri ────────────────────────────────────────────────────
const vt = StyleSheet.create({
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
