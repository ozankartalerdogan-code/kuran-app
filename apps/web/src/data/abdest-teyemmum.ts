export interface AbdestMaddesi {
  organ:      string;
  miktar:     number | "—";
  aciklama:   string;
}

export interface ReferansAyet {
  sureId:    number;
  sureAdi:   string;
  ayetNo:    number;
  kisaMetin: string;
}

export interface AbdestBolumu {
  id:              string;
  baslik:          string;
  altBaslik:       string;
  ikon:            string;
  renk:            "yesil" | "mavi" | "amber";
  aciklama:        string;
  farzlar:         AbdestMaddesi[];
  sunnetler:       AbdestMaddesi[];
  referansAyetler: ReferansAyet[];
}

export const ABDEST_BOLUMLER: AbdestBolumu[] = [
  {
    id:        "namaz-abdesti",
    baslik:    "Namaz Abdesti (Vudu)",
    altBaslik: "4 farz · 15+ sünnet",
    ikon:      "💧",
    renk:      "yesil",
    aciklama:
      "Namaz kılmak, Kur'an'a el sürmek ve Kâbe'yi tavaf etmek için gerekli olan temizliktir. Maide 5:6 abdesti emretmekte; Hanefi mezhebine göre 4 farz, Şafii mezhebine göre 6 farz içermektedir.",

    farzlar: [
      { organ: "Niyet",  miktar: "—", aciklama: "Abdest almaya niyet etmek. Hanefilerde kalp ile yeterli, dil ile söylemek sünnettir." },
      { organ: "Yüz",   miktar: 1,   aciklama: "Alın saç diplerinden çene altına, bir kulak memesinden öbürüne tüm yüzü yıkamak." },
      { organ: "Kollar", miktar: 1,  aciklama: "Sağdan başlayarak her iki kolu dirsekler dahil parmak uçlarından yukarı doğru yıkamak." },
      { organ: "Baş",   miktar: 1,   aciklama: "Başın en az dörtte birini (Hanefi) ya da tamamını (Maliki/Şafii) ıslak elle meshetmek." },
      { organ: "Ayaklar", miktar: 1, aciklama: "Sağdan başlayarak her iki ayağı topuklar ve aralıklar dahil yıkamak." },
    ],

    sunnetler: [
      { organ: "Başlangıç",    miktar: "—", aciklama: "Besmele çekmek (Bismillah demek)." },
      { organ: "Eller",        miktar: 3,   aciklama: "Abdeste başlamadan önce her iki eli bileklerle beraber yıkamak." },
      { organ: "Ağız",         miktar: 3,   aciklama: "Mazmaza: ağzı su alıp çalkalamak." },
      { organ: "Burun",        miktar: 3,   aciklama: "İstinşak: buruna su çekip temizlemek." },
      { organ: "Yüz",          miktar: 3,   aciklama: "Farzda 1 kez yeterli; sünnet olarak 3 kez yıkamak." },
      { organ: "Kollar",       miktar: 3,   aciklama: "Farzda 1 kez; sünnet olarak 3 kez yıkamak." },
      { organ: "Baş",          miktar: 1,   aciklama: "Tüm başı meshetmek." },
      { organ: "Kulaklar",     miktar: 1,   aciklama: "Parmakla içini ve baş parmakla arkasını meshetmek." },
      { organ: "Boyun (ense)", miktar: 1,   aciklama: "Ellerin arkasıyla enseni meshetmek." },
      { organ: "Ayaklar",      miktar: 3,   aciklama: "Farzda 1 kez; sünnet olarak 3 kez yıkamak." },
      { organ: "Parmak araları", miktar: 1, aciklama: "El ve ayak parmaklarını hilallemek (aralarını temizlemek)." },
      { organ: "Sıra",         miktar: "—", aciklama: "Organları yukarıdaki sırayla (tertiple) yıkamak." },
      { organ: "Süreklilik",   miktar: "—", aciklama: "Organları ara vermeksizin (muvalat) yıkamak." },
    ],

    referansAyetler: [
      {
        sureId:    5,
        sureAdi:   "Mâide",
        ayetNo:    6,
        kisaMetin:
          "Ey iman edenler! Namaza kalktığınızda yüzlerinizi, dirseklere kadar ellerinizi yıkayın; başlarınızı meshedin; topuklara kadar ayaklarınızı yıkayın.",
      },
      {
        sureId:    4,
        sureAdi:   "Nisâ",
        ayetNo:    43,
        kisaMetin:
          "Ey iman edenler! Sarhoşken ne söylediğinizi anlayacak hale gelmedikçe namaza yaklaşmayın. Cünüp iken — yolcu olanlar dışında — yıkanmadan namaz kılmayın.",
      },
    ],
  },

  {
    id:        "gusul-abdesti",
    baslik:    "Gusül Abdesti (Boy Abdesti)",
    altBaslik: "4 farz · 7+ sünnet",
    ikon:      "🚿",
    renk:      "mavi",
    aciklama:
      "Cünüplük, hayız ve nifas gibi haller sonrasında tüm vücudun yıkanmasını gerektiren tam temizliktir. Maide 5:6 ve Nisa 4:43 guslü emretmektedir.",

    farzlar: [
      { organ: "Niyet",       miktar: "—", aciklama: "Boy abdesti almaya niyet etmek." },
      { organ: "Ağız",        miktar: 1,   aciklama: "Mazmaza: ağzın içini oruçlu değilse çalkalamak." },
      { organ: "Burun",       miktar: 1,   aciklama: "İstinşak: buruna su çekip temizlemek." },
      { organ: "Tüm Vücut",   miktar: 1,   aciklama: "Saç dibi dahil tüm vücudu, tek bir kılı bile kuru bırakmamak üzere yıkamak." },
    ],

    sunnetler: [
      { organ: "Eller",          miktar: 3,   aciklama: "Gusle başlarken elleri 3 kez yıkamak." },
      { organ: "Necaset Temizliği", miktar: "—", aciklama: "Varsa bedendeki necaseti önce gidermek." },
      { organ: "Namaz Abdesti",  miktar: 1,   aciklama: "Gusle başlamadan önce tam namaz abdesti almak." },
      { organ: "Baş",            miktar: 3,   aciklama: "Başı 3 kez su dökerek yıkamak." },
      { organ: "Sağ Taraf",      miktar: "—", aciklama: "Sağ omuzdan başlayarak, ardından sol tarafı yıkamak." },
      { organ: "Ovalama",        miktar: "—", aciklama: "Elleri vücuda sürerek derinin her yerini iyice yıkamak." },
      { organ: "Süreklilik",     miktar: "—", aciklama: "Guslü ara vermeksizin tamamlamak." },
    ],

    referansAyetler: [
      {
        sureId:    5,
        sureAdi:   "Mâide",
        ayetNo:    6,
        kisaMetin:
          "Cünüp iseniz iyice yıkanın (guslü tam yapın).",
      },
      {
        sureId:    4,
        sureAdi:   "Nisâ",
        ayetNo:    43,
        kisaMetin:
          "Cünüp iken yıkanmadan namaz kılmayın. Su bulamazsanız temiz bir toprakla teyemmüm edin.",
      },
      {
        sureId:    2,
        sureAdi:   "Bakara",
        ayetNo:    222,
        kisaMetin:
          "Hayız bitince temizlendiklerinde Allah'ın size emrettiği yerden onlara yaklaşın.",
      },
    ],
  },

  {
    id:        "teyemmum",
    baslik:    "Teyemmüm (Toprak Abdesti)",
    altBaslik: "4 farz · 5+ sünnet",
    ikon:      "🌿",
    renk:      "amber",
    aciklama:
      "Su bulunamaması veya kullanılamaması durumunda (hastalık, seferde su yokluğu, soğuk tehlikesi) abdest ve guslün yerine geçen temizlik yöntemidir. Temiz toprak, kum, taş veya toz ile yapılır.",

    farzlar: [
      { organ: "Niyet",    miktar: "—", aciklama: "Teyemmüm almaya niyet etmek; namaz abdestinin yerine olduğunu kastetmek." },
      { organ: "Besmele",  miktar: "—", aciklama: "Bismillah demek (bazı mezheplere göre farz, Hanefilerde sünnet)." },
      { organ: "Yüz",      miktar: 1,   aciklama: "Temiz yere iki eli vurup silkelendirdikten sonra tüm yüzü meshetmek." },
      { organ: "Kollar",   miktar: 1,   aciklama: "İkinci kez toprağa vurup her iki kolu dirsekler dahil meshetmek (Hanefi). Şafiilerde tek vuruşla yüz ve kollar." },
    ],

    sunnetler: [
      { organ: "Başlangıç Duası", miktar: "—", aciklama: "Abdest başlangıç duasını okumak." },
      { organ: "Sıra",            miktar: "—", aciklama: "Önce yüz, sonra kollar tertibine uymak." },
      { organ: "Eller",           miktar: "—", aciklama: "Toprağa vurmadan önce parmakları açık tutmak." },
      { organ: "Üfleme",          miktar: "—", aciklama: "Toprağa vurulan elleri hafifçe silkelemek/üflemek." },
      { organ: "Parmak Araları",  miktar: 1,   aciklama: "El parmaklarını hilallemek." },
    ],

    referansAyetler: [
      {
        sureId:    5,
        sureAdi:   "Mâide",
        ayetNo:    6,
        kisaMetin:
          "Su bulamazsanız temiz bir toprağa yönelin; yüzlerinizi ve ellerinizi onunla meshedin. Allah size güçlük çıkarmak istemez.",
      },
      {
        sureId:    4,
        sureAdi:   "Nisâ",
        ayetNo:    43,
        kisaMetin:
          "Hasta olur veya yolculukta su bulamazsanız temiz bir toprağa vurup yüzünüzü ve ellerinizi meshedin.",
      },
    ],
  },
];
