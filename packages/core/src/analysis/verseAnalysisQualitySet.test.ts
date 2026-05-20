import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVerseAnalysisContext } from "./verseAnalysisContext";
import { buildMainMeaningAxisForProfile, selectVerseAnalysisProfile } from "./verseAnalysisDecision";
import { verseAnalysisQualitySet } from "./verseAnalysisQualitySet";

function normalizeForHintMatch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/gu, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .trim();
}

describe("verseAnalysisQualitySet", () => {
  for (const qualityCase of verseAnalysisQualitySet) {
    it(`${qualityCase.verseKey} — ${qualityCase.shortNote}`, { timeout: 30000 }, async () => {
      const context = await buildVerseAnalysisContext(qualityCase.surahId, qualityCase.ayahNumber);
      const profile = selectVerseAnalysisProfile(context);

      if (qualityCase.expectedProfile !== undefined) {
        assert.strictEqual(
          profile,
          qualityCase.expectedProfile,
          `Profile beklenen: ${qualityCase.expectedProfile}, gelen: ${profile}`
        );
      }

      if (qualityCase.expectedAxisHint && qualityCase.expectedAxisHint.length > 0) {
        const axisText = normalizeForHintMatch(buildMainMeaningAxisForProfile(profile, context).join(" "));
        const matched = qualityCase.expectedAxisHint.filter((hint) =>
          axisText.includes(normalizeForHintMatch(hint))
        );
        assert.ok(
          matched.length >= 1,
          `Eksen metninde hicbir ipucu bulunamadi.\nEksen: "${axisText}"\nBeklenen ipuclari: [${qualityCase.expectedAxisHint.join(", ")}]`
        );
      }
    });
  }
});
