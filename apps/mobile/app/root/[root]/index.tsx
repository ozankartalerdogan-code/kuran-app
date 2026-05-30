/**
 * /root/[root] — Kök Detayı
 * 114 sure dağılımı (renkli grid) + türev kelimeler listesi.
 */
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, FlatList, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, type RootDetail } from "../../../src/lib/api";

// ── Isı haritası rengi (0-N → beyaz-koyu yeşil) ───────────────────────────────

function heatColor(count: number, max: number): string {
  if (count === 0) return "#f5f5f4";
  const ratio = Math.min(count / Math.max(max, 1), 1);
  const intensity = Math.round(ratio * 255);
  const r = Math.round(255 - intensity * 0.8);
  const g = Math.round(255 - intensity * 0.1);
  const b = Math.round(255 - intensity * 0.7);
  return `rgb(${r},${g},${b})`;
}

// ── Sure adları (kısa) ────────────────────────────────────────────────────────

const SURAH_SHORT: Record<number, string> = {
  1:"Fât",2:"Bak",3:"Âl",4:"Nis",5:"Mâi",6:"En'",7:"A'r",8:"Enf",9:"Tev",10:"Yun",
  11:"Hûd",12:"Yus",13:"Ra'd",14:"İbr",15:"Hicr",16:"Nah",17:"İsr",18:"Keh",19:"Mer",20:"Tâh",
  21:"Enb",22:"Hac",23:"Mü'",24:"Nur",25:"Fur",26:"Şua",27:"Nem",28:"Kas",29:"Ank",30:"Rum",
  31:"Luk",32:"Sec",33:"Ahz",34:"Seb",35:"Fât",36:"Yas",37:"Saf",38:"Sâd",39:"Zum",40:"Mü'",
  41:"Fus",42:"Şur",43:"Zuh",44:"Duh",45:"Câs",46:"Ahk",47:"Muh",48:"Fet",49:"Huc",50:"Kâf",
  51:"Zâr",52:"Tûr",53:"Nec",54:"Kam",55:"Rah",56:"Vâk",57:"Had",58:"Muc",59:"Haş",60:"Mum",
  61:"Saf",62:"Cum",63:"Mun",64:"Teğ",65:"Tal",66:"Tah",67:"Mül",68:"Kal",69:"Hak",70:"Mea",
  71:"Nuh",72:"Cin",73:"Müz",74:"Müd",75:"Kıy",76:"İns",77:"Mür",78:"Neb",79:"Nâz",80:"Abs",
  81:"Tek",82:"İnf",83:"Mut",84:"İnş",85:"Bur",86:"Târ",87:"A'l",88:"Gaş",89:"Fec",90:"Bel",
  91:"Şem",92:"Ley",93:"Duh",94:"İnş",95:"Tîn",96:"Ala",97:"Kad",98:"Bey",99:"Zel",100:"Âdi",
  101:"Kâr",102:"Tek",103:"Asr",104:"Hüm",105:"Fil",106:"Kur",107:"Mâu",108:"Kev",109:"Kâf",110:"Nas",
  111:"Teb",112:"İhl",113:"Fel",114:"Nas",
};

// ── Bileşenler ────────────────────────────────────────────────────────────────

function HeatGrid({
  distribution,
  maxCount,
}: {
  distribution: Record<number, number>;
  maxCount: number;
}) {
  const [modalInfo, setModalInfo] = useState<{ surahId: number; count: number } | null>(null);

  return (
    <>
      <View style={hg.grid}>
        {Array.from({ length: 114 }, (_, i) => i + 1).map(id => {
          const count = distribution[id] ?? 0;
          const bg    = heatColor(count, maxCount);
          return (
            <TouchableOpacity
              key={id}
              style={[hg.cell, { backgroundColor: bg }]}
              onPress={() => count > 0 && setModalInfo({ surahId: id, count })}
              activeOpacity={0.7}
            >
              <Text style={[hg.cellText, count > 0 && { color: "#1c1917" }]}>
                {SURAH_SHORT[id] ?? id}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bilgi modalı */}
      <Modal
        visible={!!modalInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setModalInfo(null)}
      >
        <TouchableOpacity
          style={hg.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalInfo(null)}
        >
          <View style={hg.modalCard}>
            {modalInfo && (
              <>
                <Text style={hg.modalSurah}>{modalInfo.surahId}. Sure</Text>
                <Text style={hg.modalCount}>{modalInfo.count} geçiş</Text>
                <TouchableOpacity
                  style={hg.modalBtn}
                  onPress={() => {
                    setModalInfo(null);
                    router.push(`/surah/${modalInfo.surahId}`);
                  }}
                >
                  <Text style={hg.modalBtnText}>Sureye Git →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function RootDetailScreen() {
  const { root: encodedRoot } = useLocalSearchParams<{ root: string }>();
  const root = decodeURIComponent(encodedRoot ?? "");

  const [data,    setData]    = useState<RootDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!root) return;
    api.roots.detail(root)
      .then(setData)
      .catch(() => setError("Kök detayı yüklenemedi."))
      .finally(() => setLoading(false));
  }, [root]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: root }} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: root }} />
        <View style={s.centered}>
          <Text style={s.errorText}>{error ?? "Veri yüklenemedi."}</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>← Geri</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const maxCount = Math.max(...Object.values(data.distribution), 1);
  const totalOcc = Object.values(data.distribution).reduce((a, b) => a + b, 0);
  const surahCount = Object.values(data.distribution).filter(v => v > 0).length;

  return (
    <>
      <Stack.Screen options={{ title: root }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>

        {/* Başlık */}
        <View style={s.header}>
          <Text style={s.rootTitle}>{data.root}</Text>
          <Text style={s.meaning}>{data.meaningTr}</Text>
          <View style={s.statsRow}>
            <View style={s.statBadge}>
              <Text style={s.statNum}>{totalOcc}</Text>
              <Text style={s.statLabel}>geçiş</Text>
            </View>
            <View style={s.statBadge}>
              <Text style={s.statNum}>{surahCount}</Text>
              <Text style={s.statLabel}>sure</Text>
            </View>
            <View style={s.statBadge}>
              <Text style={s.statNum}>{data.derivedWords.length}</Text>
              <Text style={s.statLabel}>türev</Text>
            </View>
          </View>
        </View>

        {/* Isı haritası */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sure Dağılımı</Text>
          <Text style={s.sectionHint}>Renkli hücreye dokun → sure bilgisi</Text>
          <HeatGrid distribution={data.distribution} maxCount={maxCount} />
        </View>

        {/* Türev kelimeler — anlam bazlı gruplandırılmış */}
        {data.derivedWords.length > 0 && (
          <View style={s.section}>
            {(() => {
              // word bazında grupla
              const wordMap = new Map<string, { meaning: string; verses: { surahId: number; ayahNumber: number }[] }>();
              for (const dw of data.derivedWords) {
                if (!wordMap.has(dw.word)) wordMap.set(dw.word, { meaning: dw.meaning, verses: [] });
                wordMap.get(dw.word)!.verses.push({ surahId: dw.surahId, ayahNumber: dw.ayahNumber });
              }
              // meaning bazında grupla
              const meaningMap = new Map<string, { forms: string[]; verses: { word: string; surahId: number; ayahNumber: number }[] }>();
              for (const [word, { meaning, verses }] of wordMap.entries()) {
                const key = meaning || "—";
                if (!meaningMap.has(key)) meaningMap.set(key, { forms: [], verses: [] });
                const g = meaningMap.get(key)!;
                if (!g.forms.includes(word)) g.forms.push(word);
                g.verses.push(...verses.map(v => ({ word, ...v })));
              }
              const groups = Array.from(meaningMap.entries());
              return (
                <>
                  <Text style={s.sectionTitle}>
                    Kullanım Bağlamları ({groups.length} anlam, {data.derivedWords.length} geçiş)
                  </Text>
                  {groups.map(([meaning, { forms, verses }]) => (
                    <View key={meaning} style={s.meaningGroup}>
                      {/* Anlam başlığı */}
                      <View style={s.meaningHeader}>
                        <Text style={s.meaningForms}>{forms.join("  ·  ")}</Text>
                        <Text style={s.meaningLabel}>{meaning}</Text>
                        <Text style={s.meaningCount}>{verses.length} ayet</Text>
                      </View>
                      {/* Ayet referansları */}
                      <View style={s.versesWrap}>
                        {verses.map((v, i) => (
                          <TouchableOpacity
                            key={i}
                            style={s.verseChip}
                            onPress={() => router.push(`/ayah/${v.surahId}/${v.ayahNumber}`)}
                            activeOpacity={0.7}
                          >
                            <Text style={s.verseChipText}>{v.surahId}:{v.ayahNumber}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              );
            })()}
          </View>
        )}

      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#f7f1e4" },
  content:    { paddingBottom: 40 },
  centered:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText:  { color: "#dc2626", fontSize: 14, textAlign: "center" },
  backBtn:    { marginTop: 16, backgroundColor: "#059669", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText:{ color: "#fff", fontSize: 14, fontWeight: "600" },

  header:     { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, backgroundColor: "#fff", marginBottom: 8 },
  rootTitle:  { fontSize: 40, color: "#1c1917", marginBottom: 8 },
  meaning:    { fontSize: 16, color: "#44403c", marginBottom: 12 },
  statsRow:   { flexDirection: "row", gap: 16 },
  statBadge:  { alignItems: "center", backgroundColor: "#f0fdf4", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "#86efac" },
  statNum:    { fontSize: 18, fontWeight: "700", color: "#065f46" },
  statLabel:  { fontSize: 10, color: "#059669", marginTop: 1 },

  section:        { marginHorizontal: 12, marginBottom: 16, backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e7e5e4" },
  sectionTitle:   { fontSize: 13, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  sectionHint:    { fontSize: 11, color: "#a8a29e", marginBottom: 12 },

  derivRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f5f5f4" },
  derivWord:  { fontSize: 20, color: "#1c1917", width: 100 },
  derivRight: { flex: 1 },
  derivMeaning:{ fontSize: 12, color: "#44403c", marginBottom: 2 },
  derivRef:   { fontSize: 11, color: "#059669", fontWeight: "600" },

  meaningGroup:  { borderTopWidth: 1, borderTopColor: "#f0fdf4", paddingTop: 10, marginTop: 6 },
  meaningHeader: { marginBottom: 6 },
  meaningForms:  { fontSize: 18, color: "#1c1917", textAlign: "right", marginBottom: 2 },
  meaningLabel:  { fontSize: 13, color: "#44403c", fontWeight: "600" },
  meaningCount:  { fontSize: 11, color: "#059669", marginTop: 1 },
  versesWrap:    { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  verseChip:     { backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#86efac" },
  verseChipText: { fontSize: 12, color: "#065f46", fontWeight: "600" },
});

const hg = StyleSheet.create({
  grid:  { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  cell:  { width: "8%", aspectRatio: 1, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  cellText: { fontSize: 7, color: "#a8a29e", fontWeight: "500" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", minWidth: 200 },
  modalSurah:   { fontSize: 18, fontWeight: "700", color: "#1c1917", marginBottom: 6 },
  modalCount:   { fontSize: 14, color: "#78716c", marginBottom: 16 },
  modalBtn:     { backgroundColor: "#059669", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  modalBtnText: { color: "#fff", fontWeight: "600" },
});
