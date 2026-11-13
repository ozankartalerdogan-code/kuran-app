import { defineStrings } from "../index";

export default defineStrings({
  tr: {
    heading: "Kur'an-ı Kerim",
    mushafLabel: "Kur'an Oku",
    mushafSub: "604 sayfalık mushaf · kaldığın yerden devam · hatim takibi",
    surahLabel: "Sure Listesi",
    surahSub: "114 sure, ayet ayet incele",
    resumeLabel: "Kaldığın Yerden Devam Et",
    resumeMeta: "{surah} · Sayfa {page} · {juz}. Cüz",
    resumeMetaNoSurah: "Sayfa {page} · {juz}. Cüz",
    resumeHatimBadge: "Hatim {done}/30",
    resumeA11y: "Kaldığın yerden devam et: {meta}",
    resumeHatimA11y: "Hatim takibini aç: 30 cüzün {done} tanesi okundu",
  },
  en: {
    heading: "Quran",
    mushafLabel: "Read the Quran",
    mushafSub: "604-page mushaf · resume where you left off · Khatm tracking",
    surahLabel: "List of Surahs",
    surahSub: "114 surahs, explore verse by verse",
    resumeLabel: "Continue Where You Left Off",
    resumeMeta: "{surah} · Page {page} · Juz {juz}",
    resumeMetaNoSurah: "Page {page} · Juz {juz}",
    resumeHatimBadge: "Khatm {done}/30",
    resumeA11y: "Continue where you left off: {meta}",
    resumeHatimA11y: "Open Khatm tracker: {done} of 30 juz read",
  },
});
