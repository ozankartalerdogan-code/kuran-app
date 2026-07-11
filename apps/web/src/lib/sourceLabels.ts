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

export function getDevotionalSourceLabel(input: {
  title?: string | null;
  source?: string | null;
  degree?: string | null;
  category?: string | null;
}): string {
  const text = normalizeLabelValue(
    [input.title, input.source, input.degree, input.category].filter(Boolean).join(" ")
  );

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
  if (QURAN_RE.test(text)) return "Kur'an dayana\u011f\u0131";
  if (CLASSICAL_NOTE_RE.test(text)) return "Klasik kaynak notu";
  if (HADITH_RE.test(text)) return "Klasik hadis dayana\u011f\u0131";
  return "Kaynak notu";
}
