// Türkçe okunuş (transliterasyon) -> İngilizce okuyucuya uygun yazım.
// Saf ve deterministik: RN/Expo importu yok. Dış veri seti kullanılmaz.
//
// Şema (tek tek karakter eşlemesi):
//   ş->sh  ç->ch  c->j  ğ->gh  ı->i  ö->o  ü->u  v->w
//   â->a   î->i   û->u  (uzatma işaretleri okunabilirlik için düşer: a/i/u)
//   İ->I   Ş->Sh  Ç->Ch  C->J  Ğ->Gh  Ö->O  Ü->U  V->W  Â->A  Î->I  Û->U
//   ' ve ’ (ayn/hemze) olduğu gibi kalır.
// Ek kural: tek başına "ve" (bağlaç, و) -> "wa" ("Ve"->"Wa", "VE"->"WA").
//
// Sınırlamalar: Türkçedeki "e" (fetha) değiştirilmez ("rabbe", "lekel" kalır);
// "ve" kuralı yalnız bağımsız kelimeyi yakalar ("vel-ard" -> "wel-ard");
// Arap harfleri, rakamlar, noktalama ve diğer karakterler dokunulmadan geçer.
// Ayrıca "ch"/"sh" kısaltması bitişik "s"+"h" dizilerini belirsizleştirebilir
// (Türkçe metinde bu hep "s-h" gibi ayrılmıştır).

const MAP: Record<string, string> = {
  "ş": "sh", "Ş": "Sh", "ç": "ch", "Ç": "Ch", "c": "j", "C": "J",
  "ğ": "gh", "Ğ": "Gh", "ı": "i", "İ": "I", "ö": "o", "Ö": "O",
  "ü": "u", "Ü": "U", "v": "w", "V": "W",
  "â": "a", "Â": "A", "î": "i", "Î": "I", "û": "u", "Û": "U",
};

// Bağımsız "ve": önünde/arkasında harf yok (Latin + Türkçe harfler).
const LETTER = "A-Za-z\\u00C0-\\u024F";
const VE_RE = new RegExp(`(^|[^${LETTER}])([Vv][Ee])(?![${LETTER}])`, "g");

export function trToEnTranslit(text: string): string {
  if (!text) return text;
  const withVe = text.replace(VE_RE, (_m, pre: string, ve: string) => {
    const wa = ve === "ve" ? "wa" : ve === "VE" ? "WA" : ve[0] === "V" ? "Wa" : "wa";
    return pre + wa;
  });
  let out = "";
  for (const ch of withVe) out += MAP[ch] ?? ch;
  return out;
}

// Türkçeye özgü harf (ş ç ğ ı İ ö ü â î û) içermeyen metin zaten İngilizce yazımdır
// (.en.json'daki okunuşlar ve İngilizce açıklama karışık dua metinleri): c->j / v->w
// eşlemesi onu bozardı ("recited" -> "rejited", "have" -> "hawe"), dokunulmaz.
const TR_SPECIFIC = /[şŞçÇğĞıİöÖüÜâÂîÎûÛ]/;

export function localizedTranslit(text: string, lang: "tr" | "en"): string;
export function localizedTranslit(text: string | null | undefined, lang: "tr" | "en"): string | null | undefined;
export function localizedTranslit(text: string | null | undefined, lang: "tr" | "en"): string | null | undefined {
  if (lang === "tr" || !text || !TR_SPECIFIC.test(text)) return text;
  return trToEnTranslit(text);
}
