import { defineStrings } from "../index";

// Ortak: vakit adları, geri sayım için -e halleri (tr) ve Hicri ay adları.
export default defineStrings({
  tr: {
    Fajr: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle", Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı",
    toFajr: "İmsak'a", toSunrise: "Güneş'e", toDhuhr: "Öğle'ye", toAsr: "İkindi'ye", toMaghrib: "Akşam'a", toIsha: "Yatsı'ya",
    hijriMonths: [
      "Muharrem", "Safer", "Rebiülevvel", "Rebiülahir",
      "Cemaziyelevvel", "Cemaziyelahir", "Recep", "Şaban",
      "Ramazan", "Şevval", "Zilkade", "Zilhicce",
    ],
  },
  en: {
    Fajr: "Fajr", Sunrise: "Sunrise", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha",
    toFajr: "Fajr", toSunrise: "Sunrise", toDhuhr: "Dhuhr", toAsr: "Asr", toMaghrib: "Maghrib", toIsha: "Isha",
    hijriMonths: [
      "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
      "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
      "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
    ],
  },
});
