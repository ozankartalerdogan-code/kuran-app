export interface ReferansAyet {
  ayetKey:  string;   // "surahId:ayahNumber"
  sureId:   number;
  sureAdi:  string;
  ayetNo:   number;
  kisaMetin: string;
}

export interface Sart {
  id:        string;
  baslik:    string;
  ikon:      string;
  aciklama:  string;
  referansAyetler: ReferansAyet[];
}

export interface SartGrubu {
  id:       string;
  baslik:   string;
  altBaslik: string;
  renk:     "yesil" | "mavi";
  sartlar:  Sart[];
}

export const ISLAM_SARTLARI: Sart[] = [
  {
    id: "sehadet",
    baslik: "Kelime-i Şehadet",
    ikon: "🌙",
    aciklama:
      "Allah'tan başka ilah olmadığına ve Hz. Muhammed'in O'nun kulu ve elçisi olduğuna tanıklık etmektir. İslam'a girişin kapısı olan bu şehadet, yalnızca sözle değil kalp ile de tasdik gerektirir.",
    referansAyetler: [
      {
        ayetKey:   "3:18",
        sureId:    3,
        sureAdi:   "Âl-i İmrân",
        ayetNo:    18,
        kisaMetin: "Allah, melekler ve ilim sahipleri tek ilah olduğuna şahitlik etti.",
      },
      {
        ayetKey:   "47:19",
        sureId:    47,
        sureAdi:   "Muhammed",
        ayetNo:    19,
        kisaMetin: "Allah'tan başka ilah olmadığını bil.",
      },
      {
        ayetKey:   "2:255",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    255,
        kisaMetin: "Âyetü'l-Kürsî: Allah, O'ndan başka ilah yoktur.",
      },
    ],
  },
  {
    id: "namaz",
    baslik: "Namaz (Salât)",
    ikon: "🕌",
    aciklama:
      "Günde beş vakit kılınan namaz, Müslümanın Allah ile doğrudan bağını simgeler. Kur'an'da en çok emredilen ibadet olan namaz; huşu, temizlik ve vakitlere riayetle eda edilir.",
    referansAyetler: [
      {
        ayetKey:   "2:43",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    43,
        kisaMetin: "Namazı kılın, zekâtı verin, rükû edenlerle birlikte rükû edin.",
      },
      {
        ayetKey:   "2:238",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    238,
        kisaMetin: "Namazlara ve orta namaza devam edin.",
      },
      {
        ayetKey:   "4:103",
        sureId:    4,
        sureAdi:   "Nisâ",
        ayetNo:    103,
        kisaMetin: "Namaz müminlere belirlenmiş vakitlerde farz kılınmıştır.",
      },
      {
        ayetKey:   "20:14",
        sureId:    20,
        sureAdi:   "Tâhâ",
        ayetNo:    14,
        kisaMetin: "Ben Allah'ım; benden başka ilah yoktur. Bana kulluk et, beni anmak için namaz kıl.",
      },
      {
        ayetKey:   "29:45",
        sureId:    29,
        sureAdi:   "Ankebût",
        ayetNo:    45,
        kisaMetin: "Namaz, hayâsızlıktan ve kötülükten alıkoyar.",
      },
    ],
  },
  {
    id: "oruc",
    baslik: "Oruç (Savm)",
    ikon: "🌙",
    aciklama:
      "Ramazan ayında şafaktan güneş batımına kadar yiyecek, içecek ve kötü davranışlardan kaçınmaktır. Oruç; takvayı pekiştiren, nefsi terbiye eden ve toplumsal dayanışmayı güçlendiren bir ibadettir.",
    referansAyetler: [
      {
        ayetKey:   "2:183",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    183,
        kisaMetin: "Oruç, sizden öncekilere farz kılındığı gibi size de farz kılındı; umulur ki korunursunuz.",
      },
      {
        ayetKey:   "2:184",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    184,
        kisaMetin: "Sayılı günler; hasta veya yolcu olanlar diğer günlerde kaza eder.",
      },
      {
        ayetKey:   "2:185",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    185,
        kisaMetin: "Ramazan ayı, Kur'an'ın indirildiği, hidayet ve furkan olan aydır.",
      },
    ],
  },
  {
    id: "zekat",
    baslik: "Zekât",
    ikon: "💛",
    aciklama:
      "Nisap miktarına ulaşan malın belli oranını muhtaçlara vermektir. Zekât; hem mali ibadetin hem de sosyal adaleti tesis etmenin temel aracı olup Kur'an'da namazla birlikte zikredilir.",
    referansAyetler: [
      {
        ayetKey:   "2:43",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    43,
        kisaMetin: "Namazı kılın ve zekâtı verin.",
      },
      {
        ayetKey:   "2:277",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    277,
        kisaMetin: "İman edip iyi ameller işleyenler, namazı kılıp zekâtı verenler için mükâfat vardır.",
      },
      {
        ayetKey:   "9:60",
        sureId:    9,
        sureAdi:   "Tevbe",
        ayetNo:    60,
        kisaMetin: "Sadakalar; fakirler, yoksullar ve zekât toplayanlar için — Allah'tan bir farz.",
      },
      {
        ayetKey:   "6:141",
        sureId:    6,
        sureAdi:   "En'âm",
        ayetNo:    141,
        kisaMetin: "Hasat günü hakkını verin; israf etmeyin.",
      },
    ],
  },
  {
    id: "hac",
    baslik: "Hac",
    ikon: "🕋",
    aciklama:
      "Gücü yeten her Müslümanın ömründe en az bir kez Mekke'ye gidip belirli ibadetleri yerine getirmesidir. Hac; tüm Müslümanların ırk, dil ve sınıf farkı gözetmeksizin bir araya geldiği evrensel kardeşlik törenidir.",
    referansAyetler: [
      {
        ayetKey:   "3:97",
        sureId:    3,
        sureAdi:   "Âl-i İmrân",
        ayetNo:    97,
        kisaMetin: "Yoluna gücü yeten kimseye Allah için Kâbe'yi haccetmek farzdır.",
      },
      {
        ayetKey:   "2:196",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    196,
        kisaMetin: "Haccı ve umreyi Allah için tamamlayın.",
      },
      {
        ayetKey:   "22:27",
        sureId:    22,
        sureAdi:   "Hac",
        ayetNo:    27,
        kisaMetin: "İnsanlar arasında haccı ilan et; uzak yollardan gelen her yolcu sana gelsin.",
      },
    ],
  },
];

export const IMAN_SARTLARI: Sart[] = [
  {
    id: "allah-iman",
    baslik: "Allah'a İman",
    ikon: "✨",
    aciklama:
      "Allah'ın varlığına, birliğine (tevhid) ve Kur'an'da bildirilen isim ve sıfatlarına kalp ile inanmaktır. Tüm imanın temeli olan bu esas, O'ndan başka gerçek ilah olmadığının idrakidir.",
    referansAyetler: [
      {
        ayetKey:   "112:1",
        sureId:    112,
        sureAdi:   "İhlâs",
        ayetNo:    1,
        kisaMetin: "De ki: O Allah birdir.",
      },
      {
        ayetKey:   "112:2",
        sureId:    112,
        sureAdi:   "İhlâs",
        ayetNo:    2,
        kisaMetin: "Allah Samed'dir (her şey O'na muhtaç, O hiçbir şeye muhtaç değil).",
      },
      {
        ayetKey:   "2:255",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    255,
        kisaMetin: "Âyetü'l-Kürsî: Allah, diri ve her şeyi tutan; O'ndan başka ilah yoktur.",
      },
    ],
  },
  {
    id: "melek-iman",
    baslik: "Meleklere İman",
    ikon: "🪽",
    aciklama:
      "Allah'ın nurdan yarattığı, günah işlemeyen ve emirlerine tam itaat eden meleklere inanmaktır. Vahiy getiren Cebrail'den hesap günündeki görevlilere kadar tüm melekler bu imanın kapsamındadır.",
    referansAyetler: [
      {
        ayetKey:   "2:285",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    285,
        kisaMetin: "Peygamber ve müminler; Allah'a, meleklerine, kitaplarına ve elçilerine iman etti.",
      },
      {
        ayetKey:   "4:136",
        sureId:    4,
        sureAdi:   "Nisâ",
        ayetNo:    136,
        kisaMetin: "Allah'a, elçisine, indirdiği kitaba ve daha önce indirdiği kitaplara iman edin.",
      },
    ],
  },
  {
    id: "kitap-iman",
    baslik: "Kitaplara İman",
    ikon: "📖",
    aciklama:
      "Allah'ın peygamberlere gönderdiği ilahi kitaplara — Tevrat, Zebur, İncil ve Kur'an başta olmak üzere — inanmaktır. Kur'an, bu kitapların sonuncusu ve muhafazası garantilenmiş olanıdır.",
    referansAyetler: [
      {
        ayetKey:   "2:285",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    285,
        kisaMetin: "Müminler Allah'ın kitaplarına iman etti.",
      },
      {
        ayetKey:   "4:136",
        sureId:    4,
        sureAdi:   "Nisâ",
        ayetNo:    136,
        kisaMetin: "İndirilen kitaba ve önceki kitaplara iman edin.",
      },
      {
        ayetKey:   "3:3",
        sureId:    3,
        sureAdi:   "Âl-i İmrân",
        ayetNo:    3,
        kisaMetin: "Allah sana Kitabı hak ile, öncekini doğrulayıcı olarak indirdi.",
      },
    ],
  },
  {
    id: "peygamber-iman",
    baslik: "Peygamberlere İman",
    ikon: "🌿",
    aciklama:
      "Âdem'den Hz. Muhammed'e kadar gönderilmiş tüm peygamberlere inanmaktır. Kur'an'da ismi geçen 25 peygamberin yanı sıra daha pek çok elçinin gönderildiği bildirilmektedir.",
    referansAyetler: [
      {
        ayetKey:   "2:285",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    285,
        kisaMetin: "Müminler Allah'ın elçilerine iman etti; hiçbirini diğerinden ayırmayız.",
      },
      {
        ayetKey:   "4:136",
        sureId:    4,
        sureAdi:   "Nisâ",
        ayetNo:    136,
        kisaMetin: "Allah'a ve elçisine iman edin.",
      },
      {
        ayetKey:   "6:84",
        sureId:    6,
        sureAdi:   "En'âm",
        ayetNo:    84,
        kisaMetin: "İbrahim'e İshak ve Yakup'u verdik; hepsini doğruya ilettik.",
      },
    ],
  },
  {
    id: "ahiret-iman",
    baslik: "Ahiret Gününe İman",
    ikon: "⚖️",
    aciklama:
      "Ölümden sonra yeniden dirilişe, hesap gününe, cennet ve cehenneme inanmaktır. Bu iman; dünya hayatını geçici, sorumluluk bilincini kalıcı kılar ve ahlaki davranışın en güçlü kaynağıdır.",
    referansAyetler: [
      {
        ayetKey:   "2:4",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    4,
        kisaMetin: "Ahirete kesin olarak inananlar.",
      },
      {
        ayetKey:   "2:62",
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    62,
        kisaMetin: "Allah'a ve ahiret gününe iman edip salih amel işleyenler için mükâfat vardır.",
      },
      {
        ayetKey:   "99:6",
        sureId:    99,
        sureAdi:   "Zilzâl",
        ayetNo:    6,
        kisaMetin: "O gün insanlar amelleri gösterilsin diye ayrı ayrı çıkarlar.",
      },
    ],
  },
  {
    id: "kader-iman",
    baslik: "Kader ve Kazaya İman",
    ikon: "🌊",
    aciklama:
      "Her şeyin Allah'ın ilmi, iradesi ve takdiri dahilinde olduğuna inanmaktır. Bu inan, çaresizliğe değil; tevekkül, şükür ve sabır erdemlerine zemin hazırlar.",
    referansAyetler: [
      {
        ayetKey:   "54:49",
        sureId:    54,
        sureAdi:   "Kamer",
        ayetNo:    49,
        kisaMetin: "Şüphesiz Biz her şeyi bir ölçüye göre yarattık.",
      },
      {
        ayetKey:   "25:2",
        sureId:    25,
        sureAdi:   "Furkân",
        ayetNo:    2,
        kisaMetin: "Her şeyi yaratan, onu bir ölçüyle takdir edendir.",
      },
      {
        ayetKey:   "57:22",
        sureId:    57,
        sureAdi:   "Hadîd",
        ayetNo:    22,
        kisaMetin: "Yeryüzünde ve kendi başınıza gelen hiçbir musibet yoktur ki, biz onu yaratmadan önce bir kitapta yazılmış olmasın.",
      },
    ],
  },
];

export const SART_GRUPLARI: SartGrubu[] = [
  {
    id:        "islam",
    baslik:    "İslam'ın 5 Şartı",
    altBaslik: "Dinin pratik temelleri",
    renk:      "yesil",
    sartlar:   ISLAM_SARTLARI,
  },
  {
    id:        "iman",
    baslik:    "İman'ın 6 Şartı",
    altBaslik: "Dinin itikadî temelleri",
    renk:      "mavi",
    sartlar:   IMAN_SARTLARI,
  },
];
