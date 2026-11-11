import { defineStrings } from "../index";

// src/lib/namazNotifications.ts — React dışı: getStrings ile kullanılır.
export default defineStrings({
  tr: {
    channelPrayer: "Namaz Vakitleri",
    channelDaily: "Günün Ayeti ve Duası",
    prayerTitle: "🕌 {label} Vakti Girdi",
    prayerBody: "{label} vakti girdi, namaza hazırlanabilirsiniz.",
    dailyVerse: "📖 Günün Ayeti",
    dailyDua: "🤲 Günün Duası",
  },
  en: {
    channelPrayer: "Prayer Times",
    channelDaily: "Verse and Dua of the Day",
    prayerTitle: "🕌 {label} Time Has Begun",
    prayerBody: "It's time for {label}; you can prepare for prayer.",
    dailyVerse: "📖 Verse of the Day",
    dailyDua: "🤲 Dua of the Day",
  },
});
