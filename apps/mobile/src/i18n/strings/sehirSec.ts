import { defineStrings } from "../index";

// app/sehir-sec.tsx — namaz vakti şehri seçimi
export default defineStrings({
  tr: {
    screenTitle: "Namaz Vakti Şehri",
    searchPlaceholder: "Şehir ara (ör. Kartal, Berlin)",
    autoTitle: "Otomatik — konumumu kullan",
    autoSub: "Vakitler bulunduğun yere en yakın Diyanet şehrinden",
    current: "Seçili",
    noResults: "Sonuç bulunamadı",
    searchError: "Arama yapılamadı, internet bağlantını kontrol et.",
    minChars: "En az 2 harf yaz",
    source: "Vakitler: T.C. Diyanet İşleri Başkanlığı",
    searchA11y: "Şehir ara",
    autoA11y: "Otomatik — konumumu kullan",
    selectCityA11y: "{name} şehrini seç",
    selectedA11y: "Seçili",
    changeCityA11y: "Namaz vakti şehrini değiştir",
  },
  en: {
    screenTitle: "Prayer Times City",
    searchPlaceholder: "Search city (e.g. Istanbul, Berlin)",
    autoTitle: "Automatic — use my location",
    autoSub: "Times from the Diyanet city nearest to you",
    current: "Selected",
    noResults: "No results found",
    searchError: "Search failed, check your internet connection.",
    minChars: "Type at least 2 letters",
    source: "Times: Presidency of Religious Affairs of Türkiye (Diyanet)",
    searchA11y: "Search city",
    autoA11y: "Automatic — use my location",
    selectCityA11y: "Select {name}",
    selectedA11y: "Selected",
    changeCityA11y: "Change prayer times city",
  },
});
