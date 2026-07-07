import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useColors as useGlobalColors } from "../../src/hooks/useColors";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { READING_MAX_WIDTH } from "../../src/lib/layout";
import { getDevotionalSourceLabel } from "../../src/lib/sourceLabels";
import { api, prefetchAyah, type TagFilterResult } from "../../src/lib/api";
import {
  bakara250,
  ismiAzamDualari,
  korunmaDualari,
  sekineDuasi,
  type DuaKarti,
  type KorunmaDuasi,
} from "../../src/data/ismi_azam_dualari";

// ── Renk paleti (dark mode uyumlu) ───────────────────────────────────────────────
function useColors() {
  const { isDark: dark } = useGlobalColors();
  return {
    bg:            dark ? "#1c1917" : "#f5f0e8",
    cardBg:        dark ? "#292524" : "#ffffff",
    cardBorder:    dark ? "#44403c" : "#e7e5e4",
    text:          dark ? "#f5f5f4" : "#1c1917",
    textSecondary: dark ? "#a8a29e" : "#78716c",
    textMuted:     dark ? "#78716c" : "#a8a29e",
    amberBg:       dark ? "#451a03" : "#fffbeb",
    amberBorder:   dark ? "#78350f" : "#fde68a",
    amberText:     dark ? "#fcd34d" : "#92400e",
    emeraldBg:     dark ? "#052e16" : "#ecfdf5",
    emeraldBorder: dark ? "#065f46" : "#a7f3d0",
    emeraldText:   dark ? "#6ee7b7" : "#065f46",
    violetBg:      dark ? "#3b0764" : "#f5f3ff",
    violetBorder:  dark ? "#6b21a8" : "#ddd6fe",
    violetText:    dark ? "#c4b5fd" : "#6d28d9",
    blueBg:        dark ? "#172554" : "#eff6ff",
    blueBorder:    dark ? "#1e40af" : "#bfdbfe",
    blueText:      dark ? "#93c5fd" : "#1e40af",
    stepBg:        dark ? "#44403c" : "#e7e5e4",
    stepText:      dark ? "#d6d3d1" : "#57534e",
    bulletDot:     dark ? "#78716c" : "#a8a29e",
    scoreGreenBg:   dark ? "#064e3b" : "#d1fae5",
    scoreGreenText: dark ? "#6ee7b7" : "#065f46",
    scoreYellowBg:  dark ? "#451a03" : "#fef3c7",
    scoreYellowText:dark ? "#fcd34d" : "#92400e",
  };
}

// ── Bileşenler ──────────────────────────────────────────────────────────────

function StepList({ steps, colors }: { steps: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ gap: 8 }}>
      {steps.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={[styles.stepCircle, { backgroundColor: colors.stepBg }]}>
            <Text style={[styles.stepCircleText, { color: colors.stepText }]}>{i + 1}</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items, colors }: { items: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={[styles.bulletDot, { backgroundColor: colors.bulletDot }]} />
          <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Kutu({
  baslik, children, colors, renk,
}: {
  baslik: string; children: React.ReactNode; colors: ReturnType<typeof useColors>;
  renk?: "stone" | "amber" | "violet";
}) {
  const isAmber  = renk === "amber";
  const isViolet = renk === "violet";
  const labelColor = isAmber ? colors.amberText : isViolet ? colors.violetText : colors.textMuted;
  const boxBg       = isAmber ? colors.amberBg   : isViolet ? colors.violetBg   : colors.cardBg;
  const boxBorder   = isAmber ? colors.amberBorder : isViolet ? colors.violetBorder : colors.cardBorder;
  return (
    <View style={[styles.kutu, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      {baslik ? (
        <Text style={[styles.kutuBaslik, { color: labelColor }]}>{baslik}</Text>
      ) : null}
      {children}
    </View>
  );
}

// ── Arapça RTL destekli Dua Kartı ───────────────────────────────────────────

function DuaKartiFull({ dua, colors }: { dua: DuaKarti; colors: ReturnType<typeof useColors> }) {
  const is10 = dua.guvenilirlik === "10/10";
  const emoji = is10 ? "🟢" : "🟡";
  const scoreColor = is10 ? colors.scoreGreenText : colors.scoreYellowText;
  const scoreBg    = is10 ? colors.scoreGreenBg   : colors.scoreYellowBg;
  const sourceLabel = getDevotionalSourceLabel({ title: dua.baslik, source: dua.kaynak });

  return (
    <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <Text>{emoji}</Text>
        <Text style={[styles.duaBaslik, { color: colors.amberText, flex: 1 }]}>{dua.baslik}</Text>
        <View style={[styles.badge, { backgroundColor: scoreBg }]}>
          <Text style={[styles.badgeText, { color: scoreColor }]}>{dua.guvenilirlik}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.badgeText, { color: colors.amberText }]}>{sourceLabel}</Text>
        </View>
      </View>

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
        <Text style={{ fontWeight: "700" }}>Okunuşu: </Text>{dua.transkripsiyon}
      </Text>

      {/* Meal — altta, silik */}
      <Text style={[styles.duaAnlam, { color: colors.textMuted }]}>
        <Text style={{ fontWeight: "700" }}>Anlamı: </Text>{dua.meal}
      </Text>

      {/* Uygulama */}
      <Text style={[styles.duaUygulama, { color: colors.amberText }]}>
        <Text style={{ fontWeight: "700" }}>Uygulama: </Text>{dua.uygulama}
      </Text>
    </View>
  );
}

// ── Korunma Duası Kartı (Arapça RTL + Kategori) ─────────────────────────────

const korunmaKategoriLabel: Record<KorunmaDuasi["kategori"], string> = {
  "sabah-aksam": "☀️ Sabah-Akşam",
  "evden-cikarken": "🚪 Evden Çıkarken",
  "yatarken": "🌙 Yatarken",
  "genel-korunma": "🛡️ Genel Korunma",
};

function KorunmaKarti({ dua, colors }: { dua: KorunmaDuasi; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.kutu, { backgroundColor: colors.emeraldBg, borderColor: colors.emeraldBorder }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <Text>🟢</Text>
        <Text style={[styles.duaBaslik, { color: colors.emeraldText, flex: 1 }]}>{dua.baslik}</Text>
        <View style={[styles.badge, { backgroundColor: colors.scoreGreenBg, borderColor: colors.emeraldBorder }]}>
          <Text style={[styles.badgeText, { color: colors.scoreGreenText }]}>10/10</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.blueBg, borderColor: colors.blueBorder }]}>
          <Text style={[styles.badgeText, { color: colors.blueText }]}>
            {korunmaKategoriLabel[dua.kategori]}
          </Text>
        </View>
      </View>

      {/* Arapça RTL */}
      <View style={[styles.arabicBox, { borderColor: colors.emeraldBorder }]}>
        <Text
          style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
        >
          {dua.arapca}
        </Text>
      </View>

      {/* Okunuş — üstte, belirgin */}
      <Text style={[styles.duaOkunus, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: "700" }}>Okunuşu: </Text>{dua.transkripsiyon}
      </Text>

      {/* Meal — altta, silik */}
      <Text style={[styles.duaAnlam, { color: colors.textMuted }]}>
        <Text style={{ fontWeight: "700" }}>Anlamı: </Text>{dua.meal}
      </Text>

      {/* Uygulama */}
      <Text style={[styles.duaUygulama, { color: colors.emeraldText }]}>
        <Text style={{ fontWeight: "700" }}>Uygulama: </Text>{dua.uygulama}
      </Text>
    </View>
  );
}

// ── Metot Kutusu (Hadis metodları için, Arapça yoksa) ───────────────────────

function MetotKutusu({
  baslik, kaynak, aciklama, uygulama, colors, puan,
  ayetler, accordion,
}: {
  baslik: string; kaynak: string; aciklama: string; uygulama: string;
  colors: ReturnType<typeof useColors>; puan?: "10/10" | "8/10";
  ayetler?: { arapca: string; transkripsiyon: string; anlam: string; ref: string }[];
  accordion?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const isSekiz    = puan === "8/10";
  const bg         = isSekiz ? colors.violetBg      : colors.amberBg;
  const border     = isSekiz ? colors.violetBorder  : colors.amberBorder;
  const labelColor = isSekiz ? colors.violetText    : colors.amberText;
  const emoji      = isSekiz ? "🟡" : "🟢";
  const showAyetler = !accordion || expanded;
  const sourceLabel = getDevotionalSourceLabel({ title: baslik, source: kaynak });

  return (
    <View style={[styles.kutu, { backgroundColor: bg, borderColor: border }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <Text>{emoji}</Text>
        <Text style={[styles.duaBaslik, { color: labelColor, flex: 1 }]}>{baslik}</Text>
        <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
          <Text style={[styles.badgeText, { color: labelColor }]}>{sourceLabel}</Text>
        </View>
      </View>
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 10 }]}>{aciklama}</Text>

      {/* Accordion toggle */}
      {accordion && ayetler && (
        <TouchableOpacity
          onPress={() => setExpanded(v => !v)}
          style={[styles.badge, { borderColor: border, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12, marginBottom: 10 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel="Ayetleri göster"
        >
          <Text style={[styles.badgeText, { color: labelColor }]}>
            {expanded ? "▲ Ayetleri Gizle" : `▼ Ayetleri Göster (${ayetler.length} ayet)`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Ayet metinleri — DuaKartiFull tarzında */}
      {showAyetler && ayetler && ayetler.map((a, i) => (
        <View key={i} style={{ marginBottom: 14 }}>
          <Text style={[styles.badgeText, { color: labelColor, marginBottom: 6 }]}>{a.ref}</Text>
          <View style={[styles.arabicBox, { borderColor: border }]}>
            <Text style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}>
              {a.arapca}
            </Text>
          </View>
          <Text style={[styles.duaOkunus, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: "700" }}>Okunuşu: </Text>{a.transkripsiyon}
          </Text>
          <Text style={[styles.duaAnlam, { color: colors.textMuted }]}>
            <Text style={{ fontWeight: "700" }}>Anlamı: </Text>{a.anlam}
          </Text>
        </View>
      ))}

      <Text style={[styles.duaUygulama, { color: labelColor }]}>
        <Text style={{ fontWeight: "700" }}>Uygulama: </Text>{uygulama}
      </Text>
    </View>
  );
}

function VerseSubHeader({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.subHeader, { color: colors.textMuted }]}>{label}</Text>
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
  colors: ReturnType<typeof useColors>;
  renk: "amber" | "violet";
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verses, setVerses] = React.useState<TagFilterResult[]>([]);
  const [total, setTotal] = React.useState(0);

  const isViolet = renk === "violet";
  const boxBg = isViolet ? colors.violetBg : colors.amberBg;
  const boxBorder = isViolet ? colors.violetBorder : colors.amberBorder;
  const labelColor = isViolet ? colors.violetText : colors.amberText;
  const badgeBg = isViolet ? colors.cardBg : colors.amberBg;

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (!next || loaded) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.tags.filter(tag);
      setVerses((res.results ?? []).slice(0, 15));
      setTotal(res.total ?? 0);
    } catch {
      setError("Ayetler yüklenemedi.");
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const countLabel = loaded && total > 0 ? `${total} ayet` : "Ayetleri Aç";

  return (
    <View style={[styles.kutu, { backgroundColor: boxBg, borderColor: boxBorder }]}> 
      <TouchableOpacity style={styles.verseAccHeader} onPress={toggle} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={label}>
        <View style={styles.verseAccTitleWrap}>
          <Text style={[styles.verseAccTitle, { color: labelColor }]}>{label}</Text>
          <Text style={[styles.verseAccMeta, { color: colors.textMuted }]}>{countLabel}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: boxBorder }]}> 
          <Text style={[styles.badgeText, { color: labelColor }]}>{expanded ? "▲ Gizle" : "▼ Göster"}</Text>
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.verseAccBody}>
          {loading ? <ActivityIndicator color={labelColor} style={{ marginVertical: 8 }} /> : null}
          {!loading && error ? <Text style={[styles.inlineNote, { color: colors.textSecondary }]}>{error}</Text> : null}
          {!loading && !error && loaded && verses.length === 0 ? (
            <Text style={[styles.inlineNote, { color: colors.textSecondary }]}>Bu etiket için ayet bulunamadı.</Text>
          ) : null}
          {!loading && verses.map((verse) => (
            <TouchableOpacity
              key={verse.verse_key}
              style={[styles.verseRow, { backgroundColor: colors.cardBg, borderColor: boxBorder }]}
              onPressIn={() => prefetchAyah(verse.surah_id, verse.ayah_number)}
              onPress={() => router.push(`/ayah/${verse.surah_id}/${verse.ayah_number}`)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={`${verse.surah_name ?? verse.verse_key}, ayeti aç`}
            >
              <View style={styles.verseRowTop}>
                <View style={[styles.verseKeyBadge, { backgroundColor: boxBg, borderColor: boxBorder }]}> 
                  <Text style={[styles.verseKeyText, { color: labelColor }]}>{verse.verse_key}</Text>
                </View>
                <Text style={[styles.verseSurah, { color: colors.textMuted }]} numberOfLines={1}>
                  {verse.surah_name ?? "Ayet"}
                </Text>
              </View>
              {verse.reading_tr ? (
                <Text style={[styles.verseReading, { color: colors.text }]} numberOfLines={3}>{verse.reading_tr}</Text>
              ) : null}
              {verse.meal ? (
                <Text style={[styles.verseMeal, { color: colors.textSecondary }]} numberOfLines={4}>{verse.meal}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
          {total > verses.length ? (
            <Text style={[styles.verseHint, { color: colors.textMuted }]}>İlk {verses.length} ayet gösteriliyor. Daha fazlası arama ekranındaki ilgili etikette görülebilir.</Text>
          ) : (
            <Text style={[styles.verseHint, { color: colors.textMuted }]}>Bir ayete dokunarak tam görünüme geçebilirsin.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ── Ana sayfa ───────────────────────────────────────────────────────────────

export default function IsmiAzamScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "İsmi Azam ve Sekine" }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 28 }}>✨</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              İsmi Azam ve Sekine
            </Text>
          </View>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Sahih rivayetli İsmi Azam duaları, Sekine bölümü ve günlük korunma duaları.
          </Text>
        </View>

                {/* Kişisel not */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}> 
          <Text style={[styles.bodyText, { color: colors.amberText }]}> 
            <Text style={{ fontWeight: "700" }}>Not: </Text>
            İsmi Azam, sadece harflerin dizilişine indirgenmez; kulun ihlas, teslimiyet ve dua haliyle Rabbine yönelişini de hatırlatır.
            Kelimeler kadar, o kelimeleri taşıyan kalbin duruşu da önemlidir.
          </Text>
        </View>

                {/* Ulema açıklaması */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}> 
          <Text style={[styles.kutuBaslik, { color: colors.amberText }]}>Alimlerin Ortak Kanaati</Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}> 
            Birçok alim, İsmi Azam bahsinde rivayetle gelen lafızları muhafaza ederken bu konuyu sadece bir harf formülüne indirgememenin daha isabetli olduğunu söyler.
            Bu yüzden burada sahih rivayetle gelen duaları aynen koruyor; irfani açıklamaları ise kalbi hazırlayan bir çerçeve olarak sunuyoruz.
            Mesele yalnızca hangi ismi söylediğin değil; o ismi <Text style={{ fontWeight: "700" }}>hangi kalple söylediğin</Text>dir.
          </Text>
        </View>

        {/* Güvenilirlik Badgeleri */}
        <View style={styles.badgeGrid}>
          <View style={[styles.guvenCard, { backgroundColor: colors.emeraldBg, borderColor: colors.emeraldBorder }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text>🟢</Text>
              <Text style={[styles.badgeScore, { color: colors.emeraldText }]}>10/10</Text>
            </View>
            <Text style={[styles.guvenTitle, { color: colors.text }]}>Kesin Sünnet / Kur'an</Text>
            <Text style={[styles.guvenDesc, { color: colors.textMuted }]}>
              Hz. Peygamber'in bizzat "İsmi Azam" dediği, sahih hadislerle sabit ayet ve dualar.
            </Text>
          </View>
          <View style={[styles.guvenCard, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text>🟡</Text>
              <Text style={[styles.badgeScore, { color: colors.amberText }]}>8/10</Text>
            </View>
            <Text style={[styles.guvenTitle, { color: colors.text }]}>Meşru ve Makbul</Text>
            <Text style={[styles.guvenDesc, { color: colors.textMuted }]}>
              Sahabe ve ulema tertibi; sahih ayet ve esmalardan oluşan, alimlerce kabul görmüş uygulamalar.
            </Text>
          </View>
        </View>

        {/* ── Bölüm 1: Sahih İsmi Azam ──────────────────────────────── */}
        <Text style={[styles.bolumBaslik, { color: colors.text }]}>🟢 Sahih İsmi Azam — Rivayetler ve Metodlar</Text>

        <Kutu baslik="İrfani Şart — Nasıl Dua Edilir?" colors={colors}>
          <StepList steps={[
            "Abdest al, 2 rekat hacet namazı kıl.",
            "Kalbini dünyalıklardan arındır. İsmi Azam, ağızdan çıkan kelime değil, kalbin ulaştığı bir «hal»dir.",
            "Allah'tan başka hiçbir şeyi düşünme. O'nu görüyormuş gibi bir ihlas haline gir.",
            "Niyet et: «Allah'ım, senin yüce isimlerine sığındım. Acziyetimi itiraf ediyor, yalnız senden istiyorum.»",
          ]} colors={colors} />
        </Kutu>

        {ismiAzamDualari.map((dua) => (
          <DuaKartiFull key={dua.id} dua={dua} colors={colors} />
        ))}

        <MetotKutusu
          baslik="el-Hayyü'l-Kayyûm Sırrı — Übey b. Kâ'b Rivayeti"
          kaynak="Tirmizî · Sahih"
          aciklama="Hz. Peygamber, İsmi Azam'ın Bakara, Âl-i İmrân ve Tâhâ surelerinde olduğunu bildirmiştir. Bu üç surede ortak olan vasıf: «el-Hayyü'l-Kayyûm» — Ebedî diri, her şeyi ayakta tutan."
          uygulama="«Yâ Hayyü, Yâ Kayyûm» diyerek Allah'a yönel; aşağıdaki üç ayeti sırasıyla oku."
          accordion
          colors={colors}
          ayetler={[
            {
              ref: "Bakara 2:255 — Âyetü'l-Kürsî (başı)",
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
          baslik="Esma binti Yezid (r.anha) Rivayeti"
          kaynak="İbn Mâce · Sahih"
          aciklama="Hz. Peygamber şöyle buyurdu: «Allah'ın İsmi Azam'ı şu iki ayettedir: Bakara 163 ve Âl-i İmrân 2.»"
          uygulama="Bu iki ayeti 3'er defa oku; ardından «Yâ Rahmân, Yâ Rahîm, Yâ Hayy, Yâ Kayyûm» diyerek dua et."
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
          baslik="Hz. Ali (r.a.) Tavsiyesi"
          kaynak="Sahih Sahabi Uygulaması"
          aciklama="Hz. Ali şöyle buyurdu: «Allah'a İsmi Azam'ı ile dua etmek istediğinde, Hadid Suresi'nin ilk on ayetini ve Haşr Suresi'nin son üç ayetini oku.» (Toplam 13 ayet)"
          uygulama="Hadid 1–10 ardından Haşr 22–24 oku; secdede isteklerini dile getir."
          puan="8/10"
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

        <VerseSubHeader label="İsmi Azam Ayetleri" colors={colors} />
        <TagVerseAccordion tag="ismiazam-ayet" label="İsmi Azam Ayetlerini Aç" colors={colors} renk="amber" />

        {/* ── Bölüm 2: Sekine Duası ─────────────────────────────────── */}
        <Text style={[styles.bolumBaslik, { color: colors.text, marginTop: 8 }]}>🌀 Sekine Bölümü — 19 Ayet Tertibi</Text>

        {/* Tabut-u Sekine */}
        <View style={[styles.kutu, { backgroundColor: colors.violetBg, borderColor: colors.violetBorder }]}>
          <Text style={[styles.duaBaslik, { color: colors.violetText, marginBottom: 8 }]}>
            📦 Tabut-u Sekine Nedir?
          </Text>

          {/* Arapça RTL */}
          <View style={[styles.arabicBox, { borderColor: colors.violetBorder }]}>
            <Text
              style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
            >
              {sekineDuasi.arapca}
            </Text>
          </View>

          <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: "700" }}>Bakara 248 — Anlamı: </Text>{sekineDuasi.meal}
          </Text>
          <Text style={[styles.duaUygulama, { color: colors.violetText }]}>
            {sekineDuasi.aciklama}
          </Text>
        </View>

        {/* Bakara 250 */}
        <DuaKartiFull dua={bakara250} colors={colors} />

        <Kutu baslik="Çerçeve Notu" colors={colors} renk="violet">
          <Text style={[styles.inlineNote, { color: colors.textSecondary }]}>
            Bu bölümdeki 19'lu tertip, sahih hadisle sabit tek zorunlu biçim olarak değil; sahih ayetler ve esmâlarla kurulmuş yaygın bir manevi okuma düzeni olarak sunulmaktadır.
          </Text>
        </Kutu>

        <Kutu baslik="Hazırlık" colors={colors} renk="violet">
          <StepList steps={[
            "Zihnini dünya gailelerinden arındır, kalbini Allah'ın rızasına odakla.",
            "7 kez «Estağfirullah el-Azîm» oku.",
            "7 kez salavat getir.",
            "10 kez «Allahu Ekber» de.",
          ]} colors={colors} />
        </Kutu>

        <Kutu baslik="Dairesel Zikir Tertibi" colors={colors} renk="violet">
          <StepList steps={[
            "Besmele çek.",
            "Şu 6 esmayı oku: «Ferdün, Hayyün, Kayyûmün, Hakemün, Adlün, Kuddûsün».",
            "Hemen ardından listedeki ilk Sekine ayetini oku.",
            "Bu üçlüyü (Besmele + 6 Esma + Ayet) 19 kez tekrar ederek bir okuma halkası oluştur.",
            "Aynı döngüyü listedeki diğer ayetler için de sürdür.",
            "Uygulamada kimi kişiler bunu günlere bölerek, kimileri tek oturuşta okuyarak tamamlar.",
          ]} colors={colors} />
        </Kutu>

        <View style={[styles.kutu, { backgroundColor: colors.violetBg, borderColor: colors.violetBorder }]}>
          <Text style={[styles.kutuBaslik, { color: colors.violetText }]}>Tevafuk Notu</Text>
          <BulletList items={[
            "Besmele 19 harftir.",
            "6 esma (Ferdün, Hayyün, Kayyûmün, Hakemün, Adlün, Kuddûsün) toplam 19 harftir.",
            "Sekine listesindeki ayet sayısı 19'dur.",
            "Bazı uygulamalarda bu tevafuk, manevi tamamlanmayı hatırlatan bir işaret olarak yorumlanır.",
          ]} colors={colors} />
        </View>

        <VerseSubHeader label="Sekine Duası Ayetleri (Sırasıyla)" colors={colors} />
        <TagVerseAccordion tag="ismiazam-sekine" label="Sekine Ayetlerini Aç" colors={colors} renk="violet" />

        {/* ── Bölüm 3: Günlük Korunma Duaları ────────────────────────── */}
        <Text style={[styles.bolumBaslik, { color: colors.text, marginTop: 8 }]}>🛡️ Günlük Korunma Duaları</Text>

        <Kutu baslik="Korunma Duaları Hakkında" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            Aşağıdaki dualar, Peygamber Efendimiz'in (s.a.v.) bizzat okuduğu ve ümmetine tavsiye ettiği,
            sahih hadislerle sabit günlük korunma dualarıdır. Her biri 10/10 güvenilirlik puanına sahiptir.
          </Text>
        </Kutu>

        {korunmaDualari.map((dua) => (
          <KorunmaKarti key={dua.id} dua={dua} colors={colors} />
        ))}

        {/* Tavsiye */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.bodyText, { color: colors.amberText, textAlign: "center", fontWeight: "600" }]}>
            📿 Bu duaları günlük rutininize ekleyin. Allah'ın izniyle sizi görünmez kazalardan ve şerlerden muhafaza eder.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" },
  hero:          { marginBottom: 20 },
  heroTitle:     { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, flex: 1 },
  heroSub:       { fontSize: 13, lineHeight: 20, marginTop: 6 },

  kutu: {
    borderRadius: 14, borderWidth: 1,
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
  duaOkunus:   { fontSize: 13, lineHeight: 20, fontWeight: "600", marginBottom: 6 },
  duaAnlam:    { fontSize: 11, lineHeight: 17, fontStyle: "italic", marginBottom: 4 },
  duaUygulama: { fontSize: 12, lineHeight: 19 },
  badge:       { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:   { fontSize: 10, fontWeight: "700" },

  subHeader: {
    fontSize: 11, fontWeight: "800", textTransform: "uppercase",
    letterSpacing: 1.5, marginBottom: 8, marginTop: 4,
  },

  bolumBaslik: {
    fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 10,
  },

  badgeGrid:    { flexDirection: "row", gap: 10, marginBottom: 20 },
  guvenCard:    { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12 },
  badgeScore:   { fontSize: 12, fontWeight: "800" },
  guvenTitle:   { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  guvenDesc:    { fontSize: 10, lineHeight: 15 },
  verseAccHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  verseAccTitleWrap: { flex: 1, gap: 4 },
  verseAccTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  verseAccMeta: { fontSize: 11, fontWeight: "600" },
  verseAccBody: { marginTop: 12, gap: 10 },
  verseRow: { borderRadius: 12, borderWidth: 1, padding: 12 },
  verseRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  verseKeyBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  verseKeyText: { fontSize: 10, fontWeight: "800" },
  verseSurah: { fontSize: 11, fontWeight: "600", flex: 1, textAlign: "right" },
  verseReading: { fontSize: 13, lineHeight: 20, fontWeight: "600", marginBottom: 4 },
  verseMeal: { fontSize: 11, lineHeight: 18 },
  verseHint: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  inlineNote: { fontSize: 12, lineHeight: 18 },
});