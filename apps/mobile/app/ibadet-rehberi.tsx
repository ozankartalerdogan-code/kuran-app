import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Pressable,
} from "react-native";
import { router, Stack } from "expo-router";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface AyetRef { sureId: number; sureAdi: string; ayetNo: number; kisaMetin: string }
type MaddeTip = "farz" | "sunnet" | "vacip" | "info";
interface Madde { tip: MaddeTip; metin: string; detay: string }
interface AbdestSatiri { organ: string; miktar: number | "—"; aciklama: string }

// ── VERİ — İNANÇ SEKMESİ ─────────────────────────────────────────────────────

const ISLAM_SARTLARI = [
  {
    id: "sehadet", ikon: "🌙", baslik: "Kelime-i Şehadet",
    aciklama: "Allah'tan başka ilah olmadığına ve Hz. Muhammed'in O'nun kulu ve elçisi olduğuna şahitlik etmektir. İslam'a girişin ve mümin olmanın ilk adımıdır.",
    ayetler: [
      { sureId: 3,  sureAdi: "Âl-i İmrân", ayetNo: 18,  kisaMetin: "Allah, melekler ve ilim sahipleri tek ilah olduğuna şahitlik etti." },
      { sureId: 47, sureAdi: "Muhammed",    ayetNo: 19,  kisaMetin: "Allah'tan başka ilah olmadığını bil." },
      { sureId: 2,  sureAdi: "Bakara",      ayetNo: 255, kisaMetin: "Âyetü'l-Kürsî: Allah, O'ndan başka ilah yoktur." },
    ] as AyetRef[],
  },
  {
    id: "namaz-inanc", ikon: "🕌", baslik: "Namaz (Salât)",
    aciklama: "Günde beş vakit kılınan namaz, Müslümanın Allah ile doğrudan bağını simgeler. Kur'an'da en çok emredilen ibadettir; imanın bedene yansımasıdır.",
    ayetler: [
      { sureId: 2,  sureAdi: "Bakara",  ayetNo: 43,  kisaMetin: "Namazı kılın, zekâtı verin, rükû edenlerle birlikte rükû edin." },
      { sureId: 4,  sureAdi: "Nisâ",    ayetNo: 103, kisaMetin: "Namaz, müminlere belirlenmiş vakitlerde farz kılınmıştır." },
      { sureId: 20, sureAdi: "Tâhâ",    ayetNo: 14,  kisaMetin: "Beni anmak için namaz kıl." },
      { sureId: 29, sureAdi: "Ankebût", ayetNo: 45,  kisaMetin: "Namaz, hayâsızlıktan ve kötülükten alıkoyar." },
    ] as AyetRef[],
  },
  {
    id: "oruc-inanc", ikon: "🌟", baslik: "Oruç (Savm)",
    aciklama: "Ramazan ayında şafaktan güneş batımına kadar yiyecek, içecek ve kötü davranışlardan kaçınmaktır. Takvayı pekiştiren, nefsi terbiye eden bir ibadettir.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 183, kisaMetin: "Oruç, sizden öncekilere farz kılındığı gibi size de farz kılındı; umulur ki korunursunuz." },
      { sureId: 2, sureAdi: "Bakara", ayetNo: 185, kisaMetin: "Ramazan ayı, Kur'an'ın indirildiği, hidayet ve furkan olan aydır." },
      { sureId: 2, sureAdi: "Bakara", ayetNo: 187, kisaMetin: "Oruç gecesi kadınlarınıza yaklaşmak helal kılındı." },
    ] as AyetRef[],
  },
  {
    id: "zekat-inanc", ikon: "💛", baslik: "Zekât",
    aciklama: "Nisap miktarına ulaşan malın belli oranını muhtaçlara vermektir. Kur'an'da namazla birlikte 28 yerde zikredilir; servetin arınması ve paylaşılmasıdır.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 43,  kisaMetin: "Namazı kılın ve zekâtı verin." },
      { sureId: 9, sureAdi: "Tevbe",  ayetNo: 60,  kisaMetin: "Sadakalar (zekât) sekiz sınıf için — Allah'tan bir farz." },
      { sureId: 2, sureAdi: "Bakara", ayetNo: 277, kisaMetin: "İman edip zekâtı verenler için mükâfat vardır." },
    ] as AyetRef[],
  },
  {
    id: "hac-inanc", ikon: "🕋", baslik: "Hac",
    aciklama: "Gücü yeten her Müslümanın ömründe en az bir kez Mekke'ye gidip belirli ibadetleri yerine getirmesidir. Tüm müminlerin ırk ve sınıf farkı gözetmeksizin bir araya geldiği kardeşlik törevidir.",
    ayetler: [
      { sureId: 3,  sureAdi: "Âl-i İmrân", ayetNo: 97,  kisaMetin: "Yoluna gücü yeten kimseye Allah için Kâbe'yi haccetmek farzdır." },
      { sureId: 2,  sureAdi: "Bakara",      ayetNo: 196, kisaMetin: "Haccı ve umreyi Allah için tamamlayın." },
      { sureId: 22, sureAdi: "Hac",         ayetNo: 27,  kisaMetin: "İnsanlar arasında haccı ilan et; uzak yollardan her yolcu gelsin." },
      { sureId: 22, sureAdi: "Hac",         ayetNo: 29,  kisaMetin: "Kirlerini gidersinler, adaklarını yerine getirsinler, tavaf etsinler." },
    ] as AyetRef[],
  },
];

const IMAN_SARTLARI = [
  {
    id: "allah", ikon: "✨", baslik: "Allah'a İman",
    aciklama: "Allah'ın varlığına, birliğine (tevhid) ve Kur'an'da bildirilen isim ve sıfatlarına kalp ile inanmaktır. Tüm imanın temelidir.",
    ayetler: [
      { sureId: 112, sureAdi: "İhlâs",  ayetNo: 1,   kisaMetin: "De ki: O Allah birdir." },
      { sureId: 112, sureAdi: "İhlâs",  ayetNo: 2,   kisaMetin: "Allah Samed'dir; her şey O'na muhtaç, O hiçbir şeye muhtaç değil." },
      { sureId: 2,   sureAdi: "Bakara", ayetNo: 255, kisaMetin: "Âyetü'l-Kürsî: Allah, diri ve her şeyi tutandır." },
    ] as AyetRef[],
  },
  {
    id: "melek", ikon: "🪽", baslik: "Meleklere İman",
    aciklama: "Allah'ın nurdan yarattığı, günah işlemeyen ve emirlerine tam itaat eden meleklere inanmaktır.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 285, kisaMetin: "Peygamber ve müminler; Allah'a, meleklerine, kitaplarına ve elçilerine iman etti." },
      { sureId: 4, sureAdi: "Nisâ",   ayetNo: 136, kisaMetin: "Allah'a, elçisine, meleklerine, kitaplarına ve elçilerine iman edin." },
    ] as AyetRef[],
  },
  {
    id: "kitap", ikon: "📖", baslik: "Kitaplara İman",
    aciklama: "Allah'ın peygamberlere gönderdiği ilahi kitaplara — Tevrat, Zebur, İncil ve Kur'an başta olmak üzere — inanmaktır.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara",      ayetNo: 285, kisaMetin: "Müminler Allah'ın kitaplarına iman etti." },
      { sureId: 3, sureAdi: "Âl-i İmrân", ayetNo: 3,   kisaMetin: "Allah sana Kitabı hak ile, öncekini doğrulayıcı olarak indirdi." },
    ] as AyetRef[],
  },
  {
    id: "peygamber", ikon: "🌿", baslik: "Peygamberlere İman",
    aciklama: "Âdem'den Hz. Muhammed'e kadar gönderilmiş tüm peygamberlere inanmaktır. Kur'an'da 25 peygamberin ismi geçmektedir.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 285, kisaMetin: "Müminler Allah'ın elçilerine iman etti; hiçbirini diğerinden ayırmayız." },
      { sureId: 6, sureAdi: "En'âm", ayetNo: 84,  kisaMetin: "İbrahim'e İshak ve Yakup'u verdik; hepsini doğruya ilettik." },
    ] as AyetRef[],
  },
  {
    id: "ahiret", ikon: "⚖️", baslik: "Ahiret Gününe İman",
    aciklama: "Ölümden sonra yeniden dirilişe, hesap gününe, cennet ve cehenneme inanmaktır. Dünya hayatını geçici, sorumluluk bilincini kalıcı kılar.",
    ayetler: [
      { sureId: 2,  sureAdi: "Bakara", ayetNo: 4,  kisaMetin: "Ahirete kesin olarak inananlar." },
      { sureId: 2,  sureAdi: "Bakara", ayetNo: 62, kisaMetin: "Allah'a ve ahiret gününe iman edip salih amel işleyenler için mükâfat vardır." },
      { sureId: 99, sureAdi: "Zilzâl", ayetNo: 6,  kisaMetin: "O gün insanlar amelleri gösterilsin diye ayrı ayrı çıkarlar." },
    ] as AyetRef[],
  },
  {
    id: "kader", ikon: "🌊", baslik: "Kader ve Kazaya İman",
    aciklama: "Her şeyin Allah'ın ilmi, iradesi ve takdiri dahilinde olduğuna inanmaktır. Bu inan tevekkül, şükür ve sabır erdemlerine zemin hazırlar.",
    ayetler: [
      { sureId: 54, sureAdi: "Kamer",  ayetNo: 49, kisaMetin: "Şüphesiz Biz her şeyi bir ölçüye göre yarattık." },
      { sureId: 25, sureAdi: "Furkân", ayetNo: 2,  kisaMetin: "Her şeyi yaratan, onu bir ölçüyle takdir edendir." },
      { sureId: 57, sureAdi: "Hadîd",  ayetNo: 22, kisaMetin: "Yeryüzünde ve başınıza gelen hiçbir musibet yoktur ki bir kitapta yazılmış olmasın." },
    ] as AyetRef[],
  },
];

// ── VERİ — İBADETLER SEKMESİ ─────────────────────────────────────────────────

const NAMAZ_VAKİTLERİ = [
  { vakit:"Sabah",  ikon:"🌅", ilkSunnet:2, farz:2, sonSunnet:0, vitir:0, toplam:4  },
  { vakit:"Öğle",   ikon:"☀️", ilkSunnet:4, farz:4, sonSunnet:2, vitir:0, toplam:12, not:"+2 nafile" },
  { vakit:"İkindi", ikon:"🌤️", ilkSunnet:4, farz:4, sonSunnet:0, vitir:0, toplam:8  },
  { vakit:"Akşam",  ikon:"🌇", ilkSunnet:0, farz:3, sonSunnet:2, vitir:0, toplam:7,  not:"+2 nafile" },
  { vakit:"Yatsı",  ikon:"🌙", ilkSunnet:4, farz:4, sonSunnet:2, vitir:3, toplam:13 },
];

const NAMAZ_MADDELER: Madde[] = [
  { tip:"farz",   metin:"Niyet",           detay:"Hangi namazı kıldığını kalp ile kastetmek." },
  { tip:"farz",   metin:"İftitah tekbiri", detay:"\"Allahu Ekber\" diyerek namaza başlamak." },
  { tip:"farz",   metin:"Kıyam",           detay:"Gücü yetene ayakta durmak." },
  { tip:"farz",   metin:"Kıraat",          detay:"Her rekatta en az 3 ayet veya bir uzun ayet okumak." },
  { tip:"farz",   metin:"Rükû",            detay:"Eller dizlere gelecek şekilde öne eğilmek." },
  { tip:"farz",   metin:"Secdeler",        detay:"Her rekatta iki secde; yedi uzvun yere değmesi." },
  { tip:"farz",   metin:"Ka'de-i Ahire",   detay:"Son rekatta teşehhüt miktarı oturmak." },
  { tip:"farz",   metin:"Selam",           detay:"\"Es-selamü aleyküm ve rahmetullah\" diyerek bitirmek." },
  { tip:"sunnet", metin:"Sübhaneke",       detay:"İlk rekatta kıraattan önce okunur." },
  { tip:"sunnet", metin:"Eûzü-Besmele",   detay:"Her rekatta kıraattan önce okunur." },
  { tip:"sunnet", metin:"Rükû tesbihleri", detay:"\"Sübhâne Rabbiye'l-azîm\" en az 3 kez." },
  { tip:"sunnet", metin:"Secde tesbihleri",detay:"\"Sübhâne Rabbiye'l-a'lâ\" en az 3 kez." },
  { tip:"sunnet", metin:"Ettehiyyatü",     detay:"Her oturuşta okunur." },
];

const NAMAZ_AYETLERİ: AyetRef[] = [
  { sureId: 2,  sureAdi: "Bakara",  ayetNo: 43,  kisaMetin: "Namazı kılın, zekâtı verin, rükû edenlerle birlikte rükû edin." },
  { sureId: 4,  sureAdi: "Nisâ",    ayetNo: 103, kisaMetin: "Namaz, müminlere belirlenmiş vakitlerde farz kılınmıştır." },
  { sureId: 20, sureAdi: "Tâhâ",   ayetNo: 14,  kisaMetin: "Beni anmak için namaz kıl." },
  { sureId: 29, sureAdi: "Ankebût", ayetNo: 45,  kisaMetin: "Namaz, hayâsızlıktan ve kötülükten alıkoyar." },
];

const ORUC_MADDELER: Madde[] = [
  { tip:"farz",   metin:"Niyet",              detay:"Her gün için ayrı niyet; en geç sabah namazının farzından önce." },
  { tip:"farz",   metin:"İmsak",              detay:"Sabah namazının ilk vaktinden itibaren yemek-içmek ve cinsî ilişkiden kaçınmak." },
  { tip:"sunnet", metin:"Sahur",              detay:"Tan yeri ağarmadan az önce yemek; bereketi büyüktür." },
  { tip:"sunnet", metin:"İftar Duası",        detay:"\"Allahümme leke sumtü\" ile başlamak ve tatlı bir şeyle açmak." },
  { tip:"sunnet", metin:"İftarda Acele",      detay:"Güneş batınca iftar ertelemeden açılır." },
  { tip:"sunnet", metin:"Kur'an Hatmi",       detay:"Ramazan'da Kur'an okunması ve hatim yapılması büyük sevaptır." },
  { tip:"sunnet", metin:"Teravih Namazı",     detay:"Yatsıdan sonra cemaatle 20 rekat kılınır." },
  { tip:"info",   metin:"Orucu Bozan",        detay:"Bilerek yemek-içmek; cinsel ilişki; kasıtlı kusma (dolup taşarsa)." },
  { tip:"info",   metin:"Kaza Gerektiren",    detay:"Unutarak yiyen kaza gerektirir; bilerek yiyen kaza + kefaret." },
  { tip:"info",   metin:"Kefaret",            detay:"Kasıtlı cinsel birleşmede: 60 gün peşpeşe oruç VEYA 60 fakiri doyurma." },
];

const ORUC_AYETLERİ: AyetRef[] = [
  { sureId: 2, sureAdi: "Bakara", ayetNo: 183, kisaMetin: "Ey iman edenler! Oruç sizden öncekilere farz kılındığı gibi size de farz kılındı." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 185, kisaMetin: "Ramazan ayı, insanlara yol gösterici olan Kur'an'ın indirildiği aydır." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 187, kisaMetin: "Oruç gecesi kadınlarınıza yaklaşmak helal kılındı." },
];

const ZEKAT_SINIFLAR = [
  { no:1, sinif:"Fakirler (Fukarâ)",         aciklama:"Nisabın altında mala sahip olan yoksullar." },
  { no:2, sinif:"Yoksullar (Mesâkîn)",        aciklama:"Hiç malı olmayan veya günlük geçimini zor sağlayanlar." },
  { no:3, sinif:"Zekât Görevlileri (Âmilîn)",aciklama:"Devlet adına zekât toplayan ve dağıtan kişiler." },
  { no:4, sinif:"Kalpleri Isındırılanlar",    aciklama:"İslam'a yeni girenler veya düşman saldırısından korunmak için." },
  { no:5, sinif:"Köleler (Rikâb)",            aciklama:"Kölelikten kurtulmak için para toplayan kişiler." },
  { no:6, sinif:"Borçlular (Gârimûn)",        aciklama:"Kendi ihtiyacı için borçlananlar, malları borcunu karşılamıyor." },
  { no:7, sinif:"Allah Yolunda (Fî Sebîlillah)",aciklama:"Din için çalışanlar, savaşanlar." },
  { no:8, sinif:"Yolda Kalanlar (İbnus-Sebîl)",aciklama:"Yolculuk sırasında harçlığı biten kişiler." },
];

const ZEKAT_AYETLERİ: AyetRef[] = [
  { sureId: 9, sureAdi: "Tevbe",  ayetNo: 60,  kisaMetin: "Sadakalar (zekât) 8 sınıf içindir — Allah'tan bir farz." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 43,  kisaMetin: "Namazı kılın ve zekâtı verin." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 277, kisaMetin: "İman edip zekâtı verenler için mükâfat vardır." },
];

const HAC_ADIMLARI = [
  { no:1,  tip:"farz",   baslik:"İhrama Girmek",         aciklama:"Mikat sınırlarından ihrama girilir; özel elbise giyilir, niyet edilir ve Lebbeyk söylenir." },
  { no:2,  tip:"farz",   baslik:"Arafat Vakfesi",         aciklama:"Zilhicce'nin 9. günü öğleden gün batımına kadar Arafat'ta beklemek. Haccın farzının farzıdır." },
  { no:3,  tip:"farz",   baslik:"Ziyaret Tavafı (İfâda)", aciklama:"10-12 Zilhicce içinde Kâbe'yi 7 kez tavaf etmek." },
  { no:4,  tip:"vacip",  baslik:"Müzdelife'de Geceleme",  aciklama:"9. günü gün batımından sabaha kadar Müzdelife'de kalmak." },
  { no:5,  tip:"vacip",  baslik:"Sa'y",                   aciklama:"Safa ile Merve arasında 7 kez yürümek (gidip gelmek)." },
  { no:6,  tip:"vacip",  baslik:"Şeytan Taşlamak",        aciklama:"Mina'da cemrelere taş atmak: 10. gün Akabe cemresine 7 taş, sonraki günlerde 3 cemreye 21'er taş." },
  { no:7,  tip:"vacip",  baslik:"Tıraş / Saçı Kısaltmak", aciklama:"Erkekler başını tamamen tıraş eder; kadınlar parmak boğumu kadar keser." },
  { no:8,  tip:"vacip",  baslik:"Kurban Kesmek",          aciklama:"Temettü ve kıran haccında kurban kesmek vaciptir." },
  { no:9,  tip:"vacip",  baslik:"Veda Tavafı",             aciklama:"Mekke'den ayrılmadan önce Kâbe'yi 7 kez tavaf etmek." },
  { no:10, tip:"sunnet", baslik:"Kudüm Tavafı",            aciklama:"Mekke'ye ilk varışta yapılan karşılama tavafı." },
];

const HAC_AYETLERİ: AyetRef[] = [
  { sureId: 3,  sureAdi: "Âl-i İmrân", ayetNo: 97,  kisaMetin: "Yoluna gücü yeten kimseye Allah için Kâbe'yi haccetmek farzdır." },
  { sureId: 2,  sureAdi: "Bakara",      ayetNo: 196, kisaMetin: "Haccı ve umreyi Allah için tamamlayın." },
  { sureId: 22, sureAdi: "Hac",         ayetNo: 27,  kisaMetin: "İnsanlar arasında haccı ilan et; uzak yollardan her yolcu gelsin." },
  { sureId: 22, sureAdi: "Hac",         ayetNo: 29,  kisaMetin: "Kirlerini gidersinler, adaklarını yerine getirsinler, tavaf etsinler." },
];

const KURBAN_MADDELER: Madde[] = [
  { tip:"vacip", metin:"Hükmü",            detay:"Hanefi'de vacip; diğer mezheplerde sünnet-i müekkede." },
  { tip:"info",  metin:"Kimlere Vacip?",   detay:"Mukim, akıllı, baliğ, nisap miktarı mala sahip Müslümanlara." },
  { tip:"info",  metin:"Koyun / Keçi",    detay:"En az 1 yaşında; 1 kişi adına kesilir." },
  { tip:"info",  metin:"Sığır / Manda",   detay:"En az 2 yaşında; en fazla 7 kişi ortaklığıyla kesilir." },
  { tip:"info",  metin:"Deve",             detay:"En az 5 yaşında; en fazla 7 kişi ortaklığıyla kesilir." },
  { tip:"farz",  metin:"Kesim Vakti",      detay:"Kurban Bayramı 1. günü sabah namazından 3. gün güneş batımına kadar." },
  { tip:"sunnet",metin:"Niyet ve Besmele", detay:"\"Bismillah, Allahu Ekber\" denerek kesilir; niyet edilir." },
  { tip:"sunnet",metin:"Et Taksimi",       detay:"1/3 aile, 1/3 komşu/arkadaş, 1/3 fakirler (tavsiye edilen)." },
];

const KURBAN_AYETLERİ: AyetRef[] = [
  { sureId: 22,  sureAdi: "Hac",    ayetNo: 34, kisaMetin: "Her ümmet için O'nun adını ansınlar diye kurban ibadeti koyduk." },
  { sureId: 22,  sureAdi: "Hac",    ayetNo: 37, kisaMetin: "Allah'a etleri ve kanları değil, takvânız ulaşır." },
  { sureId: 108, sureAdi: "Kevser", ayetNo: 2,  kisaMetin: "Rabbin için namaz kıl ve kurban kes." },
];

// ── VERİ — ABDEST SEKMESİ ─────────────────────────────────────────────────────

const ABDEST_BOLUMLER = [
  {
    id:"abdest", ikon:"💧", baslik:"Namaz Abdesti (Vudu)", altBaslik:"5 farz · 13 sünnet",
    aciklama:"Namaz kılmak, Kur'an'a el sürmek ve Kâbe'yi tavaf etmek için gerekli olan temizliktir.",
    farzlar: [
      { organ:"Niyet",   miktar:"—" as const, aciklama:"Abdest almaya niyet etmek." },
      { organ:"Yüz",     miktar:1,            aciklama:"Alın saç diplerinden çene altına, kulak memelerinden tüm yüzü yıkamak." },
      { organ:"Kollar",  miktar:1,            aciklama:"Sağdan başlayarak her iki kolu dirsekler dahil yıkamak." },
      { organ:"Baş",     miktar:1,            aciklama:"Başın en az dörtte birini ıslak elle meshetmek (Hanefi)." },
      { organ:"Ayaklar", miktar:1,            aciklama:"Sağdan başlayarak her iki ayağı topuklar dahil yıkamak." },
    ] as AbdestSatiri[],
    sunnetler: [
      { organ:"Besmele",          miktar:"—" as const, aciklama:"Bismillah demek." },
      { organ:"Eller",            miktar:3,            aciklama:"Abdeste başlarken her iki eli bilekle yıkamak." },
      { organ:"Ağız (Mazmaza)",   miktar:3,            aciklama:"Ağzı su alıp çalkalamak." },
      { organ:"Burun (İstinşak)", miktar:3,            aciklama:"Buruna su çekip temizlemek." },
      { organ:"Yüz",              miktar:3,            aciklama:"Sünnet olarak 3 kez yıkamak." },
      { organ:"Kollar",           miktar:3,            aciklama:"Sünnet olarak 3 kez yıkamak." },
      { organ:"Tüm Baş",          miktar:1,            aciklama:"Tüm başı meshetmek." },
      { organ:"Kulaklar",         miktar:1,            aciklama:"İçini ve arkasını meshetmek." },
      { organ:"Boyun (Ense)",     miktar:1,            aciklama:"Ellerin arkasıyla enseni meshetmek." },
      { organ:"Ayaklar",          miktar:3,            aciklama:"Sünnet olarak 3 kez yıkamak." },
      { organ:"Parmak Araları",   miktar:1,            aciklama:"El ve ayak parmaklarını hilallemek." },
      { organ:"Tertip",           miktar:"—" as const, aciklama:"Organları sırayla yıkamak." },
      { organ:"Süreklilik",       miktar:"—" as const, aciklama:"Organları ara vermeksizin yıkamak." },
    ] as AbdestSatiri[],
    ayetler: [
      { sureId:5, sureAdi:"Mâide", ayetNo:6,  kisaMetin:"Ey iman edenler! Namaza kalktığınızda yüzlerinizi ve dirseklere kadar ellerinizi yıkayın; başlarınızı meshedin ve topuklara kadar ayaklarınızı yıkayın." },
      { sureId:4, sureAdi:"Nisâ",  ayetNo:43, kisaMetin:"Cünüp iken yıkanmadan namaz kılmayın. Su bulamazsanız temiz bir toprakla teyemmüm edin." },
    ] as AyetRef[],
    bozanlar: ["Küçük/büyük abdest · Yel çıkması", "Derin uyku · Bayılma", "Kan veya irin akması (Hanefi)"],
  },
  {
    id:"gusul", ikon:"🚿", baslik:"Gusül (Boy Abdesti)", altBaslik:"4 farz · 7 sünnet",
    aciklama:"Cünüplük, hayız ve nifas gibi haller sonrasında tüm vücudun yıkanmasını gerektiren tam temizliktir.",
    farzlar: [
      { organ:"Niyet",     miktar:"—" as const, aciklama:"Boy abdesti almaya niyet etmek." },
      { organ:"Ağız",      miktar:1,            aciklama:"Mazmaza: ağzın içini iyice çalkalamak." },
      { organ:"Burun",     miktar:1,            aciklama:"İstinşak: buruna su çekip temizlemek." },
      { organ:"Tüm Vücut", miktar:1,            aciklama:"Saç dibi dahil tüm vücudu, tek bir kılı bile kuru bırakmamak üzere yıkamak." },
    ] as AbdestSatiri[],
    sunnetler: [
      { organ:"Eller",             miktar:3,            aciklama:"Gusle başlarken elleri 3 kez yıkamak." },
      { organ:"Necaset Temizliği", miktar:"—" as const, aciklama:"Varsa bedendeki necaseti önce gidermek." },
      { organ:"Namaz Abdesti",     miktar:1,            aciklama:"Gusle başlamadan önce tam namaz abdesti almak." },
      { organ:"Baş",               miktar:3,            aciklama:"Başı 3 kez su dökerek yıkamak." },
      { organ:"Sağ Taraf",         miktar:"—" as const, aciklama:"Sağ omuzdan başlayarak, ardından sol tarafı yıkamak." },
      { organ:"Ovalama",           miktar:"—" as const, aciklama:"Elleri vücuda sürerek her yeri iyice yıkamak." },
      { organ:"Süreklilik",        miktar:"—" as const, aciklama:"Guslü ara vermeksizin tamamlamak." },
    ] as AbdestSatiri[],
    ayetler: [
      { sureId:5, sureAdi:"Mâide",  ayetNo:6,   kisaMetin:"Cünüp iseniz iyice yıkanın." },
      { sureId:4, sureAdi:"Nisâ",   ayetNo:43,  kisaMetin:"Cünüp iken yıkanmadan namaz kılmayın." },
      { sureId:2, sureAdi:"Bakara", ayetNo:222, kisaMetin:"Hayız bitince temizlendiklerinde onlara yaklaşın." },
    ] as AyetRef[],
    bozanlar: ["Cünüplük · Hayız · Nifas", "İslam'a giriş (mühtedi için)"],
  },
  {
    id:"teyemmum", ikon:"🌿", baslik:"Teyemmüm (Toprak Abdesti)", altBaslik:"4 farz · 5 sünnet",
    aciklama:"Su bulunamaması veya kullanılamaması durumunda abdest ve guslün yerine geçen temizlik yöntemidir. Temiz toprak, kum veya taşla yapılır.",
    farzlar: [
      { organ:"Niyet",   miktar:"—" as const, aciklama:"Teyemmüm almaya niyet etmek." },
      { organ:"Besmele", miktar:"—" as const, aciklama:"Bismillah demek (Hanbelilerde farz)." },
      { organ:"Yüz",     miktar:1,            aciklama:"Temiz yere iki eli vurup silkelendirdikten sonra tüm yüzü meshetmek." },
      { organ:"Kollar",  miktar:1,            aciklama:"İkinci kez toprağa vurup her iki kolu dirsekler dahil meshetmek (Hanefi)." },
    ] as AbdestSatiri[],
    sunnetler: [
      { organ:"Tertip",           miktar:"—" as const, aciklama:"Önce yüz, sonra kollar sırasına uymak." },
      { organ:"Parmakları Açmak", miktar:"—" as const, aciklama:"Toprağa vurmadan önce parmakları açık tutmak." },
      { organ:"Silkeleme",        miktar:"—" as const, aciklama:"Toprağa vurulan elleri hafifçe silkelemek." },
      { organ:"Parmak Araları",   miktar:1,            aciklama:"El parmaklarını hilallemek." },
      { organ:"Sağdan Başlamak",  miktar:"—" as const, aciklama:"Sağ yüzden ve sağ koldan başlamak." },
    ] as AbdestSatiri[],
    ayetler: [
      { sureId:5, sureAdi:"Mâide", ayetNo:6,  kisaMetin:"Su bulamazsanız temiz bir toprağa yönelin; yüzlerinizi ve ellerinizi onunla meshedin." },
      { sureId:4, sureAdi:"Nisâ",  ayetNo:43, kisaMetin:"Hasta olur veya yolculukta su bulamazsanız temiz bir toprağa vurup yüzünüzü ve ellerinizi meshedin." },
    ] as AyetRef[],
    bozanlar: ["Su bulunması", "Abdesti bozan tüm haller"],
  },
];

// ── YARDIMCI BİLEŞENLER ───────────────────────────────────────────────────────

const TIP_RENK: Record<MaddeTip, { bg: string; text: string; label: string }> = {
  farz:   { bg:"#fee2e2", text:"#991b1b", label:"Farz"   },
  sunnet: { bg:"#d1fae5", text:"#065f46", label:"Sünnet" },
  vacip:  { bg:"#fef3c7", text:"#92400e", label:"Vacip"  },
  info:   { bg:"#dbeafe", text:"#1e40af", label:"Bilgi"  },
};

function AyetListesi({ ayetler }: { ayetler: AyetRef[] }) {
  if (!ayetler.length) return null;
  return (
    <View style={s.ayetBox}>
      <Text style={s.ayetBoxTitle}>📖 İlgili Ayetler</Text>
      {ayetler.map((a, i) => (
        <TouchableOpacity key={i} style={s.ayetRow}
          onPress={() => router.push(`/ayah/${a.sureId}/${a.ayetNo}` as any)} activeOpacity={0.75}>
          <View style={s.keyBadge}><Text style={s.keyText}>{a.sureId}:{a.ayetNo}</Text></View>
          <View style={{ flex:1 }}>
            <Text style={s.ayetSure}>{a.sureAdi} · {a.ayetNo}. ayet</Text>
            <Text style={s.ayetMetin} numberOfLines={2}>{a.kisaMetin}</Text>
          </View>
          <Text style={s.chevronSm}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MaddeListe({ maddeler }: { maddeler: Madde[] }) {
  return (
    <View style={s.maddeBox}>
      {maddeler.map((m, i) => {
        const r = TIP_RENK[m.tip];
        return (
          <View key={i} style={s.maddeRow}>
            <View style={[s.maddeBadge, { backgroundColor: r.bg }]}>
              <Text style={[s.maddeBadgeText, { color: r.text }]}>{r.label}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={s.maddeBaslik}>{m.metin}</Text>
              {m.detay ? <Text style={s.maddeDetay}>{m.detay}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AbdestTablo({ satirlar, baslik }: { satirlar: AbdestSatiri[]; baslik: string }) {
  return (
    <View style={s.tablo}>
      <Text style={s.tabloBaslik}>{baslik}</Text>
      {satirlar.map((r, i) => (
        <View key={i} style={[s.tabloRow, i % 2 === 0 && s.tabloRowAlt]}>
          <Text style={s.tabloOrgan}>{r.organ}</Text>
          <Text style={s.tabloMiktar}>{r.miktar === "—" ? "—" : `${r.miktar}×`}</Text>
          <Text style={s.tabloAciklama} numberOfLines={2}>{r.aciklama}</Text>
        </View>
      ))}
    </View>
  );
}

// ── ANA KARTI ─────────────────────────────────────────────────────────────────

function BolumCard({ ikon, baslik, children }: { ikon: string; baslik: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={s.card}>
      <Pressable style={s.cardHeader} onPress={() => setOpen(p => !p)}>
        <Text style={s.cardIkon}>{ikon}</Text>
        <Text style={s.cardBaslik}>{baslik}</Text>
        <Text style={s.chevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && <View style={s.cardBody}>{children}</View>}
    </View>
  );
}

// ── SEKME BİLEŞENLERİ ─────────────────────────────────────────────────────────

function InancSekme() {
  return (
    <>
      <View style={s.dividerLabel}><Text style={s.dividerText}>İSLAM'IN 5 ŞARTI</Text></View>
      {ISLAM_SARTLARI.map(b => (
        <BolumCard key={b.id} ikon={b.ikon} baslik={b.baslik}>
          <Text style={s.aciklama}>{b.aciklama}</Text>
          <AyetListesi ayetler={b.ayetler} />
        </BolumCard>
      ))}
      <View style={s.dividerLabel}><Text style={s.dividerText}>İMAN'IN 6 ŞARTI</Text></View>
      {IMAN_SARTLARI.map(b => (
        <BolumCard key={b.id} ikon={b.ikon} baslik={b.baslik}>
          <Text style={s.aciklama}>{b.aciklama}</Text>
          <AyetListesi ayetler={b.ayetler} />
        </BolumCard>
      ))}
    </>
  );
}

function IbadetlerSekme() {
  return (
    <>
      {/* NAMAZ */}
      <BolumCard ikon="🕌" baslik="Namaz (Salât)">
        <Text style={s.aciklama}>Günde beş vakit kılınan namaz, Müslümanın Allah ile doğrudan bağını simgeler. Kur'an'da en çok emredilen ibadettir.</Text>
        <Text style={s.altBaslik}>Rekat Sayıları</Text>
        <View style={s.rekatTablo}>
          <View style={s.rekatHeader}>
            {["Vakit","İlk S.","Farz","Son S.","Vitir","Toplam"].map(h => (
              <Text key={h} style={s.rekatHeaderCell}>{h}</Text>
            ))}
          </View>
          {NAMAZ_VAKİTLERİ.map((v, i) => (
            <View key={i} style={[s.rekatRow, i % 2 === 0 && s.rekatRowAlt]}>
              <Text style={s.rekatCell}>{v.ikon}{v.vakit}</Text>
              <Text style={s.rekatCell}>{v.ilkSunnet || "—"}</Text>
              <Text style={[s.rekatCell, s.rekatFarz]}>{v.farz}</Text>
              <Text style={s.rekatCell}>{v.sonSunnet || "—"}</Text>
              <Text style={s.rekatCell}>{v.vitir || "—"}</Text>
              <Text style={[s.rekatCell, s.rekatToplam]}>{v.toplam}{v.not ? `*` : ""}</Text>
            </View>
          ))}
          <Text style={s.rekatNot}>* Öğle ve Akşam'da 2'şer rekat nafile eklenebilir</Text>
        </View>
        <Text style={s.altBaslik}>Farz ve Sünnetler</Text>
        <MaddeListe maddeler={NAMAZ_MADDELER} />
        <AyetListesi ayetler={NAMAZ_AYETLERİ} />
      </BolumCard>

      {/* ORUÇ */}
      <BolumCard ikon="🌙" baslik="Oruç (Savm)">
        <Text style={s.aciklama}>Ramazan ayında şafaktan güneş batımına kadar yiyecek, içecek ve kötü davranışlardan kaçınmaktır. Takvayı pekiştiren bir ibadettir.</Text>
        <MaddeListe maddeler={ORUC_MADDELER} />
        <AyetListesi ayetler={ORUC_AYETLERİ} />
      </BolumCard>

      {/* ZEKÂT */}
      <BolumCard ikon="💛" baslik="Zekât">
        <Text style={s.aciklama}>Nisap miktarına ulaşan malın belli oranını muhtaçlara vermektir. Kur'an'da namazla birlikte defalarca zikredilir.</Text>
        <View style={s.nisapBox}>
          <Text style={s.nisapTitle}>Nisap Miktarı</Text>
          <Text style={s.nisapRow}>🥇 Altın: <Text style={s.nisapDeger}>85 gram</Text> veya değeri kadar para/mal</Text>
          <Text style={s.nisapRow}>🥈 Gümüş: <Text style={s.nisapDeger}>595 gram</Text> (daha ihtiyatlı ölçü)</Text>
          <Text style={s.nisapRow}>📊 Oran: <Text style={s.nisapDeger}>%2,5</Text> (yılda bir kez, kırkta bir)</Text>
        </View>
        <Text style={s.altBaslik}>Zekâtın Verileceği 8 Sınıf</Text>
        {ZEKAT_SINIFLAR.map(z => (
          <View key={z.no} style={s.zekatRow}>
            <View style={s.zekatNo}><Text style={s.zekatNoText}>{z.no}</Text></View>
            <View style={{ flex:1 }}>
              <Text style={s.zekatSinif}>{z.sinif}</Text>
              <Text style={s.zekatAciklama}>{z.aciklama}</Text>
            </View>
          </View>
        ))}
        <AyetListesi ayetler={ZEKAT_AYETLERİ} />
      </BolumCard>

      {/* HAC */}
      <BolumCard ikon="🕋" baslik="Hac">
        <Text style={s.aciklama}>Gücü yeten her Müslümanın ömründe en az bir kez Mekke'ye gidip belirli ibadetleri yerine getirmesidir.</Text>
        <Text style={s.altBaslik}>Hac'ın Adımları (Farz · Vacip · Sünnet)</Text>
        {HAC_ADIMLARI.map(h => {
          const r = h.tip === "farz" ? TIP_RENK.farz : h.tip === "vacip" ? TIP_RENK.vacip : TIP_RENK.sunnet;
          return (
            <View key={h.no} style={s.hacRow}>
              <View style={[s.maddeBadge, { backgroundColor: r.bg, minWidth: 50 }]}>
                <Text style={[s.maddeBadgeText, { color: r.text }]}>{h.no}. {r.label}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.maddeBaslik}>{h.baslik}</Text>
                <Text style={s.maddeDetay}>{h.aciklama}</Text>
              </View>
            </View>
          );
        })}
        <AyetListesi ayetler={HAC_AYETLERİ} />
      </BolumCard>

      {/* KURBAN */}
      <BolumCard ikon="🐑" baslik="Kurban">
        <Text style={s.aciklama}>Hanefi mezhebinde vacip; diğer mezheplerde sünnet-i müekkede. Kurban Bayramı'nda Allah rızası için hayvan kesmektir.</Text>
        <MaddeListe maddeler={KURBAN_MADDELER} />
        <AyetListesi ayetler={KURBAN_AYETLERİ} />
      </BolumCard>
    </>
  );
}

function AbdestSekme() {
  return (
    <>
      {ABDEST_BOLUMLER.map(b => (
        <BolumCard key={b.id} ikon={b.ikon} baslik={`${b.baslik} (${b.altBaslik})`}>
          <Text style={s.aciklama}>{b.aciklama}</Text>
          <AbdestTablo satirlar={b.farzlar} baslik="Farzlar" />
          <AbdestTablo satirlar={b.sunnetler} baslik="Sünnetler" />
          {b.bozanlar && b.bozanlar.length > 0 && (
            <View style={s.bozanBox}>
              <Text style={s.bozanTitle}>⚡ {b.id === "abdest" ? "Abdesti Bozan" : b.id === "gusul" ? "Guslü Gerektiren" : "Teyemmümü Bozan"}</Text>
              {b.bozanlar.map((bz, i) => <Text key={i} style={s.bozanText}>• {bz}</Text>)}
            </View>
          )}
          <AyetListesi ayetler={b.ayetler} />
        </BolumCard>
      ))}
    </>
  );
}

// ── ANA EKRAN ─────────────────────────────────────────────────────────────────

type Tab = "inanc" | "ibadetler" | "abdest";
const TABS: { id: Tab; label: string; ikon: string }[] = [
  { id:"inanc",     label:"İnanç",     ikon:"✨" },
  { id:"ibadetler", label:"İbadetler", ikon:"🕌" },
  { id:"abdest",    label:"Abdest",    ikon:"💧" },
];

export default function IbadetRehberiScreen() {
  const [tab, setTab] = React.useState<Tab>("inanc");
  return (
    <>
      <Stack.Screen options={{ title:"İbadet Rehberi" }} />
      <View style={s.container}>
        <View style={s.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} style={[s.tab, tab === t.id && s.tabActive]}
              onPress={() => setTab(t.id)} activeOpacity={0.75}>
              <Text style={s.tabIkon}>{t.ikon}</Text>
              <Text style={[s.tabLabel, tab === t.id && s.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:10, paddingBottom:40, gap:8 }}
          showsVerticalScrollIndicator={false}>
          {tab === "inanc"     && <InancSekme />}
          {tab === "ibadetler" && <IbadetlerSekme />}
          {tab === "abdest"    && <AbdestSekme />}
        </ScrollView>
      </View>
    </>
  );
}

// ── STİLLER ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f7f1e4" },
  tabBar:    { flexDirection:"row", backgroundColor:"#fff", borderBottomWidth:1, borderBottomColor:"#e7e5e4" },
  tab:       { flex:1, alignItems:"center", paddingVertical:10, gap:2 },
  tabActive: { borderBottomWidth:2, borderBottomColor:"#059669" },
  tabIkon:   { fontSize:18 },
  tabLabel:  { fontSize:11, color:"#78716c", fontWeight:"600" },
  tabLabelActive: { color:"#059669" },

  dividerLabel: { alignItems:"center", marginVertical:8 },
  dividerText:  { fontSize:11, fontWeight:"700", color:"#78716c", letterSpacing:1 },

  card:       { backgroundColor:"#fff", borderRadius:14, borderWidth:1, borderColor:"#e7e5e4", overflow:"hidden" },
  cardHeader: { flexDirection:"row", alignItems:"center", padding:14, gap:10 },
  cardIkon:   { fontSize:22 },
  cardBaslik: { flex:1, fontSize:14, fontWeight:"700", color:"#1c1917" },
  chevron:    { fontSize:14, color:"#059669" },
  cardBody:   { borderTopWidth:1, borderTopColor:"#f5f5f4", padding:14, gap:10 },

  aciklama:  { fontSize:13, color:"#44403c", lineHeight:20 },
  altBaslik: { fontSize:12, fontWeight:"700", color:"#1c1917", marginTop:4 },

  ayetBox:      { backgroundColor:"#f0fdf4", borderRadius:10, padding:10, gap:6 },
  ayetBoxTitle: { fontSize:12, fontWeight:"700", color:"#059669", marginBottom:2 },
  ayetRow:      { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:4 },
  keyBadge:     { backgroundColor:"#d1fae5", borderRadius:6, paddingHorizontal:6, paddingVertical:2, marginTop:1 },
  keyText:      { fontSize:10, fontWeight:"700", color:"#065f46" },
  ayetSure:     { fontSize:10, color:"#78716c" },
  ayetMetin:    { fontSize:12, color:"#1c1917", lineHeight:17 },
  chevronSm:    { fontSize:16, color:"#86efac", marginTop:2 },

  maddeBox:       { gap:6 },
  maddeRow:       { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:4, borderBottomWidth:1, borderBottomColor:"#f5f5f4" },
  maddeBadge:     { borderRadius:6, paddingHorizontal:6, paddingVertical:2, marginTop:1 },
  maddeBadgeText: { fontSize:10, fontWeight:"700" },
  maddeBaslik:    { fontSize:12, fontWeight:"600", color:"#1c1917" },
  maddeDetay:     { fontSize:11, color:"#78716c", lineHeight:16, marginTop:1 },

  rekatTablo:    { borderRadius:8, overflow:"hidden", borderWidth:1, borderColor:"#e7e5e4" },
  rekatHeader:   { flexDirection:"row", backgroundColor:"#059669", padding:6 },
  rekatHeaderCell:{ flex:1, fontSize:9, fontWeight:"700", color:"#fff", textAlign:"center" },
  rekatRow:      { flexDirection:"row", padding:6 },
  rekatRowAlt:   { backgroundColor:"#f9fafb" },
  rekatCell:     { flex:1, fontSize:11, color:"#1c1917", textAlign:"center" },
  rekatFarz:     { fontWeight:"700", color:"#059669" },
  rekatToplam:   { fontWeight:"700", color:"#1c1917" },
  rekatNot:      { fontSize:10, color:"#78716c", padding:6, fontStyle:"italic" },

  nisapBox:   { backgroundColor:"#fef9c3", borderRadius:8, padding:10, gap:4 },
  nisapTitle: { fontSize:12, fontWeight:"700", color:"#92400e", marginBottom:2 },
  nisapRow:   { fontSize:12, color:"#44403c", lineHeight:18 },
  nisapDeger: { fontWeight:"700", color:"#92400e" },

  zekatRow:      { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:4, borderBottomWidth:1, borderBottomColor:"#f5f5f4" },
  zekatNo:       { width:22, height:22, borderRadius:11, backgroundColor:"#059669", alignItems:"center", justifyContent:"center", marginTop:1 },
  zekatNoText:   { fontSize:10, fontWeight:"700", color:"#fff" },
  zekatSinif:    { fontSize:12, fontWeight:"600", color:"#1c1917" },
  zekatAciklama: { fontSize:11, color:"#78716c", lineHeight:16 },

  hacRow: { flexDirection:"row", alignItems:"flex-start", gap:8, paddingVertical:5, borderBottomWidth:1, borderBottomColor:"#f5f5f4" },

  tablo:        { borderRadius:8, overflow:"hidden", borderWidth:1, borderColor:"#e7e5e4", marginVertical:4 },
  tabloBaslik:  { fontSize:12, fontWeight:"700", color:"#1c1917", backgroundColor:"#f0fdf4", padding:8 },
  tabloRow:     { flexDirection:"row", paddingHorizontal:8, paddingVertical:5 },
  tabloRowAlt:  { backgroundColor:"#f9fafb" },
  tabloOrgan:   { width:110, fontSize:11, fontWeight:"600", color:"#1c1917" },
  tabloMiktar:  { width:28, fontSize:11, color:"#059669", fontWeight:"700", textAlign:"center" },
  tabloAciklama:{ flex:1, fontSize:11, color:"#44403c", lineHeight:16 },

  bozanBox:   { backgroundColor:"#fee2e2", borderRadius:8, padding:10, gap:3 },
  bozanTitle: { fontSize:12, fontWeight:"700", color:"#991b1b", marginBottom:2 },
  bozanText:  { fontSize:12, color:"#7f1d1d", lineHeight:18 },
});
