export const POS_LABELS_TR: Readonly<Record<string, string>> = {
  N: "İsim",
  V: "Fiil",
  P: "Edat",
  PRON: "Zamir",
  PN: "Özel isim",
  ADJ: "Sıfat",
  ADV: "Zarf",
  CONJ: "Bağlaç",
  DET: "Belirleyici",
  REL: "İlgi zamiri",
  DEM: "İşaret zamiri",
  NEG: "Olumsuzluk edatı",
  INTG: "Soru edatı",
  COND: "Şart edatı",
  PREP: "Edat",
  ACC: "Nasb edatı",
  VOC: "Seslenme edatı",
  T: "Zaman zarfı",
  LOC: "Yer zarfı",
  NV: "Fiil ismi",
  INL: "Hurûf-ı mukattaa",
  particle: "Edat",
  noun: "İsim",
  verb: "Fiil",
  adjective: "Sıfat",
  pronoun: "Zamir",
  adverb: "Zarf",
  article: "Belirleyici",
  determiner: "Belirleyici",
  preposition: "Edat",
  conjunction: "Bağlaç",
  other: "Diğer",
  unknown: "Bilinmiyor",
};

export const MORPHOLOGY_LABELS_TR: Readonly<Record<string, string>> = {
  ...POS_LABELS_TR,
  PREF: "Ön ek",
  STEM: "Gövde",
  SUFF: "Son ek",
  LEM: "Lemma",
  ROOT: "Kök",
  FAM: "Dilbilgisi ailesi",
  MOOD: "Kip",
  VF: "Fiil kalıbı",
  M: "Eril",
  F: "Dişil",
  MS: "Eril tekil",
  FS: "Dişil tekil",
  MP: "Eril çoğul",
  FP: "Dişil çoğul",
  MD: "Eril ikil",
  FD: "Dişil ikil",
  D: "İkil",
  SG: "Tekil",
  PL: "Çoğul",
  DUAL: "İkil",
  "1S": "Birinci kişi tekil",
  "1P": "Birinci kişi çoğul",
  "2MS": "İkinci kişi eril tekil",
  "2FS": "İkinci kişi dişil tekil",
  "2MP": "İkinci kişi eril çoğul",
  "2FP": "İkinci kişi dişil çoğul",
  "2MD": "İkinci kişi eril ikil",
  "2FD": "İkinci kişi dişil ikil",
  "2D": "İkinci kişi ikil",
  "3MS": "Üçüncü kişi eril tekil",
  "3FS": "Üçüncü kişi dişil tekil",
  "3MP": "Üçüncü kişi eril çoğul",
  "3FP": "Üçüncü kişi dişil çoğul",
  "3MD": "Üçüncü kişi eril ikil",
  "3FD": "Üçüncü kişi dişil ikil",
  "3D": "Üçüncü kişi ikil",
  NOM: "Merfû hâl",
  GEN: "Mecrûr hâl",
  INDEF: "Belirsiz",
  PERF: "Tamamlanmış görünüş (mâzi)",
  IMPF: "Tamamlanmamış görünüş (muzâri)",
  IMPV: "Emir",
  IND: "Merfû kip",
  SUBJ: "Mansûb kip",
  JUS: "Meczûm kip",
  ACT: "Etken",
  PASS: "Edilgen",
  ACT_PCPL: "İsm-i fâil (etken ortaç)",
  PASS_PCPL: "İsm-i mef‘ûl (edilgen ortaç)",
  VN: "Mastar",
  EMPH: "Pekiştirme edatı",
  PRP: "Amaç edatı",
  SUB: "Mastar edatı",
  AMD: "İstidrâk edatı",
  ANS: "Cevap edatı",
  AVR: "Sakındırma edatı",
  CAUS: "Sebep edatı",
  CERT: "Kesinlik edatı",
  CIRC: "Hâl edatı",
  COM: "Birliktelik edatı",
  EQ: "Eşitleme edatı",
  EXH: "Teşvik edatı",
  EXL: "Açıklama edatı",
  EXP: "İstisna edatı",
  FUT: "Gelecek zaman edatı",
  INC: "Başlangıç edatı",
  INT: "Yorum edatı",
  PREV: "Engelleme edatı",
  PRO: "Yasaklama edatı",
  REM: "Başlangıç/yeniden başlama edatı",
  RES: "Sınırlama edatı",
  RET: "Düzeltme edatı",
  RSLT: "Sonuç edatı",
  SUP: "Pekiştirici ek edat",
  SUR: "Ani oluş edatı",
  ATT: "Dikkat çekme edatı",
  DIST: "Uzaklık eki",
  ADDR: "Hitap eki",
};

const CASE_LABELS_TR: Readonly<Record<string, string>> = {
  ACC: "Mansûb hâl",
  NOM: "Merfû hâl",
  GEN: "Mecrûr hâl",
};

const PARTICLE_LABELS_TR: Readonly<Record<string, string>> = {
  ...MORPHOLOGY_LABELS_TR,
  IMPV: "Emir lâmı",
  ACC: "Nasb edatı",
};

const MORPHOLOGY_VALUE_LABELS_TR: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  MOOD: {
    IND: "Merfû kip",
    SUBJ: "Mansûb kip",
    JUS: "Meczûm kip",
  },
};

export type MorphologyLang = "tr" | "en";

// İngilizce arayüz için standart Arapça dilbilgisi terimleri (yalnız etiketler).
export const POS_LABELS_EN: Readonly<Record<string, string>> = {
  N: "Noun",
  V: "Verb",
  P: "Particle",
  PRON: "Pronoun",
  PN: "Proper noun",
  ADJ: "Adjective",
  ADV: "Adverb",
  CONJ: "Conjunction",
  DET: "Determiner",
  REL: "Relative pronoun",
  DEM: "Demonstrative pronoun",
  NEG: "Negative particle",
  INTG: "Interrogative particle",
  COND: "Conditional particle",
  PREP: "Preposition",
  ACC: "Accusative particle",
  VOC: "Vocative particle",
  T: "Time adverb",
  LOC: "Location adverb",
  NV: "Verbal noun",
  INL: "Disconnected letters",
  particle: "Particle",
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  pronoun: "Pronoun",
  adverb: "Adverb",
  article: "Determiner",
  determiner: "Determiner",
  preposition: "Preposition",
  conjunction: "Conjunction",
  other: "Other",
  unknown: "Unknown",
};

export const MORPHOLOGY_LABELS_EN: Readonly<Record<string, string>> = {
  ...POS_LABELS_EN,
  PREF: "Prefix",
  STEM: "Stem",
  SUFF: "Suffix",
  LEM: "Lemma",
  ROOT: "Root",
  FAM: "Grammatical family",
  MOOD: "Mood",
  VF: "Verb form",
  M: "Masculine",
  F: "Feminine",
  MS: "Masculine singular",
  FS: "Feminine singular",
  MP: "Masculine plural",
  FP: "Feminine plural",
  MD: "Masculine dual",
  FD: "Feminine dual",
  D: "Dual",
  SG: "Singular",
  PL: "Plural",
  DUAL: "Dual",
  "1S": "1st person singular",
  "1P": "1st person plural",
  "2MS": "2nd person masculine singular",
  "2FS": "2nd person feminine singular",
  "2MP": "2nd person masculine plural",
  "2FP": "2nd person feminine plural",
  "2MD": "2nd person masculine dual",
  "2FD": "2nd person feminine dual",
  "2D": "2nd person dual",
  "3MS": "3rd person masculine singular",
  "3FS": "3rd person feminine singular",
  "3MP": "3rd person masculine plural",
  "3FP": "3rd person feminine plural",
  "3MD": "3rd person masculine dual",
  "3FD": "3rd person feminine dual",
  "3D": "3rd person dual",
  NOM: "Nominative",
  GEN: "Genitive",
  INDEF: "Indefinite",
  PERF: "Perfect",
  IMPF: "Imperfect",
  IMPV: "Imperative",
  IND: "Indicative mood",
  SUBJ: "Subjunctive mood",
  JUS: "Jussive mood",
  ACT: "Active voice",
  PASS: "Passive voice",
  ACT_PCPL: "Active participle",
  PASS_PCPL: "Passive participle",
  VN: "Verbal noun",
  EMPH: "Emphatic particle",
  PRP: "Purpose particle",
  SUB: "Subordinating particle",
  AMD: "Amendment particle",
  ANS: "Answer particle",
  AVR: "Aversion particle",
  CAUS: "Causative particle",
  CERT: "Certainty particle",
  CIRC: "Circumstantial particle",
  COM: "Comitative particle",
  EQ: "Equalization particle",
  EXH: "Exhortation particle",
  EXL: "Explanation particle",
  EXP: "Exceptive particle",
  FUT: "Future particle",
  INC: "Inceptive particle",
  INT: "Interpretation particle",
  PREV: "Preventive particle",
  PRO: "Prohibition particle",
  REM: "Resumption particle",
  RES: "Restriction particle",
  RET: "Retraction particle",
  RSLT: "Result particle",
  SUP: "Supplemental particle",
  SUR: "Surprise particle",
  ATT: "Attention particle",
  DIST: "Distal suffix",
  ADDR: "Address suffix",
};

const CASE_LABELS_EN: Readonly<Record<string, string>> = {
  ACC: "Accusative",
  NOM: "Nominative",
  GEN: "Genitive",
};

const PARTICLE_LABELS_EN: Readonly<Record<string, string>> = {
  ...MORPHOLOGY_LABELS_EN,
  IMPV: "Imperative lām",
  ACC: "Accusative particle",
};

const MORPHOLOGY_VALUE_LABELS_EN: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  MOOD: {
    IND: "Indicative mood",
    SUBJ: "Subjunctive mood",
    JUS: "Jussive mood",
  },
};

export const CORPUS_POS_CODES = ["N", "P", "V"] as const;

export const CORPUS_MORPHOLOGY_CODES = [
  "1P", "1S", "2D", "2FD", "2FP", "2FS", "2MD", "2MP", "2MS",
  "3D", "3FD", "3FP", "3FS", "3MD", "3MP", "3MS", "ACC", "ACT_PCPL",
  "ADDR", "ADJ", "AMD", "ANS", "ATT", "AVR", "CAUS", "CERT", "CIRC",
  "COM", "COND", "CONJ", "D", "DEM", "DET", "DIST", "EMPH", "EQ", "EXH",
  "EXL", "EXP", "F", "FD", "FP", "FS", "FUT", "GEN", "IMPF", "IMPV",
  "INC", "INDEF", "INL", "INT", "INTG", "LOC", "M", "MD", "MP", "MS",
  "NEG", "NOM", "NV", "P", "PASS", "PASS_PCPL", "PERF", "PN", "PREF",
  "PREV", "PRO", "PRON", "PRP", "REL", "REM", "RES", "RET", "RSLT",
  "SUB", "SUFF", "SUP", "SUR", "T", "VN", "VOC",
] as const;

export const CORPUS_MORPHOLOGY_VALUE_KEYS = [
  "FAM", "LEM", "MOOD", "ROOT", "VF",
] as const;

export interface MorphologyDisplayToken {
  code: string;
  label: string;
  value: string | null;
  known: boolean;
}

export function getPosLabelTr(
  code: string | null | undefined,
  lang: MorphologyLang = "tr",
): string | null {
  const normalized = code?.trim();
  if (!normalized) return null;
  const labels = lang === "en" ? POS_LABELS_EN : POS_LABELS_TR;
  return labels[normalized] ?? labels[normalized.toLowerCase()] ?? null;
}

export function translatePosEn(pos: string | null | undefined, emptyFallback = "—"): string {
  return translatePosTr(pos, emptyFallback, "en");
}

export function translatePosTr(
  pos: string | null | undefined,
  emptyFallback = "—",
  lang: MorphologyLang = "tr",
): string {
  const normalized = pos?.trim();
  if (!normalized) return emptyFallback;
  return normalized
    .split("+")
    .map((part) => {
      const code = part.trim();
      return getPosLabelTr(code, lang) ?? code;
    })
    .join(" + ");
}

function translateFeature(
  code: string,
  segmentPos: string,
  lang: MorphologyLang = "tr",
): MorphologyDisplayToken {
  const canonical = code.trim();
  const en = lang === "en";
  const particleLabels = en ? PARTICLE_LABELS_EN : PARTICLE_LABELS_TR;
  const caseLabels = en ? CASE_LABELS_EN : CASE_LABELS_TR;
  const labels = en ? MORPHOLOGY_LABELS_EN : MORPHOLOGY_LABELS_TR;
  const label =
    segmentPos === "P"
      ? particleLabels[canonical]
      : caseLabels[canonical] ?? labels[canonical];
  return { code: canonical, label: label ?? canonical, value: null, known: label !== undefined };
}

function translateValueFeature(raw: string, lang: MorphologyLang = "tr"): MorphologyDisplayToken {
  const separatorIndex = raw.indexOf(":");
  const code = raw.slice(0, separatorIndex).trim();
  const canonicalValue = raw.slice(separatorIndex + 1).trim();
  const label = (lang === "en" ? MORPHOLOGY_LABELS_EN : MORPHOLOGY_LABELS_TR)[code];
  const value =
    (lang === "en" ? MORPHOLOGY_VALUE_LABELS_EN : MORPHOLOGY_VALUE_LABELS_TR)[code]?.[canonicalValue] ??
    canonicalValue;
  return { code, label: label ?? code, value: value || null, known: label !== undefined };
}

export function parseMorphologyForDisplay(
  morphology: string | null | undefined,
  lang: MorphologyLang = "tr",
): MorphologyDisplayToken[] {
  const normalized = morphology?.trim();
  if (!normalized) return [];

  const output: MorphologyDisplayToken[] = [];
  for (const segment of normalized.split(/\s+\|\s+(?=\d+:)/)) {
    const features = segment.split("|").map((part) => part.trim()).filter(Boolean);
    const head = features.shift();
    if (!head) continue;

    const headMatch = /^(\d+):([A-Z]+):(.+)$/.exec(head);
    if (!headMatch) {
      output.push(translateFeature(head, "", lang));
      continue;
    }

    const segmentPos = headMatch[2];
    const headFeature = headMatch[3];
    output.push(headFeature.includes(":")
      ? translateValueFeature(headFeature, lang)
      : translateFeature(headFeature, segmentPos, lang));
    for (const feature of features) {
      output.push(feature.includes(":")
        ? translateValueFeature(feature, lang)
        : translateFeature(feature, segmentPos, lang));
    }
  }
  return output;
}

export function formatMorphologyEn(morphology: string | null | undefined): string {
  return formatMorphologyTr(morphology, "en");
}

export function formatMorphologyTr(
  morphology: string | null | undefined,
  lang: MorphologyLang = "tr",
): string {
  return parseMorphologyForDisplay(morphology, lang)
    .map((token) => token.value ? `${token.label}: ${token.value}` : token.label)
    .join(" · ");
}

export function getUnknownMorphologyCodes(
  morphology: string | null | undefined,
): string[] {
  return [...new Set(parseMorphologyForDisplay(morphology)
    .filter((token) => !token.known)
    .map((token) => token.code))];
}
