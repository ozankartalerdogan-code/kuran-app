import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { logScreen } from "../src/lib/analytics";
import { localizedData, useLocalizedData } from "../src/i18n/localizedData";
import { useStrings, useLang, fmt } from "../src/i18n";
import { localizedTranslit } from "../src/lib/translitEn";
import dualarStrings from "../src/i18n/strings/dualar";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { getDevotionalSourceLabel, getNarrationBadgeLabel } from "../src/lib/sourceLabels";
import { Badge, radius, space, type IoniconName, type Tone } from "../src/components/ui";

interface Dua {
  baslik: string; arapca: string; okunus: string; anlam: string; kaynak: string;
  derece: string; tekrar: string; neZaman: string; aciklama: string; not: string;
}
interface Kategori { kod: string; isim: string; dualar: Dua[] }
interface DualarData { baslik: string; aciklama: string; kategoriler: Kategori[] }

const pickDualar = localizedData<DualarData>(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/dualar.json"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../src/data/dualar.en.json"),
);

function derecTone(derece: string): Tone {
  if (/[kq]ur'?an/i.test(derece)) return "violet";
  if (/sahih/i.test(derece))   return "emerald";
  if (/hasan/i.test(derece))   return "amber";
  return "neutral";
}

function DerecBadge({ derece }: { derece: string }) {
  if (!derece) return null;
  const label = getNarrationBadgeLabel(derece);
  if (!label) return null;
  return <Badge label={label} tone={derecTone(derece)} style={{ alignSelf: "center" }} />;
}

function MetaLine({ icon, text, textStyle }: { icon: IoniconName; text: string; textStyle?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <View style={s.metaRow}>
      <Ionicons name={icon} size={14} color={c.textMuted} style={s.metaIcon} accessible={false} importantForAccessibility="no" />
      <Text style={[{ flex: 1 }, textStyle]}>{text}</Text>
    </View>
  );
}

function DuaCard({ dua }: { dua: Dua }) {
  const c = useColors();
  const t = useStrings(dualarStrings);
  const lang = useLang();
  const [detay, setDetay] = useState(false);
  const hasDetay = !!(dua.aciklama || dua.not || dua.tekrar);
  const sourceLabel = getDevotionalSourceLabel({
    title: dua.baslik,
    source: dua.kaynak,
    degree: dua.derece,
  });

  async function handleShare() {
    Haptics.selectionAsync();
    const parts = [`🤲 ${dua.baslik}`];
    if (dua.arapca && /[؀-ۿ]/.test(dua.arapca)) parts.push(dua.arapca);
    if (dua.okunus) parts.push(localizedTranslit(dua.okunus, lang));
    if (dua.anlam) parts.push(dua.anlam);
    parts.push(t.shareFooter);
    try { await Share.share({ message: parts.join("\n\n") }); } catch (_e) { /* noop */ }
  }

  return (
    <View style={[s.duaCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={s.duaHead}>
        <Text style={[s.duaBaslik, { color: c.text }]}>{dua.baslik}</Text>
        <DerecBadge derece={dua.derece} />
        <TouchableOpacity onPress={handleShare} hitSlop={8} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t.shareA11y}>
          <Ionicons name="share-social-outline" size={16} color={c.textMuted} />
        </TouchableOpacity>
      </View>
      {dua.arapca ? (
        /[؀-ۿ]/.test(dua.arapca)
          // Kart zemini temaya bağlı (c.card) — sabit koyu renk gece modunda kaybolurdu.
          ? <Text style={[s.arabic, { color: c.text }]}>{dua.arapca}</Text>
          : (
            <View style={[s.refNoteBox, { backgroundColor: c.cardAlt }]}>
              <MetaLine icon="link-outline" text={dua.arapca} textStyle={[s.refNote, { color: c.textSecondary }]} />
            </View>
          )
      ) : null}
      {dua.okunus ? <Text style={[s.okunus, { color: c.text }]}>{localizedTranslit(dua.okunus, lang)}</Text> : null}
      {dua.anlam ? <Text style={[s.anlam, { color: c.textSecondary }]}>{dua.anlam}</Text> : null}

      {(dua.kaynak || dua.neZaman) ? (
        <View style={[s.metaBox, { backgroundColor: c.cardAlt }]}>
          {dua.kaynak ? <MetaLine icon="book-outline" text={sourceLabel} textStyle={[s.meta, { color: c.textMuted }]} /> : null}
          {dua.neZaman ? <MetaLine icon="time-outline" text={dua.neZaman} textStyle={[s.meta, { color: c.textMuted }]} /> : null}
        </View>
      ) : null}

      {hasDetay && (
        <>
          <TouchableOpacity
            onPress={() => setDetay(d => !d)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: detay }}
            accessibilityLabel={t.detailA11y}
            style={s.detayToggleRow}
          >
            <Ionicons name={detay ? "chevron-up" : "chevron-down"} size={14} color={c.accent} accessible={false} importantForAccessibility="no" />
            <Text style={[s.detayToggle, { color: c.accent }]}>{detay ? t.less : t.more}</Text>
          </TouchableOpacity>
          {detay && (
            <View style={s.detayBox}>
              {dua.aciklama ? <Text style={[s.detay, { color: c.textSecondary }]}>{dua.aciklama}</Text> : null}
              {dua.tekrar ? <MetaLine icon="repeat-outline" text={dua.tekrar} textStyle={[s.detay, { color: c.textMuted }]} /> : null}
              {dua.not ? <MetaLine icon="pin-outline" text={dua.not} textStyle={[s.detay, { color: c.textMuted }]} /> : null}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function KategoriAccordion({ kat, defaultOpen }: { kat: Kategori; defaultOpen?: boolean }) {
  const c = useColors();
  const t = useStrings(dualarStrings);
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View style={[s.katCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={s.katHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={fmt(t.categoryA11y, { name: kat.isim, n: kat.dualar.length })}>
        <View style={[s.katKod, { backgroundColor: c.actionBg }]}>
          <Text style={[s.katKodText, { color: c.actionText }]}>{kat.kod}</Text>
        </View>
        <Text style={[s.katTitle, { color: c.text }]}>{kat.isim}</Text>
        <Badge tone="neutral" label={String(kat.dualar.length)} style={{ alignSelf: "center" }} />
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} accessible={false} importantForAccessibility="no" />
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
  useEffect(() => { logScreen("Dualar"); }, []);
  const D = useLocalizedData(pickDualar);
  const t = useStrings(dualarStrings);
  return (
    <>
      <Stack.Screen options={{ title: t.title }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[s.content, { paddingTop: space.xs, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: c.textSecondary }]}>{D.aciklama}</Text>
        {D.kategoriler.map((k) => <KategoriAccordion key={k.kod} kat={k} />)}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: space.gutter, paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  intro:   { fontSize: 12.5, lineHeight: 19, marginBottom: 14 },

  // Kategori akordiyon
  katCard:    { borderRadius: radius.lg, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  katHeader:  { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  katKod:     { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  katKodText: { fontSize: 13, fontWeight: "800" },
  katTitle:   { flex: 1, fontSize: 14, fontWeight: "700" },
  katBody:    { paddingHorizontal: space.sm, paddingBottom: space.sm, gap: 10 },

  // Dua kartı
  duaCard:   { borderRadius: radius.lg, borderWidth: 1, padding: 13 },
  duaHead:   { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: space.xs, flexWrap: "wrap" },
  duaBaslik: { flex: 1, fontSize: 14, fontWeight: "700" },

  arabic:     { fontSize: 21, lineHeight: 40, textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", marginBottom: space.xs },
  refNoteBox: { borderRadius: radius.sm, padding: 10, marginBottom: space.xs },
  refNote:    { fontSize: 13, lineHeight: 20 },
  okunus:     { fontSize: 13, lineHeight: 21, fontStyle: "italic", marginBottom: 6 },
  anlam:      { fontSize: 12.5, lineHeight: 19, marginBottom: space.xs },

  metaBox:  { borderRadius: radius.sm, padding: 9, gap: space.xxs },
  metaRow:  { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  metaIcon: { marginTop: 2 },
  meta:     { fontSize: 11, lineHeight: 16 },

  detayToggleRow: { flexDirection: "row", alignItems: "center", gap: space.xxs, marginTop: space.xs },
  detayToggle:    { fontSize: 12, fontWeight: "700" },
  detayBox:       { marginTop: 6, gap: 5 },
  detay:          { fontSize: 12, lineHeight: 18 },
});
