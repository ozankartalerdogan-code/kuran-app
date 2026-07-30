import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildVerseAnalysisContext } from "./verseAnalysisContext";
import { buildMainMeaningAxisForProfile, selectVerseAnalysisProfile } from "./verseAnalysisDecision";
import { verseAnalysisQualitySet } from "./verseAnalysisQualitySet";

// Bu suite kanonik data/app.db'yi okur (buildVerseAnalysisContext üzerinden).
// DB 227MB ve gitignore'lı olduğundan CI checkout'unda bulunmaz; yokken suite
// hata vermek yerine atlanır. DB erişimi it() gövdelerinde tembel olduğu için
// describe seviyesinde skip yeterlidir.
const APP_DB_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
  "data",
  "app.db",
);
const dbMissing = !fs.existsSync(APP_DB_PATH);

function normalizeForHintMatch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/gu, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .trim();
}

describe("verseAnalysisQualitySet", {
  skip: dbMissing
    ? "data/app.db yok (gitignore'lı, CI checkout'unda bulunmaz) — analiz kalite seti atlandı"
    : false,
}, () => {
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
