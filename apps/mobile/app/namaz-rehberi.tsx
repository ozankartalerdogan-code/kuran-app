import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/lib/api";
import { useColors } from "../src/hooks/useColors";
import rehberRaw from "../src/data/namaz_rehberi.json";

// ── Tipler (gevşek — JSON'dan tek cast) ───────────────────────────────────────
interface Kavram { id: string; isim: string; renk: string; aciklama: string; "örnek"?: string }
interface Sure { id: string; isim: string; arapca: string; okunusu: string; anlam: string }
interface Adim {
  id?: string; sira?: number; isim: string; konum?: string; durum?: string; ne_zaman?: string;
  aciklama?: string; dua?: string | null; dua_arapca?: string | null; anlam?: string; not?: string;
  tekrar?: string; farz_notu?: string; anlam_notu?: string; el_pozisyonu_notu?: string;
  durum_detay?: string; parmak_notu?: string; kuran_kaynagi?: string; sureler?: Sure[];
}
interface VakitRow { vakit: string; sunnet: string; farz: string; toplam: string }
interface SelamRow { sira: number; aciklama: string; dua: string; dua_arapca: string; anlam: string }
interface Ozellik { baslik: string; durum: string; aciklama: string }
interface VitirAdim { rekat: string; durum: string; aciklama: string }
interface RekatRow { rekat: string; subhaneke: string; euzu_besmele: string; fatiha: string; zamm_i_sure: string; "oturuş": string }
interface NamazRehberi {
  baslik: string; aciklama: string; kaynak_not: string;
  temel_kavramlar: { baslik: string; aciklama: string; kavramlar: Kavram[]; teselli_notu: string };
  farz_sunnet_namaz_farki: { vakit_rekat_tablosu: VakitRow[]; not: string };
  namaz_oncesi: { baslik: string; adimlar: Adim[] };
  namaz_adimlari: Adim[];
  dualar: Adim[];
  selam: { isim: string; aciklama: string; adimlar: SelamRow[]; anlam_notu: string };
  vitir_namazi: { baslik: string; durum: string; rekat: string; ne_zaman: string; aciklama: string; ozellikler: Ozellik[]; adimlar: VitirAdim[]; yaygin_hata: string; not: string };
  rekat_yapisi: { baslik: string; aciklama: string; tablo: RekatRow[]; ozet_notu: string };
  yeni_baslayan_notu: { baslik: string; maddeler: string[] };
}

const R = (rehberRaw as unknown as { namaz_rehberi: NamazRehberi }).namaz_rehberi;

const DURUM: Record<string, { bg: string; border: string; text: string; label: string }> = {
  farz:   { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", label: "FARZ" },
  vacip:  { bg: "#fff7ed", border: "#fdba74", text: "#c2410c", label: "VACİP" },
  sunnet: { bg: "#f0fdf4", border: "#86efac", text: "#15803d", label: "SÜNNET" },
};

// ── "Namaz Ayetleri" sekmesi verisi (Keşfet'ten taşındı) ──────────────────────
const VAKIT_ROWS = [
  { id: "sabah",    ikon: "🌅", ad: "Sabah",    bg: "#f0f9ff", border: "#7dd3fc", keys: ["17:78", "20:130", "50:39"] },
  { id: "ogle",     ikon: "☀️", ad: "Öğle",     bg: "#fffbeb", border: "#fcd34d", keys: ["30:18", "17:78"] },
  { id: "ikindi",   ikon: "🌤️", ad: "İkindi",   bg: "#fff7ed", border: "#fdba74", keys: ["2:238", "20:130", "50:39"] },
  { id: "aksam",    ikon: "🌆", ad: "Akşam",    bg: "#fff1f2", border: "#fda4af", keys: ["11:114", "30:17"] },
  { id: "yatsi",    ikon: "🌙", ad: "Yatsı",    bg: "#eef2ff", border: "#a5b4fc", keys: ["24:58", "17:78", "11:114"] },
  { id: "teheccud", ikon: "🌌", ad: "Teheccüd", bg: "#f5f3ff", border: "#c4b5fd", keys: ["17:79", "73:2-3", "25:64", "51:17-18"] },
];

const MOTTO = {
  surahId: 4, ayahNumber: 103, label: "Nisâ 4:103",
  arabic: "فَإِذَا قَضَيْتُمُ ٱلصَّلَوٰةَ فَٱذْكُرُوا۟ ٱللَّهَ قِيَـٰمًا وَقُعُودًا وَعَلَىٰ جُنُوبِكُمْ ۚ فَإِذَا ٱطْمَأْنَنتُمْ فَأَقِيمُوا۟ ٱلصَّلَوٰةَ ۚ إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَـٰبًا مَّوْقُوتًا",
  meal: "Namazı kıldıktan sonra; ayakta, otururken ve yan yatarken Allah'ı anın. Güvene kavuştuğunuzda namazı gereğince kılın. Şüphesiz namaz, müminlere belirli vakitlerde farz kılınmıştır.",
};

const NAMAZ_CATS = [
  { emoji: "🕌", id: "namaz-genel",    label: "Namaz Genel",     tag: "namaz-genel",    renk: "#e0e7ff" },
  { emoji: "⏰", id: "namaz-vakit",    label: "Namaz Vakitleri", tag: "namaz-vakit",    renk: "#fef3c7" },
  { emoji: "🧘", id: "namaz-husu",     label: "Huşu & Kalp",     tag: "namaz-husu",     renk: "#f0fdf4" },
  { emoji: "🌌", id: "namaz-teheccud", label: "Teheccüd",        tag: "namaz-teheccud", renk: "#ede9fe" },
  { emoji: "📅", id: "namaz-cuma",     label: "Cuma Namazı",     tag: "namaz-cuma",     renk: "#dbeafe" },
];

function parseKey(key: string) {
  const [sr, a] = key.split(":");
  const surahId = Number(sr) || 0;
  const ayahNumber = Number(a?.split("-")[0]) || 0;
  return { surahId, ayahNumber };
}

interface VerseRow { verse_key: string; surah_id: number; ayah_number: number; surah_name: string | null; reading_tr: string | null; meal: string | null }

function TagAccordion({ emoji, label, tag, renk }: { emoji: string; label: string; tag: string; renk: string }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [fetched, setFetched] = useState(false);

  const onPress = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) {
      setLoading(true);
      try {
        const res = await api.tags.filter(tag);
        setVerses((res.results ?? []).slice(0, 20).map(r => ({
          verse_key: r.verse_key, surah_id: r.surah_id, ayah_number: r.ayah_number,
          surah_name: r.surah_name, reading_tr: r.reading_tr, meal: r.meal,
        })));
      } catch { /* yoksay */ }
      setLoading(false);
      setFetched(true);
    }
  }, [open, fetched, tag]);

  return (
    <View style={[na.accCard, { backgroundColor: c.card, borderColor: c.border, borderLeftColor: renk }]}>
      <TouchableOpacity style={na.accHeader} onPress={onPress} activeOpacity={0.75}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <Text style={[na.accTitle, { color: c.text }]}>{label}</Text>
        <Text style={[na.accChev, { color: c.accent }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={[na.accBody, { borderTopColor: c.border }]}>
          {loading && <ActivityIndicator color="#059669" style={{ marginVertical: 10 }} />}
          {!loading && fetched && verses.length === 0 && <Text style={[na.empty, { color: c.textMuted }]}>Ayet bulunamadı.</Text>}
          {!loading && verses.map(v => (
            <TouchableOpacity key={v.verse_key} style={[na.verseRow, { borderBottomColor: c.border }]} onPress={() => router.push(`/ayah/${v.surah_id}/${v.ayah_number}`)} activeOpacity={0.7}>
              <View style={na.keyBox}><Text style={na.keyText}>{v.verse_key}</Text></View>
              <View style={{ flex: 1 }}>
                {v.surah_name ? <Text style={[na.vSurah, { color: c.textMuted }]}>{v.surah_name}</Text> : null}
                {v.reading_tr ? <Text style={[na.vReading, { color: c.text }]} numberOfLines={2}>{v.reading_tr}</Text> : null}
                {v.meal ? <Text style={[na.vMeal, { color: c.textSecondary }]} numberOfLines={2}>{v.meal}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function VakitTablosu() {
  const c = useColors();
  return (
    <View>
      <TouchableOpacity style={na.motto} activeOpacity={0.8} onPress={() => router.push(`/ayah/${MOTTO.surahId}/${MOTTO.ayahNumber}`)}>
        <View style={na.mottoHead}>
          <Text style={na.mottoEtiket}>Namaz Vakitlere Bağlı Bir Farzdır</Text>
          <View style={na.mottoKey}><Text style={na.mottoKeyText}>{MOTTO.label}</Text></View>
        </View>
        <Text style={na.mottoArabic}>{MOTTO.arabic}</Text>
        <Text style={[na.mottoMeal, { color: c.textSecondary }]}>“{MOTTO.meal}”</Text>
      </TouchableOpacity>

      <View style={[na.vtCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[na.vtHeader, { borderBottomColor: c.border }]}>
          <Text style={na.vtHeaderTitle}>🕐 Hangi Ayet Hangi Vakti İşaret Eder?</Text>
        </View>
        {VAKIT_ROWS.map(v => (
          <View key={v.id} style={[na.vtRow, { backgroundColor: v.bg, borderLeftColor: v.border, borderBottomColor: c.border }]}>
            <View style={na.vtVakit}>
              <Text style={{ fontSize: 20 }}>{v.ikon}</Text>
              <Text style={na.vtVakitAd}>{v.ad}</Text>
              <Text style={na.vtVakitSayi}>{v.keys.length} ayet</Text>
            </View>
            <View style={na.vtKeys}>
              {v.keys.map(k => {
                const { surahId, ayahNumber } = parseKey(k);
                return (
                  <TouchableOpacity key={k} style={na.vtChip} onPress={() => router.push(`/ayah/${surahId}/${ayahNumber}`)} activeOpacity={0.7}>
                    <Text style={na.vtChipText}>{k}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function AyetlerTab() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
      <VakitTablosu />
      <Text style={[s.subHead, { color: c.text, marginTop: 18 }]}>Namaza Dair Ayetler</Text>
      {NAMAZ_CATS.map(cat => <TagAccordion key={cat.id} emoji={cat.emoji} label={cat.label} tag={cat.tag} renk={cat.renk} />)}
    </ScrollView>
  );
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────
function DurumBadge({ durum }: { durum?: string }) {
  if (!durum || !DURUM[durum]) return null;
  const d = DURUM[durum];
  return (
    <View style={[s.badge, { backgroundColor: d.bg, borderColor: d.border }]}>
      <Text style={[s.badgeText, { color: d.text }]}>{d.label}</Text>
    </View>
  );
}

function DuaBlock({ arapca, okunus, anlam, kaynak }: { arapca?: string | null; okunus?: string | null; anlam?: string; kaynak?: string }) {
  const c = useColors();
  if (!arapca && !okunus && !anlam) return null;
  return (
    <View style={[s.duaBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      {arapca ? <Text style={s.arabic}>{arapca}</Text> : null}
      {okunus ? <Text style={[s.okunus, { color: c.text }]}>{okunus}</Text> : null}
      {anlam ? <Text style={[s.anlam, { color: c.textSecondary }]}>{anlam}</Text> : null}
      {kaynak ? <Text style={s.kaynakChip}>{kaynak}</Text> : null}
    </View>
  );
}

function Section({ emoji, title, defaultOpen, children }: { emoji: string; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const c = useColors();
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View style={[s.sec, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={s.secHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
        <Text style={s.secEmoji}>{emoji}</Text>
        <Text style={[s.secTitle, { color: c.text }]}>{title}</Text>
        <Text style={[s.secChev, { color: c.textMuted }]}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && <View style={s.secBody}>{children}</View>}
    </View>
  );
}

// ── "Nasıl Kılınır" sekmesi (adım adım rehber) ────────────────────────────────
function GuideTab() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const zammSureler = R.namaz_adimlari.find(a => a.id === "zamm_i_sure")?.sureler ?? [];
  return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[s.intro, { color: c.textSecondary }]}>{R.aciklama}</Text>

        {/* Yeni başlayan — en üstte, ilk gördükleri yer (varsayılan açık) */}
        <Section emoji="🌱" title={R.yeni_baslayan_notu.baslik} defaultOpen>
          {R.yeni_baslayan_notu.maddeler.map((m, i) => (
            <Text key={i} style={[s.madde, { color: c.textSecondary }]}>✓ {m}</Text>
          ))}
        </Section>

        {/* Kavramlar */}
        <Section emoji="📘" title={R.temel_kavramlar.baslik} defaultOpen>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.temel_kavramlar.aciklama}</Text>
          {R.temel_kavramlar.kavramlar.map(k => {
            const d = DURUM[k.id];
            return (
              <View key={k.id} style={[s.kavram, { backgroundColor: d?.bg ?? c.cardAlt, borderColor: d?.border ?? c.border }]}>
                <Text style={[s.kavramIsim, { color: d?.text ?? c.text }]}>{k.isim}</Text>
                <Text style={[s.p, { color: c.textSecondary }]}>{k.aciklama}</Text>
                {k["örnek"] ? <Text style={[s.small, { color: c.textMuted }]}>Örnek: {k["örnek"]}</Text> : null}
              </View>
            );
          })}
          <Text style={s.teselli}>💚 {R.temel_kavramlar.teselli_notu}</Text>
        </Section>

        {/* Vakit & rekat */}
        <Section emoji="🕐" title="Vakit ve Rekat Sayıları">
          {R.farz_sunnet_namaz_farki.vakit_rekat_tablosu.map(v => (
            <View key={v.vakit} style={[s.vakitRow, { borderColor: c.border }]}>
              <Text style={[s.vakitAd, { color: c.text }]}>{v.vakit}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.small, { color: c.textSecondary }]}>{v.farz}</Text>
                <Text style={[s.small, { color: c.textMuted }]}>{v.sunnet}</Text>
              </View>
              <Text style={s.vakitToplam}>{v.toplam}</Text>
            </View>
          ))}
          <Text style={s.note}>ℹ️ {R.farz_sunnet_namaz_farki.not}</Text>
        </Section>

        {/* Namaza başlamadan önce */}
        <Section emoji="🧼" title={R.namaz_oncesi.baslik}>
          {R.namaz_oncesi.adimlar.map((a, i) => (
            <View key={i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{a.isim}</Text>
                <DurumBadge durum={a.durum} />
              </View>
              {a.aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{a.aciklama}</Text> : null}
            </View>
          ))}
        </Section>

        {/* Adım adım namaz */}
        <Section emoji="🕌" title="Namaz Nasıl Kılınır? (Adım Adım)">
          {R.namaz_adimlari.map((a, i) => (
            <View key={a.id ?? i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{a.sira ? `${a.sira}. ` : ""}{a.isim}</Text>
                <DurumBadge durum={a.durum} />
              </View>
              {a.konum ? <Text style={[s.konum, { color: c.accent }]}>{a.konum}</Text> : null}
              {a.ne_zaman ? <Text style={[s.small, { color: c.textMuted }]}>{a.ne_zaman}</Text> : null}
              {a.aciklama ? <Text style={[s.p, { color: c.textSecondary }]}>{a.aciklama}</Text> : null}
              <DuaBlock arapca={a.dua_arapca} okunus={a.dua} anlam={a.anlam} />
              {a.tekrar ? <Text style={[s.small, { color: c.textMuted }]}>🔁 {a.tekrar}</Text> : null}
              {a.farz_notu ? <Text style={s.note}>ℹ️ {a.farz_notu}</Text> : null}
              {a.durum_detay ? <Text style={s.note}>ℹ️ {a.durum_detay}</Text> : null}
              {a.not ? <Text style={s.note}>ℹ️ {a.not}</Text> : null}
              {a.anlam_notu ? <Text style={s.note}>💡 {a.anlam_notu}</Text> : null}
              {a.sureler ? <Text style={[s.small, { color: c.accent }]}>↓ Sureler aşağıdaki "Zamm-ı Sureler" bölümünde</Text> : null}
            </View>
          ))}
        </Section>

        {/* Zamm-ı Sureler — ayrı bölüm */}
        <Section emoji="📖" title={`Zamm-ı Sureler (${zammSureler.length} Kısa Sure)`}>
          <Text style={[s.p, { color: c.textSecondary }]}>Fatiha'dan sonra okunabilecek, en çok tercih edilen kısa sureler:</Text>
          {zammSureler.map(su => (
            <View key={su.id} style={s.item}>
              <Text style={[s.itemTitle, { color: c.text }]}>{su.isim}</Text>
              <DuaBlock arapca={su.arapca} okunus={su.okunusu} anlam={su.anlam} />
            </View>
          ))}
        </Section>

        {/* Dualar */}
        <Section emoji="📿" title="Namaz Duaları">
          {R.dualar.map((d, i) => (
            <View key={d.id ?? i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{d.isim}</Text>
                <DurumBadge durum={d.durum} />
              </View>
              {d.ne_zaman ? <Text style={[s.small, { color: c.textMuted }]}>{d.ne_zaman}</Text> : null}
              <DuaBlock arapca={d.dua_arapca} okunus={d.dua} anlam={d.anlam} kaynak={d.kuran_kaynagi} />
              {d.parmak_notu ? <Text style={s.note}>👉 {d.parmak_notu}</Text> : null}
              {d.not ? <Text style={s.note}>ℹ️ {d.not}</Text> : null}
            </View>
          ))}
        </Section>

        {/* Selam */}
        <Section emoji="🤲" title={R.selam.isim}>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.selam.aciklama}</Text>
          {R.selam.adimlar.map((a, i) => (
            <View key={i} style={s.item}>
              <Text style={[s.p, { color: c.textSecondary }]}>{a.sira}. {a.aciklama}</Text>
              <DuaBlock arapca={a.dua_arapca} okunus={a.dua} anlam={a.anlam} />
            </View>
          ))}
          <Text style={s.note}>💡 {R.selam.anlam_notu}</Text>
        </Section>

        {/* VİTİR NAMAZI */}
        <Section emoji="🌙" title={R.vitir_namazi.baslik} defaultOpen>
          <View style={s.itemHead}>
            <DurumBadge durum={R.vitir_namazi.durum} />
            <Text style={[s.rekatBilgi, { color: c.textMuted }]}>{R.vitir_namazi.rekat}</Text>
          </View>
          <Text style={[s.small, { color: c.textMuted }]}>{R.vitir_namazi.ne_zaman}</Text>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.vitir_namazi.aciklama}</Text>

          <Text style={[s.subHead, { color: c.text }]}>Özellikleri</Text>
          {R.vitir_namazi.ozellikler.map((o, i) => (
            <View key={i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{o.baslik}</Text>
                <DurumBadge durum={o.durum} />
              </View>
              <Text style={[s.p, { color: c.textSecondary }]}>{o.aciklama}</Text>
            </View>
          ))}

          <Text style={[s.subHead, { color: c.text }]}>Adım Adım</Text>
          {R.vitir_namazi.adimlar.map((a, i) => (
            <View key={i} style={s.item}>
              <View style={s.itemHead}>
                <Text style={[s.itemTitle, { color: c.text }]}>{a.rekat}</Text>
                <DurumBadge durum={a.durum} />
              </View>
              <Text style={[s.p, { color: c.textSecondary }]}>{a.aciklama}</Text>
            </View>
          ))}

          <Text style={[s.note, s.warn]}>⚠️ {R.vitir_namazi.yaygin_hata}</Text>
          <Text style={s.note}>ℹ️ {R.vitir_namazi.not}</Text>
        </Section>

        {/* Rekat yapısı */}
        <Section emoji="📋" title={R.rekat_yapisi.baslik}>
          <Text style={[s.p, { color: c.textSecondary }]}>{R.rekat_yapisi.aciklama}</Text>
          {R.rekat_yapisi.tablo.map(t => (
            <View key={t.rekat} style={[s.kavram, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={[s.kavramIsim, { color: c.text }]}>{t.rekat}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>Sübhaneke: {t.subhaneke}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>Eûzü-Besmele: {t.euzu_besmele}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>Fatiha: {t.fatiha}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>Zamm-ı sure: {t.zamm_i_sure}</Text>
              <Text style={[s.small, { color: c.textSecondary }]}>Oturuş: {t["oturuş"]}</Text>
            </View>
          ))}
          <Text style={s.note}>📌 {R.rekat_yapisi.ozet_notu}</Text>
        </Section>

        <Text style={[s.kaynakNot, { color: c.textMuted }]}>{R.kaynak_not}</Text>
      </ScrollView>
  );
}

// ── Ana ekran — üst sekmeli (Nasıl Kılınır | Namaz Ayetleri) ──────────────────
export default function NamazRehberiScreen() {
  const c = useColors();
  const [tab, setTab] = useState<"rehber" | "ayetler">("rehber");
  return (
    <>
      <Stack.Screen options={{ title: "Namaz Rehberi" }} />
      <View style={[s.tabWrap, { backgroundColor: c.bg }]}>
        <View style={[s.segment, { backgroundColor: c.cardAlt }]}>
          {([["rehber", "Nasıl Kılınır"], ["ayetler", "Namaz Ayetleri"]] as const).map(([id, lbl]) => {
            const active = tab === id;
            return (
              <TouchableOpacity key={id} style={[s.segBtn, active && [s.segBtnActive, { backgroundColor: c.card }]]} onPress={() => setTab(id)} activeOpacity={0.85}>
                <Text style={[s.segLabel, { color: active ? c.accent : c.textMuted }]}>{lbl}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {tab === "rehber" ? <GuideTab /> : <AyetlerTab />}
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 40 },
  intro:   { fontSize: 13, lineHeight: 20, marginBottom: 14 },

  sec:      { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  secHeader:{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  secEmoji: { fontSize: 18 },
  secTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  secChev:  { fontSize: 12 },
  secBody:  { paddingHorizontal: 14, paddingBottom: 14, gap: 2 },

  p:     { fontSize: 13, lineHeight: 20, marginTop: 4 },
  small: { fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  subHead: { fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 4 },

  badge:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5 },

  item:      { marginTop: 12 },
  itemHead:  { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  itemTitle: { fontSize: 13.5, fontWeight: "700" },
  konum:     { fontSize: 11, fontWeight: "600", marginTop: 1 },

  duaBox:  { borderRadius: 10, borderWidth: 1, padding: 11, marginTop: 6, gap: 4 },
  arabic:  { fontSize: 21, lineHeight: 38, textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", color: "#1c1917" },
  okunus:  { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  anlam:   { fontSize: 12.5, lineHeight: 19 },
  kaynakChip: { fontSize: 10, fontWeight: "700", color: "#047857", marginTop: 2 },

  kavram:    { borderRadius: 10, borderWidth: 1, padding: 11, marginTop: 8 },
  kavramIsim:{ fontSize: 13.5, fontWeight: "800", marginBottom: 2 },

  teselli: { fontSize: 12.5, lineHeight: 19, color: "#047857", backgroundColor: "#f0fdf4", borderRadius: 10, padding: 11, marginTop: 12 },

  vakitRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  vakitAd:    { fontSize: 13, fontWeight: "700", width: 56 },
  vakitToplam:{ fontSize: 11, fontWeight: "700", color: "#059669" },

  note: { fontSize: 12, lineHeight: 18, color: "#57534e", backgroundColor: "#f5f5f4", borderRadius: 8, padding: 9, marginTop: 8 },
  warn: { color: "#9a3412", backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fdba74" },

  rekatBilgi: { fontSize: 12, fontWeight: "600" },

  madde: { fontSize: 13, lineHeight: 21, marginTop: 6 },
  kaynakNot: { fontSize: 11, fontStyle: "italic", marginTop: 16, textAlign: "center" },

  // Üst sekme
  tabWrap:      { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  segment:      { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4 },
  segBtn:       { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9 },
  segBtnActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  segLabel:     { fontSize: 13, fontWeight: "700" },
});

// "Namaz Ayetleri" sekmesi stilleri
const na = StyleSheet.create({
  motto:        { borderRadius: 14, borderWidth: 1, borderColor: "#a7f3d0", backgroundColor: "#ecfdf5", padding: 14, marginBottom: 10 },
  mottoHead:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  mottoEtiket:  { flex: 1, fontSize: 10, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 },
  mottoKey:     { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mottoKeyText: { fontSize: 10, fontWeight: "700", color: "#047857" },
  mottoArabic:  { fontSize: 20, lineHeight: 36, color: "#1c1917", textAlign: "right", writingDirection: "rtl", fontFamily: "Amiri", marginBottom: 8 },
  mottoMeal:    { fontSize: 13, lineHeight: 20, fontStyle: "italic" },

  vtCard:        { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  vtHeader:      { padding: 12, borderBottomWidth: 1 },
  vtHeaderTitle: { fontSize: 12, fontWeight: "700", color: "#44403c", textTransform: "uppercase", letterSpacing: 0.5 },
  vtRow:         { flexDirection: "row", borderBottomWidth: 1, borderLeftWidth: 4 },
  vtVakit:       { width: 84, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 3 },
  vtVakitAd:     { fontSize: 11, fontWeight: "700", color: "#374151" },
  vtVakitSayi:   { fontSize: 10, color: "#9ca3af" },
  vtKeys:        { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10, alignContent: "center" },
  vtChip:        { backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#86efac" },
  vtChipText:    { fontSize: 12, color: "#065f46", fontWeight: "600" },

  accCard:   { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, marginBottom: 8, overflow: "hidden" },
  accHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  accTitle:  { flex: 1, fontSize: 14, fontWeight: "600" },
  accChev:   { fontSize: 12 },
  accBody:   { borderTopWidth: 1, padding: 10 },
  empty:     { fontSize: 13, padding: 8 },
  verseRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  keyBox:    { backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  keyText:   { fontSize: 11, fontWeight: "700", color: "#065f46" },
  vSurah:    { fontSize: 11, marginBottom: 1 },
  vReading:  { fontSize: 13, fontStyle: "italic", lineHeight: 20 },
  vMeal:     { fontSize: 11, lineHeight: 17, marginTop: 1 },
});
