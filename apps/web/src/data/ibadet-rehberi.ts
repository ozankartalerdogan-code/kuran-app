// ── Ortak tipler ──────────────────────────────────────────────────────────────

export interface AyetRef {
  sureId:    number;
  sureAdi:   string;
  ayetNo:    number;
  kisaMetin: string;
}

export type MaddeTip = "farz" | "sunnet" | "vacip" | "mustahap" | "info";

export interface Madde {
  tip:    MaddeTip;
  metin:  string;
  detay?: string;
}

// ── BÖLÜM 1 & 2 — İnanç Esasları ─────────────────────────────────────────────

export interface InancSarti {
  id:        string;
  ikon:      string;
  baslik:    string;
  aciklama:  string;
  ayetler:   AyetRef[];
}

export const ISLAM_SARTLARI: InancSarti[] = [
  {
    id: "sehadet", ikon: "🌙", baslik: "Kelime-i Şehadet",
    aciklama: "Allah'tan başka ilah olmadığına ve Hz. Muhammed'in O'nun kulu ve elçisi olduğuna şahitlik etmektir. İslam'a girişin kapısıdır.",
    ayetler: [
      { sureId: 3,  sureAdi: "Âl-i İmrân", ayetNo: 18,  kisaMetin: "Allah, melekler ve ilim sahipleri tek ilah olduğuna şahitlik etti." },
      { sureId: 47, sureAdi: "Muhammed",    ayetNo: 19,  kisaMetin: "Allah'tan başka ilah olmadığını bil." },
      { sureId: 2,  sureAdi: "Bakara",      ayetNo: 255, kisaMetin: "Âyetü'l-Kürsî: Allah, O'ndan başka ilah yoktur." },
    ],
  },
  {
    id: "namaz", ikon: "🕌", baslik: "Namaz (Salât)",
    aciklama: "Günde beş vakit kılınan namaz, Müslümanın Allah ile doğrudan bağını simgeler. Kur'an'da en çok emredilen ibadettir.",
    ayetler: [
      { sureId: 2,  sureAdi: "Bakara",  ayetNo: 43,  kisaMetin: "Namazı kılın, zekâtı verin, rükû edenlerle birlikte rükû edin." },
      { sureId: 4,  sureAdi: "Nisâ",    ayetNo: 103, kisaMetin: "Namaz, müminlere belirlenmiş vakitlerde farz kılınmıştır." },
      { sureId: 20, sureAdi: "Tâhâ",    ayetNo: 14,  kisaMetin: "Beni anmak için namaz kıl." },
      { sureId: 29, sureAdi: "Ankebût", ayetNo: 45,  kisaMetin: "Namaz, hayâsızlıktan ve kötülükten alıkoyar." },
    ],
  },
  {
    id: "oruc", ikon: "🌙", baslik: "Oruç (Savm)",
    aciklama: "Ramazan ayında şafaktan güneş batımına kadar yiyecek, içecek ve kötü davranışlardan kaçınmaktır. Takvayı pekiştiren ve nefsi terbiye eden bir ibadettir.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 183, kisaMetin: "Oruç, sizden öncekilere farz kılındığı gibi size de farz kılındı; umulur ki korunursunuz." },
      { sureId: 2, sureAdi: "Bakara", ayetNo: 185, kisaMetin: "Ramazan ayı, Kur'an'ın indirildiği, hidayet ve furkan olan aydır." },
    ],
  },
  {
    id: "zekat", ikon: "💛", baslik: "Zekât",
    aciklama: "Nisap miktarına ulaşan malın belli oranını muhtaçlara vermektir. Kur'an'da namazla birlikte defalarca zikredilir.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 43,  kisaMetin: "Namazı kılın ve zekâtı verin." },
      { sureId: 9, sureAdi: "Tevbe",  ayetNo: 60,  kisaMetin: "Sadakalar; fakirler, yoksullar, zekât görevlileri, kalpleri ısındırılacaklar, köleler, borçlular, Allah yolunda çalışanlar ve yolcular içindir." },
    ],
  },
  {
    id: "hac", ikon: "🕋", baslik: "Hac",
    aciklama: "Gücü yeten her Müslümanın ömründe en az bir kez Mekke'ye gidip belirli ibadetleri yerine getirmesidir. Tüm Müslümanların ırk ve sınıf farkı gözetmeksizin bir araya geldiği kardeşlik törevidir.",
    ayetler: [
      { sureId: 3,  sureAdi: "Âl-i İmrân", ayetNo: 97,  kisaMetin: "Yoluna gücü yeten kimseye Allah için Kâbe'yi haccetmek farzdır." },
      { sureId: 2,  sureAdi: "Bakara",      ayetNo: 196, kisaMetin: "Haccı ve umreyi Allah için tamamlayın." },
      { sureId: 22, sureAdi: "Hac",         ayetNo: 27,  kisaMetin: "İnsanlar arasında haccı ilan et; uzak yollardan her yolcu gelsin." },
    ],
  },
];

export const IMAN_SARTLARI: InancSarti[] = [
  {
    id: "allah", ikon: "✨", baslik: "Allah'a İman",
    aciklama: "Allah'ın varlığına, birliğine (tevhid) ve Kur'an'da bildirilen isim ve sıfatlarına kalp ile inanmaktır. Tüm imanın temelidir.",
    ayetler: [
      { sureId: 112, sureAdi: "İhlâs",  ayetNo: 1,   kisaMetin: "De ki: O Allah birdir." },
      { sureId: 112, sureAdi: "İhlâs",  ayetNo: 2,   kisaMetin: "Allah Samed'dir; her şey O'na muhtaç, O hiçbir şeye muhtaç değil." },
      { sureId: 2,   sureAdi: "Bakara", ayetNo: 255, kisaMetin: "Âyetü'l-Kürsî: Allah, diri ve her şeyi tutandır." },
    ],
  },
  {
    id: "melek", ikon: "🪽", baslik: "Meleklere İman",
    aciklama: "Allah'ın nurdan yarattığı, günah işlemeyen ve emirlerine tam itaat eden meleklere inanmaktır.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 285, kisaMetin: "Peygamber ve müminler; Allah'a, meleklerine, kitaplarına ve elçilerine iman etti." },
      { sureId: 4, sureAdi: "Nisâ",   ayetNo: 136, kisaMetin: "Allah'a, elçisine, meleklerine, kitaplarına ve elçilerine iman edin." },
    ],
  },
  {
    id: "kitap", ikon: "📖", baslik: "Kitaplara İman",
    aciklama: "Allah'ın peygamberlere gönderdiği ilahi kitaplara — Tevrat, Zebur, İncil ve Kur'an başta olmak üzere — inanmaktır.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara",      ayetNo: 285, kisaMetin: "Müminler Allah'ın kitaplarına iman etti." },
      { sureId: 3, sureAdi: "Âl-i İmrân", ayetNo: 3,   kisaMetin: "Allah sana Kitabı hak ile, öncekini doğrulayıcı olarak indirdi." },
    ],
  },
  {
    id: "peygamber", ikon: "🌿", baslik: "Peygamberlere İman",
    aciklama: "Âdem'den Hz. Muhammed'e kadar gönderilmiş tüm peygamberlere inanmaktır. Kur'an'da 25 peygamberin ismi geçmektedir.",
    ayetler: [
      { sureId: 2, sureAdi: "Bakara", ayetNo: 285, kisaMetin: "Müminler Allah'ın elçilerine iman etti; hiçbirini diğerinden ayırmayız." },
      { sureId: 6, sureAdi: "En'âm", ayetNo: 84,  kisaMetin: "İbrahim'e İshak ve Yakup'u verdik; hepsini doğruya ilettik." },
    ],
  },
  {
    id: "ahiret", ikon: "⚖️", baslik: "Ahiret Gününe İman",
    aciklama: "Ölümden sonra yeniden dirilişe, hesap gününe, cennet ve cehenneme inanmaktır. Dünya hayatını geçici, sorumluluk bilincini kalıcı kılar.",
    ayetler: [
      { sureId: 2,  sureAdi: "Bakara", ayetNo: 4,  kisaMetin: "Ahirete kesin olarak inananlar." },
      { sureId: 2,  sureAdi: "Bakara", ayetNo: 62, kisaMetin: "Allah'a ve ahiret gününe iman edip salih amel işleyenler için mükâfat vardır." },
      { sureId: 99, sureAdi: "Zilzâl", ayetNo: 6,  kisaMetin: "O gün insanlar amelleri gösterilsin diye ayrı ayrı çıkarlar." },
    ],
  },
  {
    id: "kader", ikon: "🌊", baslik: "Kader ve Kazaya İman",
    aciklama: "Her şeyin Allah'ın ilmi, iradesi ve takdiri dahilinde olduğuna inanmaktır. Bu inan tevekkül, şükür ve sabır erdemlerine zemin hazırlar.",
    ayetler: [
      { sureId: 54, sureAdi: "Kamer",  ayetNo: 49, kisaMetin: "Şüphesiz Biz her şeyi bir ölçüye göre yarattık." },
      { sureId: 25, sureAdi: "Furkân", ayetNo: 2,  kisaMetin: "Her şeyi yaratan, onu bir ölçüyle takdir edendir." },
      { sureId: 57, sureAdi: "Hadîd",  ayetNo: 22, kisaMetin: "Yeryüzünde ve başınıza gelen hiçbir musibet yoktur ki bir kitapta yazılmış olmasın." },
    ],
  },
];

// ── BÖLÜM 3 — İbadet Detayları ───────────────────────────────────────────────

// — Namaz —

export interface NamazVakti {
  vakit:       string;
  ikon:        string;
  ilkSunnet:   number;
  farz:        number;
  sonSunnet:   number;
  vitir:       number;
  nafile:      number;
  toplam:      number;
  not?:        string;
}

export const NAMAZ_VAKİTLERİ: NamazVakti[] = [
  { vakit: "Sabah",   ikon: "🌅", ilkSunnet: 2, farz: 2, sonSunnet: 0, vitir: 0, nafile: 0, toplam: 4  },
  { vakit: "Öğle",    ikon: "☀️", ilkSunnet: 4, farz: 4, sonSunnet: 2, vitir: 0, nafile: 2, toplam: 12, not: "+2 nafile" },
  { vakit: "İkindi",  ikon: "🌤️", ilkSunnet: 4, farz: 4, sonSunnet: 0, vitir: 0, nafile: 0, toplam: 8  },
  { vakit: "Akşam",   ikon: "🌇", ilkSunnet: 0, farz: 3, sonSunnet: 2, vitir: 0, nafile: 2, toplam: 7,  not: "+2 nafile" },
  { vakit: "Yatsı",   ikon: "🌙", ilkSunnet: 4, farz: 4, sonSunnet: 2, vitir: 3, nafile: 0, toplam: 13 },
];

export const NAMAZ_MADDELERİ: Madde[] = [
  { tip: "farz",    metin: "Niyet",                  detay: "Hangi namazı kıldığını kalp ile kastetmek." },
  { tip: "farz",    metin: "İftitah tekbiri",         detay: "\"Allahu Ekber\" diyerek namaza başlamak." },
  { tip: "farz",    metin: "Kıyam",                   detay: "Gücü yetene ayakta durmak." },
  { tip: "farz",    metin: "Kıraat",                  detay: "Her rekatta en az 3 ayet veya bir uzun ayet okumak." },
  { tip: "farz",    metin: "Rükû",                    detay: "Eller dizlere gelecek şekilde öne eğilmek." },
  { tip: "farz",    metin: "Secdeler",                detay: "Her rekatta iki secde; yedi uzvun yere değmesi." },
  { tip: "farz",    metin: "Ka'de-i Ahire (Son oturuş)", detay: "Son rekatta teşehhüt miktarı oturmak." },
  { tip: "farz",    metin: "Selam",                   detay: "\"Es-selamü aleyküm ve rahmetullah\" diyerek bitirmek." },
  { tip: "sunnet",  metin: "Sübhaneke duası",         detay: "İlk rekatta kıraattan önce okunur." },
  { tip: "sunnet",  metin: "Eûzü-Besmele",            detay: "Her rekatta kıraattan önce okunur." },
  { tip: "sunnet",  metin: "Rükû tesbihler",          detay: "\"Sübhâne Rabbiye'l-azîm\" en az 3 kez." },
  { tip: "sunnet",  metin: "Secde tesbihleri",        detay: "\"Sübhâne Rabbiye'l-a'lâ\" en az 3 kez." },
  { tip: "sunnet",  metin: "Ettehiyyatü (teşehhüt)",  detay: "Her oturuşta okunur." },
];

// — Oruç —

export const ORUC_MADDELERİ: Madde[] = [
  { tip: "farz",    metin: "Niyet",           detay: "Her gün için ayrı niyet; en geç sabah namazının farzından önce." },
  { tip: "farz",    metin: "İmsak",           detay: "Sabah namazının ilk vaktinden itibaren yemek-içmek ve cinsî ilişkiden kaçınmak." },
  { tip: "sunnet",  metin: "Sahur",           detay: "Tan yeri ağarmadan az önce yemek; bereketi büyüktür." },
  { tip: "sunnet",  metin: "İftar Duası",     detay: "\"Allahümme leke sumtü\" ile başlamak ve tatlı bir şeyle açmak." },
  { tip: "sunnet",  metin: "İftar acele etmek", detay: "Güneş batınca iftar ertelemeden açılır." },
  { tip: "sunnet",  metin: "Kur'an hatmi",    detay: "Ramazan'da Kur'an okunması ve hatim yapılması büyük sevaptır." },
  { tip: "sunnet",  metin: "Teravih namazı",  detay: "Yatsıdan sonra cemaatle 20 rekat kılınır." },
  { tip: "info",    metin: "Orucu bozan şeyler", detay: "Bilerek yemek-içmek; cinsel ilişki; kasıtlı kusma (dolup taşarsa)." },
  { tip: "info",    metin: "Kaza gerektiren haller", detay: "Unutarak yiyen oruçlu olmadığını bilmiyorsa kaza gerekir; bilerek yerse kaza + kefaret." },
  { tip: "info",    metin: "Kefaret",         detay: "Kasıtlı cinsel birleşmede: 60 gün peşpeşe oruç VEYA 60 fakiri doyurma." },
];

export const ORUC_AYETLERİ: AyetRef[] = [
  { sureId: 2, sureAdi: "Bakara", ayetNo: 183, kisaMetin: "Ey iman edenler! Oruç sizden öncekilere farz kılındığı gibi size de farz kılındı." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 185, kisaMetin: "Ramazan ayı, insanlara yol gösterici olan Kur'an'ın indirildiği aydır." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 187, kisaMetin: "Oruç gecesi kadınlarınıza yaklaşmak helal kılındı." },
];

// — Zekât —

export interface ZekatSinifi {
  no:       number;
  sinif:    string;
  aciklama: string;
}

export const ZEKAT_NISAP = {
  altin:  { miktar: "85 g",     aciklama: "85 gram altın veya değeri kadar para/ticaret malı" },
  gumus:  { miktar: "595 g",    aciklama: "595 gram gümüş veya değeri kadar (daha ihtiyatlı)" },
  oran:   { deger: "%2,5",      aciklama: "Yılda bir kez, üzerinden bir yıl (hevl) geçen nisap miktarındaki malın kırkta biri" },
};

export const ZEKAT_SINIFLARı: ZekatSinifi[] = [
  { no: 1, sinif: "Fakirler (Fukarâ)",          aciklama: "Nisabın altında mala sahip olan yoksullar." },
  { no: 2, sinif: "Yoksullar (Mesâkîn)",         aciklama: "Hiç malı olmayan veya günlük geçimini zor sağlayanlar." },
  { no: 3, sinif: "Zekât Görevlileri (Âmilîn)",  aciklama: "Devlet adına zekât toplayan ve dağıtan kişiler." },
  { no: 4, sinif: "Kalpleri Isındırılanlar (Müellefe-i Kulûb)", aciklama: "İslam'a yeni girenler veya düşman saldırısından korunmak için." },
  { no: 5, sinif: "Köleler (Rikâb)",             aciklama: "Kölelikten kurtulmak için para toplayan kişiler." },
  { no: 6, sinif: "Borçlular (Gârimûn)",          aciklama: "Kendi ihtiyacı için borçlananlar, malları borcunu karşılamıyor." },
  { no: 7, sinif: "Allah Yolunda (Fî Sebîlillah)",aciklama: "Din için çalışanlar, savaşanlar." },
  { no: 8, sinif: "Yolda Kalanlar (İbnus-Sebîl)", aciklama: "Yolculuk sırasında harçlığı biten kişiler." },
];

export const ZEKAT_AYETLERİ: AyetRef[] = [
  { sureId: 9, sureAdi: "Tevbe",  ayetNo: 60,  kisaMetin: "Sadakalar (zekât) yukarıdaki 8 sınıf içindir — Allah'tan bir farz." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 43,  kisaMetin: "Namazı kılın ve zekâtı verin." },
  { sureId: 2, sureAdi: "Bakara", ayetNo: 277, kisaMetin: "İman edip zekâtı verenler için mükâfat vardır." },
];

// — Hac —

export interface HacAdimi {
  no:      number;
  tip:     "farz" | "vacip" | "sunnet";
  baslik:  string;
  aciklama: string;
}

export const HAC_ADAMLARı: HacAdimi[] = [
  { no: 1, tip: "farz",   baslik: "İhrama Girmek",          aciklama: "Mikat sınırlarından ihrama girilir; özel elbise giyilir, niyet edilir ve Lebbeyk söylenir." },
  { no: 2, tip: "farz",   baslik: "Arafat Vakfesi",          aciklama: "Zilhicce'nin 9. günü öğleden gün batımına kadar Arafat'ta beklemek. Haccın farzının farzıdır." },
  { no: 3, tip: "farz",   baslik: "Ziyaret Tavafı (İfâda)", aciklama: "10-12 Zilhicce içinde Kâbe'yi 7 kez tavaf etmek." },
  { no: 4, tip: "vacip",  baslik: "Müzdelife'de Geceleme",  aciklama: "9. günü gün batımından sabaha kadar Müzdelife'de kalmak." },
  { no: 5, tip: "vacip",  baslik: "Sa'y",                    aciklama: "Safa ile Merve arasında 7 kez yürümek (gidip gelmek)." },
  { no: 6, tip: "vacip",  baslik: "Şeytan Taşlamak (Reml)", aciklama: "Mina'da cemrelere taş atmak: 10. gün Akabe cemresine 7 taş, sonraki günlerde 3 cemreye 21'er taş." },
  { no: 7, tip: "vacip",  baslik: "Tıraş veya Saçı Kısaltmak", aciklama: "Erkekler başını tamamen tıraş eder veya kısaltır; kadınlar parmak boğumu kadar keser." },
  { no: 8, tip: "vacip",  baslik: "Kurban Kesmek (Temettü/Kıran)", aciklama: "Temettü ve kıran haccında kurban kesmek vaciptir." },
  { no: 9, tip: "vacip",  baslik: "Veda Tavafı",              aciklama: "Mekke'den ayrılmadan önce Kâbe'yi 7 kez tavaf etmek." },
  { no: 10, tip: "sunnet", baslik: "Kudüm Tavafı",            aciklama: "Mekke'ye ilk varışta yapılan karşılama tavafı." },
];

export const HAC_AYETLERİ: AyetRef[] = [
  { sureId: 3,  sureAdi: "Âl-i İmrân", ayetNo: 97,  kisaMetin: "Yoluna gücü yeten kimseye haccetmek farzdır." },
  { sureId: 2,  sureAdi: "Bakara",      ayetNo: 196, kisaMetin: "Haccı ve umreyi Allah için tamamlayın." },
  { sureId: 22, sureAdi: "Hac",         ayetNo: 27,  kisaMetin: "İnsanlar arasında haccı ilan et." },
  { sureId: 22, sureAdi: "Hac",         ayetNo: 29,  kisaMetin: "Sonra kirlerini gidersinler, adaklarını yerine getirsinler, tavaf etsinler." },
];

// — Kurban —

export const KURBAN_MADDELERİ: Madde[] = [
  { tip: "vacip",   metin: "Hükmü",               detay: "Hanefi mezhebine göre vacip; Şafii, Maliki ve Hanbeli mezheplerinde sünnet-i müekkede." },
  { tip: "info",    metin: "Kimlere Vacip?",       detay: "Mukim (yolcu olmayan), akıllı, baliğ, nisap miktarı mala sahip Müslümanlara." },
  { tip: "info",    metin: "Koyun / Keçi",         detay: "En az 1 yaşında; 1 kişi adına kesilir." },
  { tip: "info",    metin: "Sığır / Manda",        detay: "En az 2 yaşında; en fazla 7 kişi ortaklığıyla kesilir." },
  { tip: "info",    metin: "Deve",                 detay: "En az 5 yaşında; en fazla 7 kişi ortaklığıyla kesilir." },
  { tip: "farz",    metin: "Kesim Vakti",          detay: "Kurban Bayramı 1. günü sabah namazından 3. gün güneş batımına kadar (en faziletlisi 1. gün)." },
  { tip: "sunnet",  metin: "Niyet ve Besmele",     detay: "\"Bismillah, Allahu Ekber\" denerek kesilir; niyet edilir." },
  { tip: "sunnet",  metin: "Et Taksimi",           detay: "1/3 kendi ailesi, 1/3 komşu ve arkadaşlar, 1/3 fakirler için tavsiye edilen dağılım." },
];

export const KURBAN_AYETLERİ: AyetRef[] = [
  { sureId: 22, sureAdi: "Hac",    ayetNo: 34,  kisaMetin: "Her ümmet için Allah'ın kendilerine rızık olarak verdiği hayvanlar üzerine O'nun adını ansınlar diye kurban ibadeti koyduk." },
  { sureId: 22, sureAdi: "Hac",    ayetNo: 37,  kisaMetin: "Allah'a etleri ve kanları ulaşmaz; ama O'na takvânız ulaşır." },
  { sureId: 108, sureAdi: "Kevser", ayetNo: 2,  kisaMetin: "Rabbin için namaz kıl ve kurban kes." },
];

// ── BÖLÜM 4 — Abdest & Temizlik ──────────────────────────────────────────────

export interface AbdestSatiri {
  organ:    string;
  miktar:   number | "—";
  aciklama: string;
}

export interface AbdestBolumu {
  id:        string;
  baslik:    string;
  altBaslik: string;
  ikon:      string;
  renk:      "yesil" | "mavi" | "amber";
  aciklama:  string;
  farzlar:   AbdestSatiri[];
  sunnetler: AbdestSatiri[];
  ayetler:   AyetRef[];
}

export const ABDEST_BOLUMLER: AbdestBolumu[] = [
  {
    id: "namaz-abdesti", baslik: "Namaz Abdesti (Vudu)", altBaslik: "5 farz · 13 sünnet",
    ikon: "💧", renk: "yesil",
    aciklama: "Namaz kılmak, Kur'an'a el sürmek ve Kâbe'yi tavaf etmek için gerekli olan temizliktir. Maide 5:6 abdesti emretmektedir.",
    farzlar: [
      { organ: "Niyet",    miktar: "—", aciklama: "Abdest almaya niyet etmek." },
      { organ: "Yüz",      miktar: 1,   aciklama: "Alın saç diplerinden çene altına, bir kulak memesinden öbürüne tüm yüzü yıkamak." },
      { organ: "Kollar",   miktar: 1,   aciklama: "Sağdan başlayarak her iki kolu dirsekler dahil yıkamak." },
      { organ: "Baş",      miktar: 1,   aciklama: "Başın en az dörtte birini ıslak elle meshetmek (Hanefi)." },
      { organ: "Ayaklar",  miktar: 1,   aciklama: "Sağdan başlayarak her iki ayağı topuklar dahil yıkamak." },
    ],
    sunnetler: [
      { organ: "Besmele",         miktar: "—", aciklama: "Bismillah demek." },
      { organ: "Eller",           miktar: 3,   aciklama: "Abdeste başlarken her iki eli bilekle yıkamak." },
      { organ: "Ağız (Mazmaza)",  miktar: 3,   aciklama: "Ağzı su alıp çalkalamak." },
      { organ: "Burun (İstinşak)",miktar: 3,   aciklama: "Buruna su çekip temizlemek." },
      { organ: "Yüz",             miktar: 3,   aciklama: "Sünnet olarak 3 kez yıkamak." },
      { organ: "Kollar",          miktar: 3,   aciklama: "Sünnet olarak 3 kez yıkamak." },
      { organ: "Tüm Baş",        miktar: 1,   aciklama: "Tüm başı meshetmek." },
      { organ: "Kulaklar",        miktar: 1,   aciklama: "İçini ve arkasını meshetmek." },
      { organ: "Boyun (Ense)",    miktar: 1,   aciklama: "Ellerin arkasıyla enseni meshetmek." },
      { organ: "Ayaklar",         miktar: 3,   aciklama: "Sünnet olarak 3 kez yıkamak." },
      { organ: "Parmak Araları",  miktar: 1,   aciklama: "El ve ayak parmaklarını hilallemek." },
      { organ: "Sıra (Tertip)",   miktar: "—", aciklama: "Organları sırayla yıkamak." },
      { organ: "Süreklilik",      miktar: "—", aciklama: "Organları ara vermeksizin yıkamak." },
    ],
    ayetler: [
      { sureId: 5, sureAdi: "Mâide", ayetNo: 6, kisaMetin: "Ey iman edenler! Namaza kalktığınızda yüzlerinizi ve dirseklere kadar ellerinizi yıkayın; başlarınızı meshedin ve topuklara kadar ayaklarınızı yıkayın." },
      { sureId: 4, sureAdi: "Nisâ",  ayetNo: 43, kisaMetin: "Cünüp iken yıkanmadan namaz kılmayın. Su bulamazsanız temiz bir toprakla teyemmüm edin." },
    ],
  },
  {
    id: "gusul", baslik: "Gusül (Boy Abdesti)", altBaslik: "4 farz · 7 sünnet",
    ikon: "🚿", renk: "mavi",
    aciklama: "Cünüplük, hayız ve nifas gibi haller sonrasında tüm vücudun yıkanmasını gerektiren tam temizliktir.",
    farzlar: [
      { organ: "Niyet",      miktar: "—", aciklama: "Boy abdesti almaya niyet etmek." },
      { organ: "Ağız",       miktar: 1,   aciklama: "Mazmaza: ağzın içini iyice çalkalamak." },
      { organ: "Burun",      miktar: 1,   aciklama: "İstinşak: buruna su çekip temizlemek." },
      { organ: "Tüm Vücut",  miktar: 1,   aciklama: "Saç dibi dahil tüm vücudu, tek bir kılı bile kuru bırakmamak üzere yıkamak." },
    ],
    sunnetler: [
      { organ: "Eller",              miktar: 3,   aciklama: "Gusle başlarken elleri 3 kez yıkamak." },
      { organ: "Necaset Temizliği",  miktar: "—", aciklama: "Varsa bedendeki necaseti önce gidermek." },
      { organ: "Namaz Abdesti",      miktar: 1,   aciklama: "Gusle başlamadan önce tam namaz abdesti almak." },
      { organ: "Baş",                miktar: 3,   aciklama: "Başı 3 kez su dökerek yıkamak." },
      { organ: "Sağ Taraf",          miktar: "—", aciklama: "Sağ omuzdan başlayarak, ardından sol tarafı yıkamak." },
      { organ: "Ovalama",            miktar: "—", aciklama: "Elleri vücuda sürerek derinin her yerini iyice yıkamak." },
      { organ: "Süreklilik",         miktar: "—", aciklama: "Guslü ara vermeksizin tamamlamak." },
    ],
    ayetler: [
      { sureId: 5, sureAdi: "Mâide",  ayetNo: 6,   kisaMetin: "Cünüp iseniz iyice yıkanın." },
      { sureId: 4, sureAdi: "Nisâ",   ayetNo: 43,  kisaMetin: "Cünüp iken yıkanmadan namaz kılmayın." },
      { sureId: 2, sureAdi: "Bakara", ayetNo: 222, kisaMetin: "Hayız bitince temizlendiklerinde onlara yaklaşın." },
    ],
  },
  {
    id: "teyemmum", baslik: "Teyemmüm (Toprak Abdesti)", altBaslik: "4 farz · 5 sünnet",
    ikon: "🌿", renk: "amber",
    aciklama: "Su bulunamaması veya kullanılamaması durumunda abdest ve guslün yerine geçen temizlik yöntemidir. Temiz toprak, kum veya taşla yapılır.",
    farzlar: [
      { organ: "Niyet",   miktar: "—", aciklama: "Teyemmüm almaya niyet etmek." },
      { organ: "Besmele", miktar: "—", aciklama: "Bismillah demek (Hanbelilerde farz)." },
      { organ: "Yüz",     miktar: 1,   aciklama: "Temiz yere iki eli vurup silkelendirdikten sonra tüm yüzü meshetmek." },
      { organ: "Kollar",  miktar: 1,   aciklama: "İkinci kez toprağa vurup her iki kolu dirsekler dahil meshetmek (Hanefi)." },
    ],
    sunnetler: [
      { organ: "Tertip",            miktar: "—", aciklama: "Önce yüz, sonra kollar sırasına uymak." },
      { organ: "Parmakları Açmak",  miktar: "—", aciklama: "Toprağa vurmadan önce parmakları açık tutmak." },
      { organ: "Silkeleme",         miktar: "—", aciklama: "Toprağa vurulan elleri hafifçe silkelemek." },
      { organ: "Parmak Araları",    miktar: 1,   aciklama: "El parmaklarını hilallemek." },
      { organ: "Sağdan Başlamak",   miktar: "—", aciklama: "Sağ yüzden ve sağ koldan başlamak." },
    ],
    ayetler: [
      { sureId: 5, sureAdi: "Mâide", ayetNo: 6,  kisaMetin: "Su bulamazsanız temiz bir toprağa yönelin; yüzlerinizi ve ellerinizi onunla meshedin." },
      { sureId: 4, sureAdi: "Nisâ",  ayetNo: 43, kisaMetin: "Hasta olur veya yolculukta su bulamazsanız temiz bir toprağa vurup yüzünüzü ve ellerinizi meshedin." },
    ],
  },
];
