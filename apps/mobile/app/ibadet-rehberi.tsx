import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Pressable,
} from "react-native";
import { useState } from "react";
import { router, Stack } from "expo-router";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface AyetRef { sureId: number; sureAdi: string; ayetNo: number; kisaMetin: string }
interface Bolum   { id: string; ikon: string; baslik: string; aciklama: string; ayetler: AyetRef[] }

// ── Veri ─────────────────────────────────────────────────────────────────────

const ISLAM_SARTLARI: Bolum[] = [
  { id:"sehadet", ikon:"🌙", baslik:"Kelime-i Şehadet",
    aciklama:"Allah'tan başka ilah olmadığına ve Hz. Muhammed'in elçisi olduğuna şahitlik etmektir.",
    ayetler:[{sureId:3,sureAdi:"Âl-i İmrân",ayetNo:18,kisaMetin:"Allah, melekler ve ilim sahipleri tek ilah olduğuna şahitlik etti."}] },
  { id:"namaz",   ikon:"🕌", baslik:"Namaz (Salât)",
    aciklama:"Günde beş vakit kılınan namaz, Müslümanın Allah ile doğrudan bağını simgeler. Kur'an'da en çok emredilen ibadettir.",
    ayetler:[
      {sureId:4, sureAdi:"Nisâ",    ayetNo:103, kisaMetin:"Namaz, müminlere belirlenmiş vakitlerde farz kılınmıştır."},
      {sureId:29,sureAdi:"Ankebût", ayetNo:45,  kisaMetin:"Namaz, hayâsızlıktan ve kötülükten alıkoyar."},
    ] },
  { id:"oruc",    ikon:"🌙", baslik:"Oruç (Savm)",
    aciklama:"Ramazan ayında şafaktan güneş batımına kadar yiyecek ve içecekten kaçınmaktır.",
    ayetler:[{sureId:2,sureAdi:"Bakara",ayetNo:183,kisaMetin:"Oruç, sizden öncekilere farz kılındığı gibi size de farz kılındı."}] },
  { id:"zekat",   ikon:"💛", baslik:"Zekât",
    aciklama:"Nisap miktarına ulaşan malın belli oranını muhtaçlara vermektir.",
    ayetler:[{sureId:9,sureAdi:"Tevbe",ayetNo:60,kisaMetin:"Sadakalar; fakirler, yoksullar ve Allah yolunda çalışanlar içindir."}] },
  { id:"hac",     ikon:"🕋", baslik:"Hac",
    aciklama:"Gücü yeten her Müslümanın ömründe en az bir kez Mekke'ye gidip belirli ibadetleri yerine getirmesidir.",
    ayetler:[{sureId:3,sureAdi:"Âl-i İmrân",ayetNo:97,kisaMetin:"Yoluna gücü yeten kimseye Kâbe'yi haccetmek farzdır."}] },
];

const IMAN_SARTLARI: Bolum[] = [
  { id:"allah",     ikon:"✨", baslik:"Allah'a İman",
    aciklama:"Allah'ın varlığına, birliğine (tevhid) ve sıfatlarına inanmaktır.",
    ayetler:[{sureId:112,sureAdi:"İhlâs",ayetNo:1,kisaMetin:"De ki: O Allah birdir."}] },
  { id:"melek",     ikon:"🪽", baslik:"Meleklere İman",
    aciklama:"Allah'ın nurdan yarattığı, günah işlemeyen meleklere inanmaktır.",
    ayetler:[{sureId:2,sureAdi:"Bakara",ayetNo:285,kisaMetin:"Müminler Allah'a, meleklerine, kitaplarına ve elçilerine iman etti."}] },
  { id:"kitap",     ikon:"📖", baslik:"Kitaplara İman",
    aciklama:"Tevrat, Zebur, İncil ve Kur'an başta olmak üzere ilahi kitaplara inanmaktır.",
    ayetler:[{sureId:3,sureAdi:"Âl-i İmrân",ayetNo:3,kisaMetin:"Allah sana Kitabı hak ile, öncekini doğrulayıcı olarak indirdi."}] },
  { id:"peygamber", ikon:"🌿", baslik:"Peygamberlere İman",
    aciklama:"Âdem'den Hz. Muhammed'e kadar gönderilmiş tüm peygamberlere inanmaktır.",
    ayetler:[{sureId:2,sureAdi:"Bakara",ayetNo:285,kisaMetin:"Hiçbirini diğerinden ayırmayız."}] },
  { id:"ahiret",    ikon:"⚖️", baslik:"Ahiret Gününe İman",
    aciklama:"Ölümden sonra dirilişe, hesap gününe, cennet ve cehenneme inanmaktır.",
    ayetler:[{sureId:99,sureAdi:"Zilzâl",ayetNo:6,kisaMetin:"O gün insanlar amelleri gösterilsin diye ayrı ayrı çıkarlar."}] },
  { id:"kader",     ikon:"🌊", baslik:"Kader ve Kazaya İman",
    aciklama:"Her şeyin Allah'ın ilmi ve takdiri dahilinde olduğuna inanmaktır.",
    ayetler:[{sureId:54,sureAdi:"Kamer",ayetNo:49,kisaMetin:"Şüphesiz Biz her şeyi bir ölçüye göre yarattık."}] },
];

const ABDEST_BOLUM: Bolum[] = [
  { id:"farzlar", ikon:"💧", baslik:"Abdestin Farzları",
    aciklama:"Yüzü yıkamak, kolları dirseklerle birlikte yıkamak, başa mesh etmek ve ayakları topuklarla birlikte yıkamak.",
    ayetler:[{sureId:5,sureAdi:"Mâide",ayetNo:6,kisaMetin:"Namaza kalktığınızda yüzünüzü ve dirseklere kadar ellerinizi yıkayın, başınıza mesh edin, topuklara kadar ayaklarınızı yıkayın."}] },
  { id:"sunnetler", ikon:"🤲", baslik:"Abdestin Sünnetleri",
    aciklama:"Niyet etmek, besmele çekmek, elleri üç kez yıkamak, misvak/diş fırçası kullanmak, kulakları mesh etmek, üç kez yıkamak.",
    ayetler:[] },
  { id:"bozanlar", ikon:"⚡", baslik:"Abdesti Bozan Durumlar",
    aciklama:"Küçük ve büyük abdesti bozan haller: bevl, gaita, yel çıkması, uyku, bayılma.",
    ayetler:[] },
  { id:"gusul", ikon:"🚿", baslik:"Gusül (Boy Abdesti)",
    aciklama:"Cünüplük, hayız ve nifas sonrası boy abdesti almak farzdır. Ağzı ve burnu su ile çalkalamak, tüm bedeni yıkamak.",
    ayetler:[{sureId:4,sureAdi:"Nisâ",ayetNo:43,kisaMetin:"Cünüp iseniz iyice yıkanın."}] },
];

// ── Bileşenler ────────────────────────────────────────────────────────────────

function BolumCard({ bolum }: { bolum: Bolum }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={card.wrap}>
      <Pressable
        style={card.header}
        onPress={() => setOpen(p => !p)}
      >
        <View style={card.left}>
          <Text style={card.ikon}>{bolum.ikon}</Text>
          <Text style={card.baslik}>{bolum.baslik}</Text>
        </View>
        <Text style={card.chevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open && (
        <View style={card.body}>
          <Text style={card.aciklama}>{bolum.aciklama}</Text>

          {bolum.ayetler.length > 0 && (
            <View style={card.ayetler}>
              {bolum.ayetler.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={card.ayetRow}
                  onPress={() => router.push(`/ayah/${a.sureId}/${a.ayetNo}`)}
                  activeOpacity={0.75}
                >
                  <View style={card.keyBadge}>
                    <Text style={card.keyText}>{a.sureId}:{a.ayetNo}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={card.sureAdi}>{a.sureAdi} · {a.ayetNo}. ayet</Text>
                    <Text style={card.kisaMetin} numberOfLines={2}>{a.kisaMetin}</Text>
                  </View>
                  <Text style={card.chevron}>›</Text>
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

const TABS: { id: Tab; label: string }[] = [
  { id: "inanc",     label: "İnanç" },
  { id: "ibadetler", label: "İbadetler" },
  { id: "abdest",    label: "Abdest" },
];

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function IbadetRehberiScreen() {
  const [tab, setTab] = useState<Tab>("inanc");

  const ibadetlerBolum: Bolum[] = [
    ISLAM_SARTLARI.find(b => b.id === "namaz")!,
    ISLAM_SARTLARI.find(b => b.id === "oruc")!,
    ISLAM_SARTLARI.find(b => b.id === "zekat")!,
    ISLAM_SARTLARI.find(b => b.id === "hac")!,
  ];

  const inancBolum: Bolum[] = [
    ISLAM_SARTLARI.find(b => b.id === "sehadet")!,
    ...IMAN_SARTLARI,
  ];

  const currentBolumler =
    tab === "inanc"     ? inancBolum :
    tab === "ibadetler" ? ibadetlerBolum :
    ABDEST_BOLUM;

  return (
    <>
      <Stack.Screen options={{ title: "İbadet Rehberi" }} />
      <View style={styles.container}>

        {/* Sekme çubuğu */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <Pressable
              key={t.id}
              style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentBolumler.map(b => (
            <BolumCard key={b.id} bolum={b} />
          ))}
        </ScrollView>
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f7f1e4" },
  tabBar: {
    flexDirection:"row", margin:12, gap:6,
    backgroundColor:"#e7e5e4", borderRadius:12, padding:4,
  },
  tabBtn: {
    flex:1, paddingVertical:8, borderRadius:9, alignItems:"center",
  },
  tabBtnActive: { backgroundColor:"#fff", shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:2, elevation:1 },
  tabText:      { fontSize:13, fontWeight:"600", color:"#78716c" },
  tabTextActive:{ color:"#1c1917" },
  list: { paddingHorizontal:12, paddingBottom:32, gap:8 },
});

const card = StyleSheet.create({
  wrap: {
    backgroundColor:"#fff", borderRadius:14,
    borderWidth:1, borderColor:"#e7e5e4",
    overflow:"hidden",
    shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:3, elevation:1,
  },
  header: {
    flexDirection:"row", alignItems:"center", padding:16, gap:10,
  },
  left:   { flexDirection:"row", alignItems:"center", gap:10, flex:1 },
  ikon:   { fontSize:20 },
  baslik: { fontSize:14, fontWeight:"700", color:"#1c1917", flex:1 },
  chevron:{ fontSize:12, color:"#a8a29e" },
  body:   { paddingHorizontal:16, paddingBottom:16, borderTopWidth:1, borderTopColor:"#f5f5f4" },
  aciklama:{ fontSize:13, lineHeight:21, color:"#44403c", marginTop:12, marginBottom:10 },
  ayetler:{ gap:8 },
  ayetRow:{
    flexDirection:"row", alignItems:"center", gap:10,
    backgroundColor:"#f7f1e4", borderRadius:10, padding:10,
  },
  keyBadge:{ backgroundColor:"#d1fae5", borderRadius:7, paddingHorizontal:7, paddingVertical:3 },
  keyText: { fontSize:10, fontWeight:"700", color:"#065f46" },
  sureAdi: { fontSize:11, color:"#78716c", marginBottom:2 },
  kisaMetin:{ fontSize:12, lineHeight:18, color:"#292524" },
});
