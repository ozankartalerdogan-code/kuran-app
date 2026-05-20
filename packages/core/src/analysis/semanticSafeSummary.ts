const deterministicSummaries: Record<string, string> = {
  "1:1": "S\u00f6z ve i\u015fe Allah\u2019\u0131n ad\u0131yla ba\u015flan\u0131r.",
  "1:2": "\u00d6vg\u00fcn\u00fcn y\u00f6neldi\u011fi makam, b\u00fct\u00fcn varl\u0131\u011f\u0131n Rabbi olan Allah\u2019t\u0131r.",
  "1:3": "Allah\u2019\u0131n rahmet vasf\u0131 iki isimle \u00f6ne \u00e7\u0131kar.",
  "1:5": "Kulluk ve yard\u0131m iste\u011fi yaln\u0131z Allah\u2019a y\u00f6neltilir.",
  "1:5a": "Kulluk y\u00f6neli\u015fi yaln\u0131z Allah\u2019a tahsis edilir.",
  "1:5b": "Yard\u0131m iste\u011finin nihai muhatab\u0131 yaln\u0131z Allah\u2019t\u0131r.",
  "1:6": "Do\u011fru yola ula\u015fma iste\u011fi Allah\u2019\u0131n rehberli\u011fine y\u00f6neltilir.",
  "2:6": "Uyar\u0131 kar\u015f\u0131s\u0131nda kapanm\u0131\u015f ink\u00e2r tavr\u0131n\u0131n de\u011fi\u015fmedi\u011fi bildirilir.",
  "2:7": "Kalp, i\u015fitme ve g\u00f6rme alanlar\u0131n\u0131n kapanmas\u0131 ink\u00e2r tavr\u0131yla ili\u015fkilendirilir.",
  "2:8": "S\u00f6zde iman iddias\u0131 ile ger\u00e7ek inan\u00e7 aras\u0131ndaki kopukluk g\u00f6sterilir.",
  "76:7": "Verilen s\u00f6z, a\u011f\u0131r bir g\u00fcn\u00fcn sorumluluk bilinciyle birlikte an\u0131l\u0131r.",
  "8:46": "Zorluk kar\u015f\u0131s\u0131nda sab\u0131r emredilir. Allah\u2019\u0131n sabredenlerle beraber oldu\u011fu bildirilir.",
  "14:7": "\u015e\u00fck\u00fcr, nimetin art\u0131r\u0131lmas\u0131 vaadiyle ili\u015fkilendirilir.",
  "23:13": "\u0130nsan\u0131n yarat\u0131l\u0131\u015f s\u00fcreci sade bir ba\u015flang\u0131\u00e7la hat\u0131rlat\u0131l\u0131r.",
  "3:185": "\u00d6l\u00fcm\u00fcn her nefis i\u00e7in ka\u00e7\u0131n\u0131lmaz oldu\u011fu bildirilir.",
  "2:173":
    "Zorunluluk h\u00e2linde kalan kimse i\u00e7in bir ruhsat alan\u0131 tan\u0131n\u0131r. S\u0131n\u0131r\u0131 a\u015fmayan kimse i\u00e7in ba\u011f\u0131\u015f ve merhamet kap\u0131s\u0131 a\u00e7\u0131k tutulur."
};

export function getSafeSemanticSummary(verseKey: string): string | null {
  return deterministicSummaries[verseKey] ?? null;
}

export const getSafeDeterministicSemanticSummary = getSafeSemanticSummary;
