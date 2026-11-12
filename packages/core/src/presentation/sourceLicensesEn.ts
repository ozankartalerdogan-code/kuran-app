// English version of sourceLicenses.ts (AI-assisted translation, scripts/translate-json-en.mjs).
// Keep ids, urls and linkIds in sync with sourceLicenses.ts.
import type { SourceLicenseLink, SourceLicenseSection } from "./sourceLicenses";

export const SOURCE_LICENSE_LINKS_EN: readonly SourceLicenseLink[] = [
  {
    "id": "tanzil",
    "title": "Tanzil Quran Text — Uthmani 1.1",
    "url": "https://tanzil.net/docs/Text_License",
    "license": "CC BY 3.0"
  },
  {
    "id": "elmalili",
    "title": "Elmalılı Muhammed Hamdi Yazır",
    "url": "https://islamansiklopedisi.org.tr/elmalili-muhammed-hamdi"
  },
  {
    "id": "pickthall",
    "title": "M. M. Pickthall — The Meaning of the Glorious Koran (1930), Tanzil.net",
    "url": "https://tanzil.net/trans/",
    "license": "Public domain"
  },
  {
    "id": "translit-en",
    "title": "English Transliteration — AlQuran Cloud / Quran.com",
    "url": "https://api.alquran.cloud/v1/quran/en.transliteration",
    "license": "With attribution"
  },
  {
    "id": "semar-ketir",
    "title": "Semar Ketir digital Quran data",
    "url": "https://github.com/kurancilar/json",
    "license": "MIT"
  },
  {
    "id": "qac",
    "title": "Quranic Arabic Corpus",
    "url": "https://corpus.quran.com/download/"
  },
  {
    "id": "mustafa0x",
    "title": "mustafa0x Quran Morphology",
    "url": "https://github.com/mustafa0x/quran-morphology"
  },
  {
    "id": "camel-tools",
    "title": "CAMeL Tools",
    "url": "https://github.com/CAMeL-Lab/camel_tools",
    "license": "MIT"
  },
  {
    "id": "camel-morph",
    "title": "CAMeL Morph",
    "url": "https://github.com/CAMeL-Lab/camel_morph",
    "license": "CC BY 4.0"
  },
  {
    "id": "alquran-tajweed",
    "title": "AlQuran.cloud Tajweed Guide",
    "url": "https://alquran.cloud/tajweed-guide"
  },
  {
    "id": "alquran-terms",
    "title": "AlQuran.cloud Terms of Use",
    "url": "https://alquran.cloud/terms-and-conditions"
  }
];

export const SOURCE_LICENSE_SECTIONS_EN: readonly SourceLicenseSection[] = [
  {
    "id": "quran-text",
    "title": "Quran text",
    "body": "The Arabic Quran text is taken from Tanzil Quran Text Uthmani version 1.1. The canonical Unicode text is preserved unchanged; the on-screen font and compatibility processing used only for display do not alter the source text.",
    "linkIds": [
      "tanzil"
    ]
  },
  {
    "id": "meal-tafsir",
    "title": "Translation and commentary",
    "body": "Elmalılı Hamdi Yazır's Hak Dini Kur'an Dili is the only translation used for the Turkish Quran translation. When the mobile app interface is in English, Marmaduke Pickthall's public-domain translation \"The Meaning of the Glorious Koran\" (1930) is displayed; the digital text is taken from Tanzil.net. In the same mode, the English transliteration of the verses is displayed from the \"English Transliteration\" text obtained via AlQuran Cloud and also used on Quran.com (verse page, surah list, verse and dua of the day, search, Spiritual Refuge, Ism al-A'zam and Prayer Guide verses). Semar Ketir's MIT-licensed work was used in the chain of digital copies. Simplified explanations are re-prepared for Kuran Yolu with AI assistance and human review; they are for informational purposes and do not constitute fatwas. Four translation sources previously retained for comparison — Ali Bulaç, Diyanet İşleri, Yaşar Nuri Öztürk, and Diyanet Vakfı — have been completely removed from the runtime environment; no text from these sources is displayed in the app anymore. Their records are retained in source documentation only to keep the source history transparent.",
    "linkIds": [
      "elmalili",
      "pickthall",
      "translit-en",
      "semar-ketir"
    ]
  },
  {
    "id": "morphology",
    "title": "Word morphology",
    "body": "Word morphology was prepared using Quranic Arabic Corpus and CAMeL sources, together with Kuran Yolu's processes for canonical token alignment, Unicode normalization, contextual selection, error correction, and manual verification. The final data is not an exact copy of the source files.",
    "linkIds": [
      "qac",
      "mustafa0x",
      "camel-tools",
      "camel-morph"
    ]
  },
  {
    "id": "tajweed",
    "title": "Tajweed",
    "body": "Tajweed markings were realigned with the canonical Tanzil text using AlQuran.cloud tajweed markers and prepared with Kuran Yolu's span/coordinate system, color mapping, safety checks, and manual corrections. Of the 86,595 recognized source clusters, 79,343 were aligned (91.6254%); 23 manual spans were added across 14 verses.",
    "linkIds": [
      "alquran-tajweed",
      "alquran-terms"
    ]
  },
  {
    "id": "project-content",
    "title": "Kuran Yolu and AI-assisted content",
    "body": "Turkish word meanings, transliteration, simplified explanations, hadith translations, accounts of the Prophet's life and religious stories, lesson research, cards, quizzes, Elifba audio, some images, and meanings of supplications and remembrances were prepared for Kuran Yolu with assistance from AI tools and reviewed by humans where possible. The worship guides were written by the project. The lessons, quizzes, Elif-Ba lessons, simplified commentary, supplications and remembrances, hadith, Seerah, prophets' stories, worship guides, Asma ul-Husna and interface texts in the mobile app's English interface were translated into English from this Turkish content using AI tools (AI-assisted translation). In English mode, word meanings use the existing English word glosses; meanings of words without a gloss, root meanings and the word-for-word (literal) translation were translated into English from the app's Turkish texts using AI tools. Clearly wrong Turkish word and root meanings found during this work were also corrected; the translations have passed automated structure and consistency checks, and human review is not yet complete. Source and production records are kept in the central provenance manifest.",
    "linkIds": []
  },
  {
    "id": "legal-note",
    "title": "License note",
    "body": "This screen was prepared to explain sources and contributions transparently; it is not legal advice or a guarantee of legal compliance for any particular use. The current terms of third-party sources should be reviewed through their respective links.",
    "linkIds": []
  }
];

export const SOURCE_LICENSE_CONTENT_EN = {
  title: "Sources and Licenses",
  intro: "The sources used in Kuran Yolu and the transformation, verification, and content layers added by the project.",
  links: SOURCE_LICENSE_LINKS_EN,
  sections: SOURCE_LICENSE_SECTIONS_EN,
} as const;

export function getSourceLicenseLinksEn(linkIds: readonly string[]): SourceLicenseLink[] {
  const byId = new Map(SOURCE_LICENSE_LINKS_EN.map((link) => [link.id, link]));
  return linkIds.map((id) => {
    const link = byId.get(id);
    if (!link) throw new Error(`Unknown source/license link id: ${id}`);
    return link;
  });
}
