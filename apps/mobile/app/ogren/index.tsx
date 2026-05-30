import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import { router, Stack } from "expo-router";
import { api, type ElifbaDers } from "../../src/lib/api";
import { storage, STORAGE_KEYS } from "../../src/lib/storage";

const SEVIYE_COLOR: Record<string, { bg: string; text: string }> = {
  "başlangıç": { bg:"#dbeafe", text:"#1d4ed8" },
  temel:       { bg:"#fef3c7", text:"#b45309" },
  orta:        { bg:"#f3e8ff", text:"#7e22ce" },
};

export default function OgrenScreen() {
  const [dersler, setDersler]   = useState<ElifbaDers[]>([]);
  const [loading, setLoading]   = useState(true);
  const [progress, setProgress] = useState<Record<string, number[]>>({});

  useEffect(() => {
    api.elifba.dersler()
      .then(setDersler)
      .catch(() => {})
      .finally(() => setLoading(false));
    storage.getJSON<Record<string, number[]>>(STORAGE_KEYS.elifbaProgress)
      .then((p) => setProgress(p ?? {}))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Elif-Ba Öğren" }} />
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Elif-Ba Öğren" }} />
      <FlatList
        data={dersler}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Diyanet 2024 Müfredatı</Text>
            <Text style={styles.headerSub}>{dersler.length} konu · Türkçe sesli Arap harfleri</Text>
          </View>
        }
        renderItem={({ item }) => {
          const seen       = progress[String(item.id)]?.length ?? 0;
          const pct        = item.harf_sayisi > 0 ? Math.round((seen / item.harf_sayisi) * 100) : 0;
          const color      = SEVIYE_COLOR[item.seviye] ?? SEVIYE_COLOR.temel;
          const shortTitle = item.baslik.replace(/^\d+\.\s*KONU:\s*/i, "");
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/ogren/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <View style={styles.numCircle}>
                  <Text style={styles.numText}>{item.konu_sirasi}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dersTitle} numberOfLines={2}>{shortTitle}</Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.seviyeBadge, { backgroundColor: color.bg }]}>
                      <Text style={[styles.seviyeText, { color: color.text }]}>{item.seviye}</Text>
                    </View>
                    <Text style={styles.harfCount}>{item.harf_sayisi} harf</Text>
                  </View>
                </View>
              </View>
              {/* İlerleme çubuğu */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.progressText}>{seen}/{item.harf_sayisi} harf görüldü</Text>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#f7f1e4" },
  list:     { padding:12, paddingBottom:32, backgroundColor:"#f7f1e4" },
  header:   { alignItems:"center", paddingVertical:20, paddingBottom:12 },
  headerTitle: { fontSize:17, fontWeight:"700", color:"#1c1917" },
  headerSub:   { fontSize:12, color:"#78716c", marginTop:4 },
  card: {
    backgroundColor:"#fff", borderRadius:14, padding:14,
    borderWidth:1, borderColor:"#e7e5e4",
    shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:3, elevation:1,
  },
  cardTop:    { flexDirection:"row", alignItems:"flex-start", gap:12, marginBottom:10 },
  numCircle:  { width:36, height:36, borderRadius:18, backgroundColor:"#f5f0e8", alignItems:"center", justifyContent:"center", flexShrink:0 },
  numText:    { fontSize:14, fontWeight:"700", color:"#78716c" },
  dersTitle:  { fontSize:14, fontWeight:"600", color:"#1c1917", marginBottom:4 },
  tagRow:     { flexDirection:"row", alignItems:"center", gap:8 },
  seviyeBadge:{ borderRadius:8, paddingHorizontal:8, paddingVertical:2 },
  seviyeText: { fontSize:11, fontWeight:"600" },
  harfCount:  { fontSize:11, color:"#a8a29e" },
  progressBar:{ height:4, backgroundColor:"#f5f0e8", borderRadius:2, overflow:"hidden" },
  progressFill:{ height:"100%", backgroundColor:"#059669", borderRadius:2 },
  progressText:{ fontSize:11, color:"#a8a29e", marginTop:5 },
});
