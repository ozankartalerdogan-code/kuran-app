import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { logScreen } from "../src/lib/analytics";
import dualarRaw from "../src/data/dualar.json";

interface Dua {
  baslik: string; arapca: string; okunus: string; anlam: string; kaynak: string;
  derece: string; tekrar: string; neZaman: string; aciklama: string; not: string;
}
interface Kategori { kod: string; isim: string; dualar: Dua[] }
interface DualarData { baslik: string; aciklama: string; kategoriler: Kategori[] }

const D = dualarRaw as unknown as DualarData;

// derece rozeti rengi
function derecRenk(derece: string) {
  if (/kur'?an/i.test(derece)) return { bg: "#eef2ff", border: "#a5b4fc", text: "#4338ca" };
  if (/sahih/i.test(derece))   return { bg: "#f0fdf4", border: "#86efac", text: "#15803d" };
  if (/hasan/i.test(derece))   return { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" };
  return { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" };
}

function DerecBadge({ derece }: { derece: string }) {
  if (!derece) return null;
  const col = derecRenk(derece);
  return (
    <View style={[s.derec, { backgroundColor: col.bg, borderColor: col.border }]}>
      <Text style={[s.derecText, { color: col.text }]}>{derece}</Text>
    </View>
  );
}

function DuaCard({ dua }: { dua: Dua }) {
  const c = useColors();
  const [detay, setDetay] = useState(false);
  const hasDetay = !!(dua.aciklama || dua.not || dua.tekrar);

  async function handleShare() {
    Haptics.selectionAsync();
    const parts = [`🤲 ${dua.baslik}`];
    if (dua.arapca && /[؀-ۿ]/.test(dua.arapca)) parts.push(dua.arapca);
    if (dua.anlam) parts.push(dua.anlam);
    parts.push("Kuran Yolu uygulamasından");
    try { await Share.share({ message: parts.join("\n\n") }); } catch (_e) { /* noop */ }
  }

  return (
    <View style={[s.duaCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={s.duaHead}>
        <Text style={[s.duaBaslik, { color: c.text }]}>{dua.baslik}</Text>
        <DerecBadge derece={dua.derece} />
        <TouchableOpacity onPress={handleShare} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={16} color={c.textMuted} />
        </TouchableOpacity>
      </View>
      {dua.arapca ? (
        /[؀-ۿ]/.test(dua.arapca)
          ? <Text style={s.arabic}>{dua.arapca}</Text>
          : <Text style={[s.refNote, { backgroundColor: c.cardAlt, color: c.textSecondary }]}>📎 {dua.arapca}</Text>
      ) : null}
      {dua.okunus ? <Text style={[s.okunus, { color: c.text }]}>{dua.okunus}</Text> : null}
      {dua.anlam ? <Text style={[s.anlam, { color: c.textSecondary }]}>{dua.anlam}</Text> : null}

      <View style={[s.metaBox, { backgroundColor: c.cardAlt }]}>
        {dua.kaynak ? <Text style={[s.meta, { color: c.textMuted }]}>📖 {dua.kaynak}</Text> : null}
        {dua.neZaman ? <Text style={[s.meta, { color: c.textMuted }]}>🕐 {dua.neZaman}</Text> : null}
      </View>

      {hasDetay && (
        <>
          <TouchableOpacity onPress={() => setDetay(d => !d)} activeOpacity={0.7}>
            <Text style={[s.detayToggle, { color: c.accent }]}>{detay ? "▲ Daha az" : "▼ Açıklama ve fazileti"}</Text>
          </TouchableOpacity>
          {detay && (
            <View style={s.detayBox}>
              {dua.aciklama ? <Text style={[s.detay, { color: c.textSecondary }]}>{dua.aciklama}</Text> : null}
              {dua.tekrar ? <Text style={[s.detay, { color: c.textMuted }]}>🔁 {dua.tekrar}</Text> : null}
              {dua.not ? <Text style={[s.detay, { color: c.textMuted }]}>📌 {dua.not}</Text> : null}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function KategoriAccordion({ kat, defaultOpen }: { kat: Kategori; defaultOpen?: boolean }) {
  const c = useColors();
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View style={[s.katCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={s.katHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
        <View style={s.katKod}><Text style={s.katKodText}>{kat.kod}</Text></View>
        <Text style={[s.katTitle, { color: c.text }]}>{kat.isim}</Text>
        <View style={[s.katCount, { backgroundColor: c.cardAlt }]}><Text style={[s.katCountText, { color: c.textMuted }]}>{kat.dualar.length}</Text></View>
        <Text style={[s.chev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.katBody}>
          {kat.dualar.map((d, i) => <DuaCard key={i} dua={d} />)}
        </View>
      )}
    </View>
  );
}

export default function DualarScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  useEffect(() => { logScreen('Dualar'); }, []);
  return (
    <>
      <Stack.Screen options={{ title: "Dualar ve Zikirler" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>{D.aciklama}</Text>
        {D.kategoriler.map((k, i) => <KategoriAccordion key={k.kod} kat={k} defaultOpen={i === 0} />)}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 40 },
  intro:   { fontSize: 12.5, lineHeight: 19, marginBottom: 14 },

  // Kategori akordiyon
  katCard:   { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  katHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  katKod:    { width: 26, height: 26, borderRadius: 13, backgroundColor: "#059669", alignItems: "center", justifyContent: "center" },
  katKodText:{ fontSize: 13, fontWeight: "800", color: "#fff" },
  katTitle:  { flex: 1, fontSize: 14, fontWeight: "700" },
  katCount:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  katCountText: { fontSize: 11, fontWeight: "700" },
  chev:      { fontSize: 12 },
  katBody:   { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },

  // Dua kartı
  duaCard:   { borderRadius: 12, borderWidth: 1, padding: 13 },
  duaHead:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  duaBaslik: { flex: 1, fontSize: 14, fontWeight: "700" },

  derec:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 1 },
  derecText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.3 },

  arabic:  { fontSize: 21, lineHeight: 40, textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", color: "#1c1917", marginBottom: 8 },
  refNote: { fontSize: 13, lineHeight: 20, borderRadius: 8, padding: 10, marginBottom: 8 },
  okunus:  { fontSize: 13, lineHeight: 21, fontStyle: "italic", marginBottom: 6 },
  anlam:   { fontSize: 12.5, lineHeight: 19, marginBottom: 8 },

  metaBox: { borderRadius: 8, padding: 9, gap: 3 },
  meta:    { fontSize: 11, lineHeight: 16 },

  detayToggle: { fontSize: 12, fontWeight: "700", marginTop: 8 },
  detayBox:    { marginTop: 6, gap: 5 },
  detay:       { fontSize: 12, lineHeight: 18 },
});
