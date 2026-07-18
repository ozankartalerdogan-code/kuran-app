/**
 * Determinism gate for the morphology candidate build chain.
 *
 * Default mode checks the legacy canonical builder plus the DB builder. Since
 * required legacy inputs are currently missing, its preflight fails without
 * deleting existing run evidence.
 *
 * --db-only checks only the DB builder, using the pinned surviving derivative:
 * data2/processed/canonical_word_analysis_v4.json. It never invokes the
 * canonical builder in this mode.
 *
 * All preflight checks complete before run-a/run-b are removed or created.
 * All outputs stay under data/candidates/morphology/determinism/.
 *
 * Usage:
 *   node scripts/morphology/check-determinism.mjs
 *   node scripts/morphology/check-determinism.mjs --db-only
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const ALLOWED_OUTPUT_ROOT = path.join(ROOT, "data", "candidates", "morphology");
const DETERMINISM_ROOT = path.join(ALLOWED_OUTPUT_ROOT, "determinism");
const RUN_A = path.join(DETERMINISM_ROOT, "run-a");
const RUN_B = path.join(DETERMINISM_ROOT, "run-b");

const CANONICAL_BUILDER = path.join(__dirname, "build-legacy-canonical-candidate.js");
const DB_BUILDER = path.join(__dirname, "build-app-db-candidate.py");
const BASELINE_MANIFEST = path.join(
  ROOT,
  "docs",
  "provenance",
  "morphology-production-baseline.json"
);
const DB_ONLY_INPUT = path.join(
  ROOT,
  "data2",
  "processed",
  "canonical_word_analysis_v4.json"
);

const LEGACY_CANONICAL_INPUTS = [
  { path: path.join(ROOT, "data2", "quran-json", "dist", "chapters"), type: "directory" },
  { path: path.join(ROOT, "data", "word-analysis", "quran-morphology.txt"), type: "file" },
  { path: path.join(ROOT, "data2", "corpus-morphology.txt"), type: "file" },
  { path: path.join(ROOT, "data2", "quran-morphology", "quran-morphology.txt"), type: "file" },
  { path: path.join(ROOT, "data", "word-analysis", "word-translations-tr.json"), type: "file" },
  { path: path.join(ROOT, "data", "word-analysis", "extended-roots.json"), type: "file" },
  {
    path: path.join(
      ROOT,
      "data2",
      "QURAN-NLP",
      "data",
      "quran",
      "corpus",
      "quran_dictionary.csv"
    ),
    type: "file",
  },
];

const relative = (target) => path.relative(ROOT, target).replaceAll(path.sep, "/");

function parseArgs(argv) {
  let dbOnly = false;
  for (const arg of argv) {
    if (arg === "--db-only") {
      dbOnly = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { dbOnly };
}

function assertInsideAllowedOutput(target) {
  const rel = path.relative(ALLOWED_OUTPUT_ROOT, target);
  if (rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel))) {
    return;
  }
  throw new Error(`Output escaped data/candidates/morphology: ${target}`);
}

function assertPathType(target, type, label) {
  if (!existsSync(target)) {
    throw new Error(`${label} missing: ${relative(target)}`);
  }
  const stats = statSync(target);
  if (type === "file" && !stats.isFile()) {
    throw new Error(`${label} is not a file: ${relative(target)}`);
  }
  if (type === "directory" && !stats.isDirectory()) {
    throw new Error(`${label} is not a directory: ${relative(target)}`);
  }
}

function assertPythonAvailable() {
  const result = spawnSync("python", ["--version"], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Python preflight failed (${result.status}): ${result.stderr || result.error}`);
  }
}

function validateBaselineManifest() {
  assertPathType(BASELINE_MANIFEST, "file", "Baseline manifest");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(BASELINE_MANIFEST, "utf8"));
  } catch (error) {
    throw new Error(`Baseline manifest is invalid JSON: ${error.message}`);
  }
  const createSql = manifest?.production_db?.words_schema?.create_sql;
  if (!Array.isArray(createSql) || !createSql.some((entry) => entry?.sql)) {
    throw new Error("Baseline manifest contains no words CREATE SQL.");
  }
}

function validateDbOnlyInput() {
  assertPathType(DB_ONLY_INPUT, "file", "DB-only canonical input");
  let canonical;
  try {
    canonical = JSON.parse(readFileSync(DB_ONLY_INPUT, "utf8"));
  } catch (error) {
    throw new Error(`DB-only canonical input is invalid JSON: ${error.message}`);
  }
  if (!canonical || Array.isArray(canonical) || typeof canonical !== "object") {
    throw new Error("DB-only canonical input must be a non-empty object.");
  }
  const verseKeys = Object.keys(canonical);
  if (verseKeys.length === 0 || verseKeys.some((key) => !Array.isArray(canonical[key]))) {
    throw new Error("DB-only canonical input has an invalid verse-key structure.");
  }
  const wordCount = verseKeys.reduce((sum, key) => sum + canonical[key].length, 0);
  if (verseKeys.length !== 6236 || wordCount !== 77429) {
    throw new Error(
      `DB-only canonical input failed pinned counts: verses=${verseKeys.length}, words=${wordCount}`
    );
  }
  return { verseKeys: verseKeys.length, words: wordCount };
}

function missingLegacyCanonicalInputs() {
  return LEGACY_CANONICAL_INPUTS.filter(({ path: target, type }) => {
    if (!existsSync(target)) return true;
    const stats = statSync(target);
    return type === "file" ? !stats.isFile() : !stats.isDirectory();
  }).map(({ path: target }) => relative(target));
}

function preflight(options) {
  assertInsideAllowedOutput(DETERMINISM_ROOT);
  assertInsideAllowedOutput(RUN_A);
  assertInsideAllowedOutput(RUN_B);
  assertPathType(DB_BUILDER, "file", "DB builder");
  assertPythonAvailable();
  validateBaselineManifest();

  if (options.dbOnly) {
    return { dbInput: DB_ONLY_INPUT, inputStats: validateDbOnlyInput() };
  }

  assertPathType(CANONICAL_BUILDER, "file", "Canonical candidate builder");
  const missing = missingLegacyCanonicalInputs();
  if (missing.length > 0) {
    throw new Error(
      `CANONICAL_BUILDER_DETERMINISM: BLOCKED_MISSING_INPUTS\n${missing.join("\n")}`
    );
  }
  return { dbInput: null, inputStats: null };
}

function prepareRunDirs() {
  for (const dir of [RUN_A, RUN_B]) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
}

function run(command, args) {
  const printable = [
    command,
    ...args.map((arg) => (path.isAbsolute(arg) ? relative(arg) : arg)),
  ].join(" ");
  console.log(`\n>> ${printable}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${printable}`);
  }
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function normalizedDbFingerprint(dbPath) {
  const script = `
import hashlib, json, sqlite3, sys
path = sys.argv[1]
conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
schema = sorted(
    " ".join(sql.split())
    for (sql,) in conn.execute("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL")
)
tables = [r[0] for r in conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
table_hashes = {}
for table in tables:
    columns = [r[1] for r in conn.execute(f'PRAGMA table_info("{table}")').fetchall()]
    order = ", ".join(f'"{c}"' for c in columns)
    digest = hashlib.sha256()
    for row in conn.execute(f'SELECT {order} FROM "{table}" ORDER BY {order}'):
        digest.update(json.dumps(row, ensure_ascii=False, default=str).encode("utf-8"))
        digest.update(b"\\n")
    table_hashes[table] = digest.hexdigest()
conn.close()
print(json.dumps({"schema": schema, "table_hashes": table_hashes}, sort_keys=True))
`;
  const result = spawnSync("python", ["-c", script, dbPath.replaceAll("\\", "/")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Normalized dump failed for ${relative(dbPath)}:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function compareDbOutputs(dbA, dbB) {
  const dbHashA = sha256(dbA);
  const dbHashB = sha256(dbB);
  const binaryEqual = dbHashA === dbHashB;
  const check = {
    check: "candidate_db",
    binary_sha256: { runA: dbHashA, runB: dbHashB, equal: binaryEqual },
    deterministic: binaryEqual,
  };

  if (!binaryEqual) {
    const fingerprintA = normalizedDbFingerprint(dbA);
    const fingerprintB = normalizedDbFingerprint(dbB);
    const normalizedEqual = JSON.stringify(fingerprintA) === JSON.stringify(fingerprintB);
    check.normalized = { equal: normalizedEqual, runA: fingerprintA, runB: fingerprintB };
    check.deterministic = normalizedEqual;
    check.note = normalizedEqual
      ? "Binary hashes differ but schema SQL and sorted table-content hashes match."
      : "Schema or table content differs between identical-input runs.";
  }
  return check;
}

function runDbBuilderTwice(inputPath) {
  const dbA = path.join(RUN_A, "morphology_validation_candidate.db");
  const dbB = path.join(RUN_B, "morphology_validation_candidate.db");
  run("python", [DB_BUILDER, "--input", relative(inputPath), "--output", relative(dbA)]);
  run("python", [DB_BUILDER, "--input", relative(inputPath), "--output", relative(dbB)]);
  return compareDbOutputs(dbA, dbB);
}

function runDbOnly(preflightResult) {
  prepareRunDirs();
  const dbCheck = runDbBuilderTwice(preflightResult.dbInput);
  const missingCanonicalInputs = missingLegacyCanonicalInputs();
  const canonicalStatus = missingCanonicalInputs.length
    ? "BLOCKED_MISSING_INPUTS"
    : "NOT_RUN_DB_ONLY";
  const dbStatus = dbCheck.deterministic
    ? "DB_BUILDER_DETERMINISTIC"
    : "DB_BUILDER_NOT_DETERMINISTIC";
  const summary = {
    mode: "db-only",
    input: relative(preflightResult.dbInput),
    input_counts: preflightResult.inputStats,
    run_dirs: [relative(RUN_A), relative(RUN_B)],
    DB_BUILDER_DETERMINISM: dbStatus,
    CANONICAL_BUILDER_DETERMINISM: canonicalStatus,
    missing_canonical_inputs: missingCanonicalInputs,
    check: dbCheck,
  };
  console.log(`\n${JSON.stringify(summary, null, 2)}`);
  console.log(`\n${dbStatus}`);
  console.log(`CANONICAL_BUILDER_DETERMINISM: ${canonicalStatus}`);
  if (!dbCheck.deterministic) process.exitCode = 1;
}

function runFullChain() {
  prepareRunDirs();
  run("node", [CANONICAL_BUILDER, "--all", "--output", RUN_A]);
  run("node", [CANONICAL_BUILDER, "--all", "--output", RUN_B]);

  const canonicalA = path.join(RUN_A, "canonical_legacy_candidate.json");
  const canonicalB = path.join(RUN_B, "canonical_legacy_candidate.json");
  const canonicalHashA = sha256(canonicalA);
  const canonicalHashB = sha256(canonicalB);
  const canonicalCheck = {
    check: "canonical_json_sha256",
    runA: canonicalHashA,
    runB: canonicalHashB,
    deterministic: canonicalHashA === canonicalHashB,
  };
  const dbCheck = runDbBuilderTwice(canonicalA);
  const deterministic = canonicalCheck.deterministic && dbCheck.deterministic;
  console.log(
    `\n${JSON.stringify(
      {
        mode: "full-chain",
        deterministic,
        run_dirs: [relative(RUN_A), relative(RUN_B)],
        checks: [canonicalCheck, dbCheck],
      },
      null,
      2
    )}`
  );
  if (!deterministic) process.exitCode = 1;
}

try {
  const options = parseArgs(process.argv.slice(2));
  const preflightResult = preflight(options);
  if (options.dbOnly) {
    runDbOnly(preflightResult);
  } else {
    runFullChain();
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
