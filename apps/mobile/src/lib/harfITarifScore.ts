import type { ElifbaQuizScore, ElifbaQuizScores } from "./elifbaProgress";

export const HARF_I_TARIF_SCORE_ID = "1000";

export function summarizeHarfITarif(
  ids: readonly string[],
  answers: Record<string, boolean>,
): ElifbaQuizScore | null {
  if (ids.length === 0) return null;

  const unique = new Set<string>();
  for (const id of ids) {
    if (!id || unique.has(id)) return null;
    unique.add(id);
  }

  let score = 0;
  for (const id of unique) {
    const answer = answers[id];
    if (typeof answer !== "boolean") return null;
    if (answer) score++;
  }

  return { score, total: unique.size };
}

export function mergeHarfITarifScore(
  scores: ElifbaQuizScores,
  result: ElifbaQuizScore,
): ElifbaQuizScores {
  return {
    ...scores,
    [HARF_I_TARIF_SCORE_ID]: { score: result.score, total: result.total },
  };
}
