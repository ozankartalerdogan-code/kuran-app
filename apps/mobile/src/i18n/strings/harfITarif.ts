import { defineStrings } from "../index";

// HarfITarifContent — ders içeriği Türkçe kalır; yalnız etiket/düğmeler.
export default defineStrings({
  tr: {
    sun: "☀️ Şemsiye",
    moon: "🌙 Kameriye",
    answerA11y: "Harf-i Tarif cevap seçeneği: {opt}",
    quizInfo: "{n} soru · Şemsiye / Kameriye",
    startA11y: "Harf-i Tarif testine başla",
    start: "🧠 Teste Başla",
    answered: "🧠 {a} / {b} yanıtlandı",
    correct: "{n} doğru",
    finished: "Bitti! {c}/{n} doğru ",
    perfect: "🎉 Tam puan!",
    again: "— tekrar edebilirsin",
    restartA11y: "Harf-i Tarif testini tekrar başlat",
    restart: "↺ Tekrar",
    memoryTip: "💡 HAFIZA İPUCU",
  },
  en: {
    sun: "☀️ Sun letters (Shamsi)",
    moon: "🌙 Moon letters (Qamari)",
    answerA11y: "Definite article answer option: {opt}",
    quizInfo: "{n} questions · Shamsi / Qamari",
    startA11y: "Start the definite article quiz",
    start: "🧠 Start Quiz",
    answered: "🧠 {a} / {b} answered",
    correct: "{n} correct",
    finished: "Done! {c}/{n} correct ",
    perfect: "🎉 Perfect score!",
    again: "— you can try again",
    restartA11y: "Restart the definite article quiz",
    restart: "↺ Retry",
    memoryTip: "💡 MEMORY TIP",
  },
});
