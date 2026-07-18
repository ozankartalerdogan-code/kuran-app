/**
 * Candidate runner for the legacy canonical word-analysis builder.
 *
 * Loads the byte-identical snapshot (legacy-canonical-builder.snapshot.js) as a
 * module — its main() only runs when it is the entry point, so requiring it
 * performs no writes — and re-implements ONLY the output stage so that every
 * write lands under data/candidates/morphology/.
 *
 * Write-point audit of the snapshot (all bypassed here):
 *   - fs.mkdir(data2/processed/reports)              -> not called
 *   - writeFile(data2/processed/canonical_word_analysis.json)          -> redirected
 *   - writeFile(.../reports/canonical_word_analysis_coverage.json)     -> redirected
 *   - writeFile(.../reports/canonical_word_analysis_missing.json)      -> redirected
 *   - writeFile(.../reports/canonical_word_analysis_conflicts.json)    -> redirected
 *
 * Determinism: the snapshot stamps `generatedAt: new Date().toISOString()` into
 * the coverage report. That field is nulled here so repeated runs over the same
 * inputs produce byte-identical outputs.
 *
 * Usage:
 *   node scripts/morphology/build-legacy-canonical-candidate.js [--output <dir>] [--all | --surah N --ayah N]
 *
 * --output must resolve inside data/candidates/morphology/ (default: that dir).
 * Defaults to --all (full Quran) since the candidate exists for full comparison.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const snapshot = require("./legacy-canonical-builder.snapshot.js");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ALLOWED_OUTPUT_ROOT = path.join(ROOT_DIR, "data", "candidates", "morphology");

const FORBIDDEN_PATHS = [
  path.join(ROOT_DIR, "data", "app.db"),
  path.join(ROOT_DIR, "data", "app.db.yedek_20260521_164049"),
  path.join(ROOT_DIR, "data", "kuran_core.db"),
  path.join(ROOT_DIR, "data2"),
  path.join(ROOT_DIR, "data", "word-analysis"),
];

function assertSafeOutputDir(rawDir) {
  const resolved = path.resolve(ROOT_DIR, rawDir);

  const insideAllowed =
    resolved === ALLOWED_OUTPUT_ROOT ||
    resolved.startsWith(ALLOWED_OUTPUT_ROOT + path.sep);

  if (!insideAllowed) {
    throw new Error(
      `Refusing output dir outside data/candidates/morphology: ${resolved}`
    );
  }

  for (const forbidden of FORBIDDEN_PATHS) {
    if (resolved === forbidden || resolved.startsWith(forbidden + path.sep)) {
      throw new Error(`Refusing output dir inside protected path: ${resolved}`);
    }
  }

  return resolved;
}

function parseArgs(argv) {
  const options = { outputDir: ALLOWED_OUTPUT_ROOT, all: true, surah: null, ayah: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a directory argument");
      }
      options.outputDir = value;
      index += 1;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--surah") {
      options.surah = Number(argv[index + 1]);
      options.all = false;
      index += 1;
    } else if (arg === "--ayah") {
      options.ayah = Number(argv[index + 1]);
      options.all = false;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.all && (!Number.isInteger(options.surah) || !Number.isInteger(options.ayah))) {
    throw new Error("Use --all, or numeric --surah and --ayah together.");
  }

  return options;
}

async function assertInputsExist() {
  const missing = [];
  for (const [name, filePath] of Object.entries(snapshot.PATHS)) {
    if (["output", "coverageReport", "missingReport", "conflictReport"].includes(name)) {
      continue;
    }
    try {
      await fs.access(filePath);
    } catch {
      missing.push(`${name}: ${filePath}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required snapshot inputs (no fallback):\n${missing.join("\n")}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputDir = assertSafeOutputDir(options.outputDir);
  const reportDir = path.join(outputDir, "reports");

  await assertInputsExist();

  const buildOptions = options.all
    ? { all: true, surah: 1, ayah: 1 }
    : { all: false, surah: options.surah, ayah: options.ayah };

  const payload = await snapshot.buildCanonicalWordAnalysis(buildOptions);

  if (payload.reports?.coverage && "generatedAt" in payload.reports.coverage) {
    payload.reports.coverage.generatedAt = null;
  }

  await fs.mkdir(reportDir, { recursive: true });

  const outputs = {
    canonical: path.join(outputDir, "canonical_legacy_candidate.json"),
    coverage: path.join(reportDir, "canonical_legacy_candidate_coverage.json"),
    missing: path.join(reportDir, "canonical_legacy_candidate_missing.json"),
    conflicts: path.join(reportDir, "canonical_legacy_candidate_conflicts.json"),
  };

  for (const target of Object.values(outputs)) {
    assertSafeOutputDir(path.dirname(target));
  }

  await Promise.all([
    fs.writeFile(outputs.canonical, `${JSON.stringify(payload.result, null, 2)}\n`, "utf8"),
    fs.writeFile(outputs.coverage, `${JSON.stringify(payload.reports.coverage, null, 2)}\n`, "utf8"),
    fs.writeFile(outputs.missing, `${JSON.stringify(payload.reports.missing, null, 2)}\n`, "utf8"),
    fs.writeFile(outputs.conflicts, `${JSON.stringify(payload.reports.conflicts, null, 2)}\n`, "utf8"),
  ]);

  console.log(
    JSON.stringify(
      {
        outputDir: path.relative(ROOT_DIR, outputDir).replaceAll(path.sep, "/"),
        ayahs: payload.reports.coverage.totals.ayahs,
        words: payload.reports.coverage.totals.words,
        conflictCount: payload.reports.coverage.conflictCount,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
