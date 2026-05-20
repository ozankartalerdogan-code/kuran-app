import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildVerseAnalysisContext } from "../packages/core/src/analysis/verseAnalysisContext.ts";
import { buildVerseAnalysisPreview } from "../packages/core/src/analysis/verseAnalysisPreview.ts";
import { verseAnalysisQualitySet } from "../packages/core/src/analysis/verseAnalysisQualitySet.ts";

interface MissingMeaningEntry {
  surahId: number;
  ayahNumber: number;
  wordIndex: number;
  lemma: string | null;
  root: string | null;
  arabic: string | null;
  reason: string;
}

interface FilteredCandidate extends MissingMeaningEntry {
  label: string;
  filterClass: "visible_candidate" | "suppressed";
  suppressionReason?: string;
}

interface GroupedWeakCandidate {
  group: string;
  labels: string[];
  count: number;
}

interface TargetVerse {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  setMembership: string[];
}

interface TargetAuditEntry {
  verseKey: string;
  setMembership: string[];
  selectedProfile: string;
  existingWeakCorrespondencesPreview: string[];
  filteredWeakGroups: GroupedWeakCandidate[];
  filteredUserFacingPreview: string[];
  profileSpecificGroups: GroupedWeakCandidate[];
  profileSpecificUserFacingPreview: string[];
  genericDebugGroups: GroupedWeakCandidate[];
  hiddenAsGenericOnly: boolean;
  rawMissingCount: number;
  filteredCandidateCount: number;
  suppressedCount: number;
  specificCandidateCount: number;
  genericDebugCandidateCount: number;
  notes: string[];
}

const missingPath = path.join("data", "word-analysis", "reports", "missing-meanings.json");
const outputPath = path.join(
  "data",
  "analysis-snapshots",
  "profile-specific-weak-preview-target-set.sample.json"
);
const docPath = path.join("docs", "PROFILE_SPECIFIC_WEAK_PREVIEW_TARGET_SET.md");

const uiEyeTestVerseKeys = [
  "5:3",
  "5:90",
  "2:173",
  "6:145",
  "2:219",
  "2:177",
  "5:2",
  "6:141",
  "2:282",
  "2:259",
  "2:233",
  "4:29",
  "5:110",
  "2:61",
  "4:102"
];

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

const groupRules: Array<{
  group: string;
  roots: Set<string>;
  lemmas: Set<string>;
  profiles?: Set<string>;
}> = [
  {
    group: "yiyecek ve yasakli maddeler",
    roots: new Set(["دمو", "لحم", "خنزر", "خمر", "يسر", "نصب", "زلم", "رجس"]),
    lemmas: new Set(["دَم", "لَحْم", "خِنزِير", "خَمْر", "مَيْسِر", "نُصُب", "أَزْلام", "رِجْس"]),
    profiles: new Set(["hukum_istisna", "emir_yasak"])
  },
  {
    group: "zaruret, istisna ve sorumluluk",
    roots: new Set(["ضرر", "أثم", "بغي", "جنب"]),
    lemmas: new Set(["اضْطُرَّ", "إِثْم", "اجْتَنَبُ"]),
    profiles: new Set(["hukum_istisna", "emir_yasak"])
  },
  {
    group: "ahlaki yasak ve davranis uyarilari",
    roots: new Set(["جنب", "أثم", "جسس", "ظنن", "غيب", "سخر", "لمز", "لقب", "تجر", "رضو"]),
    lemmas: new Set(["اجْتَنَبُ", "إِثْم", "تَجَسَّسُ", "تِجارَة", "تَراض"]),
    profiles: new Set(["emir_yasak"])
  },
  {
    group: "amel, olcu ve ahiret sonucu",
    roots: new Set(["ثقل", "ذرر", "وزن", "عمل", "خير", "شرر", "لقي"]),
    lemmas: new Set(["ثَقُلَتْ", "ذَرَّة", "مِثْقال"]),
    profiles: new Set(["ahiret"])
  },
  {
    group: "rahmet, tovbe ve umut",
    roots: new Set(["سرف", "قنط", "غفر", "رحم", "توب", "رجو"]),
    lemmas: new Set(["أَسْرَفَ", "قَنَطُ", "يَرْجُوا۟"]),
    profiles: new Set(["rahmet_magfiret"])
  },
  {
    group: "kissa sahnesi ve olay unsurlari",
    roots: new Set(["رفع", "أبو", "عرش", "خرر", "أول", "سجن", "بدو", "قصص", "عصو", "سجد", "رءي"]),
    lemmas: new Set(["رَفَعَ", "أَبَوان", "عَرْش", "خَرَّ", "تَأْوِيل", "سِجْن", "بَدْو", "عَصَا", "سَجَدَ"]),
    profiles: new Set(["kissa"])
  },
  {
    group: "yol, hidayet ve sapma",
    roots: new Set(["هدي", "ضلل", "صراط", "نعم", "غضب", "شرق", "غرب"]),
    lemmas: new Set(["مَشْرِق", "مَغْرِب"]),
    profiles: new Set(["yol_hidayet"])
  },
  {
    group: "kulluk, dua ve yardim",
    roots: new Set(["عبد", "عون", "دعو", "رجو"]),
    lemmas: new Set([]),
    profiles: new Set(["dua_kulluk"])
  }
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function parseVerseKey(verseKey: string): [number, number] {
  const [surahId, ayahNumber] = verseKey.split(":").map(Number);
  return [surahId, ayahNumber];
}

function verseKeyOf(entry: { surahId: number; ayahNumber: number }): string {
  return `${entry.surahId}:${entry.ayahNumber}`;
}

function compareVerseKeys(left: string, right: string): number {
  const [leftSurah, leftAyah] = parseVerseKey(left);
  const [rightSurah, rightAyah] = parseVerseKey(right);
  return leftSurah === rightSurah ? leftAyah - rightAyah : leftSurah - rightSurah;
}

function classifyMissing(entry: MissingMeaningEntry): FilteredCandidate {
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

function groupCandidates(profile: string, candidates: FilteredCandidate[]): GroupedWeakCandidate[] {
  const grouped = new Map<string, string[]>();

  for (const candidate of candidates) {
    const root = clean(candidate.root);
    const lemma = clean(candidate.lemma);
    const matchedRule = groupRules.find((rule) => {
      const profileMatches = !rule.profiles || rule.profiles.has(profile);
      return profileMatches && (rule.roots.has(root) || rule.lemmas.has(lemma));
    });
    const group = matchedRule?.group ?? "diger kelime eslesme adaylari";
    const label = lemma || root || clean(candidate.arabic);
    const labels = grouped.get(group) ?? [];
    if (!labels.includes(label)) {
      labels.push(label);
    }
    grouped.set(group, labels);
  }

  return Array.from(grouped.entries()).map(([group, labels]) => ({
    group,
    labels: labels.slice(0, 8),
    count: labels.length
  }));
}

function buildUserFacingPreview(groups: GroupedWeakCandidate[]): string[] {
  return groups.slice(0, 4).map((group) => {
    if (group.group === "diger kelime eslesme adaylari") {
      return "Bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.";
    }

    return `${group.group} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`;
  });
}

function isSpecificGroup(group: string): boolean {
  return group !== "diger kelime eslesme adaylari";
}

function groupByVerse<T extends { surahId: number; ayahNumber: number }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const verseKey = verseKeyOf(item);
    const current = map.get(verseKey) ?? [];
    current.push(item);
    map.set(verseKey, current);
  }
  return map;
}

function buildTargets(): TargetVerse[] {
  const targetMap = new Map<string, TargetVerse>();

  for (const item of verseAnalysisQualitySet) {
    const current = targetMap.get(item.verseKey);
    if (current) {
      current.setMembership.push("quality_set");
      continue;
    }
    targetMap.set(item.verseKey, {
      verseKey: item.verseKey,
      surahId: item.surahId,
      ayahNumber: item.ayahNumber,
      setMembership: ["quality_set"]
    });
  }

  for (const verseKey of uiEyeTestVerseKeys) {
    const [surahId, ayahNumber] = parseVerseKey(verseKey);
    const current = targetMap.get(verseKey);
    if (current) {
      if (!current.setMembership.includes("ui_eye_test")) {
        current.setMembership.push("ui_eye_test");
      }
      continue;
    }
    targetMap.set(verseKey, {
      verseKey,
      surahId,
      ayahNumber,
      setMembership: ["ui_eye_test"]
    });
  }

  return Array.from(targetMap.values()).sort((left, right) => compareVerseKeys(left.verseKey, right.verseKey));
}

function buildNotes(entry: Omit<TargetAuditEntry, "notes">): string[] {
  const notes: string[] = [];
  if (entry.profileSpecificGroups.length > 0) {
    notes.push("profile-specific weak kullanıcı-facing gösterilebilir");
  }
  if (entry.hiddenAsGenericOnly) {
    notes.push("filtreli aday var ama generic/debug olarak gizlenmeli");
  }
  if (entry.existingWeakCorrespondencesPreview.length > 0 && entry.profileSpecificGroups.length === 0) {
    notes.push("mevcut preview weak gösteriyor; profile-specific kural bunu kullanıcı-facing gizler");
  }
  if (entry.profileSpecificGroups.length === 0 && entry.genericDebugGroups.length === 0) {
    notes.push("weak için kullanıcı-facing aday yok");
  }
  if (entry.profileSpecificGroups.some((group) => group.count > 6)) {
    notes.push("specific grup içinde aday sayısı yüksek; UI'da kısa metinle sınırlanmalı");
  }
  return notes;
}

function scoreBest(entry: TargetAuditEntry): number {
  return entry.specificCandidateCount * 4 + entry.profileSpecificGroups.length * 20 - entry.genericDebugCandidateCount;
}

function scoreRisk(entry: TargetAuditEntry): number {
  return (
    entry.genericDebugCandidateCount * 3 +
    entry.suppressedCount +
    (entry.hiddenAsGenericOnly ? 20 : 0) +
    (entry.existingWeakCorrespondencesPreview.length > 0 && entry.profileSpecificGroups.length === 0 ? 15 : 0)
  );
}

async function main(): Promise<void> {
  const missing = JSON.parse(await readFile(missingPath, "utf-8")) as MissingMeaningEntry[];
  const classified = missing.map(classifyMissing);
  const rawByVerse = groupByVerse(missing);
  const visibleByVerse = groupByVerse(classified.filter((entry) => entry.filterClass === "visible_candidate"));
  const suppressedByVerse = groupByVerse(classified.filter((entry) => entry.filterClass === "suppressed"));
  const targets = buildTargets();

  const entries: TargetAuditEntry[] = [];

  for (const target of targets) {
    const context = await buildVerseAnalysisContext(target.surahId, target.ayahNumber);
    const preview = buildVerseAnalysisPreview(context);
    const visibleCandidates = visibleByVerse.get(target.verseKey) ?? [];
    const suppressedCandidates = suppressedByVerse.get(target.verseKey) ?? [];
    const filteredWeakGroups = groupCandidates(preview.selectedProfile, visibleCandidates);
    const profileSpecificGroups = filteredWeakGroups.filter((group) => isSpecificGroup(group.group));
    const genericDebugGroups = filteredWeakGroups.filter((group) => !isSpecificGroup(group.group));
    const specificCandidateCount = profileSpecificGroups.reduce((sum, group) => sum + group.count, 0);
    const genericDebugCandidateCount = genericDebugGroups.reduce((sum, group) => sum + group.count, 0);
    const entryBase = {
      verseKey: target.verseKey,
      setMembership: target.setMembership,
      selectedProfile: preview.selectedProfile,
      existingWeakCorrespondencesPreview: preview.weakCorrespondencesPreview,
      filteredWeakGroups,
      filteredUserFacingPreview: buildUserFacingPreview(filteredWeakGroups),
      profileSpecificGroups,
      profileSpecificUserFacingPreview: buildUserFacingPreview(profileSpecificGroups),
      genericDebugGroups,
      hiddenAsGenericOnly: profileSpecificGroups.length === 0 && genericDebugGroups.length > 0,
      rawMissingCount: rawByVerse.get(target.verseKey)?.length ?? 0,
      filteredCandidateCount: visibleCandidates.length,
      suppressedCount: suppressedCandidates.length,
      specificCandidateCount,
      genericDebugCandidateCount
    };
    entries.push({
      ...entryBase,
      notes: buildNotes(entryBase)
    });
  }

  const profileSpecificEntries = entries.filter((entry) => entry.profileSpecificGroups.length > 0);
  const genericOnlyEntries = entries.filter((entry) => entry.hiddenAsGenericOnly);
  const existingWeakEntries = entries.filter((entry) => entry.existingWeakCorrespondencesPreview.length > 0);
  const filteredWeakEntries = entries.filter((entry) => entry.filteredWeakGroups.length > 0);
  const existingHiddenBySpecific = entries.filter(
    (entry) => entry.existingWeakCorrespondencesPreview.length > 0 && entry.profileSpecificGroups.length === 0
  );
  const specificCandidateCount = entries.reduce((sum, entry) => sum + entry.specificCandidateCount, 0);
  const genericDebugCandidateCount = entries.reduce((sum, entry) => sum + entry.genericDebugCandidateCount, 0);
  const filteredCandidateCount = entries.reduce((sum, entry) => sum + entry.filteredCandidateCount, 0);
  const suppressedCount = entries.reduce((sum, entry) => sum + entry.suppressedCount, 0);
  const usefulContentLossCandidates = existingHiddenBySpecific.filter((entry) => entry.filteredCandidateCount > 0);
  const noisyExamples = entries.filter((entry) => entry.genericDebugCandidateCount > 4 || entry.hiddenAsGenericOnly);
  const bestExamples = profileSpecificEntries.sort((left, right) => scoreBest(right) - scoreBest(left)).slice(0, 20);
  const riskyExamples = entries
    .filter((entry) => entry.rawMissingCount > 0 || entry.existingWeakCorrespondencesPreview.length > 0)
    .sort((left, right) => scoreRisk(right) - scoreRisk(left))
    .slice(0, 20);

  const result = {
    source: {
      contextSource: "json-default",
      missingMeanings: missingPath,
      qualitySet: "packages/core/src/analysis/verseAnalysisQualitySet.ts",
      uiEyeTestVerseKeys
    },
    summary: {
      targetVerseCount: entries.length,
      qualitySetVerseCount: verseAnalysisQualitySet.length,
      uiEyeTestVerseCount: uiEyeTestVerseKeys.length,
      existingWeakVerseCount: existingWeakEntries.length,
      filteredWeakVerseCount: filteredWeakEntries.length,
      profileSpecificWeakVerseCount: profileSpecificEntries.length,
      genericOnlyHiddenVerseCount: genericOnlyEntries.length,
      existingWeakHiddenBySpecificCount: existingHiddenBySpecific.length,
      filteredCandidateCount,
      profileSpecificCandidateCount: specificCandidateCount,
      genericDebugCandidateCount,
      suppressedCount,
      profileSpecificReductionRatio:
        filteredCandidateCount > 0 ? Number((1 - specificCandidateCount / filteredCandidateCount).toFixed(4)) : 0,
      usefulContentLossRisk:
        usefulContentLossCandidates.length > 0
          ? "Orta: mevcut weak preview olan bazı ayetler profile-specific kapıda kullanıcı-facing gizleniyor."
          : "Dusuk: mevcut weak preview profile-specific kapida belirgin content kaybetmiyor.",
      uiIntegrationReadiness:
        profileSpecificEntries.length > 0 && noisyExamples.length <= entries.length
          ? "Hazir aday: UI entegrasyonu icin generic grubu gizleyen opt-in kural makul gorunuyor."
          : "Temkinli: once manual review onerilir."
    },
    userFacingWeakVisible: profileSpecificEntries.map((entry) => ({
      verseKey: entry.verseKey,
      selectedProfile: entry.selectedProfile,
      groups: entry.profileSpecificGroups,
      preview: entry.profileSpecificUserFacingPreview
    })),
    hiddenAsGenericOnly: genericOnlyEntries.map((entry) => ({
      verseKey: entry.verseKey,
      selectedProfile: entry.selectedProfile,
      groups: entry.genericDebugGroups
    })),
    usefulContentLossCandidates,
    noisyExamples,
    bestExamples,
    riskyExamples,
    entries,
    recommendedUserFacingText: [
      "{profile-specific grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.",
      "Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.",
      "Generic adaylar normal kartta gösterilmez; debug/sourceStatus tarafında tutulur."
    ]
  };

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");

  const docLines = [
    "# Profile-Specific Weak Preview Target Set Audit",
    "",
    "Tarih: 2026-05-14",
    "",
    "Bu rapor 28 ayetlik quality set ve secili UI goz test ayetlerinde mevcut weak preview, filtreli weak preview ve profile-specific filtreli weak preview yaklasimlarini karsilastirir. Runtime, UI, default source ve mevcut preview logic degistirilmedi.",
    "",
    "## Ozet",
    "",
    `- Hedef ayet: ${result.summary.targetVerseCount}`,
    `- Quality set ayeti: ${result.summary.qualitySetVerseCount}`,
    `- UI goz test ayeti: ${result.summary.uiEyeTestVerseCount}`,
    `- Mevcut weak preview gosteren ayet: ${result.summary.existingWeakVerseCount}`,
    `- Filtreli weak adayli ayet: ${result.summary.filteredWeakVerseCount}`,
    `- Profile-specific kullanici-facing weak gosterilebilecek ayet: ${result.summary.profileSpecificWeakVerseCount}`,
    `- Generic-only oldugu icin gizlenecek ayet: ${result.summary.genericOnlyHiddenVerseCount}`,
    `- Mevcut weak olup profile-specific kapida gizlenen ayet: ${result.summary.existingWeakHiddenBySpecificCount}`,
    `- Filtreli aday toplam: ${result.summary.filteredCandidateCount}`,
    `- Profile-specific aday toplam: ${result.summary.profileSpecificCandidateCount}`,
    `- Generic/debug aday toplam: ${result.summary.genericDebugCandidateCount}`,
    `- Ek profile-specific azalma: %${(result.summary.profileSpecificReductionRatio * 100).toFixed(1)}`,
    `- Faydalı content kaybı riski: ${result.summary.usefulContentLossRisk}`,
    `- UI entegrasyon kararı: ${result.summary.uiIntegrationReadiness}`,
    "",
    "## Kullanici-facing Weak Gorunur Ayetler",
    "",
    "| Ayet | Profile | Gruplar | Preview |",
    "|---|---|---|---|",
    ...profileSpecificEntries.map(
      (entry) =>
        `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.profileSpecificGroups.map((group) => `${group.group} (${group.count})`).join("; ")} | ${entry.profileSpecificUserFacingPreview.join("; ")} |`
    ),
    "",
    "## Generic/Debug Olarak Gizlenecek Ayetler",
    "",
    "| Ayet | Profile | Generic aday | Mevcut weak |",
    "|---|---|---:|---|",
    ...genericOnlyEntries.map(
      (entry) =>
        `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.genericDebugCandidateCount} | ${entry.existingWeakCorrespondencesPreview.join("; ") || "-"} |`
    ),
    "",
    "## En Iyi 20 Ornek",
    "",
    "| Ayet | Profile | Specific | Generic/debug | Not |",
    "|---|---|---:|---:|---|",
    ...bestExamples.map(
      (entry) =>
        `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.specificCandidateCount} | ${entry.genericDebugCandidateCount} | ${entry.notes.join("; ")} |`
    ),
    "",
    "## En Riskli 20 Ornek",
    "",
    "| Ayet | Profile | Specific | Generic/debug | Bastirilan | Not |",
    "|---|---|---:|---:|---:|---|",
    ...riskyExamples.map(
      (entry) =>
        `| ${entry.verseKey} | ${entry.selectedProfile} | ${entry.specificCandidateCount} | ${entry.genericDebugCandidateCount} | ${entry.suppressedCount} | ${entry.notes.join("; ")} |`
    ),
    "",
    "## Kullanici-facing Metin Onerisi",
    "",
    "- `{profile-specific grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`",
    "- `Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.`",
    "- Generic grup normal kullanıcıya gösterilmemeli; sadece sourceStatus/debug adayı sayılmalı.",
    "",
    "## Karar",
    "",
    "Profile-specific gate, hedef sette weakCorrespondencesPreview icin UI'a alinabilecek en guvenli varyant olarak gorunuyor. En kucuk entegrasyon paketi, mevcut weak metnini bozmadan generic grubu gizleyen ve yalniz specific grup varsa kullanici-facing metin ureten opt-in helper olabilir."
  ];

  await writeFile(docPath, docLines.join("\n"), "utf-8");

  console.log(`json: ${outputPath}`);
  console.log(`doc: ${docPath}`);
  console.log(JSON.stringify(result.summary, null, 2));
  console.log("visible:", profileSpecificEntries.map((entry) => entry.verseKey).join(", "));
  console.log("generic-only:", genericOnlyEntries.map((entry) => entry.verseKey).join(", "));
}

main().catch((error) => {
  console.error("audit-profile-specific-weak-preview-target-set failed");
  console.error(error);
  process.exit(1);
});
