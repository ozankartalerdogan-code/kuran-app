// Saf yer tutucu doldurma (RN bağımlılığı yok → node --test ile test edilir).

// İngilizce şablonlarda "{n} verses" gibi sayı + çoğul isim: değer 1 ise tekile çevrilir
// ("1 verses" → "1 verse"). Türkçe şablonlarda bu kelimeler geçmediği için etkisizdir.
const SINGULAR: Record<string, string> = {
  days: "day", verses: "verse", words: "word", times: "time", minutes: "minute",
  lessons: "lesson", questions: "question", results: "result", hours: "hour",
};
const PLURAL_RE = new RegExp(`\\{(\\w+)\\} (${Object.keys(SINGULAR).join("|")})\\b`, "g");

/** "{name}" yer tutucularını doldurur. */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template
    .replace(PLURAL_RE, (m, k: string, noun: string) =>
      params[k] !== undefined && String(params[k]) === "1" ? `{${k}} ${SINGULAR[noun]}` : m)
    .replace(/\{(\w+)\}/g, (m, k: string) => (params[k] !== undefined ? String(params[k]) : m));
}
