import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "docs/provenance/source-content-provenance.json");
const GENERATED_AT = "2026-07-27";
const RESEARCH_HISTORY_GAP =
  "Exact araştırma URL geçmişi korunmamıştır; kullanılan kaynakların tamamı kayıt bazında yeniden oluşturulamaz.";

const normalizePath = (value) => value.split(path.sep).join("/");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function walk(relativeDirectory, accept = () => true) {
  const absoluteDirectory = path.join(REPO_ROOT, relativeDirectory);
  if (!existsSync(absoluteDirectory)) {
    throw new Error(`Required provenance directory is missing: ${relativeDirectory}`);
  }

  const found = [];
  const visit = (absolutePath) => {
    for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(absolutePath, entry.name);
      if (entry.isDirectory()) {
        visit(child);
      } else if (entry.isFile()) {
        const relativePath = normalizePath(path.relative(REPO_ROOT, child));
        if (accept(relativePath)) found.push(relativePath);
      }
    }
  };
  visit(absoluteDirectory);
  return found;
}

/**
 * Provenance açısından anlamlı dosyaları iki gruba ayırır:
 *  - depoda bulunanlar: hash'lenir ve grup sha256'sına girer,
 *  - depoda saklanmayanlar: `absentFromRepo` altında yol olarak korunur.
 *
 * Bu depo, üretilmiş tecvid çıktıları, vendor'lanmış Tanzil kaynağı ve bazı
 * morfoloji ara çıktıları gibi büyük veri dosyalarını taşımıyor. Bu dosyaları
 * listeden düşürmek provenance kaydını kaybettirirdi; hash'lemeye çalışmak ise
 * üretimi imkânsız kılardı. Bu yüzden kayıt korunur, hash zinciri yalnız
 * gerçekten mevcut dosyaları kapsar.
 */
function artifactGroup(paths, extraAbsentPaths = []) {
  const uniquePaths = [...new Set(paths)].sort((left, right) => left.localeCompare(right, "en"));
  const absentPaths = [...extraAbsentPaths];
  const files = [];

  for (const relativePath of uniquePaths) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      absentPaths.push(relativePath);
      continue;
    }
    const bytes = readFileSync(absolutePath);
    files.push({
      path: normalizePath(relativePath),
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }

  const groupInput = files
    .map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`)
    .join("");
  const absentFromRepo = [...new Set(absentPaths)]
    .map((relativePath) => normalizePath(relativePath))
    .sort((left, right) => left.localeCompare(right, "en"));

  return {
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    sha256: sha256(Buffer.from(groupInput, "utf8")),
    files,
    ...(absentFromRepo.length > 0 ? { absentFromRepo } : {}),
  };
}

const lessonFiles = [
  ...walk("apps/mobile/src/data/Dersler", (file) => /(?:_dersi|_ders_modulu)\.json$/u.test(file)),
  ...walk("apps/web/src/data/dersler", (file) => /(?:_dersi|_ders_modulu)\.json$/u.test(file)),
];
const quizFiles = [
  ...walk("apps/mobile/src/data/Dersler", (file) => /_quiz\.json$/u.test(file)),
  ...walk("apps/web/src/data/dersler", (file) => /_quiz\.json$/u.test(file)),
];
const elifbaAudio = walk("apps/web/public/audio/elifba", (file) => /\.mp3$/u.test(file));
const prayerImages = [
  ...walk("apps/web/public/images/namaz", (file) => /\.(?:jpe?g|png|webp)$/iu.test(file)),
  ...walk("apps/mobile/assets/images/namaz", (file) => /\.(?:jpe?g|png|webp)$/iu.test(file)),
];
const elmaliliDigital = [
  "data/quran/external/Kuran/json-main/LICENSE",
  ...walk("data/quran/external/Kuran/json-main/tafseer/elmalili", (file) => /\.md$/u.test(file)),
];

const entries = [
  {
    id: "tanzil-uthmani-1.1",
    sourceUrls: [
      "https://tanzil.net/docs/Text_License",
      "https://tanzil.net/download/",
    ],
    classification: "direct-open-licensed-source",
    sourceContribution: "Canonical Uthmani Arabic Quran text.",
    projectContribution: "Immutable storage, SHA-256 gate, tokenization and rendering-only compatibility.",
    toolModel: "Tanzil Quran Text Uthmani 1.1",
    method: "Verbatim canonical source retained behind an immutable hash gate.",
    generatedAt: "2021-02-12",
    humanReview: "Tanzil verification plus Kuran Yolu corpus and alignment regression checks.",
    exactResearchUrlHistoryPreserved: true,
    artifacts: artifactGroup([
      "data/vendor/tanzil/uthmani-1.1/manifest.json",
      "data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt",
    ]),
  },
  {
    id: "elmalili-semar-ketir",
    sourceUrls: [
      "https://islamansiklopedisi.org.tr/elmalili-muhammed-hamdi",
      "https://github.com/kurancilar/json",
    ],
    classification: "public-domain-work-and-open-digital-edition",
    sourceContribution: "Elmalılı Hamdi Yazır's Hak Dini Kur'an Dili and Semar Ketir's digital transcription.",
    projectContribution: "Normalization, application packaging and separate AI-assisted simplified explanations.",
    toolModel: "Semar Ketir JSON Quran dataset; Kuran Yolu import pipeline",
    method: "Digital surah files imported and checked as the original tafsir layer.",
    generatedAt: null,
    humanReview: "Application-level coverage and content checks; edition-specific legal status is not asserted as legal certainty.",
    exactResearchUrlHistoryPreserved: true,
    artifacts: artifactGroup(elmaliliDigital),
  },
  {
    id: "qac-mustafa0x-source-chain",
    sourceUrls: [
      "https://corpus.quran.com/download/",
      "https://github.com/mustafa0x/quran-morphology",
    ],
    classification: "modified-third-party-source",
    sourceContribution: "Quranic Arabic Corpus v0.4 morphology and the mustafa0x Arabic/fix fork.",
    projectContribution: "Used as morphology input and teacher/reference evidence; raw runtime morphology remains a separately tracked risk layer.",
    toolModel: "QAC v0.4; mustafa0x/quran-morphology",
    method: "Segment morphology imported by the legacy builder and later compared with canonical token decisions.",
    generatedAt: null,
    humanReview: "Cell-level source-flow audit and subsequent project correction stages.",
    exactResearchUrlHistoryPreserved: true,
    artifacts: artifactGroup([
      "data/word-analysis/quran-morphology.txt",
      "data2/quran-morphology/README.md",
      "data2/quran-morphology/quran-morphology.txt",
    ]),
  },
  {
    id: "camel-tools-and-morph",
    sourceUrls: [
      "https://github.com/CAMeL-Lab/camel_tools",
      "https://github.com/CAMeL-Lab/camel_morph",
    ],
    classification: "tool-and-open-licensed-model-data",
    sourceContribution: "CAMeL Tools analyzer and CAMeL Morph morphology database candidates.",
    projectContribution: "Contextual candidate selection, rejection, Unicode normalization and manual review.",
    toolModel: "CAMeL Tools; CAMeL Morph MSA",
    method: "Candidate analyses were ranked and selected into the Kuran Yolu canonical morphology layer.",
    generatedAt: "2026-07-24",
    humanReview: "v1.8 acceptance, rollback and regression packages.",
    exactResearchUrlHistoryPreserved: true,
    artifacts: artifactGroup([
      "docs/provenance/camel-token-policy.md",
      "data/candidates/morphology/final-v1_8/checksums.json",
      "data/candidates/morphology/final-v1_8/determinism.json",
      "data/candidates/morphology/final-v1_8/summary.json",
    ]),
  },
  {
    id: "alquran-cloud-tajweed-source",
    sourceUrls: [
      "https://api.alquran.cloud/v1/quran/quran-tajweed",
      "https://alquran.cloud/tajweed-guide",
      "https://alquran.cloud/terms-and-conditions",
    ],
    classification: "direct-runtime-source-and-transformation-input",
    sourceContribution: "quran-tajweed rule markers.",
    projectContribution: "Canonical Tanzil alignment, span coordinates, rule colors, safety checks and manual overrides.",
    toolModel: "AlQuran.cloud quran-tajweed API",
    method: "The raw marked text is fetched into verses.arabic_tajweed, then parsed and aligned; the raw runtime field is not removed by this task.",
    generatedAt: null,
    humanReview: "Source-diff audit, alignment diagnostics and verse-scoped overrides.",
    exactResearchUrlHistoryPreserved: true,
    evidenceGap: "A standalone immutable pre-transform snapshot/hash of the raw AlQuran.cloud marker response was not preserved.",
    runtimeLocation: "data/app.db: verses.arabic_tajweed",
    artifacts: artifactGroup([
      "scripts/_build-tajweed.mjs",
      "scripts/audit-tajweed-source-diff.mjs",
      "scripts/output/tajweed-source-diff-summary.md",
    ]),
  },
  {
    id: "kuran-yolu-morphology-layer",
    sourceUrls: [
      "https://corpus.quran.com/download/",
      "https://github.com/mustafa0x/quran-morphology",
      "https://github.com/CAMeL-Lab/camel_tools",
      "https://github.com/CAMeL-Lab/camel_morph",
    ],
    classification: "project-transformed-and-manually-verified-output",
    sourceContribution: "QAC/mustafa0x and CAMeL evidence.",
    projectContribution: "Canonical token alignment, Unicode normalization, contextual selection, error correction, Turkish meanings and manual verification.",
    toolModel: "Kuran Yolu morphology pipeline with QAC/CAMeL inputs and manual decisions",
    method: "v1.8 enrichment/cleanup, v1.9 nine-verse realignment, v1.10 guarded corrections and token-map v1.1 freeze.",
    generatedAt: "2026-07-27",
    humanReview: "Guarded migrations, pre-images, reverse checks, full-corpus regressions and final freeze.",
    exactResearchUrlHistoryPreserved: true,
    artifacts: artifactGroup([
      "docs/provenance/morphology-production-baseline.json",
      "docs/provenance/morphology-final-freeze-v1_10-token-map-v1_1.json",
      "data/candidates/morphology/token-realign-v1_9/field-change-manifest.json",
      "data/candidates/morphology/surgical-v1_10/batch-a-37-130/field-change-manifest.json",
      "data/candidates/morphology/surgical-v1_10/batch-a-37-130-lemma-normalization/field-change-manifest.json",
      "data/candidates/morphology/surgical-v1_10/batch-bc-meaning-tr/field-change-manifest.json",
      "data/candidates/morphology/camel-token-map-v1_1-fatiha/manifest.json",
      "data/candidates/morphology/camel-token-map-v1_1-fatiha/token-map.jsonl",
      "data/candidates/morphology/camel-token-map-v1_1-fatiha/validation-report.json",
    ]),
  },
  {
    id: "kuran-yolu-tajweed-layer",
    sourceUrls: [
      "https://tanzil.net/docs/Text_License",
      "https://alquran.cloud/tajweed-guide",
      "https://alquran.cloud/terms-and-conditions",
    ],
    classification: "project-transformed-and-manually-corrected-output",
    sourceContribution: "AlQuran.cloud marker rules.",
    projectContribution: "Canonical code-point spans, coordinate and color mapping, validation guards and manual additions.",
    toolModel: "Kuran Yolu tajweed alignment engine",
    method: "Markers are aligned to canonical Tanzil graphemes and emitted as code-point spans.",
    generatedAt: "2026-07-27",
    humanReview: "14 verses received 23 manual spans covering 24 clusters.",
    exactResearchUrlHistoryPreserved: true,
    metrics: {
      recognizedSourceClusters: 86595,
      alignedSourceClusters: 79343,
      alignedPercent: 91.6254,
      manualOverrideVerses: 14,
      manualSpans: 23,
      manualClusters: 24,
    },
    artifacts: artifactGroup([
      "scripts/build-quran-runtime.mjs",
      "data/tajweed-span-overrides.json",
      "data/generated/quran/tajweed-spans.json",
      "data/generated/quran/tajweed-coverage.json",
    ]),
  },
  {
    id: "ai-transliteration",
    sourceUrls: [],
    classification: "user-declared-ai-assisted-project-output",
    sourceContribution: "Arabic Quran text used as the transliteration input.",
    projectContribution: "Turkish-reader-oriented transliteration regenerated for Kuran Yolu.",
    toolModel: "AI model; exact provider/model/run not preserved",
    method: "Verse-level AI regeneration followed by project normalization.",
    generatedAt: null,
    humanReview: "Project review declared; record-level review manifest is not preserved.",
    exactResearchUrlHistoryPreserved: false,
    evidenceGap: RESEARCH_HISTORY_GAP,
    artifacts: artifactGroup(["data/quran/transliteration.json"]),
  },
  {
    id: "codex-hadith-translations",
    sourceUrls: [],
    classification: "user-declared-ai-assisted-project-output",
    sourceContribution: "Classical hadith references and Arabic/source identifiers.",
    projectContribution: "Turkish translations and presentation text prepared for Kuran Yolu.",
    toolModel: "OpenAI Codex; exact model/run not preserved",
    method: "Hadith records translated and edited into the application schema.",
    generatedAt: null,
    humanReview: "Project review declared; entry-level decision log is not preserved.",
    exactResearchUrlHistoryPreserved: false,
    evidenceGap: RESEARCH_HISTORY_GAP,
    artifacts: artifactGroup([
      "apps/web/src/data/hadisler_v2.json",
      "apps/mobile/src/data/hadisler_v2.json",
    ]),
  },
  {
    id: "deep-research-siyer-kissa",
    sourceUrls: [],
    classification: "user-declared-ai-assisted-project-output",
    sourceContribution: "Historical and religious references consulted during research.",
    projectContribution: "Original Turkish narrative structure and application presentation.",
    toolModel: "OpenAI Deep Research plus AI writing tools; exact runs not preserved",
    method: "Research synthesis, AI-assisted drafting and project editing.",
    generatedAt: null,
    humanReview: "Project review declared; per-claim citation ledger is incomplete.",
    exactResearchUrlHistoryPreserved: false,
    evidenceGap: RESEARCH_HISTORY_GAP,
    artifacts: artifactGroup([
      "apps/web/src/data/siyer_i_nebi.json",
      "apps/mobile/src/data/siyer_i_nebi.json",
      "apps/web/src/data/peygamber_kissalari.json",
      "apps/mobile/src/data/peygamber_kissalari.json",
    ]),
  },
  {
    id: "chatgpt-lesson-research",
    sourceUrls: [],
    classification: "user-declared-ai-assisted-project-output",
    sourceContribution: "Religious and educational references used for lesson research.",
    projectContribution: "Kuran Yolu lesson organization and Turkish presentation.",
    toolModel: "ChatGPT; exact model/run not preserved",
    method: "AI-assisted research and drafting followed by project editing.",
    generatedAt: null,
    humanReview: "Project review declared; lesson-level generation logs are not preserved.",
    exactResearchUrlHistoryPreserved: false,
    evidenceGap: RESEARCH_HISTORY_GAP,
    artifacts: artifactGroup(lessonFiles),
  },
  {
    id: "claude-card-quiz-generation",
    sourceUrls: [],
    classification: "user-declared-ai-assisted-project-output",
    sourceContribution: "Kuran Yolu lesson material.",
    projectContribution: "Cards and quizzes generated and integrated into the learning flow.",
    toolModel: "Anthropic Claude; exact model/run not preserved",
    method: "AI generation from lesson topics followed by schema validation and project editing.",
    generatedAt: null,
    humanReview: "Project review declared; item-level generation prompts are not preserved.",
    exactResearchUrlHistoryPreserved: false,
    evidenceGap: RESEARCH_HISTORY_GAP,
    artifacts: artifactGroup(quizFiles),
  },
  {
    id: "gemini-elifba-audio-and-images",
    sourceUrls: [],
    classification: "user-declared-ai-generated-project-assets",
    sourceContribution: "Kuran Yolu asset prompts and lesson requirements.",
    projectContribution: "Elifba pronunciation assets and prayer-guide visuals.",
    toolModel: "Google Gemini; exact model/run not preserved",
    method: "AI audio/image generation, file selection and application packaging.",
    generatedAt: null,
    humanReview: "Project selection and placement; prompt/run archive is not preserved.",
    exactResearchUrlHistoryPreserved: false,
    evidenceGap: RESEARCH_HISTORY_GAP,
    artifacts: artifactGroup([...elifbaAudio, ...prayerImages]),
  },
  {
    id: "ai-prayer-dhikr-guides-explanations",
    sourceUrls: [
      "https://islamansiklopedisi.org.tr/elmalili-muhammed-hamdi",
    ],
    classification: "project-authored-and-ai-assisted-output",
    sourceContribution: "Historical prayer/dhikr texts, Elmalılı tafsir and religious references.",
    projectContribution: "Turkish meanings, worship guides and simplified explanatory presentation.",
    toolModel: "AI translation/writing tools; DeepSeek v4 Flash for simplified tafsir; other exact runs not preserved",
    method: "Project-authored guides plus AI-assisted translation and simplification.",
    generatedAt: null,
    humanReview: "Project review declared; exact coverage varies by content group.",
    exactResearchUrlHistoryPreserved: false,
    evidenceGap: RESEARCH_HISTORY_GAP,
    artifacts: artifactGroup([
      "content/tafsir/simplified-surah.json",
      "apps/web/src/data/dualar.json",
      "apps/mobile/src/data/dualar.json",
      "apps/web/src/data/namaz_rehberi.json",
      "apps/mobile/src/data/namaz_rehberi.json",
      "apps/web/src/data/ozel_namazlar.json",
      "apps/mobile/src/data/ozel_namazlar.json",
      "apps/mobile/src/data/ismi_azam_dualari.ts",
      "scripts/generate-simplified-tafsir-deepseek.mjs",
    ]),
  },
  {
    id: "removed-runtime-translations-v1",
    sourceUrls: ["https://github.com/kurancilar/json"],
    classification: "retired-runtime-translation-sources",
    sourceContribution:
      "Bulaç, Diyanet İşleri, Yaşar Nuri Öztürk and Diyanet Vakfı Turkish translations, previously carried as comparison meals.",
    projectContribution:
      "Normalization and packaging only; no derived text remains in the runtime after the Elmalılı-only migration.",
    toolModel: "scripts/migrate-elmalili-only.mjs (guarded forward/reverse migration)",
    method:
      "Production runtime reduced to Elmalılı Hamdi Yazır: 24944 translation rows removed from translations, aktif_mealler pruned to yazir, verses.primary_translation and ayet_fts.meal repointed to Elmalılı, and fidelity comparison rows dropped. Provenance is retained here rather than deleted.",
    generatedAt: null,
    humanReview:
      "Counts verified before and after the migration; off-target columns checksum-compared and unchanged.",
    exactResearchUrlHistoryPreserved: true,
    runtimeStatus: "removed_from_runtime",
    sources: ["bulac", "diyanet", "ozturk", "vakfi"],
    artifacts: artifactGroup([
      "data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/tr.bulac.json",
      "data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/tr.diyanet.json",
      "data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/tr.ozturk.json",
      "data/quran/external/Kuran/Kuran-Rehberi-main/data/translations/tr.vakfi.json",
    ]),
  },
];

const manifest = {
  schemaVersion: 1,
  generatedAt: GENERATED_AT,
  scope: "Kuran Yolu source, license and project-production provenance",
  legalDisclaimer:
    "This manifest records technical provenance and attribution evidence; it is not legal advice or a warranty of legal status.",
  productionPolicy: {
    quranText: "Tanzil Uthmani 1.1 canonical text",
    targetTranslation:
      "only Elmalılı Hamdi Yazır; bulac, diyanet, ozturk and vakfi were removed from the runtime by the guarded Elmalılı-only migration and are retained in provenance as removed_from_runtime",
    morphology: "usable Kuran Yolu transformed/verified output",
    tajweed: "usable Kuran Yolu aligned span output",
    retainedRuntimeRisks: ["verses.arabic_tajweed"],
    removedRuntimeArtifacts: {
      "morfoloji table":
        "removed_from_runtime. The raw QAC-derived segment-level morphology table (130,030 rows) was dropped from the local and Turso runtime databases. It had no user-facing web, mobile or API consumer; its only reader was an unused root/lemma fallback in verseAnalysisContext, reachable solely from offline audit scripts. That fallback aggregated segment-level values to word level and would have written the leading particle (و, ل, ب) as the word's lemma in 2,180 of 2,182 empty cells, so it was removed rather than persisted. Four root cells that were individually verified against the canonical token were backfilled into words beforehand (2:72 w9 كون, 15:7 w4 ملك, 15:7 w6 كون, 27:20 w10 كون). The full table is retained outside the runtime as a hashed provenance artifact. The final canonical Kuran Yolu morphology in the words table (77,433 rows) is unaffected and remains the single source; QAC and CAMeL attribution for that layer is unchanged.",
    },
    retainedRuntimeRiskNotes: {
      "verses.arabic_tajweed":
        "Raw AlQuran.cloud tajweed markup is retained in the runtime database for now. A span-only runtime was implemented and verified, but the canonical tajweed_spans layer maps only 79,343 of 86,595 source rule clusters (91.6254%); by the alignment ambiguity policy the remaining 7,252 clusters stay uncolored. Switching would reduce visible colouring in 2,398 ayahs and remove it entirely in 13, which was not accepted as a product decision. The raw field therefore remains the rendering source for web and mobile, and also serves as the build input for span regeneration.",
    },
  },
  licenseAndDisclosureArtifacts: artifactGroup([
    "NOTICE",
    "THIRD_PARTY_LICENSES.md",
    "licenses/README.md",
    "licenses/TANZIL-QURAN-TEXT-NOTICE.txt",
    "licenses/CAMEL-TOOLS-MIT.txt",
    "licenses/CAMEL-MORPH-CC-BY-4.0-NOTICE.md",
    "licenses/SEMAR-KETIR-MIT.txt",
    "licenses/OFL-1.1.txt",
    "licenses/FONT-NOTICES.md",
    "licenses/UTHMANIC-HAFS-EULA.txt",
    "licenses/PACKAGE-NOTICES.md",
    "licenses/PACKAGE-LICENSE-TEXTS.txt",
    "packages/core/src/presentation/sourceLicenses.ts",
    "apps/web/src/app/hakkinda/page.tsx",
    "apps/mobile/app/hakkinda.tsx",
  ]),
  entries,
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${normalizePath(path.relative(REPO_ROOT, OUTPUT_PATH))} with ${entries.length} provenance entries.`);
