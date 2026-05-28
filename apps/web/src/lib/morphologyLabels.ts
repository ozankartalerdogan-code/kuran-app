export const MORPH_LABELS: Record<string, string> = {
  // ── Abbreviated Quranic morphology codes ─────────────────────────────────
  P:    "Edat",
  N:    "İsim",
  V:    "Fiil",
  ADJ:  "Sıfat",
  M:    "Eril",
  F:    "Dişil",
  MS:   "Eril Tekil",
  FS:   "Dişil Tekil",
  MP:   "Eril Çoğul",
  FP:   "Dişil Çoğul",
  MD:   "Eril İkil",
  FD:   "Dişil İkil",
  GEN:  "Tamlayan",
  ACC:  "Belirtme",
  NOM:  "Yalın",
  PREF: "Önek",
  LEM:  "Lemma",
  ROOT: "Kök",
  DET:  "Belirteç",
  PN:   "Özel İsim",
  NEG:  "Olumsuz",
  IMP:  "Emir",
  PASS: "Edilgen",
  ACT:  "Etken",
  CAUS: "Ettirgen",
  SUBJ: "Dilek",
  IND:  "Haber",
  INS:  "Vasıta",
  DUAL: "İkil",
  PL:   "Çoğul",
  SG:   "Tekil",
  PRON: "Zamir",
  DEM:  "İşaret",
  REL:  "İlgi",
  COND: "Şart",
  FUT:  "Gelecek",
  PAST: "Geçmiş",
  PRES: "Şimdiki",
  // ── English category names (from @quran-app/core WordAnalysis) ────────────
  particle:    "Edat",
  noun:        "İsim",
  verb:        "Fiil",
  adjective:   "Sıfat",
  pronoun:     "Zamir",
  adverb:      "Zarf",
  article:     "Belirlilik Takısı",
  determiner:  "Belirteç",
  preposition: "Edat",
  conjunction: "Bağlaç",
  other:       "Diğer",
  unknown:     "Bilinmiyor",
};

// Maps English WordAnalysis category → abbreviated code shown to user
export const MORPH_ABBR: Record<string, string> = {
  particle:    "P",
  noun:        "N",
  verb:        "V",
  adjective:   "ADJ",
  pronoun:     "PRON",
  preposition: "P",
  conjunction: "P",
  article:     "DET",
  determiner:  "DET",
  adverb:      "ADV",
};

export function getMorphLabel(code: string): string | null {
  return MORPH_LABELS[code] ?? null;
}

// "P+N" → [{code:"P", label:"Edat"}, {code:"N", label:"İsim"}]
export function parsePosCode(
  pos: string
): Array<{ code: string; label: string | null }> {
  return pos.split("+").map((part) => ({
    code: part,
    label: MORPH_LABELS[part] ?? null,
  }));
}

// "P+N" → "Edat+İsim"
export function translatePos(pos: string): string {
  return pos
    .split("+")
    .map((part) => MORPH_LABELS[part] ?? part)
    .join("+");
}
