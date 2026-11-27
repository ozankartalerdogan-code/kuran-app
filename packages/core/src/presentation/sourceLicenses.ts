export type SourceLicenseLink = {
  id: string;
  title: string;
  url: string;
  license?: string;
};

export type SourceLicenseSection = {
  id: string;
  title: string;
  body: string;
  linkIds: readonly string[];
};

export const SOURCE_LICENSE_LINKS: readonly SourceLicenseLink[] = [
  {
    id: "tanzil",
    title: "Tanzil Quran Text — Uthmani 1.1",
    url: "https://tanzil.net/docs/Text_License",
    license: "CC BY 3.0",
  },
  {
    id: "tanzil-home",
    title: "Tanzil.net",
    url: "https://tanzil.net/",
  },
  {
    id: "elmalili",
    title: "Elmalılı Muhammed Hamdi Yazır",
    url: "https://islamansiklopedisi.org.tr/elmalili-muhammed-hamdi",
  },
  {
    id: "pickthall",
    title: "M. M. Pickthall — The Meaning of the Glorious Koran (1930), Tanzil.net",
    url: "https://tanzil.net/trans/",
    license: "Kamu malı",
  },
  {
    id: "translit-en",
    title: "English Transliteration — AlQuran Cloud / Quran.com",
    url: "https://api.alquran.cloud/v1/quran/en.transliteration",
    license: "Kaynak belirtilerek",
  },
  {
    id: "semar-ketir",
    title: "Semar Ketir dijital Kur'an verisi",
    url: "https://github.com/kurancilar/json",
    license: "MIT",
  },
  {
    id: "qac",
    title: "Quranic Arabic Corpus",
    url: "https://corpus.quran.com/download/",
    license: "GPL / QAC Terms of Use",
  },
  {
    id: "mustafa0x",
    title: "mustafa0x Quran Morphology",
    url: "https://github.com/mustafa0x/quran-morphology",
  },
  {
    id: "camel-tools",
    title: "CAMeL Tools",
    url: "https://github.com/CAMeL-Lab/camel_tools",
    license: "MIT",
  },
  {
    id: "camel-morph",
    title: "CAMeL Morph",
    url: "https://github.com/CAMeL-Lab/camel_morph",
    license: "CC BY 4.0",
  },
  {
    id: "alquran-tajweed",
    title: "AlQuran.cloud Tecvid Rehberi",
    url: "https://alquran.cloud/tajweed-guide",
  },
  {
    id: "alquran-terms",
    title: "AlQuran.cloud Kullanım Şartları",
    url: "https://alquran.cloud/terms-and-conditions",
  },
  {
    id: "diyanet-awqat",
    title: "T.C. Diyanet İşleri Başkanlığı — Awqat Salah",
    url: "https://awqatsalah.diyanet.gov.tr",
  },
  {
    id: "aladhan",
    title: "Aladhan Prayer Times API",
    url: "https://aladhan.com/prayer-times-api",
  },
  {
    id: "geonames",
    title: "GeoNames",
    url: "https://www.geonames.org/",
    license: "CC BY 4.0",
  },
  {
    id: "sunnah",
    title: "Sunnah.com",
    url: "https://sunnah.com/",
  },
  {
    id: "font-amiri",
    title: "Amiri",
    url: "https://github.com/aliftype/amiri",
    license: "SIL OFL 1.1",
  },
  {
    id: "font-figtree",
    title: "Figtree",
    url: "https://github.com/erikdkennedy/figtree",
    license: "SIL OFL 1.1",
  },
  {
    id: "font-lora",
    title: "Lora",
    url: "https://github.com/cyrealtype/Lora-Cyrillic",
    license: "SIL OFL 1.1",
  },
  {
    id: "font-uthmanic-hafs",
    title: "KFGQPC HAFS Uthmanic Script (UthmanicHafs)",
    url: "https://fonts.qurancomplex.gov.sa/",
    license: "KFGQPC EULA",
  },
] as const;

export const SOURCE_LICENSE_SECTIONS: readonly SourceLicenseSection[] = [
  {
    id: "quran-text",
    title: "Kur'an metni",
    body:
      "Arapça Kur'an metni, Tanzil Project (tanzil.net, Copyright © 2007–2026 Tanzil Project) tarafından yayımlanan Tanzil Quran Text Uthmani 1.1 sürümünden CC BY 3.0 lisansı kapsamında alınır. Metnin harfleri ve işaretleri hiç değiştirilmeden saklanır; ekranda düzgün görünmesi için yapılan yazı tipi ayarları asıl metne dokunmaz.",
    linkIds: ["tanzil", "tanzil-home"],
  },
  {
    id: "meal-tafsir",
    title: "Meal ve tefsir",
    body:
      "Türkçe meal olarak yalnız Elmalılı Hamdi Yazır'ın Hak Dini Kur'an Dili meali kullanılır. Mobil uygulamada arayüz İngilizceyken Marmaduke Pickthall'un kamu malı \"The Meaning of the Glorious Koran\" (1930) çevirisi gösterilir; dijital metin Tanzil.net'ten alınmıştır. Aynı modda ayetlerin İngilizce okunuşu (transliterasyon), AlQuran Cloud üzerinden alınan ve Quran.com'da da kullanılan \"English Transliteration\" metninden gösterilir (ayet sayfası, sure listesi, günün ayeti ve duası, arama, Manevi Sığınak, İsm-i Azam ve Namaz Rehberi ayetleri). Dijital nüsha zincirinde Semar Ketir'in MIT lisanslı çalışmasından yararlanılmıştır. Sade açıklamalar AI desteği ve insan kontrolüyle Kuran Yolu için yeniden hazırlanır; bilgilendirme amaçlıdır ve fetva niteliği taşımaz. Daha önce karşılaştırma amacıyla taşınan dört meal kaynağı — Ali Bulaç, Diyanet İşleri, Yaşar Nuri Öztürk ve Diyanet Vakfı — çalışma ortamından tamamen kaldırılmıştır; bu kaynaklara ait hiçbir metin artık uygulamada gösterilmez. Kayıtları yalnız kaynak geçmişi şeffaf kalsın diye kaynak kayıt belgelerinde saklanır.",
    linkIds: ["elmalili", "pickthall", "translit-en", "semar-ketir"],
  },
  {
    id: "morphology",
    title: "Kelime morfolojisi",
    body:
      "Kelime morfolojisi, Quranic Arabic Corpus ve CAMeL kaynaklarından yararlanılarak Kuran Yolu tarafından kelimeleri asıl metinle eşleştirme, harf kodlarını tek biçime getirme, bağlama göre doğru çözümlemeyi seçme, hata düzeltme ve elle kontrol adımlarıyla hazırlanmıştır. Nihai veri kaynak dosyaların birebir kopyası değildir.",
    linkIds: ["qac", "mustafa0x", "camel-tools", "camel-morph"],
  },
  {
    id: "tajweed",
    title: "Tecvid",
    body:
      "Tecvid işaretleri, AlQuran.cloud'daki tecvid işaretlerinden yararlanılarak uygulamadaki Tanzil metnine yeniden yerleştirilmiş; renklendirme, kontroller ve elle düzeltmelerle Kuran Yolu tarafından hazırlanmıştır. Kaynaktaki 86.595 tecvid işaretinin 79.343'ü (%91,6) metne yerleştirilebilmiştir; 14 ayette 23 işaret elle eklenmiştir.",
    linkIds: ["alquran-tajweed", "alquran-terms"],
  },
  {
    id: "prayer-times",
    title: "Namaz vakitleri",
    body:
      "Namaz vakitleri, T.C. Diyanet İşleri Başkanlığı'nın Awqat Salah servisinden şehir bazında alınır; bu servise ulaşılamadığında veya yakında bir Diyanet şehri bulunmadığında Aladhan servisi yedek olarak kullanılır. Size en yakın Diyanet şehrini bulmak için kullanılan şehir koordinatları GeoNames verisinden (CC BY 4.0) yararlanılarak Kuran Yolu tarafından eşleştirilmiş ve doğrulanmıştır.",
    linkIds: ["diyanet-awqat", "aladhan", "geonames"],
  },
  {
    id: "hadith",
    title: "Hadisler",
    body:
      "Hadisler bölümünde Buhârî, Müslim, Tirmizî, Ebû Dâvûd, İbn Mâce ve Ahmed b. Hanbel gibi klasik hadis kaynaklarından seçmeler sunulur. Numaralı rivayetlerde doğrulama için Sunnah.com bağlantıları kullanılır. Hadislerin Türkçe ve İngilizce sunumu ile açıklayıcı notlar Kuran Yolu için yapay zekâ desteğiyle hazırlanmıştır.",
    linkIds: ["sunnah"],
  },
  {
    id: "fonts",
    title: "Yazı tipleri",
    body:
      "Uygulamada Amiri, Figtree ve Lora yazı tipleri SIL Open Font License 1.1 kapsamında; Kur'an metni için kullanılan KFGQPC HAFS Uthmanic Script (UthmanicHafs) yazı tipi ise Kral Fahd Kur'an-ı Kerim Basım Kompleksi'nin (KFGQPC) yazı tipine gömülü son kullanıcı lisansı (EULA) kapsamında değiştirilmeden dağıtılır.",
    linkIds: ["font-amiri", "font-figtree", "font-lora", "font-uthmanic-hafs"],
  },
  {
    id: "project-content",
    title: "Kuran Yolu ve AI destekli içerikler",
    body:
      "Türkçe kelime anlamları, okunuşlar (transliterasyon), sade açıklamalar, hadis tercümeleri, siyer ve kıssa anlatımları, ders araştırmaları, kartlar, quizler, Elifba sesleri, bazı görseller, dua ve zikir anlamları AI araçlarından destek alınarak Kuran Yolu için hazırlanmış ve mümkün olan bölümlerde insan kontrolünden geçirilmiştir. İbadet rehberleri proje tarafından yazılmıştır. Mobil uygulamanın İngilizce arayüzündeki ders, quiz, Elif-Ba, sade tefsir, dua ve zikir, hadis, siyer, kıssa, ibadet rehberi, Esmaül Hüsna ve arayüz metinleri bu Türkçe içeriklerden AI araçlarıyla İngilizceye çevrilmiştir (AI-assisted translation). İngilizce modda kelime anlamları hazır İngilizce kelime karşılıklarından gösterilir; karşılığı olmayan kelimelerin anlamları, kök anlamları ve kelime kelime (literal) çeviri uygulamanın Türkçe metinlerinden AI araçlarıyla İngilizceye çevrilmiştir. Bu çeviri sırasında açıkça hatalı bulunan Türkçe kelime ve kök anlamları da düzeltilmiştir; çeviriler otomatik tutarlılık kontrollerinden geçmiştir, ancak bir insanın tek tek okuyup kontrol etmesi henüz bitmemiştir. Kaynak ve üretim kayıtları projenin kaynak kayıt dosyasında tutulur.",
    linkIds: [],
  },
  {
    id: "legal-note",
    title: "Lisans notu",
    body:
      "Bu ekran kaynak ve katkıları şeffaf biçimde açıklamak için hazırlanmıştır; hukuki görüş veya belirli bir kullanım için hukuki uygunluk garantisi değildir. Üçüncü taraf kaynakların güncel şartları kendi bağlantılarından incelenmelidir.",
    linkIds: [],
  },
] as const;

export const SOURCE_LICENSE_CONTENT = {
  title: "Kaynaklar ve Lisanslar",
  intro: "Kuran Yolu'nda kullanılan kaynaklar ile proje tarafından eklenen dönüşüm, doğrulama ve içerik katmanları.",
  links: SOURCE_LICENSE_LINKS,
  sections: SOURCE_LICENSE_SECTIONS,
} as const;

export function getSourceLicenseLinks(linkIds: readonly string[]): SourceLicenseLink[] {
  const linksById = new Map(SOURCE_LICENSE_LINKS.map((link) => [link.id, link]));
  return linkIds.map((id) => {
    const link = linksById.get(id);
    if (!link) {
      throw new Error(`Unknown source/license link id: ${id}`);
    }
    return link;
  });
}
