import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "hatimTakibi";

const JUZ_DATA = [
  { juz:  1, start: "Fâtiha 1",    end: "Bakara 141"   },
  { juz:  2, start: "Bakara 142",  end: "Bakara 252"   },
  { juz:  3, start: "Bakara 253",  end: "Âl-i İmrân 92"},
  { juz:  4, start: "Âl-i İmrân 93", end: "Nisâ 23"   },
  { juz:  5, start: "Nisâ 24",     end: "Nisâ 147"     },
  { juz:  6, start: "Nisâ 148",    end: "Mâide 81"     },
  { juz:  7, start: "Mâide 82",    end: "En'âm 110"    },
  { juz:  8, start: "En'âm 111",   end: "A'râf 87"     },
  { juz:  9, start: "A'râf 88",    end: "Enfâl 40"     },
  { juz: 10, start: "Enfâl 41",    end: "Tevbe 92"     },
  { juz: 11, start: "Tevbe 93",    end: "Hûd 5"        },
  { juz: 12, start: "Hûd 6",       end: "Yûsuf 52"     },
  { juz: 13, start: "Yûsuf 53",    end: "İbrâhîm 52"   },
  { juz: 14, start: "Hicr 1",      end: "Nahl 128"     },
  { juz: 15, start: "İsrâ 1",      end: "Kehf 74"      },
  { juz: 16, start: "Kehf 75",     end: "Tâhâ 135"     },
  { juz: 17, start: "Enbiyâ 1",    end: "Hac 78"       },
  { juz: 18, start: "Mü'minûn 1",  end: "Furkân 20"    },
  { juz: 19, start: "Furkân 21",   end: "Neml 55"      },
  { juz: 20, start: "Neml 56",     end: "Ankebût 45"   },
  { juz: 21, start: "Ankebût 46",  end: "Ahzâb 30"     },
  { juz: 22, start: "Ahzâb 31",    end: "Yâsîn 27"     },
  { juz: 23, start: "Yâsîn 28",    end: "Zümer 31"     },
  { juz: 24, start: "Zümer 32",    end: "Fussilet 46"  },
  { juz: 25, start: "Fussilet 47", end: "Câsiye 37"    },
  { juz: 26, start: "Ahkâf 1",     end: "Zâriyât 30"   },
  { juz: 27, start: "Zâriyât 31",  end: "Hadîd 29"     },
  { juz: 28, start: "Mücâdele 1",  end: "Tahrîm 12"    },
  { juz: 29, start: "Mülk 1",      end: "Mürselât 50"  },
  { juz: 30, start: "Nebe 1",      end: "Nâs 6"        },
];

interface Hatim { id: string; startDate: string; completedDate: string | null; readJuz: number[] }
interface Store  { hatims: Hatim[]; currentId: string | null }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
function days(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function HatimScreen() {
  const [store, setStore]   = useState<Store>({ hatims: [], currentId: null });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => { if (v) setStore(JSON.parse(v)); })
      .finally(() => setMounted(true));
  }, []);

  const persist = useCallback((next: Store) => {
    setStore(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const startHatim = () => {
    const h: Hatim = { id: Date.now().toString(), startDate: new Date().toISOString(), completedDate: null, readJuz: [] };
    persist({ hatims: [h, ...store.hatims], currentId: h.id });
  };

  const toggleJuz = (n: number) => {
    const next = store.hatims.map(h => {
      if (h.id !== store.currentId) return h;
      const readJuz = h.readJuz.includes(n) ? h.readJuz.filter(j => j !== n) : [...h.readJuz, n];
      const completedDate = readJuz.length === 30 ? (h.completedDate ?? new Date().toISOString()) : null;
      return { ...h, readJuz, completedDate };
    });
    persist({ ...store, hatims: next });
  };

  const current   = store.hatims.find(h => h.id === store.currentId) ?? null;
  const completed = store.hatims.filter(h => h.completedDate !== null);
  const progress  = current?.readJuz.length ?? 0;

  if (!mounted) return null;

  return (
    <>
      <Stack.Screen options={{ title: "Hatim Takibi" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <Text style={styles.title}>📖 Hatim Takibi</Text>
        <Text style={styles.sub}>30 cüzlük okumanızı işaretleyin</Text>

        {!current ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aktif hatim yok</Text>
            <TouchableOpacity style={styles.startBtn} onPress={startHatim}>
              <Text style={styles.startBtnText}>+ Yeni Hatim Başlat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* İlerleme */}
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View>
                  <Text style={styles.progressDate}>Başlangıç: {fmt(current.startDate)}</Text>
                  {current.completedDate && (
                    <Text style={styles.completedText}>✅ Tamamlandı! ({days(current.startDate, current.completedDate)} günde)</Text>
                  )}
                </View>
                <Text style={styles.progressCount}>{progress}/30</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${(progress/30)*100}%` as any }]} />
              </View>
              <View style={styles.progressActions}>
                <TouchableOpacity onPress={() => Alert.alert("Sıfırla", "Mevcut hatimi sıfırlamak istediğinize emin misiniz?", [
                  { text: "Hayır", style: "cancel" },
                  { text: "Evet", style: "destructive", onPress: () => persist({ ...store, hatims: store.hatims.map(h => h.id === store.currentId ? { ...h, readJuz: [], completedDate: null } : h) }) }
                ])}>
                  <Text style={styles.actionText}>Sıfırla</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={startHatim}>
                  <Text style={[styles.actionText, { color: "#059669" }]}>+ Yeni Hatim</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 30 Cüz */}
            {JUZ_DATA.map(juz => {
              const done = current.readJuz.includes(juz.juz);
              return (
                <TouchableOpacity
                  key={juz.juz}
                  style={[styles.juzRow, done && styles.juzRowDone]}
                  onPress={() => toggleJuz(juz.juz)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.juzCheck, done && styles.juzCheckDone]}>
                    <Text style={[styles.juzNum, done && styles.juzNumDone]}>
                      {done ? "✓" : juz.juz}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.juzTitle, done && styles.juzTitleDone]}>{juz.juz}. Cüz</Text>
                    <Text style={styles.juzRange}>{juz.start} – {juz.end}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Geçmiş */}
        {completed.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Tamamlanan Hatimler ({completed.length})</Text>
            {completed.map((h, i) => (
              <View key={h.id} style={styles.historyRow}>
                <Text style={styles.historyLabel}>{completed.length - i}. Hatim — {fmt(h.startDate)}</Text>
                <Text style={styles.historyDays}>{days(h.startDate, h.completedDate!)} gün</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  content:   { padding: 16, paddingBottom: 32 },
  title:     { fontSize: 22, fontWeight: "700", color: "#14532d", textAlign: "center", marginBottom: 4 },
  sub:       { fontSize: 13, color: "#86efac", textAlign: "center", marginBottom: 20 },

  emptyCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#bbf7d0" },
  emptyText:    { fontSize: 15, color: "#6b7280", marginBottom: 16 },
  startBtn:     { backgroundColor: "#059669", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  progressCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  progressRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  progressDate: { fontSize: 12, color: "#6b7280" },
  completedText:{ fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  progressCount:{ fontSize: 28, fontWeight: "700", color: "#059669" },
  progressBg:   { height: 8, backgroundColor: "#d1fae5", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: "#059669", borderRadius: 4 },
  progressActions: { flexDirection: "row", gap: 16, marginTop: 10 },
  actionText:   { fontSize: 13, color: "#ef4444" },

  juzRow:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: "#e7e5e4" },
  juzRowDone: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  juzCheck:     { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  juzCheckDone: { backgroundColor: "#059669", borderColor: "#059669" },
  juzNum:     { fontSize: 13, fontWeight: "700", color: "#9ca3af" },
  juzNumDone: { color: "#fff" },
  juzTitle:   { fontSize: 13, fontWeight: "600", color: "#1c1917" },
  juzTitleDone: { color: "#059669" },
  juzRange:   { fontSize: 11, color: "#9ca3af", marginTop: 1 },

  historySection: { marginTop: 20 },
  historyTitle:   { fontSize: 14, fontWeight: "700", color: "#6b7280", marginBottom: 8 },
  historyRow:     { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: "#e7e5e4" },
  historyLabel:   { fontSize: 13, color: "#374151" },
  historyDays:    { fontSize: 13, fontWeight: "600", color: "#059669" },
});
