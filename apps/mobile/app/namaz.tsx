import {
  View, Text, FlatList, TouchableOpacity,
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

const NAMAZ_TAGS = [
  { tag: "namaz",       label: "Namaz Ayetleri",     emoji: "🕌", desc: "Namaz emri, huşu ve tesbihat" },
  { tag: "tövbe",       label: "Tövbe & Bağışlanma", emoji: "🤲", desc: "Dua, istiğfar ve tövbe ayetleri" },
  { tag: "sabır",       label: "Sabır",               emoji: "💪", desc: "Sabır ve dayanıklılık" },
  { tag: "rahmet",      label: "Rahmet & Huzur",      emoji: "😌", desc: "Allah'ın rahmeti ve affı" },
  { tag: "şükür",       label: "Şükür",               emoji: "🌟", desc: "Şükür ve minnet ayetleri" },
  { tag: "B2_SERI_IBADETLER", label: "Şer'i İbadetler", emoji: "📿", desc: "Namaz, oruç, hac, zekât" },
] as const;

export default function NamazScreen() {
  const [activeTag, setActiveTag]   = useState<string | null>(null);
  const [verses, setVerses]         = useState<TagFilterResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((v) => setNotifEnabled(v === "1"));
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

  async function loadTag(tag: string) {
    if (activeTag === tag) { setActiveTag(null); setVerses([]); return; }
    setActiveTag(tag);
    setLoading(true);
    try {
      const res = await api.tags.filter(tag);
      setVerses(res.results);
    } catch { setVerses([]); }
    finally  { setLoading(false); }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Namaz & İbadet" }} />
      <View style={styles.container}>
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

        {/* Kategori kartları */}
        <View style={styles.grid}>
          {NAMAZ_TAGS.map((t) => (
            <TouchableOpacity
              key={t.tag}
              style={[styles.catCard, activeTag === t.tag && styles.catCardActive]}
              onPress={() => loadTag(t.tag)}
              activeOpacity={0.75}
            >
              <Text style={styles.catEmoji}>{t.emoji}</Text>
              <Text style={styles.catLabel} numberOfLines={2}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ayetler */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : verses.length > 0 ? (
          <FlatList
            data={verses}
            keyExtractor={(v) => v.verse_key}
            contentContainerStyle={styles.verseList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.verseCard}
                onPress={() => router.push(`/ayah/${item.surah_id}/${item.ayah_number}`)}
                activeOpacity={0.75}
              >
                <View style={styles.verseHeader}>
                  <View style={styles.keyBadge}>
                    <Text style={styles.keyText}>{item.verse_key}</Text>
                  </View>
                  {item.surah_name && (
                    <Text style={styles.surahLabel}>{item.surah_name}</Text>
                  )}
                </View>
                {item.meal && (
                  <Text style={styles.mealText} numberOfLines={3}>{item.meal}</Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        ) : activeTag ? (
          <View style={styles.centered}>
            <Text style={styles.noResult}>Ayet bulunamadı.</Text>
          </View>
        ) : null}
      </View>
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
  mealText:    { fontSize:13, lineHeight:21, color:"#292524" },
});
