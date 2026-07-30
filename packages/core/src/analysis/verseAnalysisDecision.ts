import type { VerseAnalysisContext } from "./verseAnalysisContext";

export type VerseAnalysisProfile =
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

type NonGeneralProfile = Exclude<VerseAnalysisProfile, "genel_karma">;

const turkishSignals: Record<NonGeneralProfile, string[]> = {
  tevhid_birlik: [
    "birlik",
    "tevhid",
    "tek",
    "essiz",
    "bir",
    "teklik",
    "samed",
    "allah birdir",
    "denk",
    "benzer",
    "kufu",
    "kufuv",
    "hicbir"
  ],
  dua_kulluk: [
    "kulluk",
    "ibadet",
    "yardim",
    "yardim isteme",
    "dua",
    "cagri",
    "cevap",
    "yakaris",
    "yakin"
  ],
  yol_hidayet: ["yol", "hidayet", "nimet", "gazap", "sapma", "dogru", "rehberlik"],
  uyari_inkar: [
    "kalp",
    "isitme",
    "gorme",
    "perde",
    "muhur",
    "azap",
    "inkar",
    "uyari",
    "hastalik",
    "yalan"
  ],
  hukum_istisna: [
    "haram",
    "yasak",
    "yiyecek",
    "et",
    "kan",
    "domuz",
    "zorunluluk",
    "caresizlik",
    "istisna",
    "sinir",
    "asma",
    "mecbur",
    "les",
    "olu hayvan"
  ],
  ahiret: [
    "ahiret",
    "kiyamet",
    "hesap",
    "mizan",
    "amel",
    "zerre",
    "hayir",
    "ser",
    "cennet",
    "cehennem",
    "tarti",
    "agir",
    "hafif",
    "karsilik",
    "sonuc",
    "akibet"
  ],
  rahmet_magfiret: [
    "rahmet",
    "merhamet",
    "bagislama",
    "magfiret",
    "gunah",
    "tovbe",
    "umut",
    "affetme",
    "esirgeyen",
    "bagislayan",
    "genis",
    "yazarim"
  ],
  kissa: [
    "musa",
    "yusuf",
    "ibrahim",
    "nuh",
    "firavun",
    "ruya",
    "asa",
    "kardes",
    "baba",
    "kavim",
    "dedi",
    "dediler",
    "gerceklesme"
  ],
  emir_yasak: [
    "yapmayin",
    "yaklasmayin",
    "sakinin",
    "kacinin",
    "uzak",
    "uzak durun",
    "arastirmayin",
    "cekistirmesin",
    "yemeyin",
    "oldurmeyin",
    "emredildi",
    "buyurdu",
    "ana",
    "giybet",
    "zan",
    "kusur",
    "haksizlik",
    "batil",
    "mallar",
    "mallarinizi",
    "ticaret",
    "anne",
    "baba",
    "babaya",
    "iyilik",
    "icki",
    "kumar",
    "putlar",
    "fal"
  ]
};

const arabicSignals: Record<NonGeneralProfile, string[]> = {
  tevhid_birlik: ["احد", "واحد", "صمد", "وحد", "اله", "كفو"],
  dua_kulluk: ["عبد", "عون", "استعين", "دعو", "قرب", "جيب"],
  yol_hidayet: ["هدي", "نعم", "غضب", "ضلل", "صرط"],
  uyari_inkar: ["ختم", "سمع", "بصر", "قلب", "غشو", "كفر", "عذب", "مرض"],
  hukum_istisna: ["حرم", "ميتة", "دم", "دمو", "لحم", "خنزر", "خنزير", "غير", "بغي", "اضطر"],
  ahiret: ["عمل", "جزي", "وزن", "ثقل", "خف", "خير", "شر", "ذر", "جنة", "نار"],
  rahmet_magfiret: ["رحم", "غفر", "توب", "ذنب", "قنط", "عفو", "وسع", "كتب"],
  kissa: ["موسى", "يوسف", "ابرهيم", "نوح", "فرعون", "رءي", "عصو", "اخ", "اب", "قول"],
  emir_yasak: [
    "اكل",
    "مال",
    "قرب",
    "قتل",
    "ظنن",
    "غتب",
    "ولد",
    "امر",
    "نهي",
    "حكم",
    "خمر",
    "يسر",
    "نصب",
    "زلم",
    "رجس",
    "جنب",
    "بطل",
    "جسس",
    "كره",
    "تجر",
    "نفس"
  ]
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function stripArabicDiacritics(value: string): string {
  return value.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "");
}

function normalizeArabic(value: string | null | undefined): string {
  return stripArabicDiacritics(value ?? "").replace(/[^\u0600-\u06FF]/gu, "").trim();
}

interface DecisionSignals {
  tokens: Set<string>;
  arabicRoots: Set<string>;
  arabicLemmas: Set<string>;
  arabicWords: Set<string>;
}

type ProfileScores = Record<NonGeneralProfile, number>;

function collectDecisionSignals(context: VerseAnalysisContext): DecisionSignals {
  const tokens = new Set<string>();
  const arabicRoots = new Set<string>();
  const arabicLemmas = new Set<string>();
  const arabicWords = new Set<string>();

  const textValues = [
    ...context.keyTerms,
    ...context.translationComparison.commonPhrases,
    ...context.translationComparison.divergentPhrases,
    ...context.themesConcepts,
    context.primaryTranslation?.text ?? "",
    ...context.rootMeanings,
    ...context.deterministicNotes
  ];

  for (const value of textValues) {
    const normalized = normalizeText(value);
    if (!normalized) {
      continue;
    }

    for (const token of normalized.split(" ").filter(Boolean)) {
      tokens.add(token);
    }
  }

  for (const word of context.wordByWord) {
    if (word.meaning) {
      for (const token of normalizeText(word.meaning).split(" ").filter(Boolean)) {
        tokens.add(token);
      }
    }

    if (word.rootMeaning) {
      for (const token of normalizeText(word.rootMeaning).split(" ").filter(Boolean)) {
        tokens.add(token);
      }
    }

    const root = normalizeArabic(word.root);
    const lemma = normalizeArabic(word.lemma);
    const arabic = normalizeArabic(word.arabic);

    if (root) {
      arabicRoots.add(root);
    }
    if (lemma) {
      arabicLemmas.add(lemma);
    }
    if (arabic) {
      arabicWords.add(arabic);
    }
  }

  return { tokens, arabicRoots, arabicLemmas, arabicWords };
}

function hasAnyToken(signals: DecisionSignals, values: string[]): boolean {
  return values.some((value) => signals.tokens.has(normalizeText(value)));
}

function countTokens(signals: DecisionSignals, values: string[]): number {
  return values.filter((value) => signals.tokens.has(normalizeText(value))).length;
}

function hasAnyArabicSignal(signals: DecisionSignals, values: string[]): boolean {
  return values.some(
    (value) =>
      signals.arabicRoots.has(value) ||
      signals.arabicLemmas.has(value) ||
      signals.arabicWords.has(value)
  );
}

function countArabicSignals(signals: DecisionSignals, values: string[]): number {
  return values.filter(
    (value) =>
      signals.arabicRoots.has(value) ||
      signals.arabicLemmas.has(value) ||
      signals.arabicWords.has(value)
  ).length;
}

function profileScore(signals: DecisionSignals, profile: NonGeneralProfile): number {
  let score = 0;

  for (const signal of turkishSignals[profile]) {
    if (signals.tokens.has(normalizeText(signal))) {
      score += 2;
    }
  }

  for (const signal of arabicSignals[profile]) {
    if (
      signals.arabicRoots.has(signal) ||
      signals.arabicLemmas.has(signal) ||
      signals.arabicWords.has(signal)
    ) {
      score += 3;
    }
  }

  return score;
}

function hasStrongTawhidAnchor(signals: DecisionSignals): boolean {
  return (
    hasAnyToken(signals, ["tevhid", "birlik", "tek", "essiz", "denk", "benzer", "kufu", "kufuv", "hicbir"]) ||
    hasAnyArabicSignal(signals, ["احد", "واحد", "صمد", "كفو"])
  );
}

function hasStrongHukumIstisnaAnchor(signals: DecisionSignals): boolean {
  const hasFoodAnchor =
    hasAnyToken(signals, ["domuz", "kan", "et", "yiyecek", "les", "olu hayvan"]) ||
    hasAnyArabicSignal(signals, ["ميتة", "دم", "دمو", "لحم", "خنزر", "خنزير"]);
  const hasNecessityAnchor =
    hasAnyToken(signals, ["zorunluluk", "caresizlik", "istisna", "mecbur", "sinir"]) ||
    hasAnyArabicSignal(signals, ["اضطر", "بغي", "غير"]);
  const hasHaramAnchor =
    hasAnyToken(signals, ["haram", "yasak"]) || hasAnyArabicSignal(signals, ["حرم"]);

  return (hasFoodAnchor && hasNecessityAnchor) || (hasFoodAnchor && hasHaramAnchor);
}

function hasStrongAhiretAnchor(signals: DecisionSignals): boolean {
  return (
    hasAnyToken(signals, ["ahiret", "kiyamet", "hesap", "mizan", "cennet", "cehennem"]) ||
    hasAnyArabicSignal(signals, ["جنة", "نار", "وزن"]) ||
    (hasAnyToken(signals, ["zerre", "hayir", "ser"]) &&
      hasAnyToken(signals, ["gorur", "sonuc", "karsilik"])) ||
    (hasAnyToken(signals, ["agir", "hafif", "tarti"]) &&
      hasAnyToken(signals, ["sonuc", "akibet"]))
  );
}

function hasStrongRahmetAnchor(signals: DecisionSignals): boolean {
  const hasMercyCore =
    hasAnyToken(signals, ["rahmet", "merhamet", "bagislama", "magfiret"]) ||
    hasAnyArabicSignal(signals, ["رحم", "غفر"]);
  const hasRepentanceOrSin =
    hasAnyToken(signals, ["tovbe", "gunah", "umut", "affetme", "genis", "yazarim"]) ||
    hasAnyArabicSignal(signals, ["توب", "ذنب", "قنط", "عفو", "وسع", "كتب"]);

  return hasMercyCore && hasRepentanceOrSin;
}

function hasStrongKissaAnchor(signals: DecisionSignals): boolean {
  const hasName =
    hasAnyToken(signals, ["musa", "yusuf", "ibrahim", "nuh", "firavun"]) ||
    hasAnyArabicSignal(signals, ["موسى", "يوسف", "ابرهيم", "نوح", "فرعون"]);
  const hasConcreteScene =
    hasAnyToken(signals, ["ruya", "asa", "kardes", "baba", "kavim", "gerceklesme"]) ||
    hasAnyArabicSignal(signals, ["رءي", "عصو", "اخ", "اب"]);
  const hasNarrativeSpeech =
    hasAnyToken(signals, ["dedi", "dediler"]) || hasAnyArabicSignal(signals, ["قول"]);

  return hasName || (hasConcreteScene && hasNarrativeSpeech);
}

function hasStrongEmirYasakAnchor(signals: DecisionSignals): boolean {
  const imperativeCount = countTokens(signals, [
    "yapmayin",
    "yaklasmayin",
    "sakinin",
    "kacinin",
    "uzak",
    "uzak durun",
    "arastirmayin",
    "cekistirmesin",
    "yemeyin",
    "oldurmeyin",
    "buyurdu",
    "emredildi"
  ]);
  const moralCount = countTokens(signals, [
    "ana",
    "giybet",
    "zan",
    "kusur",
    "haksizlik",
    "anne",
    "baba",
    "iyilik",
    "mallar",
    "mallarinizi",
    "ticaret",
    "batil",
    "icki",
    "kumar",
    "putlar",
    "fal"
  ]);
  const familyCount = countTokens(signals, ["ana", "anne", "baba", "babaya", "iyilik"]);
  const arabicCount = countArabicSignals(signals, [
    "اكل",
    "مال",
    "قرب",
    "قتل",
    "ظنن",
    "غتب",
    "ولد",
    "خمر",
    "يسر",
    "نصب",
    "زلم",
    "رجس",
    "جنب",
    "بطل",
    "جسس",
    "كره",
    "تجر",
    "نفس"
  ]);

  return (
    (imperativeCount >= 1 && moralCount >= 1) ||
    moralCount >= 2 ||
    familyCount >= 2 ||
    arabicCount >= 3
  );
}

function hasStrongGeneralKarmaAnchor(signals: DecisionSignals): boolean {
  const clusterCount = [
    ["iman", "ahiret", "melek", "kitap", "peygamber", "inanan"],
    ["namaz", "zekat", "salat", "ibadet", "kulluk"],
    ["mal", "mallar", "infak", "veren", "yetim", "yoksul", "yolcu"],
    ["ahit", "vefa", "sabir", "savas", "darda", "zorda"],
    ["takva", "dogru", "iyilik"]
  ].filter((cluster) => hasAnyToken(signals, cluster)).length;

  const richAnchorCount = countTokens(signals, [
    "zekat",
    "namaz",
    "salat",
    "infak",
    "yetim",
    "yoksul",
    "yolcu",
    "ahit",
    "vefa",
    "sabir",
    "melek",
    "peygamber",
    "ahiret"
  ]);

  return clusterCount >= 4 && richAnchorCount >= 2;
}

export function selectVerseAnalysisProfile(context: VerseAnalysisContext): VerseAnalysisProfile {
  const signals = collectDecisionSignals(context);
  const scores: ProfileScores = {
    tevhid_birlik: profileScore(signals, "tevhid_birlik"),
    dua_kulluk: profileScore(signals, "dua_kulluk"),
    yol_hidayet: profileScore(signals, "yol_hidayet"),
    uyari_inkar: profileScore(signals, "uyari_inkar"),
    hukum_istisna: profileScore(signals, "hukum_istisna"),
    ahiret: profileScore(signals, "ahiret"),
    rahmet_magfiret: profileScore(signals, "rahmet_magfiret"),
    kissa: profileScore(signals, "kissa"),
    emir_yasak: profileScore(signals, "emir_yasak")
  };

  if (!hasStrongTawhidAnchor(signals)) {
    scores.tevhid_birlik = 0;
  }
  if (!hasStrongHukumIstisnaAnchor(signals)) {
    scores.hukum_istisna = 0;
  }
  if (!hasStrongAhiretAnchor(signals)) {
    scores.ahiret = 0;
  }
  if (!hasStrongRahmetAnchor(signals)) {
    scores.rahmet_magfiret = 0;
  }
  if (!hasStrongKissaAnchor(signals)) {
    scores.kissa = 0;
  }
  if (!hasStrongEmirYasakAnchor(signals)) {
    scores.emir_yasak = 0;
  }

  if (scores.rahmet_magfiret >= 4) {
    scores.dua_kulluk = Math.max(0, scores.dua_kulluk - 2);
  }
  if (scores.emir_yasak >= 4 && !hasStrongHukumIstisnaAnchor(signals)) {
    scores.hukum_istisna = 0;
  }
  // Anne-baba ekseni (17:23) emir dilini güçlendirir. Yalnız GERÇEK ebeveyn
  // token'ı sayılır: "iyilik" ve "buyurdu" mealde çok yaygın olduğu için bu
  // listede yer aldıklarında kural 126 ayette tetikleniyor ve 115'i alakasız
  // oluyordu (ör. 7:156 "bir iyilik yaz" / "Buyurdu ki" → emir_yasak +3 →
  // rahmet_magfiret -4 → 7-7 beraberlik → genel_karma).
  if (hasAnyToken(signals, ["anne", "baba", "babaya"])) {
    scores.emir_yasak += 3;
    scores.dua_kulluk = Math.max(0, scores.dua_kulluk - 3);
  }
  if (scores.emir_yasak >= 5) {
    scores.rahmet_magfiret = Math.max(0, scores.rahmet_magfiret - 4);
    scores.dua_kulluk = Math.max(0, scores.dua_kulluk - 1);
  }
  if (
    scores.emir_yasak >= 4 &&
    hasAnyToken(signals, [
      "zan",
      "giybet",
      "kusur",
      "arastirmayin",
      "cekistirmesin",
      "mallar",
      "haksizlik",
      "yemeyin",
      "oldurmeyin",
      "ticaret",
      "batil"
    ])
  ) {
    scores.rahmet_magfiret = Math.max(0, scores.rahmet_magfiret - 3);
  }
  if (
    scores.rahmet_magfiret >= 4 &&
    !hasAnyToken(signals, ["tovbe", "gunah", "umut", "affetme", "genis", "yazarim"]) &&
    !hasAnyArabicSignal(signals, ["توب", "ذنب", "قنط", "عفو", "وسع", "كتب"])
  ) {
    scores.rahmet_magfiret = Math.max(0, scores.rahmet_magfiret - 2);
  }
  if (scores.kissa >= 4) {
    scores.yol_hidayet = Math.max(0, scores.yol_hidayet - 1);
    scores.dua_kulluk = Math.max(0, scores.dua_kulluk - 1);
    scores.emir_yasak = Math.max(0, scores.emir_yasak - 1);
    if (
      hasAnyToken(signals, ["yusuf", "musa", "ibrahim", "nuh", "firavun", "ruya", "gerceklesme"]) ||
      hasAnyArabicSignal(signals, ["يوسف", "موسى", "ابرهيم", "نوح", "فرعون", "رءي"])
    ) {
      scores.emir_yasak = Math.max(0, scores.emir_yasak - 4);
    }
  }
  if (scores.ahiret >= 4) {
    scores.yol_hidayet = Math.max(0, scores.yol_hidayet - 1);
  }

  const orderedProfiles: NonGeneralProfile[] = [
    "hukum_istisna",
    "emir_yasak",
    "rahmet_magfiret",
    "ahiret",
    "kissa",
    "uyari_inkar",
    "dua_kulluk",
    "yol_hidayet",
    "tevhid_birlik"
  ];

  let selected: VerseAnalysisProfile = "genel_karma";
  let bestScore = 0;

  for (const profile of orderedProfiles) {
    const score = scores[profile];
    if (score > bestScore) {
      bestScore = score;
      selected = profile;
    }
  }

  const strongProfiles = orderedProfiles.filter((profile) => scores[profile] >= 4);
  const sortedScores = orderedProfiles
    .map((profile) => scores[profile])
    .sort((left, right) => right - left);

  if (hasStrongHukumIstisnaAnchor(signals) && scores.hukum_istisna >= 8) {
    return "hukum_istisna";
  }

  if (hasStrongGeneralKarmaAnchor(signals)) {
    return "genel_karma";
  }

  if (strongProfiles.length >= 3 && bestScore > 0 && bestScore - (sortedScores[1] ?? 0) <= 1) {
    return "genel_karma";
  }

  return bestScore >= 3 ? selected : "genel_karma";
}

export function buildMainMeaningAxisForProfile(
  profile: VerseAnalysisProfile,
  context?: VerseAnalysisContext
): string[] {
  const signals = context ? collectDecisionSignals(context) : null;

  switch (profile) {
    case "dua_kulluk":
      if (
        signals &&
        (hasAnyToken(signals, ["cagri", "cevap", "yakin"]) ||
          hasAnyArabicSignal(signals, ["دعو", "قرب", "جيب"]))
      ) {
        return ["Veriler bu ayette dua, yakınlık ve cevap ekseninin öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette kulluk ve yardım isteme ekseninin öne çıktığını gösteriyor."];
    case "yol_hidayet":
      return ["Veriler bu ayette yol, nimet ve sapma uyarısı ekseninin öne çıktığını gösteriyor."];
    case "uyari_inkar":
      if (signals && !hasAnyToken(signals, ["kalp", "isitme", "gorme", "perde", "muhur"])) {
        return ["Veriler bu ayette inkâr, uyarı ve sonuç ekseninin öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette kalp, işitme, görme ve sonuç uyarısı ekseninin öne çıktığını gösteriyor."];
    case "hukum_istisna":
      return ["Veriler bu ayette haram kılınan yiyecekler, zorunluluk ve sınır aşmama ekseninin öne çıktığını gösteriyor."];
    case "ahiret":
      if (
        signals &&
        (hasAnyToken(signals, ["agir", "hafif", "tarti", "mizan", "terazi", "agirlik"]) ||
          hasAnyArabicSignal(signals, ["وزن", "ثقل"]))
      ) {
        return ["Veriler bu ayette tartının ağır basması, amellerin karşılığı ve ahiret sonucunun öne çıktığını gösteriyor."];
      }
      if (signals && hasAnyToken(signals, ["hayir", "ser", "iyilik", "kotuluk", "gorur"])) {
        return ["Veriler bu ayette iyilik ve kötülüğün karşılığı ile hesap sonucunun öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette ahiret hesabı ve amellerin karşılığı ekseninin öne çıktığını gösteriyor."];
    case "rahmet_magfiret":
      if (
        signals &&
        (hasAnyToken(signals, ["tovbe", "gunah", "umut", "genis", "yazarim"]) ||
          hasAnyArabicSignal(signals, ["توب", "ذنب", "قنط", "وسع", "كتب"]))
      ) {
        return ["Veriler bu ayette rahmet, bağışlanma ve tövbe çağrısı ekseninin öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette Allah'ın rahmeti ve bağışlaması ekseninin öne çıktığını gösteriyor."];
    case "kissa":
      if (
        signals &&
        (hasAnyToken(signals, ["ruya", "asa", "gerceklesme", "ana", "baba", "anne baba", "elindeki", "soru"]) ||
          hasAnyArabicSignal(signals, ["رءي", "عصو", "اب", "يمن"]))
      ) {
        if (hasAnyToken(signals, ["yusuf", "ruya", "gerceklesme", "anne baba"])) {
          return ["Veriler bu ayette Yusuf kıssasında rüya, aile ve olay akışının öne çıktığını gösteriyor."];
        }
        if (
          hasAnyToken(signals, ["musa", "asa", "elindeki", "soru"]) ||
          hasAnyArabicSignal(signals, ["موسى", "عصو", "يمن"])
        ) {
          return ["Veriler bu ayette Musa'ya yöneltilen soru ve elindeki nesne sahnesinin öne çıktığını gösteriyor."];
        }
        return ["Veriler bu ayette kıssa içinde işaret edilen olay ve sahnenin öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette kıssa içinde kişi, olay ve konuşma ilişkisinin öne çıktığını gösteriyor."];
    case "emir_yasak":
      if (
        signals &&
        (hasAnyToken(signals, ["mallar", "haksizlik", "batil", "ticaret", "oldurmeyin", "oldurme", "can"]) ||
          hasAnyArabicSignal(signals, ["مول", "بطل", "تجر", "قتل", "نفس"]))
      ) {
        return ["Veriler bu ayette mallar, haksız kazanç, ticaret ölçüsü ve can dokunulmazlığı uyarısının öne çıktığını gösteriyor."];
      }
      if (signals && hasAnyToken(signals, ["anne", "baba", "iyilik"])) {
        return ["Veriler bu ayette emir, iyilik ve ahlaki sorumluluğun öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette sakındırma, yasak ve davranış uyarısı ekseninin öne çıktığını gösteriyor."];
    case "tevhid_birlik":
      if (signals && hasAnyToken(signals, ["denk", "benzer", "hicbir"])) {
        return ["Veriler bu ayette Allah'ın birliği ve benzersizliği ekseninin öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette Allah'ın birliği ekseninin öne çıktığını gösteriyor."];
    default:
      if (signals && hasStrongGeneralKarmaAnchor(signals)) {
        return ["Veriler bu ayette iman, ibadet, infak ve ahlaki sorumluluklarının birlikte anlatıldığını gösteriyor."];
      }
      if (context && context.keyTerms.length > 0) {
        return ["Veriler bu ayette birden fazla anlam alanının birlikte öne çıktığını gösteriyor."];
      }
      return ["Veriler bu ayette genel anlam bağlamının öne çıktığını gösteriyor."];
  }
}

export function buildTranslationDifferenceCategories(
  profile: VerseAnalysisProfile,
  hasComparisonData: boolean
): string[] {
  if (!hasComparisonData) {
    return [];
  }

  switch (profile) {
    case "dua_kulluk":
      return ["Meallerde kulluk ve yardım isteme vurgusu farklı söz dizimleriyle aktarılıyor."];
    case "yol_hidayet":
      return ["Meallerde yol, nimet ve sapma ifadeleri farklı şekillerde aktarılıyor."];
    case "uyari_inkar":
      return ["Meallerde kalp, perde ve azap ilişkisi farklı söz dizimleriyle kuruluyor."];
    case "hukum_istisna":
      return ["Meallerde yasaklanan yiyecekler ve zaruret ifadesi farklı şekillerde aktarılıyor."];
    case "ahiret":
      return ["Meallerde hesap, sonuç ve karşılık ifadeleri farklı karşılıklarla aktarılıyor."];
    case "rahmet_magfiret":
      return ["Meallerde rahmet, bağışlanma ve tövbe çağrısı farklı ifadelerle aktarılıyor."];
    case "kissa":
      return ["Meallerde kişi, konuşma ve olay sahnesi farklı biçimlerde aktarılıyor."];
    case "emir_yasak":
      return ["Meallerde yasak, sakındırma ve davranış uyarıları farklı ifadelerle aktarılıyor."];
    case "tevhid_birlik":
      return ["Meallerde birlik vurgusu farklı karşılıklarla aktarılıyor."];
    default:
      return [];
  }
}

export function buildWeakCorrespondenceGroups(
  profile: VerseAnalysisProfile,
  hasWeakCorrespondences: boolean
): string[] {
  if (!hasWeakCorrespondences) {
    return [];
  }

  switch (profile) {
    case "dua_kulluk":
      return ["kulluk ve yonelis fiilleri"];
    case "yol_hidayet":
      return ["yol ve yonelis ifadeleri"];
    case "uyari_inkar":
      return ["kalp, isitme ve gorme alani"];
    case "hukum_istisna":
      return ["yiyecek adlari", "zaruret/istisna ifadesi"];
    case "ahiret":
      return ["amel, karsilik ve sonuc ifadeleri"];
    case "rahmet_magfiret":
      return ["rahmet, bagislanma ve tovbe ifadeleri"];
    case "kissa":
      return ["kisi, olay ve anlati ifadeleri"];
    case "emir_yasak":
      return ["emir, yasak ve davranis uyarilari"];
    case "tevhid_birlik":
      return ["birlik vurgusunu tasiyan terimler"];
    default:
      return ["bazi kelime-karsilik eslesmeleri"];
  }
}

export function scoreKeyTermForProfile(label: string, profile: VerseAnalysisProfile): number {
  const normalized = normalizeText(label);

  const byProfile: Record<NonGeneralProfile, string[]> = {
    dua_kulluk: ["kulluk", "ibadet", "yardim", "dua"],
    yol_hidayet: ["yol", "nimet", "gazap", "sapma", "hidayet", "rehberlik"],
    uyari_inkar: ["kalp", "isitme", "gorme", "perde", "muhur", "azap", "hastalik"],
    hukum_istisna: ["haram", "kan", "et", "domuz", "zorunluluk", "les", "sinir"],
    ahiret: ["ahiret", "hesap", "mizan", "amel", "zerre", "hayir", "ser", "sonuc", "akibet", "tarti", "terazi", "agirlik"],
    rahmet_magfiret: ["rahmet", "merhamet", "bagislama", "magfiret", "tovbe", "gunah", "umut", "genis"],
    kissa: ["musa", "yusuf", "ibrahim", "nuh", "firavun", "ruya", "asa", "kardes", "baba", "gerceklesme", "elindeki", "sahne", "soru"],
    emir_yasak: ["yasak", "sakindirma", "giybet", "zan", "anne", "baba", "iyilik", "haksizlik", "mallar", "yemeyin", "ticaret", "batil", "oldurme", "can"],
    tevhid_birlik: ["allah", "birlik", "tek", "essiz", "samed", "denk", "benzer", "benzersizlik"]
  };

  if (profile === "genel_karma") {
    return 0;
  }

  return byProfile[profile].reduce(
    (score, token) => score + (normalized.includes(normalizeText(token)) ? 1 : 0),
    0
  );
}
