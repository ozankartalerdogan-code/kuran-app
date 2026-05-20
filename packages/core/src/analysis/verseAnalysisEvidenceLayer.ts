import type { VerseAnalysisContext, VerseAnalysisSourceStatus } from "./verseAnalysisContext";
import { selectVerseAnalysisProfile } from "./verseAnalysisDecision";
import { buildProfileSpecificWeakPreview } from "./verseAnalysisWeakPreview";

export type EvidenceKind =
  | "keyTerm"
  | "root"
  | "lemma"
  | "rootExplanation"
  | "weakCorrespondence"
  | "coverage"
  | "sourceStatus"
  | "translationCoverage"
  | "limitedContext";

export type EvidencePolicyClass =
  | "user_facing"
  | "sourceStatus"
  | "debug_only"
  | "build_input"
  | "parked";

export type InternalConfidence = "low" | "medium" | "high";

export interface EvidenceSource {
  id: string;
  policyClass: EvidencePolicyClass;
  riskLevel: "low" | "medium" | "high";
  note?: string;
}

export interface EvidenceSupport {
  sourceIds: string[];
  sourceSupportCount: number;
  singleSource: boolean;
}

export interface EvidenceConflict {
  type:
    | "meaning_conflict"
    | "root_conflict"
    | "lemma_conflict"
    | "morphology_conflict"
    | "profile_signal_conflict"
    | "encoding_risk"
    | "scope_mismatch"
    | "keyTermMissingInV4"
    | "keyTermOnlyInV4"
    | "rootMismatch"
    | "lemmaMismatch"
    | "profileRelevantTermDropped";
  sourceIds: string[];
  note: string;
}

export interface EvidenceTrace {
  sourceId: string;
  fieldPath: string;
  rawValuePreview: string;
  normalizedValue: string;
  transformation: "direct" | "normalized" | "filtered" | "grouped" | "suppressed" | "source_backed_merge";
}

export interface EvidenceItem {
  kind: EvidenceKind;
  value: string;
  normalizedValue: string;
  sourceIds: string[];
  sourceSupportCount: number;
  singleSource: boolean;
  conflictFlags: EvidenceConflict[];
  internalConfidence: InternalConfidence;
  userFacingAllowed: boolean;
  debugOnly: boolean;
  evidenceTrace: EvidenceTrace[];
  notes: string[];
}

export interface EvidenceLayerSnapshot {
  verseKey: string;
  selectedProfile: string;
  sources: EvidenceSource[];
  items: EvidenceItem[];
  summary: {
    totalItems: number;
    kindDistribution: Record<EvidenceKind, number>;
    internalConfidenceDistribution: Record<InternalConfidence, number>;
    conflictFlagCount: number;
    singleSourceItemCount: number;
    userFacingAllowedCount: number;
    userFacingBlockedCount: number;
    debugOnlyCount: number;
    sourceSupportTwoPlusCount: number;
  };
}

export interface RootEasyOnlyEntry {
  root: string;
  short_tr?: string;
  summary_tr?: string;
  review_status?: string;
  source?: string;
  sources?: string[];
}

export interface BuildVerseAnalysisEvidenceLayerOptions {
  v4Context?: VerseAnalysisContext;
  rootEasyOnly?: RootEasyOnlyEntry[];
}

const sourcePolicyById: Record<string, EvidenceSource> = {
  canonical_word_analysis: {
    id: "canonical_word_analysis",
    policyClass: "user_facing",
    riskLevel: "low",
    note: "Default JSON canonical word analysis source."
  },
  canonical_word_analysis_v2: {
    id: "canonical_word_analysis_v2",
    policyClass: "debug_only",
    riskLevel: "medium",
    note: "Opt-in enriched canonical source."
  },
  canonical_word_analysis_v3: {
    id: "canonical_word_analysis_v3",
    policyClass: "debug_only",
    riskLevel: "medium",
    note: "Opt-in enriched canonical source."
  },
  canonical_word_analysis_v4: {
    id: "canonical_word_analysis_v4",
    policyClass: "debug_only",
    riskLevel: "medium",
    note: "Opt-in canonical source; default candidate only after audit."
  },
  verse_analysis_signals: {
    id: "verse_analysis_signals",
    policyClass: "debug_only",
    riskLevel: "low"
  },
  root_explanations: {
    id: "root_explanations",
    policyClass: "debug_only",
    riskLevel: "medium"
  },
  root_easy_only: {
    id: "root_easy_only",
    policyClass: "debug_only",
    riskLevel: "low",
    note: "Risk-gated easy-only root explanations, audit/debug support only."
  },
  missing_meaning_report: {
    id: "missing_meaning_report",
    policyClass: "debug_only",
    riskLevel: "medium"
  },
  profile_specific_weak_helper: {
    id: "profile_specific_weak_helper",
    policyClass: "user_facing",
    riskLevel: "low"
  },
  coverage_by_ayah: {
    id: "coverage_by_ayah",
    policyClass: "sourceStatus",
    riskLevel: "low"
  },
  source_status_mapper: {
    id: "source_status_mapper",
    policyClass: "sourceStatus",
    riskLevel: "low"
  },
  normalized_translations: {
    id: "normalized_translations",
    policyClass: "user_facing",
    riskLevel: "medium"
  },
  revelation_context: {
    id: "revelation_context",
    policyClass: "sourceStatus",
    riskLevel: "medium"
  },
  tafsir_summary: {
    id: "tafsir_summary",
    policyClass: "parked",
    riskLevel: "high"
  }
};

const lowValueTermNeedles = [
  "allah",
  "rab",
  "rabb",
  "suphesiz",
  "ancak",
  "sadece",
  "icinde",
  "içinde",
  "olan",
  "dost",
  "veli",
  "geldi",
  "getirdi"
];

function normalizeValue(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s:\-./]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function stripConfidence(value: string): string {
  return value.replace(/\s*\[(?:yuksek|orta|dusuk)\]\s*$/u, "").trim();
}

function preview(value: string, length = 120): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}...`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function canonicalSourceId(context: VerseAnalysisContext): string {
  return (
    context.debugSources.find((source) => source.key.startsWith("canonical_word_analysis"))?.key ??
    "canonical_word_analysis"
  );
}

function sourceFor(id: string): EvidenceSource {
  return (
    sourcePolicyById[id] ?? {
      id,
      policyClass: "debug_only",
      riskLevel: "medium"
    }
  );
}

function isDebugOnlyBySources(sourceIds: string[]): boolean {
  return sourceIds.every((sourceId) => {
    const policy = sourceFor(sourceId).policyClass;
    return policy === "debug_only" || policy === "build_input" || policy === "parked";
  });
}

function hasParkedSource(sourceIds: string[]): boolean {
  return sourceIds.some((sourceId) => sourceFor(sourceId).policyClass === "parked");
}

function isLowValueKeyTerm(value: string): boolean {
  const normalized = normalizeValue(value);
  return lowValueTermNeedles.some((needle) => normalized.includes(normalizeValue(needle)));
}

function inferInternalConfidence(input: {
  sourceIds: string[];
  conflictFlags: EvidenceConflict[];
  userFacingAllowed: boolean;
  debugOnly: boolean;
}): InternalConfidence {
  if (input.conflictFlags.length > 0 || hasParkedSource(input.sourceIds)) {
    return "low";
  }

  if (input.sourceIds.length >= 2 && input.userFacingAllowed && !input.debugOnly) {
    return "high";
  }

  if (input.userFacingAllowed && !input.debugOnly) {
    return "medium";
  }

  return "low";
}

function recomputeItem(item: EvidenceItem): EvidenceItem {
  const debugOnly = isDebugOnlyBySources(item.sourceIds) || hasParkedSource(item.sourceIds) || !item.userFacingAllowed;
  const userFacingAllowed = item.userFacingAllowed && !debugOnly && item.conflictFlags.length === 0;

  return {
    ...item,
    sourceIds: unique(item.sourceIds),
    sourceSupportCount: unique(item.sourceIds).length,
    singleSource: unique(item.sourceIds).length === 1,
    userFacingAllowed,
    debugOnly,
    internalConfidence: inferInternalConfidence({
      sourceIds: unique(item.sourceIds),
      conflictFlags: item.conflictFlags,
      userFacingAllowed,
      debugOnly
    })
  };
}

function makeItem(input: {
  kind: EvidenceKind;
  value: string;
  sourceIds: string[];
  conflictFlags?: EvidenceConflict[];
  userFacingAllowed: boolean;
  evidenceTrace: EvidenceTrace[];
  notes?: string[];
}): EvidenceItem {
  const sourceIds = unique(input.sourceIds);
  const conflictFlags = input.conflictFlags ?? [];
  const debugOnly = isDebugOnlyBySources(sourceIds) || hasParkedSource(sourceIds) || !input.userFacingAllowed;
  const userFacingAllowed = input.userFacingAllowed && !debugOnly && conflictFlags.length === 0;

  return {
    kind: input.kind,
    value: input.value,
    normalizedValue: normalizeValue(input.value),
    sourceIds,
    sourceSupportCount: sourceIds.length,
    singleSource: sourceIds.length === 1,
    conflictFlags,
    internalConfidence: inferInternalConfidence({
      sourceIds,
      conflictFlags,
      userFacingAllowed,
      debugOnly
    }),
    userFacingAllowed,
    debugOnly,
    evidenceTrace: input.evidenceTrace,
    notes: input.notes ?? []
  };
}

function trace(sourceId: string, fieldPath: string, rawValue: string, transformation: EvidenceTrace["transformation"] = "direct"): EvidenceTrace {
  return {
    sourceId,
    fieldPath,
    rawValuePreview: preview(rawValue),
    normalizedValue: normalizeValue(rawValue),
    transformation
  };
}

function buildKeyTermItems(context: VerseAnalysisContext): EvidenceItem[] {
  const canonicalSource = canonicalSourceId(context);

  return context.keyTerms.map((term) => {
    const cleanTerm = stripConfidence(term);
    const userFacingAllowed = !isLowValueKeyTerm(cleanTerm);

    return makeItem({
      kind: "keyTerm",
      value: cleanTerm,
      sourceIds: [canonicalSource, "verse_analysis_signals"],
      userFacingAllowed,
      evidenceTrace: [
        trace(canonicalSource, "context.keyTerms", term, "normalized"),
        trace("verse_analysis_signals", "signals.keyTerms", term, "filtered")
      ],
      notes: userFacingAllowed
        ? ["Clean candidate; final preview gate still applies."]
        : ["Low-value/general term kept out of user-facing evidence."]
    });
  });
}

function mergeEvidenceItems(primaryItems: EvidenceItem[], supplementalItems: EvidenceItem[]): EvidenceItem[] {
  const merged = [...primaryItems];
  const indexByKindAndValue = new Map(
    merged.map((item, index) => [`${item.kind}:${item.normalizedValue}`, index])
  );

  for (const supplemental of supplementalItems) {
    const key = `${supplemental.kind}:${supplemental.normalizedValue}`;
    const existingIndex = indexByKindAndValue.get(key);

    if (existingIndex === undefined) {
      indexByKindAndValue.set(key, merged.length);
      merged.push(supplemental);
      continue;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = recomputeItem({
      ...existing,
      sourceIds: unique([...existing.sourceIds, ...supplemental.sourceIds]),
      conflictFlags: [...existing.conflictFlags, ...supplemental.conflictFlags],
      evidenceTrace: [...existing.evidenceTrace, ...supplemental.evidenceTrace],
      notes: unique([...existing.notes, ...supplemental.notes])
    });
  }

  return merged.map(recomputeItem);
}

function addConflictToMatchingItems(
  items: EvidenceItem[],
  kind: EvidenceKind,
  normalizedValues: Set<string>,
  conflict: Omit<EvidenceConflict, "sourceIds"> & { sourceIds?: string[] }
): EvidenceItem[] {
  return items.map((item) => {
    if (item.kind !== kind || !normalizedValues.has(item.normalizedValue)) {
      return item;
    }

    return recomputeItem({
      ...item,
      conflictFlags: [
        ...item.conflictFlags,
        {
          type: conflict.type,
          sourceIds: conflict.sourceIds ?? item.sourceIds,
          note: conflict.note
        }
      ],
      notes: unique([...item.notes, conflict.note])
    });
  });
}

function addV4ComparisonEvidence(
  items: EvidenceItem[],
  context: VerseAnalysisContext,
  v4Context: VerseAnalysisContext
): EvidenceItem[] {
  const v4Items = [
    ...buildKeyTermItems(v4Context),
    ...buildRootItems(v4Context),
    ...buildLemmaItems(v4Context)
  ];
  let merged = mergeEvidenceItems(items, v4Items);

  const jsonKeyTerms = new Set(buildKeyTermItems(context).map((item) => item.normalizedValue));
  const v4KeyTerms = new Set(buildKeyTermItems(v4Context).map((item) => item.normalizedValue));
  const missingInV4 = new Set([...jsonKeyTerms].filter((value) => !v4KeyTerms.has(value)));
  const onlyInV4 = new Set([...v4KeyTerms].filter((value) => !jsonKeyTerms.has(value)));
  const profileRelevantDropped = new Set(
    merged
      .filter((item) => item.kind === "keyTerm" && item.userFacingAllowed && missingInV4.has(item.normalizedValue))
      .map((item) => item.normalizedValue)
  );

  merged = addConflictToMatchingItems(merged, "keyTerm", missingInV4, {
    type: "keyTermMissingInV4",
    sourceIds: ["canonical_word_analysis", "canonical_word_analysis_v4"],
    note: "Default JSON key term was not present in v4 opt-in source."
  });
  merged = addConflictToMatchingItems(merged, "keyTerm", onlyInV4, {
    type: "keyTermOnlyInV4",
    sourceIds: ["canonical_word_analysis_v4"],
    note: "v4 opt-in source produced an additional key term."
  });
  merged = addConflictToMatchingItems(merged, "keyTerm", profileRelevantDropped, {
    type: "profileRelevantTermDropped",
    sourceIds: ["canonical_word_analysis", "canonical_word_analysis_v4"],
    note: "A user-facing eligible key term from JSON is absent in v4."
  });

  const rootMismatches = new Set<string>();
  const lemmaMismatches = new Set<string>();
  const maxWordCount = Math.max(context.wordByWord.length, v4Context.wordByWord.length);

  for (let index = 0; index < maxWordCount; index += 1) {
    const jsonWord = context.wordByWord[index];
    const v4Word = v4Context.wordByWord[index];

    if (!jsonWord || !v4Word) {
      continue;
    }

    if (jsonWord.root && v4Word.root && normalizeValue(jsonWord.root) !== normalizeValue(v4Word.root)) {
      rootMismatches.add(normalizeValue(jsonWord.root));
      rootMismatches.add(normalizeValue(v4Word.root));
    }

    if (jsonWord.lemma && v4Word.lemma && normalizeValue(jsonWord.lemma) !== normalizeValue(v4Word.lemma)) {
      lemmaMismatches.add(normalizeValue(jsonWord.lemma));
      lemmaMismatches.add(normalizeValue(v4Word.lemma));
    }
  }

  merged = addConflictToMatchingItems(merged, "root", rootMismatches, {
    type: "rootMismatch",
    sourceIds: ["canonical_word_analysis", "canonical_word_analysis_v4"],
    note: "Root differs between default JSON and v4 at the same word position."
  });
  merged = addConflictToMatchingItems(merged, "lemma", lemmaMismatches, {
    type: "lemmaMismatch",
    sourceIds: ["canonical_word_analysis", "canonical_word_analysis_v4"],
    note: "Lemma differs between default JSON and v4 at the same word position."
  });

  return merged.map(recomputeItem);
}

function buildRootItems(context: VerseAnalysisContext): EvidenceItem[] {
  const canonicalSource = canonicalSourceId(context);
  return context.roots.map((root) =>
    makeItem({
      kind: "root",
      value: root,
      sourceIds: [canonicalSource],
      userFacingAllowed: false,
      evidenceTrace: [trace(canonicalSource, "context.roots", root)],
      notes: ["Root evidence is internal support, not direct user-facing output."]
    })
  );
}

function buildLemmaItems(context: VerseAnalysisContext): EvidenceItem[] {
  const canonicalSource = canonicalSourceId(context);
  return context.lemmas.map((lemma) =>
    makeItem({
      kind: "lemma",
      value: lemma,
      sourceIds: [canonicalSource],
      userFacingAllowed: false,
      evidenceTrace: [trace(canonicalSource, "context.lemmas", lemma)],
      notes: ["Lemma evidence is internal support, not direct user-facing output."]
    })
  );
}

function buildRootExplanationItems(context: VerseAnalysisContext): EvidenceItem[] {
  const canonicalSource = canonicalSourceId(context);
  const rootMeaningByValue = new Map<string, string[]>();

  for (const word of context.wordByWord) {
    if (!word.rootMeaning) {
      continue;
    }

    const roots = rootMeaningByValue.get(word.rootMeaning) ?? [];
    if (word.root) {
      roots.push(word.root);
    }
    rootMeaningByValue.set(word.rootMeaning, roots);
  }

  return Array.from(rootMeaningByValue.entries()).map(([meaning, roots]) =>
    makeItem({
      kind: "rootExplanation",
      value: meaning,
      sourceIds: [canonicalSource, "root_explanations"],
      userFacingAllowed: false,
      evidenceTrace: [
        trace(canonicalSource, "wordByWord.rootMeaning", meaning),
        trace("root_explanations", "rootMeanings", roots.join(", "), "source_backed_merge")
      ],
      notes: ["Root explanation kept as support/debug until easy-only gate is integrated."]
    })
  );
}

function buildRootEasyOnlyMap(entries: RootEasyOnlyEntry[] | undefined): Map<string, RootEasyOnlyEntry> {
  const map = new Map<string, RootEasyOnlyEntry>();

  for (const entry of entries ?? []) {
    const root = entry.root?.trim();
    const text = entry.short_tr?.trim() || entry.summary_tr?.trim();

    if (!root || !text) {
      continue;
    }

    map.set(normalizeValue(root), entry);
  }

  return map;
}

function addRootEasyOnlyEvidence(
  items: EvidenceItem[],
  context: VerseAnalysisContext,
  rootEasyOnly: RootEasyOnlyEntry[] | undefined
): EvidenceItem[] {
  const easyMap = buildRootEasyOnlyMap(rootEasyOnly);

  if (easyMap.size === 0) {
    return items;
  }

  const merged = [...items];
  const rootExplanationIndexesByRoot = new Map<string, number[]>();

  for (let index = 0; index < merged.length; index += 1) {
    const item = merged[index];
    if (item.kind !== "rootExplanation") {
      continue;
    }

    for (const traceEntry of item.evidenceTrace) {
      if (traceEntry.sourceId !== "root_explanations") {
        continue;
      }

      for (const rawRoot of traceEntry.rawValuePreview.split(",")) {
        const rootKey = normalizeValue(rawRoot);
        if (!rootKey) {
          continue;
        }

        const indexes = rootExplanationIndexesByRoot.get(rootKey) ?? [];
        indexes.push(index);
        rootExplanationIndexesByRoot.set(rootKey, indexes);
      }
    }
  }

  for (const root of context.roots) {
    const rootKey = normalizeValue(root);
    const easyEntry = easyMap.get(rootKey);

    if (!easyEntry) {
      continue;
    }

    const easyText = easyEntry.short_tr?.trim() || easyEntry.summary_tr?.trim() || "";
    const existingIndexes = rootExplanationIndexesByRoot.get(rootKey) ?? [];

    if (existingIndexes.length > 0) {
      for (const index of existingIndexes) {
        const existing = merged[index];
        merged[index] = recomputeItem({
          ...existing,
          sourceIds: unique([...existing.sourceIds, "root_easy_only"]),
          evidenceTrace: [
            ...existing.evidenceTrace,
            trace("root_easy_only", `root_explanations_tr_v2_easy_only.${root}`, easyText, "source_backed_merge")
          ],
          notes: unique([...existing.notes, "Easy-only root explanation supports this root."])
        });
      }
      continue;
    }

    merged.push(
      makeItem({
        kind: "rootExplanation",
        value: `${root}: ${easyText}`,
        sourceIds: ["root_easy_only"],
        userFacingAllowed: false,
        evidenceTrace: [
          trace("root_easy_only", `root_explanations_tr_v2_easy_only.${root}`, easyText, "source_backed_merge")
        ],
        notes: ["Easy-only root explanation available as debug/audit support."]
      })
    );
  }

  return merged.map(recomputeItem);
}

function buildWeakCorrespondenceItems(context: VerseAnalysisContext): EvidenceItem[] {
  const selectedProfile = selectVerseAnalysisProfile(context);
  const weakPreview = buildProfileSpecificWeakPreview({
    profile: selectedProfile,
    weakOrMissingCorrespondences: context.fidelitySignals.weakOrMissingCorrespondences
  });
  const userFacingItems = weakPreview.userFacingGroups.map((group) =>
    makeItem({
      kind: "weakCorrespondence",
      value: group.label,
      sourceIds: ["missing_meaning_report", "profile_specific_weak_helper"],
      userFacingAllowed: true,
      evidenceTrace: [
        trace("missing_meaning_report", "fidelitySignals.weakOrMissingCorrespondences", group.key, "grouped"),
        trace("profile_specific_weak_helper", "weakPreview.userFacingGroups", group.label, "filtered")
      ],
      notes: [`Profile-specific weak group count: ${group.count}`]
    })
  );
  const debugItems = weakPreview.debugOnlyGroups.map((group) =>
    makeItem({
      kind: "weakCorrespondence",
      value: group.label,
      sourceIds: ["missing_meaning_report"],
      userFacingAllowed: false,
      evidenceTrace: [
        trace("missing_meaning_report", "weakPreview.debugOnlyGroups", group.key, "suppressed")
      ],
      notes: [`Generic/debug weak group count: ${group.count}`]
    })
  );

  return [...userFacingItems, ...debugItems];
}

function buildCoverageItems(context: VerseAnalysisContext): EvidenceItem[] {
  const coverageItems: EvidenceItem[] = [];

  if (context.fidelitySignals.coverageRatio !== null) {
    const value = `coverageRatio=${context.fidelitySignals.coverageRatio.toFixed(3)}`;
    coverageItems.push(
      makeItem({
        kind: "coverage",
        value,
        sourceIds: ["coverage_by_ayah"],
        userFacingAllowed: false,
        evidenceTrace: [trace("coverage_by_ayah", "fidelitySignals.coverageRatio", value)],
        notes: ["Raw coverage is debug/sourceStatus only."]
      })
    );
  }

  for (const source of context.debugSources.filter((entry) => entry.key === "word_coverage_report" && entry.detail)) {
    coverageItems.push(
      makeItem({
        kind: "coverage",
        value: source.detail ?? "",
        sourceIds: ["coverage_by_ayah"],
        userFacingAllowed: false,
        evidenceTrace: [trace("coverage_by_ayah", "debugSources.word_coverage_report.detail", source.detail ?? "")],
        notes: ["Opt-in coverage detail is debug-only."]
      })
    );
  }

  return coverageItems;
}

function buildSourceStatusItems(context: VerseAnalysisContext): EvidenceItem[] {
  return context.debugSources.map((source: VerseAnalysisSourceStatus) => {
    const sourceId = source.key === "tafsir_summary" ? "tafsir_summary" : "source_status_mapper";
    const value = `${source.key}:${source.status}${source.detail ? `:${source.detail}` : ""}`;

    return makeItem({
      kind: "sourceStatus",
      value,
      sourceIds: [sourceId],
      userFacingAllowed: false,
      evidenceTrace: [trace(sourceId, "context.debugSources", value)],
      notes: ["Raw source status remains debug/audit; mapped muted text is generated elsewhere."]
    });
  });
}

function buildTranslationCoverageItems(context: VerseAnalysisContext): EvidenceItem[] {
  const value = `translationCount=${context.translations.length};comparisonCount=${context.translationComparison.comparisonCount}`;
  return [
    makeItem({
      kind: "translationCoverage",
      value,
      sourceIds: ["normalized_translations"],
      userFacingAllowed: false,
      evidenceTrace: [
        trace("normalized_translations", "context.translations.length", String(context.translations.length)),
        trace("normalized_translations", "translationComparison.comparisonCount", String(context.translationComparison.comparisonCount))
      ],
      notes: ["Translation/source diversity support; phrase extraction stays gated."]
    })
  ];
}

function buildLimitedContextItems(context: VerseAnalysisContext): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (context.contextNuzul) {
    const value = `${context.contextNuzul.scope}:${context.contextNuzul.status}`;
    items.push(
      makeItem({
        kind: "limitedContext",
        value,
        sourceIds: ["revelation_context"],
        userFacingAllowed: false,
        evidenceTrace: [trace("revelation_context", "context.contextNuzul", value)],
        notes: ["Context signal is limited/scope-sensitive."]
      })
    );
  }

  if (context.tafsirNotes.length > 0) {
    items.push(
      makeItem({
        kind: "limitedContext",
        value: `tafsirNotes=${context.tafsirNotes.length}`,
        sourceIds: ["tafsir_summary"],
        conflictFlags: [
          {
            type: "scope_mismatch",
            sourceIds: ["tafsir_summary"],
            note: "Tafsir notes are parked and must not be shown as ayah-specific analysis."
          }
        ],
        userFacingAllowed: false,
        evidenceTrace: [trace("tafsir_summary", "context.tafsirNotes.length", String(context.tafsirNotes.length))],
        notes: ["Tafsir note kept parked/debug-only."]
      })
    );
  }

  return items;
}

function summarizeItems(items: EvidenceItem[]): EvidenceLayerSnapshot["summary"] {
  const kindDistribution = {
    keyTerm: 0,
    root: 0,
    lemma: 0,
    rootExplanation: 0,
    weakCorrespondence: 0,
    coverage: 0,
    sourceStatus: 0,
    translationCoverage: 0,
    limitedContext: 0
  } satisfies Record<EvidenceKind, number>;
  const internalConfidenceDistribution = {
    low: 0,
    medium: 0,
    high: 0
  } satisfies Record<InternalConfidence, number>;

  for (const item of items) {
    kindDistribution[item.kind] += 1;
    internalConfidenceDistribution[item.internalConfidence] += 1;
  }

  return {
    totalItems: items.length,
    kindDistribution,
    internalConfidenceDistribution,
    conflictFlagCount: items.reduce((total, item) => total + item.conflictFlags.length, 0),
    singleSourceItemCount: items.filter((item) => item.singleSource).length,
    userFacingAllowedCount: items.filter((item) => item.userFacingAllowed).length,
    userFacingBlockedCount: items.filter((item) => !item.userFacingAllowed).length,
    debugOnlyCount: items.filter((item) => item.debugOnly).length,
    sourceSupportTwoPlusCount: items.filter((item) => item.sourceSupportCount >= 2).length
  };
}

export function buildVerseAnalysisEvidenceLayer(
  context: VerseAnalysisContext,
  options: BuildVerseAnalysisEvidenceLayerOptions = {}
): EvidenceLayerSnapshot {
  let items = [
    ...buildKeyTermItems(context),
    ...buildRootItems(context),
    ...buildLemmaItems(context),
    ...buildRootExplanationItems(context),
    ...buildWeakCorrespondenceItems(context),
    ...buildCoverageItems(context),
    ...buildSourceStatusItems(context),
    ...buildTranslationCoverageItems(context),
    ...buildLimitedContextItems(context)
  ];

  if (options.v4Context) {
    items = addV4ComparisonEvidence(items, context, options.v4Context);
  }

  if (options.rootEasyOnly) {
    items = addRootEasyOnlyEvidence(items, context, options.rootEasyOnly);
  }

  const sourceIds = unique(items.flatMap((item) => item.sourceIds));

  return {
    verseKey: context.verseKey,
    selectedProfile: selectVerseAnalysisProfile(context),
    sources: sourceIds.map(sourceFor),
    items,
    summary: summarizeItems(items)
  };
}
