import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { router, Stack } from "expo-router";
import { api, type TagFilterResult } from "../src/lib/api";

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: "10/10" | "8/10" | "0/10" }) {
  const cfg = { "10/10": { emoji: "🟢", bg: "#d1fae5", color: "#065f46" },
                "8/10":  { emoji: "🟡", bg: "#fef3c7", color: "#92400e" },
                "0/10":  { emoji: "🔴", bg: "#fee2e2", color: "#991b1b" } }[score];
  return (
    <View style={[sc.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[sc.badgeText, { color: cfg.color }]}>{cfg.emoji} {score}</Text>
    </View>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <View style={sc.stepList}>
      {steps.map((s, i) => (
        <View key={i} style={sc.stepRow}>
          <View style={sc.stepNum}><Text style={sc.stepNumText}>{i + 1}</Text></View>
          <Text style={sc.stepText}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function HadisBox({ baslik, arapca, anlam, uygulama }: { baslik: string; arapca: string; anlam: string; uygulama?: string }) {
  return (
    <View style={sc.hadisBox}>
      <Text style={sc.hadisBaslik}>📖 {baslik}</Text>
      <Text style={sc.hadisArapca}>{arapca}</Text>
      <Text style={sc.hadisAnlam}>"{anlam}"</Text>
      {uygulama && <Text style={sc.hadisUyg}>{uygulama}</Text>}
    </View>
  );
}

function UyariBox({ mesaj, renk = "amber" }: { mesaj: string; renk?: "red" | "amber" }) {
  const bg    = renk === "red" ? "#fee2e2" : "#fef3c7";
  const color = renk === "red" ? "#991b1b" : "#92400e";
  return <View style={[sc.uyari, { backgroundColor: bg }]}><Text style={[sc.uyariText, { color }]}>{mesaj}</Text></View>;
}

function VerseList({ tag }: { tag: string }) {
  const [verses,  setVerses]  = useState<TagFilterResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [open, setOpen]       = useState(false);

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) {
      setLoading(true);
      try { const r = await api.tags.filter(tag); setVerses(r.results.slice(0, 15)); }
      catch {}
      setLoading(false);
      setFetched(true);
    }
  }, [open, fetched, tag]);

  return (
    <View style={sc.verseSection}>
      <TouchableOpacity style={sc.verseSectionBtn} onPress={toggle} activeOpacity={0.75}>
        <Text style={sc.verseSectionLabel}>📖 İlgili Ayetler</Text>
        <Text style={sc.verseSectionChev}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View>
          {loading && <ActivityIndicator color="#059669" style={{ marginVertical: 8 }} />}
          {!loading && verses.map(v => (
            <TouchableOpacity key={v.verse_key} style={sc.verseRow}
              onPress={() => router.push(`/ayah/${v.surah_id}/${v.ayah_number}` as any)} activeOpacity={0.7}>
              <View style={sc.verseKey}><Text style={sc.verseKeyText}>{v.verse_key}</Text></View>
              <View style={{ flex: 1 }}>
                {v.surah_name && <Text style={sc.verseSurah}>{v.surah_name}</Text>}
                {v.reading_tr && <Text style={sc.verseReading} numberOfLines={2}>{v.reading_tr}</Text>}
                {v.meal && <Text style={sc.verseMeal} numberOfLines={2}>{v.meal}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Bolum Accordion ───────────────────────────────────────────────────────────

function Bolum({ emoji, baslik, color, children }: { emoji: string; baslik: string; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[s.bolum, { borderLeftColor: color }]}>
      <TouchableOpacity style={s.bolumHeader} onPress={() => setOpen(p => !p)} activeOpacity={0.75}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={s.bolumTitle}>{baslik}</Text>
        <Text style={s.bolumChev}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && <View style={s.bolumBody}>{children}</View>}
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function ManeviSiginakScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Manevi Sığınak" }} />
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Başlık */}
        <View style={s.header}>
          <Text style={s.headerTitle}>🛡️ Manevi Sığınak</Text>
          <Text style={s.headerSub}>Korunma, şifa ve istiaze — Kur'an ve sahih hadislerle</Text>
        </View>

        {/* Güvenilirlik Sistemi */}
        <View style={s.scoreCard}>
          <Text style={s.scoreTitle}>Güvenilirlik Puanı Sistemi</Text>
          <View style={s.scoreRow}><ScoreBadge score="10/10" /><Text style={s.scoreDesc}>Kesin Sünnet / Kur'an</Text></View>
          <View style={s.scoreRow}><ScoreBadge score="8/10"  /><Text style={s.scoreDesc}>Ulema İctihadı / Meşru Rukye</Text></View>
          <View style={s.scoreRow}><ScoreBadge score="0/10"  /><Text style={s.scoreDesc}>Hurafe ve Şirk Riski</Text></View>
        </View>

        {/* İsmi Azam linki */}
        <TouchableOpacity style={s.featuredCard} onPress={() => router.push("/manevi-siginak/ismi-azam")} activeOpacity={0.85}>
          <Text style={{ fontSize: 32 }}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.featuredTitle}>İsmi Azam & Korunma Duaları</Text>
            <Text style={s.featuredSub}>Allah'ın en büyük ismi, Sekine ve sahih korunma duaları</Text>
          </View>
          <Text style={s.featuredArrow}>→</Text>
        </TouchableOpacity>

        <Text style={s.sectionLabel}>UYGULAMA REHBERLERİ</Text>

        {/* Bolum 1: Genel Korunma */}
        <Bolum emoji="⚔️" baslik="Genel Korunma Kalkanı — Günlük Rutin" color="#6ee7b7">
          <StepList steps={[
            "Sabah namazından sonra: 1 Fatiha + Ayetel Kürsi + 3 İhlas + 1 Felak + 1 Nas oku.",
            "Akşam namazından sonra: Aynı seti tekrarla. Avuçlarına okuyup tüm vücuduna sür.",
            "Yatmadan önce: Ayetel Kürsi + Amenerresulü (Bakara 285-286) oku.",
            "Evden çıkarken: Ayetel Kürsi oku, koruma kalkanı niyetiyle.",
          ]} />
          <HadisBox
            baslik="Sahih Hadis Duası — Sabah-Akşam Kalkanı (İbn Mâce)"
            arapca="Bismillâhillezî lâ yedurru me'asmihi şey'ün fil erdı ve lâ fissemâi ve hüves-semî'ul alîm."
            anlam="Yerde ve gökte hiçbir şeyin O'nun adıyla zarar veremeyeceği Allah'ın adıyla."
            uygulama="Sabah ve akşam 3'er defa oku."
          />
          <VerseList tag="korunma-genel" />
        </Bolum>

        {/* Bolum 2: Büyü ve Sihir */}
        <Bolum emoji="🔱" baslik="Büyü ve Sihir — Sihrin Bozulması" color="#93c5fd">
          <Text style={s.boxTitle}>Hazırlık</Text>
          <StepList steps={[
            "Abdest al, 2 rekat tövbe namazı kıl.",
            "Kalpten tövbe et. «Allah'ım, sana yöneldim, senden başka sığınacak yok» de.",
          ]} />
          <Text style={s.boxTitle}>7 Günlük Program (Suya Okuyarak)</Text>
          <StepList steps={[
            "Bir şişe temiz su al. Fatiha + Ayetel Kürsi + Bakara 102 + A'raf 117-119 + Yunus 81-82 + Taha 69 + 3 İhlas + 1 Felak + 1 Nas oku.",
            "Her ayeti 3 veya 7 defa okuyup suya üfle.",
            "Bu sudan sabah aç karnına, öğle arası ve yatmadan önce birer bardak iç. 7 gün devam et.",
            "Kalan suyla banyo yap.",
          ]} />
          <UyariBox renk="red" mesaj="🔴 Uyarı: Cinci, medyum ve şarlatan kişilere gitmek şirke götürebilir. Şifayı yalnız Allah'tan iste!" />
          <VerseList tag="korunma-sihir" />
        </Bolum>

        {/* Bolum 3: Nazar */}
        <Bolum emoji="👁️" baslik="Nazar — Göz Değmesi" color="#fcd34d">
          <Text style={s.boxTitle}>Nazar Değen Kişi İçin</Text>
          <StepList steps={[
            "Abdest al.",
            "Sağ elini nazar değdiğini düşündüğün bölgeye koy.",
            "3 defa «Bismillah» de.",
            "7 defa Fatiha + 7 defa Felak + 7 defa Nas + 3 defa Kalem 51-52 oku.",
            "«Allah'ım, şifa ver, şifa veren Sensin» de.",
          ]} />
          <HadisBox
            baslik="Cebrail'in (a.s.) Nazar Rukyesi — Müslim, İbn Mâce (Sahih)"
            arapca="Bismillâhi erkîke, min kulli şey'in yu'zîke, min şerri kulli nefsin ev ayni hâsidin, Allâhu yeşfîke."
            anlam="Allah'ın adıyla seni rahatsız eden her şeyden ve hasetçi gözün şerrinden sana rukye ederim."
            uygulama="Nazar değdiğini düşündüğün kişiye 7 defa oku."
          />
          <Text style={s.boxTitle}>Korunma İçin Günlük</Text>
          <StepList steps={[
            "Beğendiğin her şey için «Maşallah, Allah nazardan korusun» de.",
            "Çocuklara her gün 3 İhlas + 1 Felak + 1 Nas okuyup üfle.",
          ]} />
          <UyariBox renk="red" mesaj="🔴 Not: Nazar boncuğu takmak, kurşun döktürmek yasak. Koruma yalnız Allah'tandır." />
          <VerseList tag="korunma-nazar" />
        </Bolum>

        {/* Bolum 4: Hased */}
        <Bolum emoji="💚" baslik="Hased — Kıskançlık Şerrinden Korunma" color="#86efac">
          <Text style={s.boxTitle}>Hasede Uğradığını Düşünen Kişi</Text>
          <StepList steps={[
            "Abdest al, 2 rekat namaz kıl.",
            "7 defa Fatiha + 7 defa Felak + 7 defa Nas oku.",
            "Avuçlarına okuyup tüm vücuduna sür.",
            "«Allah'ım, haset edenlerin şerrinden sana sığınıyorum» diye dua et.",
            "7 gün boyunca sabah akşam tekrarla.",
          ]} />
          <Text style={s.boxTitle}>Kendini Hasetten Korumak İçin</Text>
          <StepList steps={[
            "Başkasının nimetini görünce «Maşallah, Allah onu hayırlı etsin» de.",
            "Haset hissi gelince hemen istiğfar et.",
            "Haset ettiğin kişi için dua et — bu duyguyu söndürür.",
          ]} />
          <UyariBox renk="amber" mesaj="🟢 Not (Müslim, İbn Mâce): Cebrail'in Nazar Rukyesi duası hasede karşı da okunur." />
          <VerseList tag="korunma-hased" />
        </Bolum>

        {/* Bolum 5: Vesvese */}
        <Bolum emoji="🌪️" baslik="Şeytan Vesvesesi — Sığınma" color="#c4b5fd">
          <Text style={s.boxTitle}>Vesvese Geldiğinde</Text>
          <StepList steps={[
            "Hemen «Eûzü billâhi mineş-şeytânir-racîm» de.",
            "Sol tarafına 3 defa hafifçe tükür (sünnet).",
            "Mü'minun 97-98 ayetlerini 3 defa oku.",
            "«La ilahe illallah» zikrine sarıl.",
          ]} />
          <Text style={s.boxTitle}>Gece Korkusu ve Karabasan İçin</Text>
          <StepList steps={[
            "Yatmadan önce Ayetel Kürsi oku.",
            "Sağ tarafına yat, sağ elini yanağının altına koy.",
            "3 İhlas + 1 Felak + 1 Nas oku, avuçlarına üfle, vücuduna sür.",
          ]} />
          <UyariBox renk="amber" mesaj="⚠️ Not: Vesvese, imanın varlığına işarettir. Büyütme, Allah'a sığınıp geç." />
          <VerseList tag="korunma-siginma" />
        </Bolum>

        {/* Bolum 6: Şifa */}
        <Bolum emoji="💊" baslik="Şifa — Kur'an ile İyileşme" color="#fca5a5">
          <Text style={s.boxTitle}>Hastalıkta Şifa İçin</Text>
          <StepList steps={[
            "Abdest al, 2 rekat namaz kıl.",
            "Sağ elini ağrıyan bölgeye koy, 3 defa «Bismillah» de.",
            "7 defa Fatiha + 7 defa İsra 82 + 7 defa Yunus 107 oku.",
            "«Allâhumme Rabben-nâsi muzhibel-bâsi işfi enteş-Şâfî» duasını 3 defa oku.",
            "Her okuyuşta ağrıyan bölgeye üfle.",
            "Günde 3 defa tekrarla (sabah, öğle, akşam).",
          ]} />
          <HadisBox
            baslik="Bölgesel Ağrı Duası — Müslim, Ebû Dâvûd (Sahih)"
            arapca="Eûzu billâhi ve kudretihî min şerri mâ ecidu ve uhâziru."
            anlam="Hissedip çekindiğim ağrının şerrinden Allah'a ve O'nun kudretine sığınırım."
            uygulama="Sağ el ağrıyan yere konur, 3 Bismillah'tan sonra 7 defa okunur."
          />
          <UyariBox renk="amber" mesaj="⚠️ Uyarı: Doktora gitmeyi ihmal etme. Tıbbi tedavi ile Kur'an birbirini dışlamaz." />
          <VerseList tag="korunma-sifa" />
        </Bolum>

        {/* YAP / YAPMA */}
        <Text style={s.sectionLabel}>MİT AVCISI — YAP / YAPMA</Text>
        <View style={s.mitCard}>
          <Text style={s.mitTitle}>🟢 YAP — Meşru Yöntemler</Text>
          {["Kur'an'dan duaları bizzat oku.",
            "Şifayı Allah'tan iste.",
            "Sabah-akşam Ayetel Kürsi oku.",
            "Nazar için Felak ve Nas surelerini oku.",
            "Vesvese gelince istiacze et.",
          ].map((i, idx) => <Text key={idx} style={s.mitGreen}>✓ {i}</Text>)}
        </View>
        <View style={[s.mitCard, { borderColor: "#fca5a5" }]}>
          <Text style={[s.mitTitle, { color: "#991b1b" }]}>🔴 YAPMA — Yasak Uygulamalar</Text>
          {[
            "Nazar boncuğu takma → Şirk riski",
            "Kurşun döktürme → Batıl",
            "Sirke-tuz-su karışımı → Hurafe",
            "Cinci / medyum / falcı → Büyük günah",
            "Yıldızname / astroloji → Küfür riski",
            "Muska / temime → Şirk",
          ].map((i, idx) => <Text key={idx} style={s.mitRed}>✗ {i}</Text>)}
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>
            "Tevhit bilinci: Şifayı ve korumayı yalnız Allah'tan iste. Vesilelere değil, Vesileler Sahibi'ne güven."
          </Text>
        </View>

      </ScrollView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },

  header:      { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, backgroundColor: "#fff", marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1c1917" },
  headerSub:   { fontSize: 12, color: "#78716c", marginTop: 4, textAlign: "center" },

  scoreCard:  { backgroundColor: "#fff", margin: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e7e5e4", gap: 8 },
  scoreTitle: { fontSize: 13, fontWeight: "700", color: "#1c1917", marginBottom: 4 },
  scoreRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreDesc:  { fontSize: 13, color: "#44403c" },

  featuredCard:  { backgroundColor: "#fef3c7", margin: 12, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#fcd34d" },
  featuredTitle: { fontSize: 14, fontWeight: "700", color: "#1c1917" },
  featuredSub:   { fontSize: 11, color: "#78716c", marginTop: 2 },
  featuredArrow: { fontSize: 20, color: "#d97706" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#78716c", letterSpacing: 1, textTransform: "uppercase", marginHorizontal: 12, marginTop: 16, marginBottom: 8 },

  bolum:       { margin: 12, marginBottom: 6, borderRadius: 14, borderWidth: 1, borderColor: "#e7e5e4", borderLeftWidth: 4, backgroundColor: "#fff", overflow: "hidden" },
  bolumHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  bolumTitle:  { flex: 1, fontSize: 14, fontWeight: "700", color: "#1c1917" },
  bolumChev:   { fontSize: 14, color: "#059669" },
  bolumBody:   { borderTopWidth: 1, borderTopColor: "#f5f5f4", padding: 12, gap: 10 },

  boxTitle: { fontSize: 13, fontWeight: "700", color: "#1c1917", marginTop: 4, marginBottom: 2 },

  mitCard:  { margin: 12, marginBottom: 6, borderRadius: 14, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#86efac", gap: 4 },
  mitTitle: { fontSize: 13, fontWeight: "700", color: "#065f46", marginBottom: 6 },
  mitGreen: { fontSize: 13, color: "#166534", lineHeight: 20 },
  mitRed:   { fontSize: 13, color: "#991b1b", lineHeight: 20 },

  footer:     { margin: 16, padding: 14, backgroundColor: "#f0fdf4", borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  footerText: { fontSize: 13, color: "#166534", fontStyle: "italic", textAlign: "center", lineHeight: 20 },
});

const sc = StyleSheet.create({
  badge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  stepList: { gap: 8, marginVertical: 4 },
  stepRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stepNum:  { width: 20, height: 20, borderRadius: 10, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  stepText: { flex: 1, fontSize: 13, color: "#1c1917", lineHeight: 20 },

  hadisBox:    { backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#86efac", gap: 4 },
  hadisBaslik: { fontSize: 12, fontWeight: "700", color: "#065f46" },
  hadisArapca: { fontSize: 14, color: "#1c1917", textAlign: "right", lineHeight: 24 },
  hadisAnlam:  { fontSize: 12, color: "#166534", fontStyle: "italic" },
  hadisUyg:    { fontSize: 11, color: "#059669" },

  uyari:     { borderRadius: 10, padding: 10 },
  uyariText: { fontSize: 12, lineHeight: 18 },

  verseSection:    { borderTopWidth: 1, borderTopColor: "#f0fdf4", marginTop: 4 },
  verseSectionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  verseSectionLabel: { fontSize: 12, fontWeight: "700", color: "#059669" },
  verseSectionChev:  { fontSize: 12, color: "#059669" },
  verseRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  verseKey:  { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  verseKeyText: { fontSize: 10, fontWeight: "700", color: "#065f46" },
  verseSurah:   { fontSize: 10, color: "#78716c" },
  verseReading: { fontSize: 13, color: "#1c1917", fontStyle: "italic", lineHeight: 20, marginTop: 1 },
  verseMeal:    { fontSize: 11, color: "#57534e", lineHeight: 17, marginTop: 1 },
});
