import type { VerseAnalysisProfile } from "./verseAnalysisDecision";

export interface VerseAnalysisQualityCase {
  surahId: number;
  ayahNumber: number;
  verseKey: string;
  category:
    | "tevhid_birlik"
    | "dua_kulluk"
    | "yol_hidayet"
    | "uyari_inkar"
    | "hukum_istisna"
    | "ahiret"
    | "rahmet_magfiret"
    | "kissa"
    | "emir_yasak"
    | "genel_karma";
  expectedProfile?: VerseAnalysisProfile;
  expectedAxisHint?: string[];
  shortNote: string;
}

function createCase(
  surahId: number,
  ayahNumber: number,
  category: VerseAnalysisQualityCase["category"],
  shortNote: string,
  options?: {
    expectedProfile?: VerseAnalysisProfile;
    expectedAxisHint?: string[];
  }
): VerseAnalysisQualityCase {
  return {
    surahId,
    ayahNumber,
    verseKey: `${surahId}:${ayahNumber}`,
    category,
    expectedProfile: options?.expectedProfile,
    expectedAxisHint: options?.expectedAxisHint,
    shortNote
  };
}

export const verseAnalysisQualitySet: VerseAnalysisQualityCase[] = [
  createCase(112, 1, "tevhid_birlik", "Birlik vurgusu icin cekirdek test.", {
    expectedProfile: "tevhid_birlik",
    expectedAxisHint: ["birligi", "birlik"]
  }),
  createCase(112, 2, "tevhid_birlik", "Samed ifadesiyle birlik/tek dayanak sinyali.", {
    expectedProfile: "tevhid_birlik",
    expectedAxisHint: ["birligi", "birlik", "tek dayanak"]
  }),
  createCase(112, 4, "tevhid_birlik", "Benzersizlik ve es tutmama ekseni.", {
    expectedProfile: "tevhid_birlik",
    expectedAxisHint: ["birligi", "birlik", "benzeri"]
  }),
  createCase(1, 5, "dua_kulluk", "Kulluk ve yardim isteme ekseni.", {
    expectedProfile: "dua_kulluk",
    expectedAxisHint: ["kulluk", "yardim"]
  }),
  createCase(2, 186, "dua_kulluk", "Dua ve cevap verme vurgusu.", {
    expectedProfile: "dua_kulluk",
    expectedAxisHint: ["dua", "yakin", "cevap"]
  }),
  createCase(40, 60, "dua_kulluk", "Dua cagrisi ve buyukluk taslama karsitligi.", {
    expectedProfile: "dua_kulluk",
    expectedAxisHint: ["dua", "cagri", "yalvaris"]
  }),
  createCase(1, 6, "yol_hidayet", "Dogru yol talebi.", {
    expectedProfile: "yol_hidayet",
    expectedAxisHint: ["yol", "hidayet"]
  }),
  createCase(1, 7, "yol_hidayet", "Nimet, gazap ve sapma ekseni.", {
    expectedProfile: "yol_hidayet",
    expectedAxisHint: ["yol", "nimet", "sapma"]
  }),
  createCase(2, 2, "yol_hidayet", "Hidayet ve rehberlik sinyali.", {
    expectedProfile: "yol_hidayet",
    expectedAxisHint: ["hidayet", "rehberlik", "yol"]
  }),
  createCase(2, 6, "uyari_inkar", "Inkarda direnenler icin uyari ekseni.", {
    expectedProfile: "uyari_inkar",
    expectedAxisHint: ["uyari", "inkar", "iman etmezler"]
  }),
  createCase(2, 7, "uyari_inkar", "Kalp, isitme, gorme ve sonuc uyarisi.", {
    expectedProfile: "uyari_inkar",
    expectedAxisHint: ["kalp", "isitme", "gorme", "uyari"]
  }),
  createCase(2, 10, "uyari_inkar", "Kalpte hastalik ve artan sapma sinyali.", {
    expectedProfile: "uyari_inkar",
    expectedAxisHint: ["kalp", "hastalik", "yalan"]
  }),
  createCase(2, 173, "hukum_istisna", "Yiyecek yasagi ve zaruret istisnasi.", {
    expectedProfile: "hukum_istisna",
    expectedAxisHint: ["haram", "yiyecek", "zorunluluk", "sinir asmama"]
  }),
  createCase(5, 3, "hukum_istisna", "Haram kilinanlar ve darda kalma istisnasi.", {
    expectedProfile: "hukum_istisna",
    expectedAxisHint: ["haram", "yiyecek", "zorunluluk", "istisna"]
  }),
  createCase(5, 90, "emir_yasak", "Yasaklama ve uzak durma emri.", {
    expectedProfile: "emir_yasak",
    expectedAxisHint: ["yasak", "pislik", "uzak durun"]
  }),
  createCase(99, 7, "ahiret", "Zerre agirligi kadar iyilik sonucu.", {
    expectedProfile: "ahiret",
    expectedAxisHint: ["iyilik", "gorur", "sonuc"]
  }),
  createCase(99, 8, "ahiret", "Zerre agirligi kadar kotuluk sonucu.", {
    expectedProfile: "ahiret",
    expectedAxisHint: ["kotuluk", "gorur", "sonuc"]
  }),
  createCase(101, 6, "ahiret", "Olcu ve agirlik sonucu ekseni.", {
    expectedProfile: "ahiret",
    expectedAxisHint: ["olcu", "agirlik", "hafif", "agir"]
  }),
  createCase(39, 53, "rahmet_magfiret", "Rahmet ve bagislanma cagrisinin guclu ornegi.", {
    expectedProfile: "rahmet_magfiret",
    expectedAxisHint: ["rahmet", "bagislanma", "umit"]
  }),
  createCase(7, 156, "rahmet_magfiret", "Rahmetin genisligi ve yazilmasi.", {
    expectedProfile: "rahmet_magfiret",
    expectedAxisHint: ["rahmet", "yazarim", "genis"]
  }),
  createCase(6, 54, "rahmet_magfiret", "Rahmeti kendi uzerine yazma vurgusu.", {
    expectedProfile: "rahmet_magfiret",
    expectedAxisHint: ["rahmet", "bagislanma", "kendi uzerine"]
  }),
  createCase(12, 4, "kissa", "Ruyanin anlatildigi kissa girisi.", {
    expectedProfile: "kissa",
    expectedAxisHint: ["ruya", "yildizlar", "gunes", "ay"]
  }),
  createCase(12, 100, "kissa", "Yusuf kissasinda yorum ve gerceklesme.", {
    expectedProfile: "kissa",
    expectedAxisHint: ["ana baba", "ruya", "gerceklesme"]
  }),
  createCase(20, 17, "kissa", "Musa kissasinda asaya dair soru.", {
    expectedProfile: "kissa",
    expectedAxisHint: ["musa", "asa", "elindeki"]
  }),
  createCase(17, 23, "emir_yasak", "Anne-babaya iyilik ve tevhid ekseniyle emir dili.", {
    expectedProfile: "emir_yasak",
    expectedAxisHint: ["anne baba", "iyilik", "rabbin", "buyurdu"]
  }),
  createCase(49, 12, "emir_yasak", "Zan, giybet ve kusur arama uyarisi.", {
    expectedProfile: "emir_yasak",
    expectedAxisHint: ["zan", "giybet", "kusur", "uyari"]
  }),
  createCase(4, 29, "emir_yasak", "Mallar ve haksizlik yasagi.", {
    expectedProfile: "emir_yasak",
    expectedAxisHint: ["mallar", "haksizlik", "olmeyin", "ticaret"]
  }),
  createCase(2, 177, "genel_karma", "Iman, ibadet ve infaki bir araya getiren genis ayet.", {
    expectedProfile: "genel_karma",
    expectedAxisHint: ["iman", "namaz", "zekat", "sabir"]
  })
];
