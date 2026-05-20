import type { VerseAnalysisContext } from "./verseAnalysisContext";
import type { VerseAnalysisProfile } from "./verseAnalysisDecision";

type WeakCorrespondence = VerseAnalysisContext["fidelitySignals"]["weakOrMissingCorrespondences"][number];

interface FilteredWeakCandidate extends WeakCorrespondence {
  label: string;
  filterClass: "visible_candidate" | "suppressed";
  suppressionReason?: string;
}

export interface ProfileSpecificWeakGroup {
  key: string;
  label: string;
  count: number;
}

export interface ProfileSpecificWeakPreviewResult {
  userFacingPreview: string[];
  userFacingGroups: ProfileSpecificWeakGroup[];
  debugOnlyGroups: ProfileSpecificWeakGroup[];
  suppressedCount: number;
}

const suffixOrParticleArabic = new Set([
  "وا۟",
  "وٓا۟",
  "وْا۟",
  "ونَ",
  "وْنَ",
  "نَا",
  "نَٰ",
  "نَآ",
  "نَّ",
  "نَّا",
  "نِى",
  "نِىٓ",
  "نَ",
  "نِ",
  "هَا",
  "هَآ",
  "هُنَّ",
  "هُمَا",
  "هِنَّ",
  "تُمْ",
  "تُم",
  "تُمُو",
  "تُمُ",
  "تَ",
  "تُ",
  "كُمَا"
]);

const weakLemmaSet = new Set(["أَمّا", "سَوْف"]);

const userFacingLabels: Record<string, string> = {
  "yiyecek ve yasakli maddeler": "Yiyecek ve yasak kapsamındaki ifadeler",
  "zaruret, istisna ve sorumluluk": "Zaruret ve istisna ifadeleri",
  "ahlaki yasak ve davranis uyarilari": "Davranış uyarıları",
  "amel, olcu ve ahiret sonucu": "Amel, ölçü ve sonuç ifadeleri",
  "rahmet, tovbe ve umut": "Rahmet ve bağışlanma ifadeleri",
  "kissa sahnesi ve olay unsurlari": "Kıssa sahnesiyle ilgili ifadeler",
  "yol, hidayet ve sapma": "Yol ve hidayet ifadeleri",
  "kulluk, dua ve yardim": "Kulluk ve dua ifadeleri",
  "diger kelime eslesme adaylari": "Ek kelime eşleşme adayları"
};

const groupRules: Array<{
  key: string;
  roots: Set<string>;
  lemmas: Set<string>;
  profiles?: Set<VerseAnalysisProfile>;
}> = [
  {
    key: "yiyecek ve yasakli maddeler",
    roots: new Set(["دمو", "لحم", "خنزر", "خمر", "يسر", "نصب", "زلم", "رجس"]),
    lemmas: new Set(["دَم", "لَحْم", "خِنزِير", "خَمْر", "مَيْسِر", "نُصُب", "أَزْلام", "رِجْس"]),
    profiles: new Set(["hukum_istisna", "emir_yasak"])
  },
  {
    key: "zaruret, istisna ve sorumluluk",
    roots: new Set(["ضرر", "أثم", "بغي", "جنب"]),
    lemmas: new Set(["اضْطُرَّ", "إِثْم", "اجْتَنَبُ"]),
    profiles: new Set(["hukum_istisna", "emir_yasak"])
  },
  {
    key: "ahlaki yasak ve davranis uyarilari",
    roots: new Set(["جنب", "أثم", "جسس", "ظنن", "غيب", "سخر", "لمز", "لقب", "تجر", "رضو"]),
    lemmas: new Set(["اجْتَنَبُ", "إِثْم", "تَجَسَّسُ", "تِجارَة", "تَراض"]),
    profiles: new Set(["emir_yasak"])
  },
  {
    key: "amel, olcu ve ahiret sonucu",
    roots: new Set(["ثقل", "ذرر", "وزن", "عمل", "خير", "شرر", "لقي"]),
    lemmas: new Set(["ثَقُلَتْ", "ذَرَّة", "مِثْقال"]),
    profiles: new Set(["ahiret"])
  },
  {
    key: "rahmet, tovbe ve umut",
    roots: new Set(["سرف", "قنط", "غفر", "رحم", "توب", "رجو"]),
    lemmas: new Set(["أَسْرَفَ", "قَنَطُ", "يَرْجُوا۟"]),
    profiles: new Set(["rahmet_magfiret"])
  },
  {
    key: "kissa sahnesi ve olay unsurlari",
    roots: new Set(["رفع", "أبو", "عرش", "خرر", "أول", "سجن", "بدو", "قصص", "عصو", "سجد", "رءي"]),
    lemmas: new Set(["رَفَعَ", "أَبَوان", "عَرْش", "خَرَّ", "تَأْوِيل", "سِجْن", "بَدْو", "عَصَا", "سَجَدَ"]),
    profiles: new Set(["kissa"])
  },
  {
    key: "yol, hidayet ve sapma",
    roots: new Set(["هدي", "ضلل", "صراط", "نعم", "غضب", "شرق", "غرب"]),
    lemmas: new Set(["مَشْرِق", "مَغْرِب"]),
    profiles: new Set(["yol_hidayet"])
  },
  {
    key: "kulluk, dua ve yardim",
    roots: new Set(["عبد", "عون", "دعو", "رجو"]),
    lemmas: new Set([]),
    profiles: new Set(["dua_kulluk"])
  }
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function classifyWeakCorrespondence(entry: WeakCorrespondence): FilteredWeakCandidate {
  const lemma = clean(entry.lemma);
  const root = clean(entry.root);
  const arabic = clean(entry.arabic);
  const label = lemma || root || arabic;

  if (!lemma && !root) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "no_lemma_root" };
  }

  if (!label || label.length <= 2) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "short_label" };
  }

  if (suffixOrParticleArabic.has(arabic)) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "suffix_or_particle_arabic" };
  }

  if (weakLemmaSet.has(lemma)) {
    return { ...entry, label, filterClass: "suppressed", suppressionReason: "weak_formula_lemma" };
  }

  return { ...entry, label, filterClass: "visible_candidate" };
}

function groupCandidate(profile: VerseAnalysisProfile, candidate: FilteredWeakCandidate): string {
  const root = clean(candidate.root);
  const lemma = clean(candidate.lemma);
  const matchedRule = groupRules.find((rule) => {
    const profileMatches = !rule.profiles || rule.profiles.has(profile);
    return profileMatches && (rule.roots.has(root) || rule.lemmas.has(lemma));
  });

  return matchedRule?.key ?? "diger kelime eslesme adaylari";
}

function toGroups(grouped: Map<string, Set<string>>): ProfileSpecificWeakGroup[] {
  return Array.from(grouped.entries()).map(([key, labels]) => ({
    key,
    label: userFacingLabels[key] ?? key,
    count: labels.size
  }));
}

function buildUserFacingPreview(groups: ProfileSpecificWeakGroup[]): string[] {
  return groups.slice(0, 2).map((group) => {
    return `${group.label}: bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`;
  });
}

export function buildProfileSpecificWeakPreview(input: {
  profile: VerseAnalysisProfile;
  weakOrMissingCorrespondences: WeakCorrespondence[];
}): ProfileSpecificWeakPreviewResult {
  const classified = input.weakOrMissingCorrespondences.map(classifyWeakCorrespondence);
  const visibleCandidates = classified.filter((candidate) => candidate.filterClass === "visible_candidate");
  const suppressedCount = classified.length - visibleCandidates.length;
  const userFacing = new Map<string, Set<string>>();
  const debugOnly = new Map<string, Set<string>>();

  for (const candidate of visibleCandidates) {
    const groupKey = groupCandidate(input.profile, candidate);
    const targetMap = groupKey === "diger kelime eslesme adaylari" ? debugOnly : userFacing;
    const labels = targetMap.get(groupKey) ?? new Set<string>();
    labels.add(candidate.label);
    targetMap.set(groupKey, labels);
  }

  const userFacingGroups = toGroups(userFacing);
  const debugOnlyGroups = toGroups(debugOnly);

  return {
    userFacingPreview: buildUserFacingPreview(userFacingGroups),
    userFacingGroups,
    debugOnlyGroups,
    suppressedCount
  };
}
