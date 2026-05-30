import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { router, Stack } from "expo-router";

// ── Tipler ────────────────────────────────────────────────────────────────────
interface AyetRef { sureId: number; sureAdi: string; ayetNo: number; kisaMetin: string }
interface Bolum   { id: string; ikon: string; baslik: string; aciklama: string; ayetler: AyetRef[]; detaylar?: string[] }

// ── Veri ─────────────────────────────────────────────────────────────────────

const ISLAM_SARTLARI: Bolum[] = [
  { id:"sehadet", ikon:"🌙", baslik:"Kelime-i Şehadet",
    aciklama:"Allah'tan başka ilah olmadığına ve Hz. Muhammed'in O'nun kulu ve elçisi olduğuna şahitlik etmektir. İslam'a girişin kapısıdır.",
    ayetler:[
      {sureId:3,  sureAdi:"Âl-i İmrân",ayetNo:18, kisaMetin:"Allah, melekler ve ilim sahipleri tek ilah olduğuna şahitlik etti."},
      {sureId:47, sureAdi:"Muhammed",   ayetNo:19, kisaMetin:"Allah'tan başka ilah olmadığını bil."},
      {sureId:2,  sureAdi:"Bakara",     ayetNo:255,kisaMetin:"Allah, O'ndan başka ilah yoktur; Hayy ve Kayyûm'dur."},
    ] },
  { id:"namaz", ikon:"🕌", baslik:"Namaz (Salât)",
    aciklama:"Günde beş vakit kılınan namaz, Müslümanın Allah ile doğrudan bağını simgeler. Kur'an'da en çok emredilen ibadettir.",
    ayetler:[
      {sureId:2, sureAdi:"Bakara",  ayetNo:43, kisaMetin:"Namazı kılın, zekâtı verin, rükû edenlerle birlikte rükû edin."},
      {sureId:4, sureAdi:"Nisâ",    ayetNo:103,kisaMetin:"Namaz, müminlere belirlenmiş vakitlerde farz kılınmıştır."},
      {sureId:20,sureAdi:"Tâhâ",   ayetNo:14, kisaMetin:"Beni anmak için namaz kıl."},
      {sureId:29,sureAdi:"Ankebût",ayetNo:45, kisaMetin:"Namaz, hayâsızlıktan ve kötülükten alıkoyar."},
    ],
    detaylar:[
      "Sabah: 2 sünnet + 2 farz = 4 rekat",
      "Öğle: 4 sünnet + 4 farz + 2 sünnet = 10 rekat",
      "İkindi: 4 sünnet + 4 farz = 8 rekat",
      "Akşam: 3 farz + 2 sünnet = 5 rekat",
      "Yatsı: 4 sünnet + 4 farz + 2 sünnet + 3 vitir = 13 rekat",
      "Farzlar: Niyet, iftitah tekbiri, kıyam, kıraat, rükû, secde, son oturuş, selam",
    ] },
  { id:"oruc", ikon:"🌙", baslik:"Oruç (Savm)",
    aciklama:"Ramazan ayında şafaktan güneş batımına kadar yiyecek, içecek ve kötü davranışlardan kaçınmaktır.",
    ayetler:[
      {sureId:2,sureAdi:"Bakara",ayetNo:183,kisaMetin:"Oruç, sizden öncekilere farz kılındığı gibi size de farz kılındı; umulur ki korunursunuz."},
      {sureId:2,sureAdi:"Bakara",ayetNo:185,kisaMetin:"Ramazan ayı, insanlara yol gösterici olan Kur'an'ın indirildiği aydır."},
    ],
    detaylar:[
      "Farz: Niyet, imsak (yemek/içmekten kaçınmak)",
      "Sünnet: Sahur yemek, iftar etmekte acele etmek",
      "Sünnet: Ramazan'da Kur'an hatmi, teravih namazı",
      "Orucu bozan: Bilerek yemek-içmek, cinsel ilişki, kasıtlı kusma",
    ] },
  { id:"zekat", ikon:"💛", baslik:"Zekât",
    aciklama:"Nisap miktarına ulaşan malın belli oranını muhtaçlara vermektir. Kur'an'da namazla birlikte defalarca zikredilir.",
    ayetler:[
      {sureId:2,sureAdi:"Bakara",ayetNo:43, kisaMetin:"Namazı kılın ve zekâtı verin."},
      {sureId:9,sureAdi:"Tevbe", ayetNo:60, kisaMetin:"Sadakalar; fakirler, yoksullar, zekât görevlileri ve diğerleri içindir."},
      {sureId:2,sureAdi:"Bakara",ayetNo:277,kisaMetin:"İman edip zekâtı verenler için mükâfat vardır."},
    ],
    detaylar:[
      "Nisap: 85g altın veya değeri kadar mal",
      "Oran: Yılda bir kez malın %2.5'i (kırkta biri)",
      "8 sınıf: Fakirler, yoksullar, zekât görevlileri, kalpleri ısındırılanlar, köleler, borçlular, Allah yolundakiler, yolcular",
    ] },
  { id:"hac", ikon:"🕋", baslik:"Hac",
    aciklama:"Gücü yeten her Müslümanın ömründe en az bir kez Mekke'ye gidip belirli ibadetleri yerine getirmesidir.",
    ayetler:[
      {sureId:3, sureAdi:"Âl-i İmrân",ayetNo:97, kisaMetin:"Yoluna gücü yeten kimseye Allah için Kâbe'yi haccetmek farzdır."},
      {sureId:2, sureAdi:"Bakara",    ayetNo:196,kisaMetin:"Haccı ve umreyi Allah için tamamlayın."},
      {sureId:22,sureAdi:"Hac",       ayetNo:27, kisaMetin:"İnsanlar arasında haccı ilan et."},
    ],
    detaylar:[
      "Farzlar: İhrama girmek, Arafat vakfesi, ziyaret tavafı",
      "Vacipler: Müzdelife'de geceleme, sa'y, şeytan taşlama, tıraş/saç kısaltma, veda tavafı",
      "Kurban: Temettü ve kıran haccında vacip",
    ] },
  { id:"kurban", ikon:"🐑", baslik:"Kurban",
    aciklama:"Hanefi mezhebinde vacip; diğer mezheplerde sünnet-i müekkede. Kurban Bayramı'nda Allah rızası için hayvan kesmektir.",
    ayetler:[
      {sureId:22, sureAdi:"Hac",    ayetNo:34,kisaMetin:"Her ümmet için Allah'ın adını ansınlar diye kurban ibadeti koyduk."},
      {sureId:22, sureAdi:"Hac",    ayetNo:37,kisaMetin:"Allah'a etleri ve kanları değil, takvânız ulaşır."},
      {sureId:108,sureAdi:"Kevser", ayetNo:2, kisaMetin:"Rabbin için namaz kıl ve kurban kes."},
    ],
    detaylar:[
      "Koyun/Keçi: En az 1 yaşında, 1 kişi adına",
      "Sığır/Manda: En az 2 yaşında, en fazla 7 kişi",
      "Deve: En az 5 yaşında, en fazla 7 kişi",
      "Vakti: Bayram 1. günü sabah namazından 3. gün güneş batımına kadar",
      "Et taksimi: 1/3 aile, 1/3 komşu-arkadaş, 1/3 fakirler (tavsiye)",
    ] },
];

const IMAN_SARTLARI: Bolum[] = [
  { id:"allah", ikon:"✨", baslik:"Allah'a İman",
    aciklama:"Allah'ın varlığına, birliğine (tevhid) ve sıfatlarına kalp ile inanmaktır. Tüm imanın temelidir.",
    ayetler:[
      {sureId:112,sureAdi:"İhlâs", ayetNo:1,  kisaMetin:"De ki: O Allah birdir."},
      {sureId:112,sureAdi:"İhlâs", ayetNo:2,  kisaMetin:"Allah Samed'dir; her şey O'na muhtaç, O hiçbir şeye muhtaç değil."},
      {sureId:2,  sureAdi:"Bakara",ayetNo:255,kisaMetin:"Allah, O'ndan başka ilah yoktur; diri ve her şeyi ayakta tutandır."},
    ] },
  { id:"melek", ikon:"🪽", baslik:"Meleklere İman",
    aciklama:"Allah'ın nurdan yarattığı, günah işlemeyen ve emirlerine tam itaat eden meleklere inanmaktır.",
    ayetler:[
      {sureId:2,sureAdi:"Bakara",ayetNo:285,kisaMetin:"Müminler Allah'a, meleklerine, kitaplarına ve elçilerine iman etti."},
      {sureId:4,sureAdi:"Nisâ",  ayetNo:136,kisaMetin:"Allah'a, elçisine, meleklerine, kitaplarına ve elçilerine iman edin."},
    ] },
  { id:"kitap", ikon:"📖", baslik:"Kitaplara İman",
    aciklama:"Allah'ın peygamberlere gönderdiği ilahi kitaplara — Tevrat, Zebur, İncil ve Kur'an — inanmaktır.",
    ayetler:[
      {sureId:2,sureAdi:"Bakara",     ayetNo:285,kisaMetin:"Müminler Allah'ın kitaplarına iman etti."},
      {sureId:3,sureAdi:"Âl-i İmrân",ayetNo:3,  kisaMetin:"Allah sana Kitabı hak ile, öncekini doğrulayıcı olarak indirdi."},
    ] },
  { id:"peygamber", ikon:"🌿", baslik:"Peygamberlere İman",
    aciklama:"Âdem'den Hz. Muhammed'e kadar gönderilmiş tüm peygamberlere inanmaktır. Kur'an'da 25 peygamberin ismi geçmektedir.",
    ayetler:[
      {sureId:2,sureAdi:"Bakara",ayetNo:285,kisaMetin:"Müminler Allah'ın elçilerine iman etti; hiçbirini diğerinden ayırmayız."},
      {sureId:6,sureAdi:"En'âm",ayetNo:84, kisaMetin:"İbrahim'e İshak ve Yakup'u verdik; hepsini doğruya ilettik."},
    ] },
  { id:"ahiret", ikon:"⚖️", baslik:"Ahiret Gününe İman",
    aciklama:"Ölümden sonra yeniden dirilişe, hesap gününe, cennet ve cehenneme inanmaktır.",
    ayetler:[
      {sureId:2, sureAdi:"Bakara",ayetNo:4,  kisaMetin:"Ahirete kesin olarak inananlar."},
      {sureId:2, sureAdi:"Bakara",ayetNo:62, kisaMetin:"Allah'a ve ahiret gününe iman edip salih amel işleyenler için mükâfat vardır."},
      {sureId:99,sureAdi:"Zilzâl",ayetNo:6,  kisaMetin:"O gün insanlar amelleri gösterilsin diye ayrı ayrı çıkarlar."},
    ] },
  { id:"kader", ikon:"🌊", baslik:"Kader ve Kazaya İman",
    aciklama:"Her şeyin Allah'ın ilmi, iradesi ve takdiri dahilinde olduğuna inanmaktır.",
    ayetler:[
      {sureId:54,sureAdi:"Kamer",  ayetNo:49,kisaMetin:"Şüphesiz Biz her şeyi bir ölçüye göre yarattık."},
      {sureId:25,sureAdi:"Furkân", ayetNo:2, kisaMetin:"Her şeyi yaratan, onu bir ölçüyle takdir edendir."},
      {sureId:57,sureAdi:"Hadîd",  ayetNo:22,kisaMetin:"Yeryüzünde ve başınıza gelen hiçbir musibet yoktur ki bir kitapta yazılmış olmasın."},
    ] },
];

const ABDEST_BOLUM: Bolum[] = [
  { id:"abdest", ikon:"💧", baslik:"Namaz Abdesti",
    aciklama:"Namaz kılmak, Kur'an'a el sürmek ve Kâbe'yi tavaf etmek için gerekli olan temizliktir.",
    ayetler:[
      {sureId:5,sureAdi:"Mâide",ayetNo:6, kisaMetin:"Ey iman edenler! Namaza kalktığınızda yüzlerinizi ve dirseklere kadar ellerinizi yıkayın; başlarınızı meshedin ve topuklara kadar ayaklarınızı yıkayın."},
      {sureId:4,sureAdi:"Nisâ", ayetNo:43,kisaMetin:"Cünüp iken yıkanmadan namaz kılmayın."},
    ],
    detaylar:[
      "5 Farz: Yüz yıkamak · Kolları dirseklerle yıkamak · Başa mesh · Ayakları topuklarla yıkamak · Niyet",
      "Sünnetler: Besmele · Elleri 3 kez yıkamak · Ağzı (mazmaza) · Burnu (istinşak) · Her organı 3 kez yıkamak · Kulakları mesh · Parmak aralarını hilallemek",
      "Abdesti bozan: Küçük/büyük abdest · Yel çıkması · Derin uyku · Bayılma · Kan/irin akması",
    ] },
  { id:"gusul", ikon:"🚿", baslik:"Gusül (Boy Abdesti)",
    aciklama:"Cünüplük, hayız ve nifas gibi haller sonrasında tüm vücudun yıkanmasıdır.",
    ayetler:[
      {sureId:5,sureAdi:"Mâide", ayetNo:6,  kisaMetin:"Cünüp iseniz iyice yıkanın."},
      {sureId:4,sureAdi:"Nisâ",  ayetNo:43, kisaMetin:"Cünüp iken yıkanmadan namaz kılmayın."},
      {sureId:2,sureAdi:"Bakara",ayetNo:222,kisaMetin:"Hayız bitince temizlendiklerinde onlara yaklaşın."},
    ],
    detaylar:[
      "4 Farz: Niyet · Ağzı yıkamak (mazmaza) · Burnu yıkamak (istinşak) · Tüm vücudu yıkamak",
      "Sünnetler: Önce elleri yıkamak · Namaz abdesti almak · Başı 3 kez dökmek · Sağdan başlamak",
      "Guslü gerektiren haller: Cünüplük · Hayız · Nifas · İslam'a giriş",
    ] },
  { id:"teyemmum", ikon:"🌿", baslik:"Teyemmüm (Toprak Abdesti)",
    aciklama:"Su bulunamaması veya kullanılamaması durumunda abdest ve guslün yerine geçen temizlik yöntemidir.",
    ayetler:[
      {sureId:5,sureAdi:"Mâide",ayetNo:6,  kisaMetin:"Su bulamazsanız temiz bir toprağa yönelin; yüzlerinizi ve ellerinizi onunla meshedin."},
      {sureId:4,sureAdi:"Nisâ", ayetNo:43, kisaMetin:"Hasta olur veya yolculukta su bulamazsanız temiz bir toprağa vurup yüzünüzü ve ellerinizi meshedin."},
    ],
    detaylar:[
      "4 Farz: Niyet · Temiz toprağa/taşa el vurmak · Yüzü meshetmek · Kolları dirseklere kadar meshetmek",
      "Sünnetler: Tertip · Parmakları açık tutmak · Elleri silkelemek · Parmak aralarını hilallemek · Sağdan başlamak",
      "Teyemmümü bozan: Su bulunması · Abdesti bozan haller",
    ] },
];

// ── Bileşenler ────────────────────────────────────────────────────────────────

function BolumCard({ bolum }: { bolum: Bolum }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={card.wrap}>
      <Pressable style={card.header} onPress={() => setOpen(p => !p)}>
        <View style={card.left}>
          <Text style={card.ikon}>{bolum.ikon}</Text>
          <Text style={card.baslik}>{bolum.baslik}</Text>
        </View>
        <Text style={card.chevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && (
        <View style={card.body}>
          <Text style={card.aciklama}>{bolum.aciklama}</Text>
          {bolum.detaylar && bolum.detaylar.length > 0 && (
            <View style={card.detayBox}>
              {bolum.detaylar.map((d, i) => (
                <Text key={i} style={card.detayText}>• {d}</Text>
              ))}
            </View>
          )}
          {bolum.ayetler.length > 0 && (
            <View style={card.ayetler}>
              {bolum.ayetler.map((a, i) => (
                <TouchableOpacity key={i} style={card.ayetRow}
                  onPress={() => router.push(`/ayah/${a.sureId}/${a.ayetNo}` as any)} activeOpacity={0.75}>
                  <View style={card.keyBadge}><Text style={card.keyText}>{a.sureId}:{a.ayetNo}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={card.sureAdi}>{a.sureAdi} · {a.ayetNo}. ayet</Text>
                    <Text style={card.kisaMetin} numberOfLines={2}>{a.kisaMetin}</Text>
                  </View>
                  <Text style={card.chevronSmall}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Sekmeler ──────────────────────────────────────────────────────────────────

type Tab = "inanc" | "ibadetler" | "abdest";
const TABS: { id: Tab; label: string; ikon: string }[] = [
  { id: "inanc",     label: "İnanç",     ikon: "✨" },
  { id: "ibadetler", label: "İbadetler", ikon: "🕌" },
  { id: "abdest",    label: "Abdest",    ikon: "💧" },
];

export default function IbadetRehberiScreen() {
  const [tab, setTab] = useState<Tab>("inanc");

  const inancBolum  = [ISLAM_SARTLARI.find(b => b.id === "sehadet")!, ...IMAN_SARTLARI];
  const ibadetBolum = ISLAM_SARTLARI.filter(b => b.id !== "sehadet");

  const current = tab === "inanc" ? inancBolum : tab === "ibadetler" ? ibadetBolum : ABDEST_BOLUM;

  return (
    <>
      <Stack.Screen options={{ title: "İbadet Rehberi" }} />
      <View style={s.container}>
        {/* Tab bar */}
        <View style={s.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} style={[s.tab, tab === t.id && s.tabActive]}
              onPress={() => setTab(t.id)} activeOpacity={0.75}>
              <Text style={s.tabIkon}>{t.ikon}</Text>
              <Text style={[s.tabLabel, tab === t.id && s.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* İçerik */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.list, { paddingBottom: 32 }]}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {current.map(b => <BolumCard key={b.id} bolum={b} />)}
        </ScrollView>
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },
  tabBar:    { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tab:       { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#059669" },
  tabIkon:   { fontSize: 18 },
  tabLabel:  { fontSize: 11, color: "#78716c", fontWeight: "600" },
  tabLabelActive: { color: "#059669" },
  list:      { padding: 12, gap: 8 },
});

const card = StyleSheet.create({
  wrap:    { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e7e5e4", overflow: "hidden" },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  left:    { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  ikon:    { fontSize: 22 },
  baslik:  { fontSize: 14, fontWeight: "700", color: "#1c1917", flex: 1 },
  chevron: { fontSize: 14, color: "#059669" },
  body:    { borderTopWidth: 1, borderTopColor: "#f5f5f4", padding: 14, gap: 10 },
  aciklama:{ fontSize: 13, color: "#44403c", lineHeight: 20 },
  detayBox:{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: 10, gap: 4 },
  detayText:{ fontSize: 12, color: "#166534", lineHeight: 18 },
  ayetler: { gap: 6, marginTop: 4 },
  ayetRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 8, backgroundColor: "#f9fafb", borderRadius: 8 },
  keyBadge:{ backgroundColor: "#d1fae5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  keyText: { fontSize: 10, fontWeight: "700", color: "#065f46" },
  sureAdi: { fontSize: 10, color: "#78716c" },
  kisaMetin:{ fontSize: 12, color: "#1c1917", lineHeight: 18 },
  chevronSmall:{ fontSize: 16, color: "#86efac", marginTop: 2 },
});
