import { getLang } from "../i18n";

function normalizeLabelValue(value?: string | null): string {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/[\u2019]/g, "'");
}

const QURAN_RE = /kuran|kur'an|ayet|sure|suresi|fatiha|ayetul kursi|ihlas|felak|nas|bakara|enbiya|muminun|ibrahim|al-i imran|kasas|zuhruf/;
const SALAVAT_RE = /salavat|salli|barik|allahumme salli|vesile/;
const ISTIGFAR_RE = /istigfar|estagfir|seyyidul istigfar/;
const ZIKIR_RE = /zikir|tesbih|subhan|elhamdulillah|allahu ekber|la ilahe|la havle|hasbunallah|euzu billah/;
const HADITH_RE = /buhar|musli?m|tirmiz|ebu davud|nesai|ibn mace|muvatta|hisnul|hisnu'l|hadis|sahih|hasen|rivayet/;
const CLASSICAL_NOTE_RE = /genel sunnet|sahabe uygulamasi|fikih gelenegi|klasik/;

// İngilizce arayüz (AI çevirisi *.en.json içerik): Türkçe desenler ("sure", "nas")
// İngilizce kelimelerle yanlış eşleşeceği için ayrı, kelime sınırlı set kullanılır.
const EN = {
  quran: /\b(qur'?an|surah|verses?|ayah|ayat al-kursi|al-fatihah|al-ikhlas|al-falaq|an-nas|al-baqarah|al-anbiya|al-mu'minun|al-i ?'?imran|al-qasas|az-zukhruf)\b/,
  salavat: /\b(salawat|salavat|blessings upon the prophet|allahumma salli)\b/,
  istigfar: /\b(istighfar|astaghfir\w*|sayyid al-istighfar|seeking forgiveness)\b/,
  zikir: /\b(dhikr|tasbih|subhan\w*|alhamdulillah|allahu akbar|la ilaha|la hawla|hasbunallah|a'?udhu)\b/,
  hadith: /\b(bukhari|muslim|tirmidhi|abu dawud|nasa'?i|ibn majah|muwatta|hisn al-muslim|hadith|sahih|hasan|narrat\w*)\b/,
  classical: /\b(general sunnah|practice of the companions|fiqh tradition|classical)\b/,
  sahih: /\bsahih\b/, hasan: /\bhasan\b/, weak: /\b(weak|da'?if)\b/, fabricated: /\b(fabricated|mawdu'?)\b/,
};
function en(): boolean {
  return getLang() === "en";
}

export function getDevotionalSourceLabel(input: {
  title?: string | null;
  source?: string | null;
  degree?: string | null;
  category?: string | null;
}): string {
  const text = normalizeLabelValue(
    [input.title, input.source, input.degree, input.category].filter(Boolean).join(" ")
  );

  if (en()) {
    if (EN.salavat.test(text)) return "Salawat";
    if (EN.istigfar.test(text)) return "Istighfar";
    if (EN.quran.test(text)) return "Qur'anic dua";
    if (EN.zikir.test(text)) return "Dhikr";
    if (EN.hadith.test(text)) return "Dua from hadith";
    return "Dua";
  }
  if (SALAVAT_RE.test(text)) return "Salavat";
  if (ISTIGFAR_RE.test(text)) return "\u0130sti\u011ffar";
  if (QURAN_RE.test(text)) return "Kur'an duas\u0131";
  if (ZIKIR_RE.test(text)) return "Zikir";
  if (HADITH_RE.test(text)) return "Hadis kaynakl\u0131 dua";
  return "Dua";
}

export function getNarrationBadgeLabel(degree?: string | null): string | null {
  const text = normalizeLabelValue(degree);
  if (!text) return null;
  if (en()) {
    if (EN.quran.test(text)) return "Qur'an";
    if (EN.sahih.test(text)) return "Sahih narration";
    if (EN.hasan.test(text)) return "Hasan narration";
    if (EN.weak.test(text)) return "Weak narration";
    if (EN.fabricated.test(text)) return "Fabricated narration";
    return "Narration info";
  }
  if (QURAN_RE.test(text)) return "Kur'an";
  if (/sahih/.test(text)) return "Sahih rivayet";
  if (/hasen/.test(text)) return "Hasen rivayet";
  if (/zayif/.test(text)) return "Zay\u0131f rivayet";
  if (/uydurma/.test(text)) return "Uydurma rivayet";
  return "Rivayet bilgisi";
}

export function getEvidenceLabel(source?: string | null): string | null {
  const text = normalizeLabelValue(source);
  if (!text) return null;
  if (en()) {
    if (EN.quran.test(text)) return "Qur'anic basis";
    if (EN.classical.test(text)) return "Classical source note";
    if (EN.hadith.test(text)) return "Classical hadith basis";
    return "Source note";
  }
  if (QURAN_RE.test(text)) return "Kur'an dayana\u011f\u0131";
  if (CLASSICAL_NOTE_RE.test(text)) return "Klasik kaynak notu";
  if (HADITH_RE.test(text)) return "Klasik hadis dayana\u011f\u0131";
  return "Kaynak notu";
}
