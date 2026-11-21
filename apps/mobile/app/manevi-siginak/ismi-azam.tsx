import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type AppColors } from "../../src/hooks/useColors";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { useMealOf } from "../../src/lib/englishMeal";
import { useStrings, getStrings, useLang, fmt, caps } from "../../src/i18n";
import { localizedTranslit } from "../../src/lib/translitEn";
import { localizedVerseTranslit } from "../../src/lib/verseTranslitEn";
import { localizedData, useLocalizedData } from "../../src/i18n/localizedData";
import ismiStrings from "../../src/i18n/strings/ismiAzam";
import { useSurahNameOf } from "../../src/lib/surahNames";
import { api, prefetchAyah, type TagFilterResult } from "../../src/lib/api";
import {
  Badge, Button, Callout,
  radius, space, toneColors,
  type Tone,
} from "../../src/components/ui";
import {
  bakara250 as bakara250Tr,
  ismiAzamDualari as ismiAzamDualariTr,
  korunmaDualari as korunmaDualariTr,
  sekineDuasi as sekineDuasiTr,
  type DuaKarti,
  type KaynakTuru,
  type KorunmaDuasi,
} from "../../src/data/ismi_azam_dualari";

const pickIsmi = localizedData(
  { bakara250: bakara250Tr, ismiAzamDualari: ismiAzamDualariTr, korunmaDualari: korunmaDualariTr, sekineDuasi: sekineDuasiTr },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("../../src/data/ismi_azam_dualari.en.json"),
);


// ── Bileşenler ──────────────────────────────────────────────────────────────

function StepList({ steps, colors }: { steps: readonly string[]; colors: AppColors }) {
  return (
    <View style={{ gap: space.xs }}>
      {steps.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={[styles.stepCircle, { backgroundColor: colors.cardAlt }]}>
            <Text style={[styles.stepCircleText, { color: colors.textSecondary }]}>{i + 1}</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items, colors }: { items: readonly string[]; colors: AppColors }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: space.xs }}>
          <View style={[styles.bulletDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function turMeta(
  tur: KaynakTuru,
  ia: { badgeKuran: string; badgeSahih: string; badgeHasen: string; badgeGelenek: string },
): { label: string; tone: Tone } {
  switch (tur) {
    case "kuran":
      return { label: ia.badgeKuran, tone: "emerald" };
    case "sahih":
      return { label: ia.badgeSahih, tone: "emerald" };
    case "hasen":
      return { label: ia.badgeHasen, tone: "amber" };
    case "gelenek":
      return { label: ia.badgeGelenek, tone: "violet" };
  }
}

function TurBadge({ tur }: { tur: KaynakTuru }) {
  const ia = useStrings(ismiStrings);
  const meta = turMeta(tur, ia);
  return <Badge label={meta.label} tone={meta.tone} />;
}

function Kutu({
  baslik, children, colors, renk, tur, kaynak,
}: {
  baslik: string; children: React.ReactNode; colors: AppColors;
  renk?: "stone" | "amber" | "violet"; tur?: KaynakTuru; kaynak?: string;
}) {
  const ia = useStrings(ismiStrings);
  const isAmber  = renk === "amber";
  const isViolet = renk === "violet";
  const labelColor = isAmber ? colors.amberText : isViolet ? colors.violetText : colors.textMuted;
  const boxBg       = isAmber ? colors.amberBg   : isViolet ? colors.violetBg   : colors.card;
  const boxBorder   = isAmber ? colors.amberBorder : colors.border;
  return (
    <View style={[styles.kutu, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      {baslik ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: kaynak ? 4 : 10, flexWrap: "wrap" }}>
          <Text style={[styles.kutuBaslik, { color: labelColor, flex: 1, marginBottom: 0 }]}>{caps(baslik)}</Text>
          {tur ? <TurBadge tur={tur} /> : null}
        </View>
      ) : null}
      {kaynak ? (
        <Text style={[styles.sourceLine, { color: colors.textSecondary }]}>{fmt(ia.sourceLine, { source: kaynak })}</Text>
      ) : null}
      {children}
    </View>
  );
}

// ── Arapça RTL destekli Dua Kartı ───────────────────────────────────────────

// ayet: dua tek bir ayete karşılık geliyorsa "sure:ayet" — İngilizce modda Pickthall gösterilir.
function DuaKartiFull({ dua, colors, ayet }: { dua: DuaKarti; colors: AppColors; ayet?: string }) {
  const mealOf = useMealOf();
  const ia = useStrings(ismiStrings);
  const lang = useLang();

  return (
    <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <Text style={[styles.duaBaslik, { color: colors.amberText, flex: 1 }]}>{caps(dua.baslik)}</Text>
        <TurBadge tur={dua.tur} />
      </View>
      <Text style={[styles.sourceLine, { color: colors.textSecondary }]}>{fmt(ia.sourceLine, { source: dua.kaynak })}</Text>

      {/* Arapça RTL */}
      <View style={[styles.arabicBox, { borderColor: colors.amberBorder }]}>
        <Text
          style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
        >
          {dua.arapca}
        </Text>
      </View>

      {/* Okunuş — üstte, belirgin */}
      <Text style={[styles.duaOkunus, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: "700" }}>{ia.reading}</Text>{localizedTranslit(dua.transkripsiyon, lang)}
      </Text>

      {/* Meal — altta */}
      <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: "700" }}>{ia.meaning}</Text>{ayet ? mealOf(ayet, dua.meal) : dua.meal}
      </Text>

      {/* Uygulama */}
      <Text style={[styles.duaUygulama, { color: colors.amberText }]}>
        <Text style={{ fontWeight: "700" }}>{ia.practice}</Text>{dua.uygulama}
      </Text>
    </View>
  );
}

// ── Korunma Duası Kartı (Arapça RTL + Kategori) ─────────────────────────────

const korunmaKategoriKey: Record<KorunmaDuasi["kategori"], "catMorningEvening" | "catLeavingHome" | "catSleeping" | "catGeneral"> = {
  "sabah-aksam": "catMorningEvening",
  "evden-cikarken": "catLeavingHome",
  "yatarken": "catSleeping",
  "genel-korunma": "catGeneral",
};

function KorunmaKarti({ dua, colors }: { dua: KorunmaDuasi; colors: AppColors }) {
  const ia = useStrings(ismiStrings);
  const lang = useLang();
  return (
    <View style={[styles.kutu, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <Text style={[styles.duaBaslik, { color: colors.greenText, flex: 1 }]}>{caps(dua.baslik)}</Text>
        <TurBadge tur={dua.tur} />
        <Badge tone="sky" label={ia[korunmaKategoriKey[dua.kategori]]} />
      </View>
      <Text style={[styles.sourceLine, { color: colors.textSecondary }]}>{fmt(ia.sourceLine, { source: dua.kaynak })}</Text>

      {/* Arapça RTL */}
      <View style={[styles.arabicBox, { borderColor: colors.greenBorder }]}>
        <Text
          style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
        >
          {dua.arapca}
        </Text>
      </View>

      {/* Okunuş — üstte, belirgin */}
      <Text style={[styles.duaOkunus, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: "700" }}>{ia.reading}</Text>{localizedTranslit(dua.transkripsiyon, lang)}
      </Text>

      {/* Meal — altta */}
      <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: "700" }}>{ia.meaning}</Text>{dua.meal}
      </Text>

      {/* Uygulama */}
      <Text style={[styles.duaUygulama, { color: colors.greenText }]}>
        <Text style={{ fontWeight: "700" }}>{ia.practice}</Text>{dua.uygulama}
      </Text>
    </View>
  );
}

// ref etiketinden "sure:ayet" çıkarır; yalnız tam ayeti gösterenlerde (başı/kısmi değil).
function ayetKey(ref: string): string | null {
  if (/başı/.test(ref)) return null;
  return /\b(\d{1,3}:\d{1,3})\b/.exec(ref)?.[1] ?? null;
}

// Görünen ref etiketi: TR'de olduğu gibi; EN'de refEn ya da "Al-Hadid 57:1" biçimi.
// (Kısmi-ayet denetimi ayetKey içinde Türkçe ref üzerinden yapılır.)
function refLabel(
  a: { ref: string; refEn?: string },
  lang: string,
  surahNameOf: (id: number, tr: string) => string,
): string {
  if (lang !== "en") return a.ref;
  if (a.refEn) return a.refEn;
  const m = /^(.*?)\s*(\d{1,3}):(\d{1,3})$/.exec(a.ref);
  return m ? `${surahNameOf(Number(m[2]), m[1])} ${m[2]}:${m[3]}` : a.ref;
}

// ── Metot Kutusu (Hadis metodları için, Arapça yoksa) ───────────────────────

function MetotKutusu({
  baslik, kaynak, aciklama, uygulama, colors, tur,
  ayetler, accordion,
}: {
  baslik: string; kaynak: string; aciklama: string; uygulama: string;
  colors: AppColors; tur: KaynakTuru;
  ayetler?: { arapca: string; transkripsiyon: string; anlam: string; ref: string; refEn?: string; anlamEn?: string }[];
  accordion?: boolean;
}) {
  const mealOf = useMealOf();
  const ia = useStrings(ismiStrings);
  const lang = useLang();
  const surahNameOf = useSurahNameOf();
  const [expanded, setExpanded] = React.useState(false);
  const isGelenek  = tur === "gelenek";
  const bg         = isGelenek ? colors.violetBg   : colors.amberBg;
  const border     = isGelenek ? colors.border     : colors.amberBorder;
  const labelColor = isGelenek ? colors.violetText : colors.amberText;
  const showAyetler = !accordion || expanded;

  return (
    <View style={[styles.kutu, { backgroundColor: bg, borderColor: border }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <Text style={[styles.duaBaslik, { color: labelColor, flex: 1 }]}>{caps(baslik)}</Text>
        <TurBadge tur={tur} />
      </View>
      <Text style={[styles.sourceLine, { color: colors.textSecondary }]}>{fmt(ia.sourceLine, { source: kaynak })}</Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 10 }]}>{aciklama}</Text>

      {/* Accordion toggle */}
      {accordion && ayetler && (
        <TouchableOpacity
          onPress={() => setExpanded(v => !v)}
          style={[styles.accToggleBtn, { borderColor: border }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={ia.showVersesA11y}
        >
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={labelColor} accessible={false} importantForAccessibility="no" />
          <Text style={[styles.badgeText, { color: labelColor }]}>
            {expanded ? ia.hideVerses : fmt(ia.showVerses, { n: ayetler.length })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Ayet metinleri — DuaKartiFull tarzında */}
      {showAyetler && ayetler && ayetler.map((a, i) => (
        <View key={i} style={{ marginBottom: 14 }}>
          <Text style={[styles.badgeText, { color: labelColor, marginBottom: 6 }]}>{refLabel(a, lang, surahNameOf)}</Text>
          <View style={[styles.arabicBox, { borderColor: border }]}>
            <Text style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}>
              {a.arapca}
            </Text>
          </View>
          <Text style={[styles.duaOkunus, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: "700" }}>{ia.reading}</Text>{localizedTranslit(a.transkripsiyon, lang)}
          </Text>
          <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: "700" }}>{ia.meaning}</Text>{mealOf(ayetKey(a.ref), lang === "en" ? (a.anlamEn ?? a.anlam) : a.anlam)}
          </Text>
        </View>
      ))}

      <Text style={[styles.duaUygulama, { color: labelColor }]}>
        <Text style={{ fontWeight: "700" }}>{ia.practice}</Text>{uygulama}
      </Text>
    </View>
  );
}

function VerseSubHeader({ label, colors }: { label: string; colors: AppColors }) {
  return (
    <Text style={[styles.subHeader, { color: colors.textMuted }]}>{caps(label)}</Text>
  );
}

function TagVerseAccordion({
  tag,
  label,
  colors,
  renk,
}: {
  tag: string;
  label: string;
  colors: AppColors;
  renk: "amber" | "violet";
}) {
  const mealOf = useMealOf();
  const ia = useStrings(ismiStrings);
  const lang = useLang();
  const surahNameOf = useSurahNameOf();
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verses, setVerses] = React.useState<TagFilterResult[]>([]);
  const [total, setTotal] = React.useState(0);

  const isViolet = renk === "violet";
  const boxBg = isViolet ? colors.violetBg : colors.amberBg;
  const boxBorder = isViolet ? colors.border : colors.amberBorder;
  const labelColor = isViolet ? colors.violetText : colors.amberText;
  const badgeBg = isViolet ? colors.card : colors.amberBg;

  const fetchVerses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.tags.filter(tag);
      setVerses((res.results ?? []).slice(0, 15));
      setTotal(res.total ?? 0);
    } catch {
      setError(getStrings(ismiStrings).versesError);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (!next || loaded) return;
    await fetchVerses();
  };

  const countLabel = loaded && total > 0 ? fmt(ia.countVerses, { n: total }) : ia.openVerses;

  return (
    <View style={[styles.kutu, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <TouchableOpacity style={styles.verseAccHeader} onPress={toggle} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={label}>
        <View style={styles.verseAccTitleWrap}>
          <Text style={[styles.verseAccTitle, { color: labelColor }]}>{caps(label)}</Text>
          <Text style={[styles.verseAccMeta, { color: colors.textMuted }]}>{countLabel}</Text>
        </View>
        <View style={[styles.badgePill, { backgroundColor: badgeBg, borderColor: boxBorder }]}>
          <Text style={[styles.badgeText, { color: labelColor }]}>{expanded ? ia.hide : ia.show}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={labelColor} accessible={false} importantForAccessibility="no" />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.verseAccBody}>
          {loading ? <ActivityIndicator color={labelColor} style={{ marginVertical: 8 }} /> : null}
          {!loading && error ? (
            <View style={styles.verseErrorWrap}>
              <Text style={[styles.inlineNote, { color: colors.textSecondary }]}>{error}</Text>
              <Button variant="secondary" label={ia.retry} onPress={fetchVerses} accessibilityLabel={ia.retryA11y} />
            </View>
          ) : null}
          {!loading && !error && loaded && verses.length === 0 ? (
            <Text style={[styles.inlineNote, { color: colors.textSecondary }]}>{ia.noVerses}</Text>
          ) : null}
          {!loading && verses.map((verse) => (
            <TouchableOpacity
              key={verse.verse_key}
              style={[styles.verseRow, { backgroundColor: colors.card, borderColor: boxBorder }]}
              onPressIn={() => prefetchAyah(verse.surah_id, verse.ayah_number)}
              onPress={() => router.push(`/ayah/${verse.surah_id}/${verse.ayah_number}`)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={fmt(ia.openVerseA11y, { name: surahNameOf(verse.surah_id, verse.surah_name) ?? verse.verse_key })}
            >
              <View style={styles.verseRowTop}>
                <View style={[styles.verseKeyBadge, { backgroundColor: boxBg, borderColor: boxBorder }]}>
                  <Text style={[styles.verseKeyText, { color: labelColor }]}>{verse.verse_key}</Text>
                </View>
                <Text style={[styles.verseSurah, { color: colors.textMuted }]} numberOfLines={1}>
                  {surahNameOf(verse.surah_id, verse.surah_name) ?? ia.verseWord}
                </Text>
              </View>
              {verse.reading_tr ? (
                <Text style={[styles.verseReading, { color: colors.text }]} numberOfLines={3}>{localizedVerseTranslit(verse.verse_key, verse.reading_tr, lang)}</Text>
              ) : null}
              {verse.meal ? (
                <Text style={[styles.verseMeal, { color: colors.textSecondary }]} numberOfLines={4}>{mealOf(verse.verse_key, verse.meal)}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
          {total > verses.length ? (
            <Text style={[styles.verseHint, { color: colors.textMuted }]}>{fmt(ia.firstN, { n: verses.length })}</Text>
          ) : (
            <Text style={[styles.verseHint, { color: colors.textMuted }]}>{ia.tapHint}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ── Ana sayfa ───────────────────────────────────────────────────────────────

export default function IsmiAzamScreen() {
  const colors = useColors();
  const mealOf = useMealOf();
  const { bakara250, ismiAzamDualari, korunmaDualari, sekineDuasi } = useLocalizedData(pickIsmi);
  const ia = useStrings(ismiStrings);
  const heroTone = toneColors(colors, "amber");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: ia.screenTitle }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIconWrap, { backgroundColor: heroTone.bg }]}>
            <Ionicons name="sparkles-outline" size={28} color={heroTone.fg} accessible={false} importantForAccessibility="no" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {ia.screenTitle}
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            {ia.heroSub}
          </Text>
        </View>

        {/* Kişisel not */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.bodyText, { color: colors.amberText }]}>
            <Text style={{ fontWeight: "700" }}>{ia.noteLabel}</Text>
            {ia.noteBody}
          </Text>
        </View>

        {/* Ulema açıklaması */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.kutuBaslik, { color: colors.amberText }]}>{caps(ia.ulemaTitle)}</Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {ia.ulemaA}<Text style={{ fontWeight: "700" }}>{ia.ulemaB}</Text>{ia.ulemaC}
          </Text>
        </View>

        {/* Kaynak etiketleme bilgisi */}
        <View style={[styles.kutu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {ia.sourceInfo}
          </Text>
        </View>

        {/* ── Bölüm 1: İsm-i Azam ────────────────────────────────────── */}
        <Text style={[styles.bolumBaslik, { color: colors.text }]}>{ia.sec1Title}</Text>

        <Kutu baslik={ia.irfaniTitle} colors={colors}>
          <StepList steps={ia.irfaniSteps} colors={colors} />
        </Kutu>

        {ismiAzamDualari.map((dua) => (
          <DuaKartiFull key={dua.id} dua={dua} colors={colors} />
        ))}

        <MetotKutusu
          baslik={ia.hayyTitle}
          kaynak={ia.hayySource}
          aciklama={ia.hayyDesc}
          uygulama={ia.hayyPractice}
          tur="hasen"
          accordion
          colors={colors}
          ayetler={[
            {
              ref: "Bakara 2:255 — Âyetü'l-Kürsî (başı)",
              refEn: ia.hayyRef1,
              anlamEn: ia.hayyMeaning1,
              arapca: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
              transkripsiyon: "Allâhü lâ ilâhe illâ hüvel-Hayyül-Kayyûm",
              anlam: "Allah, O'ndan başka ilah yoktur; O Hayy (diri) ve Kayyûm (her şeyi ayakta tutan)'dur.",
            },
            {
              ref: "Âl-i İmrân 3:2",
              arapca: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
              transkripsiyon: "Allâhü lâ ilâhe illâ hüvel-Hayyül-Kayyûm",
              anlam: "Allah, O'ndan başka ilah yoktur; O Hayy ve Kayyûm'dur.",
            },
            {
              ref: "Tâhâ 20:111",
              arapca: "وَعَنَتِ الْوُجُوهُ لِلْحَيِّ الْقَيُّومِ ۖ وَقَدْ خَابَ مَنْ حَمَلَ ظُلْمًا",
              transkripsiyon: "Ve anetel-vücûhü lil-Hayyil-Kayyûm, ve kad hâbe men hamele zulmâ",
              anlam: "Tüm yüzler, Hayy ve Kayyûm olan Allah için boyun eğmiştir. Kim zulüm taşırsa şüphesiz perişan olur.",
            },
          ]}
        />

        <MetotKutusu
          baslik={ia.asmaTitle}
          kaynak={ia.asmaSource}
          aciklama={ia.asmaDesc}
          uygulama={ia.asmaPractice}
          tur="hasen"
          accordion
          colors={colors}
          ayetler={[
            {
              ref: "Bakara 2:163",
              arapca: "وَإِلَٰهُكُمْ إِلَٰهٌ وَاحِدٌ ۖ لَّا إِلَٰهَ إِلَّا هُوَ الرَّحْمَٰنُ الرَّحِيمُ",
              transkripsiyon: "Ve ilâhüküm ilâhün vâhid, lâ ilâhe illâ hüver-Rahmânür-Rahîm",
              anlam: "İlâhınız tek bir İlâh'tır; O'ndan başka ilah yoktur. O Rahman ve Rahim'dir.",
            },
            {
              ref: "Âl-i İmrân 3:2",
              arapca: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
              transkripsiyon: "Allâhü lâ ilâhe illâ hüvel-Hayyül-Kayyûm",
              anlam: "Allah, O'ndan başka ilah yoktur; O Hayy ve Kayyûm'dur.",
            },
          ]}
        />

        <MetotKutusu
          baslik={ia.aliTitle}
          kaynak={ia.aliSource}
          aciklama={ia.aliDesc}
          uygulama={ia.aliPractice}
          tur="gelenek"
          accordion
          colors={colors}
          ayetler={[
            {
              ref: "Hadid 57:1",
              arapca: "سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ ۖ وَهُوَ الْعَزِيزُ الْحَكِيمُ",
              transkripsiyon: "Sebbehe lillâhi mâ fis-semâvâti vel-ard, ve hüvel-azîzül-hakîm",
              anlam: "Göklerde ve yerde ne varsa Allah'ı tesbih eder. O, Aziz ve Hakimdir.",
            },
            {
              ref: "Hadid 57:2",
              arapca: "لَهُ مُلْكُ السَّمَاوَاتِ وَالْأَرْضِ ۖ يُحْيِي وَيُمِيتُ ۖ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
              transkripsiyon: "Lehü mülküs-semâvâti vel-ard, yuhyî ve yümît, ve hüve alâ külli şey'in kadîr",
              anlam: "Göklerin ve yerin hükümranlığı O'nundur; diriltir ve öldürür. O her şeye kadirdir.",
            },
            {
              ref: "Hadid 57:3",
              arapca: "هُوَ الْأَوَّلُ وَالْآخِرُ وَالظَّاهِرُ وَالْبَاطِنُ ۖ وَهُوَ بِكُلِّ شَيْءٍ عَلِيمٌ",
              transkripsiyon: "Hüvel-Evvelü vel-Âhiru vez-Zâhiru vel-Bâtın, ve hüve bikülli şey'in alîm",
              anlam: "O Evvel ve Âhirdir, Zâhir ve Bâtındır. O her şeyi bilendir.",
            },
            {
              ref: "Hadid 57:4",
              arapca: "هُوَ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ ثُمَّ اسْتَوَىٰ عَلَى الْعَرْشِ ۚ يَعْلَمُ مَا يَلِجُ فِي الْأَرْضِ وَمَا يَخْرُجُ مِنْهَا وَمَا يَنزِلُ مِنَ السَّمَاءِ وَمَا يَعْرُجُ فِيهَا ۖ وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ بَصِيرٌ",
              transkripsiyon: "Hüvellezî halekas-semâvâti vel-arda fî sitteti eyyâm, sümmestevâ alel-arş, ya'lemü mâ yeliçü fil-ardi ve mâ yahrucü minhâ ve mâ yenzilü mines-semâi ve mâ ya'rucü fîhâ, ve hüve meaküm eyne mâ küntüm, vallâhü bimâ ta'melûne basîr",
              anlam: "O, gökleri ve yeri altı günde yaratan; yere gireni, yerden çıkanı, gökten ineni ve göğe çıkanı bilendir. Nerede olursanız olun O sizinledir. Allah yaptıklarınızı görendir.",
            },
            {
              ref: "Hadid 57:5",
              arapca: "لَّهُ مُلْكُ السَّمَاوَاتِ وَالْأَرْضِ ۚ وَإِلَى اللَّهِ تُرْجَعُ الْأُمُورُ",
              transkripsiyon: "Lehü mülküs-semâvâti vel-ard, ve ilallâhi türce'ul-umûr",
              anlam: "Göklerin ve yerin hükümranlığı O'nundur; bütün işler Allah'a döndürülür.",
            },
            {
              ref: "Hadid 57:6",
              arapca: "يُولِجُ اللَّيْلَ فِي النَّهَارِ وَيُولِجُ النَّهَارَ فِي اللَّيْلِ ۚ وَهُوَ عَلِيمٌ بِذَاتِ الصُّدُورِ",
              transkripsiyon: "Yûlicül-leyle fin-nehâri ve yûlicün-nehâre fil-leyl, ve hüve alîmün bizâtis-sudûr",
              anlam: "Geceyi gündüze, gündüzü geceye katar. O, göğüslerin özündekini bilendir.",
            },
            {
              ref: "Hadid 57:7",
              arapca: "آمِنُوا بِاللَّهِ وَرَسُولِهِ وَأَنفِقُوا مِمَّا جَعَلَكُم مُّسْتَخْلَفِينَ فِيهِ ۖ فَالَّذِينَ آمَنُوا مِنكُمْ وَأَنفَقُوا لَهُمْ أَجْرٌ كَبِيرٌ",
              transkripsiyon: "Âminû billâhi ve resûlihî ve enfiku mimmâ cealekum müstahlegîne fîh, fellezîne âmenû minküm ve enfekû lehüm ecrun kebîr",
              anlam: "Allah'a ve Resulüne iman edin; sizi üzerinde halife kıldığı şeyden infak edin. Sizden iman edip infak edenlere büyük mükâfat vardır.",
            },
            {
              ref: "Hadid 57:8",
              arapca: "وَمَا لَكُمْ لَا تُؤْمِنُونَ بِاللَّهِ ۙ وَالرَّسُولُ يَدْعُوكُمْ لِتُؤْمِنُوا بِرَبِّكُمْ وَقَدْ أَخَذَ مِيثَاقَكُمْ إِن كُنتُم مُّؤْمِنِينَ",
              transkripsiyon: "Ve mâ leküm lâ tü'minûne billâh, ver-resûlü yed'ûküm litü'minû birabbküm ve kad ehaze mîsâkaküm in küntüm mü'minîn",
              anlam: "Allah'a iman etmemeniz için ne engeliniz var? Resulü sizi Rabbinize iman etmeye çağırıyor. Eğer mü'minseniz, O sizden söz almıştır.",
            },
            {
              ref: "Hadid 57:9",
              arapca: "هُوَ الَّذِي يُنَزِّلُ عَلَىٰ عَبْدِهِ آيَاتٍ بَيِّنَاتٍ لِّيُخْرِجَكُم مِّنَ الظُّلُمَاتِ إِلَى النُّورِ ۚ وَإِنَّ اللَّهَ بِكُمْ لَرَءُوفٌ رَّحِيمٌ",
              transkripsiyon: "Hüvellezî yünezzilü alâ abdihî âyâtin beyyinâtin liyuhricaküm minez-zulümâti ilen-nûr, ve innallâhe biküm le-raûfün rahîm",
              anlam: "O, kuluna açık âyetler indirip sizi karanlıklardan nura çıkarmak isteyendir. Allah size karşı şefkatli ve merhametlidir.",
            },
            {
              ref: "Hadid 57:10",
              arapca: "وَمَا لَكُمْ أَلَّا تُنفِقُوا فِي سَبِيلِ اللَّهِ وَلِلَّهِ مِيرَاثُ السَّمَاوَاتِ وَالْأَرْضِ ۚ لَا يَسْتَوِي مِنكُم مَّنْ أَنفَقَ مِن قَبْلِ الْفَتْحِ وَقَاتَلَ ۚ أُولَٰئِكَ أَعْظَمُ دَرَجَةً مِّنَ الَّذِينَ أَنفَقُوا مِن بَعْدُ وَقَاتَلُوا ۚ وَكُلًّا وَعَدَ اللَّهُ الْحُسْنَىٰ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ خَبِيرٌ",
              transkripsiyon: "Ve mâ leküm ellâ tünfiku fî sebîlillâh, ve lillâhi mîrâsüs-semâvâti vel-ard, lâ yestevî minküm men enfeka min kablil-fethi ve kâtel, ülâike a'zamü dereceten minellezîne enfekû min ba'dü ve kâtelû, ve küllen veadallâhul-husnâ, vallâhü bimâ ta'melûne habîr",
              anlam: "Allah'ın yolunda infak etmemeniz için ne var? Göklerin ve yerin mirası Allah'ındır. Fetihten önce infak edip savaşanlar diğerleriyle eşit değildir; onlar daha büyük derecelidir. Allah hepsine güzeli vaat etmiş, yaptıklarınızdan haberdardır.",
            },
            {
              ref: "Haşr 59:22",
              arapca: "هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ ۖ عَالِمُ الْغَيْبِ وَالشَّهَادَةِ ۖ هُوَ الرَّحْمَٰنُ الرَّحِيمُ",
              transkripsiyon: "Hüvallâhüllezî lâ ilâhe illâ hû, âlimül-ğaybi veş-şehâdeh, hüver-Rahmânür-Rahîm",
              anlam: "O Allah ki O'ndan başka ilah yoktur; gaybı ve aşikârı bilendir. O Rahman ve Rahimdir.",
            },
            {
              ref: "Haşr 59:23",
              arapca: "هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْمَلِكُ الْقُدُّوسُ السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ ۚ سُبْحَانَ اللَّهِ عَمَّا يُشْرِكُونَ",
              transkripsiyon: "Hüvallâhüllezî lâ ilâhe illâ hü, el-Melikül-Kuddûsüs-Selâmül-Mü'minül-Müheyminül-Azîzül-Cebbârül-Mütekebbir, sübhânallâhi ammâ yüşrikûn",
              anlam: "O Allah: Melik, Kuddûs, Selâm, Mü'min, Müheymin, Aziz, Cebbâr ve Mütekebbir'dir. Allah, müşriklerin ortak koştuklarından münezzehtir.",
            },
            {
              ref: "Haşr 59:24",
              arapca: "هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ ۖ لَهُ الْأَسْمَاءُ الْحُسْنَىٰ ۚ يُسَبِّحُ لَهُ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ ۖ وَهُوَ الْعَزِيزُ الْحَكِيمُ",
              transkripsiyon: "Hüvallâhül-Hâlikul-Bâriül-Musavvir, lehül-esmâül-hüsnâ, yüsebbihü lehü mâ fis-semâvâti vel-ard, ve hüvel-azîzül-hakîm",
              anlam: "O Allah: Yaratıcı, yoktan var edici ve şekil vericidir. En güzel isimler O'nundur. Göklerde ve yerde ne varsa O'nu tesbih eder. O Aziz ve Hakimdir.",
            },
          ]}
        />

        <VerseSubHeader label={ia.subHeader1} colors={colors} />
        <TagVerseAccordion tag="ismiazam-ayet" label={ia.openAcc1} colors={colors} renk="amber" />

        {/* ── Bölüm 2: Sekine Duası ─────────────────────────────────── */}
        <View style={[styles.secHeadRow, { marginTop: space.xs }]}>
          <Ionicons name="sync-outline" size={18} color={colors.violetText} accessible={false} importantForAccessibility="no" />
          <Text style={[styles.bolumBaslik, { color: colors.text, marginTop: 0, marginBottom: 0, flex: 1 }]}>{ia.sec2Title}</Text>
        </View>

        {/* Tabut-u Sekine */}
        <View style={[styles.kutu, { backgroundColor: colors.violetBg, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            <Ionicons name="cube-outline" size={15} color={colors.violetText} accessible={false} importantForAccessibility="no" />
            <Text style={[styles.duaBaslik, { color: colors.violetText, flex: 1 }]}>
              {caps(ia.tabutTitle)}
            </Text>
            <TurBadge tur="kuran" />
          </View>
          <Text style={[styles.sourceLine, { color: colors.textSecondary }]}>{fmt(ia.sourceLine, { source: ia.tabutSource })}</Text>

          {/* Arapça RTL */}
          <View style={[styles.arabicBox, { borderColor: colors.border }]}>
            <Text
              style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
            >
              {sekineDuasi.arapca}
            </Text>
          </View>

          <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: "700" }}>{ia.sekineMeaning}</Text>{mealOf("2:248", sekineDuasi.meal)}
          </Text>
          <Text style={[styles.duaUygulama, { color: colors.violetText }]}>
            {sekineDuasi.aciklama}
          </Text>
        </View>

        {/* Bakara 250 */}
        <DuaKartiFull dua={bakara250} colors={colors} ayet="2:250" />

        <Kutu baslik={ia.frameTitle} colors={colors} renk="violet">
          <Text style={[styles.inlineNote, { color: colors.textSecondary }]}>
            {ia.frameBody}
          </Text>
        </Kutu>

        <Kutu baslik={ia.prepTitle} colors={colors} renk="violet">
          <StepList steps={ia.prepSteps} colors={colors} />
        </Kutu>

        <Kutu baslik={ia.circleTitle} colors={colors} renk="violet" tur="gelenek" kaynak={ia.sekineSource}>
          <StepList steps={ia.circleSteps} colors={colors} />
        </Kutu>

        <View style={[styles.kutu, { backgroundColor: colors.violetBg, borderColor: colors.border }]}>
          <Text style={[styles.kutuBaslik, { color: colors.violetText }]}>{caps(ia.tevafukTitle)}</Text>
          <BulletList items={ia.tevafukItems} colors={colors} />
        </View>

        <VerseSubHeader label={ia.subHeader2} colors={colors} />
        <TagVerseAccordion tag="ismiazam-sekine" label={ia.openAcc2} colors={colors} renk="violet" />

        {/* ── Bölüm 3: Günlük Korunma Duaları ────────────────────────── */}
        <View style={[styles.secHeadRow, { marginTop: space.xs }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.greenText} accessible={false} importantForAccessibility="no" />
          <Text style={[styles.bolumBaslik, { color: colors.text, marginTop: 0, marginBottom: 0, flex: 1 }]}>{ia.sec3Title}</Text>
        </View>

        <Kutu baslik={ia.aboutTitle} colors={colors}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {ia.aboutBody}
          </Text>
        </Kutu>

        {korunmaDualari.map((dua) => (
          <KorunmaKarti key={dua.id} dua={dua} colors={colors} />
        ))}

        {/* Tavsiye */}
        <Callout tone="warning" icon="heart-outline" style={{ marginBottom: 14 }}>
          {ia.advice}
        </Callout>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { padding: space.gutter, paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  hero:          { alignItems: "center", marginBottom: 20 },
  heroIconWrap:  { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  heroTitle:     { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, textAlign: "center" },
  heroSub:       { fontSize: 13, lineHeight: 20, marginTop: 6, textAlign: "center" },

  kutu: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: 14, marginBottom: 14,
  },
  kutuBaslik: {
    fontSize: 11, fontWeight: "800", textTransform: "uppercase",
    letterSpacing: 1.5, marginBottom: 10,
  },

  bodyText:     { fontSize: 13, lineHeight: 21 },
  stepCircle:   { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepCircleText: { fontSize: 11, fontWeight: "800" },
  bulletDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 7 },

  // Arapça RTL
  arabicBox: {
    borderRadius: 10, borderWidth: 1,
    padding: 12, marginBottom: 10,
  },
  arabicText: {
    fontSize: 20, lineHeight: 38,
    textAlign: "right",
    fontFamily: "Amiri",
  },

  duaBaslik:   { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  sourceLine:  { fontSize: 11, fontWeight: "600", marginBottom: 10 },
  duaOkunus:   { fontSize: 13, lineHeight: 20, fontWeight: "600", marginBottom: 6 },
  duaAnlam:    { fontSize: 11, lineHeight: 17, fontStyle: "italic", marginBottom: 4 },
  duaUygulama: { fontSize: 12, lineHeight: 19 },
  badgePill:   { flexDirection: "row", alignItems: "center", gap: space.xxs, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { fontSize: 10, fontWeight: "700" },
  accToggleBtn:{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, marginBottom: 10 },

  subHeader: {
    fontSize: 11, fontWeight: "800", textTransform: "uppercase",
    letterSpacing: 1.5, marginBottom: 8, marginTop: 4,
  },

  secHeadRow:  { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: 10 },
  bolumBaslik: { fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 10 },
  verseAccHeader: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
  verseAccTitleWrap: { flex: 1, gap: 4 },
  verseAccTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  verseAccMeta: { fontSize: 11, fontWeight: "600" },
  verseAccBody: { marginTop: 12, gap: 10 },
  verseRow: { borderRadius: radius.md, borderWidth: 1, padding: 12, minHeight: 44 },
  verseRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  verseKeyBadge: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  verseKeyText: { fontSize: 10, fontWeight: "800" },
  verseSurah: { fontSize: 11, fontWeight: "600", flex: 1, textAlign: "right" },
  verseReading: { fontSize: 13, lineHeight: 20, fontWeight: "600", marginBottom: 4 },
  verseMeal: { fontSize: 11, lineHeight: 18 },
  verseHint: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  inlineNote: { fontSize: 12, lineHeight: 18 },
  verseErrorWrap: { alignItems: "center", gap: space.xs, paddingVertical: 4 },
});