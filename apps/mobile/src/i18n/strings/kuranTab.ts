import { defineStrings } from "../index";

export default defineStrings({
  tr: {
    heading: "Kur'an-ı Kerim",
    mushafLabel: "Kur'an Oku",
    mushafSub: "604 sayfalık mushaf · hatim takibi",
    surahLabel: "Sure Listesi",
    surahSub: "114 sure, ayet ayet incele",
    resumeLabel: "Kaldığın Yerden Devam Et",
    resumeMeta: "{surah} · Sayfa {page} · {juz}. Cüz",
    resumeMetaNoSurah: "Sayfa {page} · {juz}. Cüz",
    resumeHatimBadge: "Hatim {done}/30",
    resumeA11y: "Kaldığın yerden devam et: {meta}",
  },
  en: {
    heading: "Quran",
    mushafLabel: "Read the Quran",
    mushafSub: "604-page mushaf · Khatm tracking",
    surahLabel: "List of Surahs",
    surahSub: "114 surahs, explore verse by verse",
    resumeLabel: "Continue Where You Left Off",
    resumeMeta: "{surah} · Page {page} · Juz {juz}",
    resumeMetaNoSurah: "Page {page} · Juz {juz}",
    resumeHatimBadge: "Khatm {done}/30",
    resumeA11y: "Continue where you left off: {meta}",
  },
});
