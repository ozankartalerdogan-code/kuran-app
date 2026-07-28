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
    id: "elmalili",
    title: "Elmalılı Muhammed Hamdi Yazır",
    url: "https://islamansiklopedisi.org.tr/elmalili-muhammed-hamdi",
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
] as const;

export const SOURCE_LICENSE_SECTIONS: readonly SourceLicenseSection[] = [
  {
    id: "quran-text",
    title: "Kur'an metni",
    body:
      "Arapça Kur'an metni, Tanzil Quran Text Uthmani 1.1 sürümünden alınır. Canonical Unicode metin değiştirilmeden korunur; ekrandaki font ve yalnız gösterime yönelik uyumluluk işlemleri kaynak metni değiştirmez.",
    linkIds: ["tanzil"],
  },
  {
    id: "meal-tafsir",
    title: "Meal ve tefsir",
    body:
      "Production'da yalnız Elmalılı Hamdi Yazır'ın Hak Dini Kur'an Dili meali kullanılır. Dijital nüsha zincirinde Semar Ketir'in MIT lisanslı çalışmasından yararlanılmıştır. Sade açıklamalar AI desteği ve insan kontrolüyle Kuran Yolu için yeniden hazırlanır; bilgilendirme amaçlıdır ve fetva niteliği taşımaz. Daha önce karşılaştırma amacıyla taşınan dört meal kaynağı — Ali Bulaç, Diyanet İşleri, Yaşar Nuri Öztürk ve Diyanet Vakfı — çalışma ortamından tamamen kaldırılmıştır (removed_from_runtime); bu kaynaklara ait hiçbir metin artık uygulamada gösterilmez. Kayıtları yalnız kaynak geçmişi şeffaf kalsın diye provenance belgelerinde saklanır.",
    linkIds: ["elmalili", "semar-ketir"],
  },
  {
    id: "morphology",
    title: "Kelime morfolojisi",
    body:
      "Kelime morfolojisi, Quranic Arabic Corpus ve CAMeL kaynaklarından yararlanılarak Kuran Yolu'nun canonical token hizalama, Unicode normalizasyonu, bağlamsal seçim, hata düzeltme ve manuel doğrulama süreçleriyle hazırlanmıştır. Nihai veri kaynak dosyaların birebir kopyası değildir.",
    linkIds: ["qac", "mustafa0x", "camel-tools", "camel-morph"],
  },
  {
    id: "tajweed",
    title: "Tecvid",
    body:
      "Tecvid işaretleri, AlQuran.cloud tecvid markerlarından yararlanılarak canonical Tanzil metnine yeniden hizalanmış; Kuran Yolu'nun span/koordinat sistemi, renk eşlemesi, güvenlik kontrolleri ve manuel düzeltmeleriyle hazırlanmıştır. Tanınan 86.595 kaynak kümesinin 79.343'ü hizalanmıştır (%91,6254); 14 ayette 23 manuel span eklenmiştir.",
    linkIds: ["alquran-tajweed", "alquran-terms"],
  },
  {
    id: "project-content",
    title: "Kuran Yolu ve AI destekli içerikler",
    body:
      "Türkçe kelime anlamları, transliterasyon, sade açıklamalar, hadis tercümeleri, siyer ve kıssa anlatımları, ders araştırmaları, kartlar, quizler, Elifba sesleri, bazı görseller, dua ve zikir anlamları AI araçlarından destek alınarak Kuran Yolu için hazırlanmış ve mümkün olan bölümlerde insan kontrolünden geçirilmiştir. İbadet rehberleri proje tarafından yazılmıştır. Kaynak ve üretim kayıtları merkezi provenance manifestinde tutulur.",
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
