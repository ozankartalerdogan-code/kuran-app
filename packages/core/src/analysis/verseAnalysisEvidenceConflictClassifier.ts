export type EvidenceConflictQualityClass =
  | "likelyGoodSuppression"
  | "likelyUsefulV4Addition"
  | "likelyRiskyDrop"
  | "genericNeutral"
  | "needsManualReview";

export type EvidenceConflictReasonCode =
  | "generic_term_suppressed"
  | "generic_term_added"
  | "source_backed_content_added"
  | "profile_relevant_content_dropped"
  | "content_term_dropped"
  | "generic_theological_term"
  | "particle_or_formula"
  | "proper_name_content"
  | "content_needs_profile_check"
  | "unknown_conflict_type";

export type EvidenceConflictTermFamily =
  | "generic_theological"
  | "particle_or_formula"
  | "belief_term"
  | "afterlife_term"
  | "warning_term"
  | "mercy_term"
  | "story_term"
  | "law_term"
  | "action_term"
  | "nature_scene_term"
  | "proper_name"
  | "content_term"
  | "unclear";

export interface EvidenceConflictClassificationInput {
  conflictType: string;
  value: string;
  selectedProfile: string;
}

export interface EvidenceConflictClassification {
  qualityClass: EvidenceConflictQualityClass;
  reasonCode: EvidenceConflictReasonCode;
  termFamily: EvidenceConflictTermFamily;
  isGeneric: boolean;
  isContent: boolean;
  isProfileRelevant: boolean;
}

interface TermRule {
  family: EvidenceConflictTermFamily;
  patterns: string[];
  profiles?: string[];
}

interface ManualReviewDecisionRule {
  normalizedValue: string;
  conflictTypes: string[];
  qualityClass: EvidenceConflictQualityClass;
  reasonCode: EvidenceConflictReasonCode;
  termFamily: EvidenceConflictTermFamily;
  isGeneric: boolean;
  isContent: boolean;
}

const genericTheologicalPatterns = ["allah", "الل ه", "ٱلل ه", "rab", "rabb", "ilah"];

const particleOrFormulaPatterns = [
  "iste o",
  "işte o",
  "sonra",
  "ardindan",
  "ardından",
  "once",
  "önce",
  "ne zaman",
  "o zaman",
  "dığında",
  "diginda",
  "ile beraber",
  "baska",
  "başka",
  "disinda",
  "dışında",
  "icinde",
  "içinde",
  "uzerine",
  "üzerine",
  "arasinda",
  "arasında",
  "yanında",
  "katında",
  "bazi",
  "bazı",
  "cok pek cok",
  "çok pek çok",
  "hepsi",
  "nerede",
  "degil",
  "değil",
  "dedi",
  "geldi",
  "getirdi",
  "oldu"
];

const contentRules: TermRule[] = [
  {
    family: "belief_term",
    profiles: ["tevhid", "uyari", "genel", "ahiret"],
    patterns: ["iman", "kufr", "küfr", "kufretti", "küfretti", "sirk", "şirk", "nifak", "takva", "takva sahibi"]
  },
  {
    family: "afterlife_term",
    profiles: ["ahiret", "uyari", "genel"],
    patterns: ["ates", "ateş", "cehennem", "cennet", "hesap", "amel", "karsilik", "karşılık", "tarti", "tartı", "mizan", "agir", "ağır", "agirlik", "ağırlık", "akıbet"]
  },
  {
    family: "warning_term",
    profiles: ["uyari", "ahiret", "genel"],
    patterns: ["hastalik", "hastalık", "kalp", "kulak", "isit", "işit", "goz", "göz", "perde", "muhur", "mühür", "azap", "gazap", "seytan", "şeytan", "azgin", "azgın", "husran", "hüsran", "kotu", "kötü"]
  },
  {
    family: "mercy_term",
    profiles: ["rahmet", "dua", "genel"],
    patterns: ["rahmet", "merhamet", "bagis", "bağış", "tovbe", "tövbe", "umut", "umitsiz", "ümitsiz", "lutuf", "lütuf"]
  },
  {
    family: "story_term",
    profiles: ["kissa", "genel"],
    patterns: ["adem", "âdem", "musa", "yusuf", "ibrahim", "nuh", "firavun", "secde", "ruya", "rüya", "yildiz", "yıldız", "kardes", "kardeş", "baba"]
  },
  {
    family: "law_term",
    profiles: ["hukum", "emir", "genel"],
    patterns: ["haram", "helal", "yasak", "hukum", "hüküm", "ticaret", "mal", "can", "oldur", "öldür", "kistas", "kıstas", "adalet"]
  },
  {
    family: "action_term",
    profiles: ["dua", "yol", "emir", "genel", "uyari"],
    patterns: ["yardim", "yardım", "rizik", "rızık", "rızık verdi", "satın almak", "satin almak", "degistir", "değiştir", "kâr etmek", "kar etmek", "alay etmek", "fark etmek", "karsilasma", "karşılaşma", "gecip gitmek", "geçip gitmek", "aydınlatmak", "aydinlatmak", "soyle", "söyle", "dogru soyleyen", "doğru söyleyen", "yerine getirmek", "ayirmak", "ayırmak", "actı", "açtı", "dokmek", "dökmek", "tasidi", "taşıdı", "kacin", "kaçın", "israf", "casusluk", "boyun eg", "boyun eğ", "yukselt", "yükselt", "dust", "düşt", "dusmek", "düşmek"]
  },
  {
    family: "nature_scene_term",
    profiles: ["genel", "uyari", "tevhid"],
    patterns: ["gok", "gök", "yer", "yagmur", "yağmur", "saganak", "sağanak", "gok gurultusu", "gök gürültüsü", "isık", "ışık", "nur"]
  },
  {
    family: "proper_name",
    profiles: ["kissa", "genel"],
    patterns: ["adem", "âdem", "musa", "yusuf", "ibrahim", "nuh", "firavun"]
  },
  {
    family: "content_term",
    patterns: ["kitap", "elci", "elçi", "insan", "insanlar", "dusman", "düşman", "yurt", "ev", "goz kaynak", "göz kaynak", "hacc", "hac delil", "delil", "ilim", "yol", "nimet"]
  }
];

const manualReviewDecisionBatch1: ManualReviewDecisionRule[] = [
  {
    normalizedValue: "ش ي ء ش ى ء sey bir sey",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ٱل م و م ن ين م و م ن mumin",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "belief_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ق ل يل ا ق ل يل az biraz",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ٱلد ن ي ا د ن يا dunya",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "afterlife_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ش ي ـ ا ش ى ء sey bir sey",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "و ك ف ى ك ف ى sana yeter",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_added",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ٱل ج ب ال ج ب ل dag",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "nature_scene_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ل يم ا ل يم acı veren",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "warning_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "م ب ين م ب ين apacık",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ٱلص ـ ل ح ت صال ح ة ıslah iyi olmak",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ع س ى ع س ى umulur ki",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_added",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ع س ى عسي umulur ki",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_added",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "س ن ة س ن ة yıl",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyGoodSuppression",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ء ال ا ل the belirtec",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ٱل م ج ر م ين م ج ر م suclular",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "warning_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱلش م س ش م س gunes",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "nature_scene_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ف و ق ف و ق ustunde",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ٱل م ج ر م ون م ج ر م suclular",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "warning_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱل م ل ا م ل ا ileri gelenler",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "story_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ع ل م ا ع ل م daha iyi bilir",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ع اد عاد ad kavmi",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "story_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ف ذ وق وا ذاق tadın",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "warning_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "و ب ش ر ب ش ر mujde ver",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱل ب ر ب ر iyilik",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱلص ور ص ور sur",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "afterlife_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ن ى ا ن ى nasıl",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_added",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ت ح ت ت ح ت altında",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "خ ل د ون خال د ebedi kalan",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "afterlife_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ك ي ف ك ي ف nasıl",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "و ح د واح د birlemek tek",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "belief_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱل ا ن ه ر ن ه ر ırmaklar",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "afterlife_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ح م يم ح م يم kaynar su",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "afterlife_term",
    isGeneric: false,
    isContent: true
  }
];

const manualReviewDecisionBatch3: ManualReviewDecisionRule[] = [
  {
    normalizedValue: "ٱل ع ر ش ع ر ش catıları",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_added",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "س ا ء ساء onları uzer",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ز و ج ا ز و ج es cift",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "content_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ب ن ي ب ن ى oglum",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "story_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱل غ ن ي غ ن ي mustagni",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "content_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱل م خ ل ص ين م خ ل ص secilmis",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "content_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ب ا س ن ا ب ا س savas",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "law_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ت س ت ع ج ل ون اس ت ع ج ل acele istemek",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "و ت ع ل ى ت عال ى yucelmek",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "و ح اق حاق kusattı",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱل غ ب ر ين غاب ر geride kalanlar",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "story_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱل م ب ين م ب ين apacık",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "genericNeutral",
    reasonCode: "generic_term_suppressed",
    termFamily: "particle_or_formula",
    isGeneric: true,
    isContent: false
  },
  {
    normalizedValue: "ٱل م ش ر ك ين م ش ر ك musrik",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "belief_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ٱلش ر ش ر ser",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "warning_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ب ن ا ء ه م اب ن ogul",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "story_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ب و ب باب kapı",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "content_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ع وذ ع ذ sıgınmak",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "action_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ا ز و ج ك م ز و ج es cift",
    conflictTypes: ["keyTermMissingInV4", "profileRelevantTermDropped"],
    qualityClass: "likelyRiskyDrop",
    reasonCode: "content_term_dropped",
    termFamily: "content_term",
    isGeneric: false,
    isContent: true
  },
  {
    normalizedValue: "ب غ ل م غ لام ogul",
    conflictTypes: ["keyTermOnlyInV4"],
    qualityClass: "likelyUsefulV4Addition",
    reasonCode: "source_backed_content_added",
    termFamily: "story_term",
    isGeneric: false,
    isContent: true
  }
];

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s:\-./]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function displayValue(value: string): string {
  const parts = value.split("|").map((part) => part.trim());
  return parts.at(-1) ?? value;
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.map((needle) => normalize(needle)).some((needle) => haystack.includes(needle));
}

function profileMatches(selectedProfile: string, ruleProfiles?: string[]): boolean {
  if (!ruleProfiles || ruleProfiles.length === 0) {
    return false;
  }

  const normalizedProfile = normalize(selectedProfile);
  return ruleProfiles.some((profile) => normalizedProfile.includes(normalize(profile)));
}

function classifyManualReviewDecisionBatch1(
  input: EvidenceConflictClassificationInput
): EvidenceConflictClassification | null {
  const normalizedValue = normalize(input.value);
  const decision = [...manualReviewDecisionBatch1, ...manualReviewDecisionBatch3].find(
    (rule) => rule.normalizedValue === normalizedValue && rule.conflictTypes.includes(input.conflictType)
  );

  if (!decision) {
    return null;
  }

  return {
    qualityClass: decision.qualityClass,
    reasonCode: decision.reasonCode,
    termFamily: decision.termFamily,
    isGeneric: decision.isGeneric,
    isContent: decision.isContent,
    isProfileRelevant: false
  };
}

function classifyTerm(value: string, selectedProfile: string): Pick<
  EvidenceConflictClassification,
  "termFamily" | "isGeneric" | "isContent" | "isProfileRelevant"
> {
  const label = normalize(displayValue(value));
  const fullValue = normalize(value);
  const searchValue = `${label} ${fullValue}`;

  if (includesAny(searchValue, genericTheologicalPatterns)) {
    return {
      termFamily: "generic_theological",
      isGeneric: true,
      isContent: false,
      isProfileRelevant: false
    };
  }

  if (includesAny(searchValue, particleOrFormulaPatterns)) {
    return {
      termFamily: "particle_or_formula",
      isGeneric: true,
      isContent: false,
      isProfileRelevant: false
    };
  }

  for (const rule of contentRules) {
    if (includesAny(searchValue, rule.patterns)) {
      return {
        termFamily: rule.family,
        isGeneric: false,
        isContent: true,
        isProfileRelevant: profileMatches(selectedProfile, rule.profiles)
      };
    }
  }

  return {
    termFamily: "unclear",
    isGeneric: false,
    isContent: false,
    isProfileRelevant: false
  };
}

export function classifyEvidenceConflict(
  input: EvidenceConflictClassificationInput
): EvidenceConflictClassification {
  const manualReviewDecision = classifyManualReviewDecisionBatch1(input);

  if (manualReviewDecision) {
    return manualReviewDecision;
  }

  const term = classifyTerm(input.value, input.selectedProfile);

  if (term.isGeneric) {
    return {
      ...term,
      qualityClass: "genericNeutral",
      reasonCode:
        term.termFamily === "generic_theological" ? "generic_theological_term" : "particle_or_formula"
    };
  }

  if (input.conflictType === "keyTermOnlyInV4") {
    if (term.isContent) {
      return {
        ...term,
        qualityClass: "likelyUsefulV4Addition",
        reasonCode: term.isProfileRelevant ? "source_backed_content_added" : "content_needs_profile_check"
      };
    }

    return {
      ...term,
      qualityClass: "needsManualReview",
      reasonCode: "content_needs_profile_check"
    };
  }

  if (input.conflictType === "keyTermMissingInV4" || input.conflictType === "profileRelevantTermDropped") {
    if (term.isContent) {
      return {
        ...term,
        qualityClass: "likelyRiskyDrop",
        reasonCode: term.isProfileRelevant ? "profile_relevant_content_dropped" : "content_term_dropped"
      };
    }

    return {
      ...term,
      qualityClass: "needsManualReview",
      reasonCode: "content_needs_profile_check"
    };
  }

  return {
    ...term,
    qualityClass: "needsManualReview",
    reasonCode: "unknown_conflict_type"
  };
}
