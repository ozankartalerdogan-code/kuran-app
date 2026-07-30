import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(REPO_ROOT, "docs/provenance/source-content-provenance.json");
const manifestText = readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function verifyArtifactGroup(group) {
  assert.equal(group.fileCount, group.files.length);
  assert.equal(group.totalBytes, group.files.reduce((sum, file) => sum + file.bytes, 0));

  const groupInput = group.files
    .map((file) => {
      const bytes = readFileSync(path.join(REPO_ROOT, file.path));
      assert.equal(bytes.length, file.bytes, `${file.path} byte count`);
      assert.equal(sha256(bytes), file.sha256, `${file.path} SHA-256`);
      return `${file.path}\0${file.bytes}\0${file.sha256}\n`;
    })
    .join("");
  assert.equal(sha256(Buffer.from(groupInput, "utf8")), group.sha256);
}

test("central provenance manifest covers all required source and project layers", () => {
  const requiredIds = [
    "tanzil-uthmani-1.1",
    "elmalili-semar-ketir",
    "qac-mustafa0x-source-chain",
    "camel-tools-and-morph",
    "alquran-cloud-tajweed-source",
    "kuran-yolu-morphology-layer",
    "kuran-yolu-tajweed-layer",
    "ai-transliteration",
    "codex-hadith-translations",
    "deep-research-siyer-kissa",
    "chatgpt-lesson-research",
    "claude-card-quiz-generation",
    "gemini-elifba-audio-and-images",
    "ai-prayer-dhikr-guides-explanations",
    "removed-runtime-translations-v1",
  ];
  assert.deepEqual(manifest.entries.map((entry) => entry.id), requiredIds);
});

test("all provenance file hashes and group hashes match the current workspace", () => {
  for (const entry of manifest.entries) verifyArtifactGroup(entry.artifacts);
  verifyArtifactGroup(manifest.licenseAndDisclosureArtifacts);
});

test("source URLs and declared AI evidence gaps are explicit", () => {
  for (const entry of manifest.entries) {
    assert.ok("generatedAt" in entry);
    assert.ok(entry.toolModel);
    assert.ok(entry.method);
    assert.ok(entry.humanReview);
    for (const sourceUrl of entry.sourceUrls) {
      assert.equal(new URL(sourceUrl).protocol, "https:");
    }
    if (!entry.exactResearchUrlHistoryPreserved) {
      assert.match(entry.evidenceGap, /Exact araştırma URL geçmişi korunmamıştır/u);
    }
  }
});

test("tajweed metrics use the audited limited-override wording and values", () => {
  const tajweed = manifest.entries.find((entry) => entry.id === "kuran-yolu-tajweed-layer");
  assert.deepEqual(tajweed.metrics, {
    recognizedSourceClusters: 86595,
    alignedSourceClusters: 79343,
    alignedPercent: 91.6254,
    manualOverrideVerses: 14,
    manualSpans: 23,
    manualClusters: 24,
  });
  assert.doesNotMatch(manifestText, /daha fazla genel kapsam|more general coverage/iu);
});

test("runtime risks and the later Elmalılı-only migration remain explicit", () => {
  assert.deepEqual(manifest.productionPolicy.retainedRuntimeRisks, [
    "morfoloji table",
    "verses.arabic_tajweed",
  ]);
  assert.match(manifest.productionPolicy.targetTranslation, /only Elmalılı/u);
  const retired = manifest.entries.find((entry) => entry.id === "removed-runtime-translations-v1");
  assert.equal(retired?.runtimeStatus, "removed_from_runtime");
  assert.deepEqual(retired?.sources, ["bulac", "diyanet", "ozturk", "vakfi"]);
  assert.equal(retired?.artifacts.fileCount, 4);
});
