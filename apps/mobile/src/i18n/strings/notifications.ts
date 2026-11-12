import { defineStrings } from "../index";

// src/lib/namazNotifications.ts — React dışı: getStrings ile kullanılır.
export default defineStrings({
  tr: {
    channelPrayer: "Namaz Vakitleri",
    channelDaily: "Günün Ayeti ve Duası",
    prayerTitle: "🕌 {label} Vakti Girdi",
    prayerBody: "{label} vakti girdi, namaza hazırlanabilirsiniz.",
    // Güneş bir namaz vakti değil: sabah namazının vakti çıkar, kerahat vakti başlar.
    sunriseTitle: "🌅 Güneş Doğdu",
    sunriseBody: "Güneş doğdu, sabah namazı vakti çıktı.",
    dailyVerse: "📖 Günün Ayeti",
    dailyDua: "🤲 Günün Duası",
  },
  en: {
    channelPrayer: "Prayer Times",
    channelDaily: "Verse and Dua of the Day",
    prayerTitle: "🕌 {label} Time Has Begun",
    prayerBody: "It's time for {label}; you can prepare for prayer.",
    sunriseTitle: "🌅 Sunrise",
    sunriseBody: "The sun has risen; the time for the Fajr prayer has ended.",
    dailyVerse: "📖 Verse of the Day",
    dailyDua: "🤲 Dua of the Day",
  },
});
