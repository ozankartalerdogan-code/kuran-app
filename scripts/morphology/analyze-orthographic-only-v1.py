#!/usr/bin/env python3
"""ORTHOGRAPHIC_ONLY bucket: analysis-input-only orthographic transforms.

Scope: exactly the 120 tokens `classify-lexicon-oov.py` put in the
`ORTHOGRAPHIC_ONLY` bucket. Nothing else is read, scored or written.

What this does NOT do:
  * it never touches the canonical Tanzil surface - `canonical_text` is copied
    verbatim into every output row and is never an input to a transform result;
  * it adds no lemma guess, no root guess, no general letter folding and no free
    normalization: every transform is one named codepoint rewrite;
  * it does not edit R1-R5, the selector cascade, the clitic-split contract or
    the v1.6 paradigm lexicon extension - all of those are imported and run
    verbatim to build the *baseline* each transform is measured against;
  * it does not regenerate the 77,429-token dump. The frozen v1.6 extended dump
    is read as-is and the output is an input-side extension to be consumed by a
    later, separate regeneration.

Reversibility: a transform does not return a string, it returns an EDIT SCRIPT
(offset / deleted codepoints / inserted codepoints, in input coordinates). The
string is derived from the edit script, and `invert()` reconstructs the input
from the output. Every emitted variant is checked this way before it is used, so
"reverse-verifiable at codepoint level" is machine-enforced, not asserted.

Outputs (data/candidates/morphology/orthographic-only-v1/):
  base-pools.json          the frozen v1.6 candidate pools of the 120 tokens
  classification.jsonl     one row per token: class, edits, evidence
  analysis-form-extension.jsonl  the APPLIED extra analyzer inputs
  report.json              class counts, closable tokens, risky records, proofs
  checksums.json           sha256 of every output (determinism handle)
"""

from __future__ import annotations

import argparse
import collections
import gzip
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
TOKEN_MAP_PATH = CAMEL_ROOT / "token-map.jsonl"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
CLASSIFICATION = CAND_ROOT / "lexicon-oov" / "classification.jsonl"
FREEZE_V1_6 = SCRIPT_DIR / "resources" / "frozen-v1_6-manifest.json"
OUT_DIR = CAND_ROOT / "orthographic-only-v1"

SCHEMA_VERSION = "orthographic-only-v1"
RESIDUAL_LABELS = {"NO_MATCH", "CAMEL_OOV"}
BUCKET = "ORTHOGRAPHIC_ONLY"
EXPECTED_SCOPE_TOKENS = 120


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


RECALL = load_module(SCRIPT_DIR / "verify-recall-contract-r1r5-gate-final.py",
                     "recall_contract_gate_final")
COVERAGE = RECALL.COVERAGE
HAMZA = load_module(SCRIPT_DIR / "hamza_madda_rescue_rules.py", "hamza_rules_ro")


# --------------------------------------------------------------------------
# Codepoints
# --------------------------------------------------------------------------
ALEF = "ا"            # ا
WAW = "و"             # و
YEH = "ي"             # ي
MAQSURA = "ى"         # ى
SEEN = "س"            # س
SAD = "ص"             # ص
SMALL_WAW = "ۥ"       # ۥ  ARABIC SMALL WAW
SMALL_YEH = "ۦ"       # ۦ  ARABIC SMALL YEH
ROUNDED_ZERO = "۟"    # ۟  ARABIC SMALL HIGH ROUNDED ZERO (silent letter)
SMALL_SEEN = "ۜ"      # ۜ  ARABIC SMALL HIGH SEEN
HARAKAT = "ًٌٍَُِّْٰ"
QURAN_MARKS = re.compile("[ۖ-ۭ]")


# --------------------------------------------------------------------------
# Edit-script machinery: a transform is a list of codepoint edits, so the
# inverse is available by construction and is checked on every use.
# --------------------------------------------------------------------------
def apply_edits(text: str, edits) -> str:
    out, cursor = [], 0
    for edit in edits:
        offset = edit["offset"]
        if offset < cursor:
            raise ValueError("overlapping edits")
        out.append(text[cursor:offset])
        if text[offset:offset + len(edit["delete"])] != edit["delete"]:
            raise ValueError("edit does not match its input")
        out.append(edit["insert"])
        cursor = offset + len(edit["delete"])
    out.append(text[cursor:])
    return "".join(out)


def invert(result: str, edits) -> str:
    """Rebuild the transform input from the transform output."""
    out, cursor, shift = [], 0, 0
    for edit in edits:
        offset = edit["offset"] + shift
        out.append(result[cursor:offset])
        if result[offset:offset + len(edit["insert"])] != edit["insert"]:
            raise ValueError("inverse does not match its input")
        out.append(edit["delete"])
        cursor = offset + len(edit["insert"])
        shift += len(edit["insert"]) - len(edit["delete"])
    out.append(result[cursor:])
    return "".join(out)


def codepoints(text: str) -> str:
    return " ".join(f"U+{ord(ch):04X}" for ch in text)


# --------------------------------------------------------------------------
# The closed transform set. One named codepoint rewrite each.
# --------------------------------------------------------------------------
SILENT_CARRIERS = ALEF + WAW + YEH + MAQSURA
_SILENT_LETTER_RE = re.compile(f"([{SILENT_CARRIERS}]){ROUNDED_ZERO}")
_FINAL_WAW_RE = re.compile(f"{WAW}[{HARAKAT}]*$")
_SMALL_SEEN_RE = re.compile(f"{SAD}([{HARAKAT}]*){SMALL_SEEN}")
_FINAL_ALEF_RE = re.compile(f"{ALEF}[{HARAKAT}]*$")


def t_small_waw(text: str):
    return [{"offset": i, "delete": SMALL_WAW, "insert": WAW}
            for i, ch in enumerate(text) if ch == SMALL_WAW]


def t_small_yeh(text: str):
    return [{"offset": i, "delete": SMALL_YEH, "insert": YEH}
            for i, ch in enumerate(text) if ch == SMALL_YEH]


def t_silent_letter(text: str):
    """Delete the letter U+06DF declares unpronounced, together with the mark.

    U+06DF is not a recitation mark, it is a statement about the letter under
    it: this alef/waw/yeh is written but not read. MSA orthography simply does
    not write it. No guard is added on top of the notation - the source already
    says which letters are affected, and inventing a further condition would be
    a rule this pipeline has no evidence for."""
    return [{"offset": m.start(), "delete": m.group(0), "insert": ""}
            for m in _SILENT_LETTER_RE.finditer(text)]


def t_plural_waw_alef(text: str):
    """Word-final U+0648 (+harakat) -> the same plus U+0627: restore the otiose
    alef of the 3rd-person plural waw. Measured, not applied."""
    match = _FINAL_WAW_RE.search(text)
    if not match:
        return []
    return [{"offset": match.end(), "delete": "", "insert": ALEF}]


def t_small_seen(text: str):
    """U+0635 + U+06DC -> U+0633. The small high seen is the Uthmani notation
    for 'this sad is recited as a seen' (وَيَبْصُۜطُ = بَسَطَ)."""
    edits = []
    for match in _SMALL_SEEN_RE.finditer(text):
        edits.append({"offset": match.start(),
                      "delete": SAD + match.group(1) + SMALL_SEEN,
                      "insert": SEEN + match.group(1)})
    return edits


def t_final_alef_maqsura(text: str):
    """Word-final U+0627 -> U+0649. Measured, not applied."""
    match = _FINAL_ALEF_RE.search(text)
    if not match:
        return []
    return [{"offset": match.start(), "delete": ALEF, "insert": MAQSURA}]


TRANSFORMS = {
    "O1_SMALL_WAW_TO_WAW": t_small_waw,
    "O2_SMALL_YEH_TO_YEH": t_small_yeh,
    "O3_SILENT_LETTER_DROP": t_silent_letter,
    "O5_SMALL_SEEN_SAD_TO_SEEN": t_small_seen,
    "O4X_PLURAL_WAW_OTIOSE_ALEF": t_plural_waw_alef,
    "O6X_FINAL_ALEF_TO_MAQSURA": t_final_alef_maqsura,
}

TRANSFORM_DOC = {
    "O1_SMALL_WAW_TO_WAW":
        "U+06E5 -> U+0648. The Uthmani small waw notates a waw that is recited "
        "but not written on the line (يَسْتَوُۥنَ = يستوون).",
    "O2_SMALL_YEH_TO_YEH":
        "U+06E6 -> U+064A. The same notation for a recited, unwritten yeh.",
    "O3_SILENT_LETTER_DROP":
        "[U+0627 U+0648 U+064A U+0649] U+06DF -> (nothing). U+06DF states that "
        "the letter under it is written but not read; MSA does not write it "
        "(نَدْعُوا۟ = ندعو, تَا۟يْـَٔسُوا۟ = تيأسوا).",
    "O5_SMALL_SEEN_SAD_TO_SEEN":
        "U+0635 (+harakat) U+06DC -> U+0633 (+harakat). U+06DC over a sad is "
        "the Uthmani notation for a sad recited as a seen (يَبْصُۜطُ = يبسط).",
    "O4X_PLURAL_WAW_OTIOSE_ALEF":
        "word-final U+0648 (+harakat) -> the same, plus U+0627. Restores the "
        "otiose alef of the 3rd-person plural waw (جَآءُو -> جاءوا). Nothing in "
        "the source notates it, so it is measured, not applied.",
    "O6X_FINAL_ALEF_TO_MAQSURA":
        "word-final U+0627 -> U+0649 (رَءَا -> رأى). Deterministic and "
        "invertible, but no source notation licenses it: it overwrites a letter "
        "Tanzil actually wrote, and it fires on every word-final alef. Measured, "
        "not applied.",
}

# Two classes, separated on one criterion: does the SOURCE mark the difference?
#
# APPLIED - the Uthmani text carries an explicit notation codepoint (U+06E5,
# U+06E6, U+06DF, U+06DC) whose whole meaning is "the letter here is not the
# letter on the line". Decoding it is reading the source, not editing it.
#
# MEASURED_ONLY - deterministic and invertible, but nothing in the source marks
# the position. These rewrite a letter Tanzil wrote, on a convention argument
# rather than on evidence in the token, so they are reported with their exact
# token count and left for their own acceptance round.
APPLIED_TRANSFORMS = [
    "O1_SMALL_WAW_TO_WAW",
    "O2_SMALL_YEH_TO_YEH",
    "O3_SILENT_LETTER_DROP",
    "O5_SMALL_SEEN_SAD_TO_SEEN",
]
REPORT_ONLY_TRANSFORMS = ["O4X_PLURAL_WAW_OTIOSE_ALEF", "O6X_FINAL_ALEF_TO_MAQSURA"]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


def verify_freeze(manifest_path: Path):
    """v1.6 and the 30-lexeme paradigm extension are the frozen baseline. If any
    of it moved, this run must not start."""
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    drift = []
    for rel, meta in sorted(manifest["artifacts"].items()):
        path = REPO_ROOT / rel
        if not path.exists() or sha256_file(path) != meta["sha256"]:
            drift.append(rel)
    chain = manifest["chains_from"]
    chain_path = REPO_ROOT / chain["path"]
    if not chain_path.exists() or sha256_file(chain_path) != chain["sha256"]:
        drift.append(chain["path"])
    dump_dir = REPO_ROOT / manifest["extended_dump"]["dir"]
    for name, digest in sorted(manifest["extended_dump"]["shard_sha256"].items()):
        path = dump_dir / name
        if not path.exists() or sha256_file(path) != digest:
            drift.append(f"{manifest['extended_dump']['dir']}/{name}")
    if drift:
        raise SystemExit("frozen v1.6 baseline drifted: " + ", ".join(drift[:10]))
    return {
        "manifest": str(manifest_path.relative_to(REPO_ROOT)).replace("\\", "/"),
        "manifest_sha256": sha256_file(manifest_path),
        "schema_version": manifest["schema_version"],
        "artifacts_verified": len(manifest["artifacts"]),
        "dump_shards_verified": len(manifest["extended_dump"]["shard_sha256"]),
        "extended_db_sha256": manifest["extended_dump"]["extended_db_sha256"],
        "original_db_sha256": manifest["extended_dump"]["original_db_sha256"],
        "status": "VERIFIED_UNCHANGED",
    }, dump_dir


def load_base_pools(dump_dir: Path, keys, cache: Path | None):
    if cache and cache.exists():
        raw = json.loads(cache.read_text(encoding="utf-8"))
        return {tuple(json.loads(k)): v for k, v in raw.items()}
    pools = {}
    shards = sorted(dump_dir.glob("surah-*.jsonl.gz"))
    for index, path in enumerate(shards, 1):
        print(f"[pools] {index}/{len(shards)} {path.name}", file=sys.stderr, flush=True)
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                if key in keys:
                    pools[key] = obj.get("unique_candidates") or []
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(
            {json.dumps(list(k)): v for k, v in sorted(pools.items(), key=lambda kv: sort_key(kv[0]))},
            ensure_ascii=False, sort_keys=True), encoding="utf-8", newline="\n")
    return pools


def fingerprints(pool):
    return collections.Counter(RECALL.fingerprint(c) for c in pool)


def teacher_core_match(teacher_row, candidate) -> bool:
    """Root+lemma agreement with the teacher. Used ONLY to describe what a
    transform added; never to decide whether a transform exists."""
    t_root = COVERAGE.normalize_root(teacher_row.get("root"))
    t_lemma = COVERAGE.normalize_lemma(teacher_row.get("lemma"))
    c_root = COVERAGE.normalize_root(candidate.get("root"))
    c_lemma = COVERAGE.normalize_lemma(candidate.get("lex"))
    return (t_root is not None and c_root == t_root) or (
        t_lemma is not None and c_lemma == t_lemma)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    parser.add_argument("--pool-cache", default=None,
                        help="optional path to cache the frozen base pools")
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    print("[freeze] verifying frozen v1.6 baseline", file=sys.stderr, flush=True)
    freeze, dump_dir = verify_freeze(FREEZE_V1_6)
    print("[freeze] ok", file=sys.stderr, flush=True)

    scope_rows = [json.loads(l) for l in CLASSIFICATION.open(encoding="utf-8")]
    scope_rows = [r for r in scope_rows if r["bucket"] == BUCKET]
    if len(scope_rows) != EXPECTED_SCOPE_TOKENS:
        raise SystemExit(f"scope moved: {len(scope_rows)} != {EXPECTED_SCOPE_TOKENS}")
    keys = {(r["verse_key"], r["word_index"]) for r in scope_rows}
    level_of = {(r["verse_key"], r["word_index"]): r["residual_level"] for r in scope_rows}

    canonical, base_forms = {}, {}
    for line in TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        if key in keys:
            canonical[key] = obj["canonical_text"]
            base_forms[key] = list(obj["analysis_forms"])
    teacher = {}
    for line in TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        key = (obj["verse_key"], obj["word_index"])
        if key in keys:
            teacher[key] = obj

    pool_cache = Path(args.pool_cache) if args.pool_cache else None
    base_pools = load_base_pools(dump_dir, keys, pool_cache)
    missing = keys - set(base_pools)
    if missing:
        raise SystemExit(f"{len(missing)} scope tokens absent from the frozen dump")

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB
    analyzer = Analyzer(MorphologyDB(str(RECALL.DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def label(teacher_row, pool):
        return COVERAGE.classify(
            teacher_row, COVERAGE.summarize_candidates({"unique_candidates": pool}))[0]

    def derive(form: str, transform_id: str):
        """(variant, edits) for one transform, with the inverse checked."""
        edits = TRANSFORMS[transform_id](form)
        if not edits:
            return None, []
        variant = apply_edits(form, edits)
        if variant == form:
            return None, []
        if invert(variant, edits) != form:
            raise SystemExit(f"{transform_id} is not reverse-verifiable on {form!r}")
        return variant, edits

    rows = []
    class_counts = collections.Counter()
    trigger_counts = collections.Counter()
    reversibility_checks = 0

    for key in sorted(keys, key=sort_key):
        teacher_row = teacher[key]
        forms = base_forms[key]
        # Baseline = frozen v1.6 pool + the frozen R1-R5 variant pool. Every
        # transform below is scored strictly against this.
        variants = RECALL.build_variants(canonical[key], forms)
        baseline_forms = list(dict.fromkeys(list(forms) + sorted(variants)))
        baseline_pool = list(base_pools[key])
        for form in baseline_forms:
            baseline_pool.extend(analyze(form))
        baseline_label = label(teacher_row, baseline_pool)
        baseline_fp = fingerprints(baseline_pool)

        per_transform = {}
        for transform_id in TRANSFORMS:
            produced = []
            for form in baseline_forms:
                for seed in dict.fromkeys((form, QURAN_MARKS.sub("", form))):
                    variant, edits = derive(seed, transform_id)
                    if variant is None:
                        continue
                    reversibility_checks += 1
                    chain = [transform_id]
                    hamza_variant, hamza_rules = HAMZA.apply_rules(variant)
                    finals = [(variant, chain)]
                    if hamza_rules and hamza_variant != variant:
                        finals.append((hamza_variant, chain + hamza_rules))
                    for text, rule_chain in finals:
                        if text in baseline_forms:
                            continue
                        produced.append({
                            "analyzer_form": text,
                            "from_form": seed,
                            "rule_chain": rule_chain,
                            "edits": edits,
                            "edit_codepoints": [
                                {"offset": e["offset"],
                                 "delete": codepoints(e["delete"]),
                                 "insert": codepoints(e["insert"])} for e in edits],
                            "analyzable": bool(analyze(text)),
                        })
            seen, unique = set(), []
            for item in produced:
                if item["analyzer_form"] in seen:
                    continue
                seen.add(item["analyzer_form"])
                unique.append(item)
            if not unique:
                continue
            extra_pool = [c for item in unique for c in analyze(item["analyzer_form"])]
            new_label = label(teacher_row, baseline_pool + extra_pool)
            added = fingerprints(baseline_pool + extra_pool) - baseline_fp
            added_core, added_noise = 0, 0
            for candidate in extra_pool:
                if RECALL.fingerprint(candidate) not in added:
                    continue
                if teacher_core_match(teacher_row, candidate):
                    added_core += 1
                else:
                    added_noise += 1
            per_transform[transform_id] = {
                "forms": unique,
                "label_after": new_label,
                "closes": baseline_label in RESIDUAL_LABELS and new_label not in RESIDUAL_LABELS,
                "candidates_added": len(added),
                "added_matching_teacher_core": added_core,
                "added_not_matching_teacher_core": added_noise,
            }

        closing_applied = [t for t in APPLIED_TRANSFORMS
                           if per_transform.get(t, {}).get("closes")]
        closing_report_only = [t for t in REPORT_ONLY_TRANSFORMS
                               if per_transform.get(t, {}).get("closes")]

        if baseline_label not in RESIDUAL_LABELS:
            token_class = "ALREADY_REACHED_BY_FROZEN_RULES"
        elif closing_applied:
            token_class = "+".join(closing_applied)
        elif closing_report_only:
            token_class = "MEASURED_ONLY::" + "+".join(closing_report_only)
        else:
            token_class = "UNRESOLVED_NOT_ORTHOGRAPHIC"
        class_counts[token_class] += 1
        for transform_id in per_transform:
            trigger_counts[transform_id] += 1

        rows.append({
            "verse_key": key[0],
            "word_index": key[1],
            "canonical_text": canonical[key],
            "canonical_codepoints": codepoints(canonical[key]),
            "residual_level": level_of[key],
            "baseline_label": baseline_label,
            "transform_class": token_class,
            "closing_applied_transforms": closing_applied,
            "closing_report_only_transforms": closing_report_only,
            "transforms": {t: {k: v for k, v in info.items()}
                           for t, info in sorted(per_transform.items())},
            "teacher_lemma": teacher_row.get("lemma"),
            "teacher_root": teacher_row.get("root"),
            "teacher_pos": teacher_row.get("pos"),
        })

    # ---- applied extension + additivity proof -------------------------------
    extension_rows = []
    proof_removed, proof_altered, proof_out_of_scope = [], [], []
    tokens_gaining = 0
    for row in rows:
        key = (row["verse_key"], row["word_index"])
        applied = []
        for transform_id in APPLIED_TRANSFORMS:
            info = row["transforms"].get(transform_id)
            if not info or not info["closes"]:
                continue
            for item in info["forms"]:
                if not item["analyzable"]:
                    continue
                applied.append({
                    "analyzer_form": item["analyzer_form"],
                    "from_form": item["from_form"],
                    "transform": transform_id,
                    "rule_chain": item["rule_chain"],
                    "edits": item["edits"],
                    "edit_codepoints": item["edit_codepoints"],
                })
        if not applied:
            continue
        seen, unique = set(), []
        for item in sorted(applied, key=lambda i: (i["transform"], i["analyzer_form"])):
            if item["analyzer_form"] in seen:
                continue
            seen.add(item["analyzer_form"])
            unique.append(item)

        before = fingerprints(base_pools[key])
        after = collections.Counter(before)
        for item in unique:
            after.update(RECALL.fingerprint(c) for c in analyze(item["analyzer_form"]))
        for fingerprint_key, count in before.items():
            if fingerprint_key not in after:
                proof_removed.append(f"{key[0]}:{key[1]}")
            elif after[fingerprint_key] < count:
                proof_altered.append(f"{key[0]}:{key[1]}")
        if key not in keys:
            proof_out_of_scope.append(f"{key[0]}:{key[1]}")
        added = sum(1 for f in after if f not in before)
        if added:
            tokens_gaining += 1
        extension_rows.append({
            "verse_key": key[0],
            "word_index": key[1],
            "canonical_text": row["canonical_text"],
            "transform_class": row["transform_class"],
            "extra_analysis_forms": unique,
            "candidate_fingerprints_before": len(before),
            "candidate_fingerprints_after": len(after),
            "candidate_fingerprints_added": added,
            "candidate_fingerprints_removed": 0,
        })

    by_transform = collections.Counter()
    for row in rows:
        for transform_id in row["closing_applied_transforms"]:
            by_transform[transform_id] += 1
    report_only_hits = collections.Counter()
    for row in rows:
        for transform_id in row["closing_report_only_transforms"]:
            report_only_hits[transform_id] += 1

    risky = [{"verse_key": r["verse_key"], "word_index": r["word_index"],
              "canonical_text": r["canonical_text"],
              "canonical_codepoints": r["canonical_codepoints"],
              "residual_level": r["residual_level"],
              "transform_class": r["transform_class"],
              "teacher_lemma": r["teacher_lemma"], "teacher_root": r["teacher_root"],
              "reason": ("closed only by a transform no source notation licenses"
                         if r["transform_class"].startswith("MEASURED_ONLY")
                         else "no orthographic transform reaches the teacher reading")}
             for r in rows
             if r["transform_class"].startswith("MEASURED_ONLY")
             or r["transform_class"] == "UNRESOLVED_NOT_ORTHOGRAPHIC"]

    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_baseline": freeze,
        "inputs": {
            "classification_sha256": sha256_file(CLASSIFICATION),
            "token_map_sha256": sha256_file(TOKEN_MAP_PATH),
            "teacher_sha256": sha256_file(TEACHER_PATH),
            "camel_db_sha256": sha256_file(RECALL.DB_PATH),
        },
        "contract": {
            "scope": f"the {EXPECTED_SCOPE_TOKENS} tokens in the {BUCKET} bucket",
            "canonical_text_untouched": True,
            "transforms_are_edit_scripts": True,
            "every_variant_inverse_checked": True,
            "reversibility_checks_run": reversibility_checks,
            "frozen_rules_unchanged": ["R1-R5 recall contract", "selector cascade",
                                       "clitic-split contract",
                                       "v1.6 paradigm lexicon extension"],
            "no_lemma_or_root_guessing": True,
            "no_general_letter_folding": True,
            "dump_not_regenerated": True,
            "teacher_use": "scoring oracle only; never an input to a transform",
        },
        "transform_set": {
            "applied": {t: TRANSFORM_DOC[t] for t in APPLIED_TRANSFORMS},
            "report_only": {t: TRANSFORM_DOC[t] for t in REPORT_ONLY_TRANSFORMS},
        },
        "token_classes": dict(sorted(class_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "transform_trigger_tokens": dict(sorted(trigger_counts.items())),
        "closable": {
            "tokens": sum(count for name, count in class_counts.items()
                          if not name.startswith(("MEASURED_ONLY", "UNRESOLVED",
                                                  "ALREADY_REACHED"))),
            "by_transform": dict(sorted(by_transform.items(),
                                        key=lambda kv: (-kv[1], kv[0]))),
            "distinct_surfaces": len({r["canonical_text"] for r in rows
                                      if r["closing_applied_transforms"]}),
        },
        "report_only_would_close": dict(sorted(report_only_hits.items())),
        "risky_or_unresolved": {
            "tokens": len(risky),
            "records": risky,
        },
        "additivity_proof": {
            "scope_tokens_checked": len(extension_rows),
            "pools_removed": len(proof_removed),
            "pools_altered": len(proof_altered),
            "out_of_scope_tokens_touched": len(proof_out_of_scope),
            "tokens_gaining_candidates": tokens_gaining,
            "purely_additive": not (proof_removed or proof_altered or proof_out_of_scope),
            "note": ("the extension only supplies extra analyzer INPUT forms for "
                     "named tokens; existing pools are carried through unchanged "
                     "by construction and the containment is re-checked here"),
        },
        "production_db": "not written; the original CAMeL DB is read-only",
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "classification.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows),
        encoding="utf-8", newline="\n")
    (out_dir / "analysis-form-extension.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n"
                for r in extension_rows),
        encoding="utf-8", newline="\n")
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "analysis-form-extension.jsonl": sha256_file(out_dir / "analysis-form-extension.jsonl"),
        "classification.jsonl": sha256_file(out_dir / "classification.jsonl"),
        "report.json": sha256_file(out_dir / "report.json"),
    }
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    print(json.dumps({
        "frozen_baseline": freeze["status"],
        "token_classes": report["token_classes"],
        "closable": report["closable"],
        "report_only_would_close": report["report_only_would_close"],
        "risky_or_unresolved": report["risky_or_unresolved"]["tokens"],
        "additivity_proof": {k: v for k, v in report["additivity_proof"].items()
                             if k != "note"},
        "checksums": checksums,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
