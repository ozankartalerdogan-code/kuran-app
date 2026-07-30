#!/usr/bin/env python3
"""Re-bucket the ORTHOGRAPHIC_ONLY tokens no orthographic rule can close.

Input: the frozen v1 diagnostic classification. Every token whose v1 class is
`UNRESOLVED_NOT_ORTHOGRAPHIC` is re-examined and put in exactly one of:

  SEGMENTATION    the frozen v1.5 clitic-split contract leaves it open, or
                  stripping a proclitic/enclitic the CAMeL DB itself licenses
                  makes the remainder reach the teacher core.
  HAMZA_CARRIER   the surface carries a hamza-family codepoint and substituting
                  the carrier at that position - within the closed set
                  {ء أ إ آ ؤ ئ} - reaches the teacher core. The frozen R1-R3
                  rules are NOT changed; this only records that the residue is a
                  carrier choice, not a missing word.
  PARADIGM_GAP    CAMeL knows the lexeme (the teacher lemma is reachable
                  somewhere in the corpus) or knows the teacher root with a base
                  verb; what is missing is a form, not an entry.
  LEXICON_OOV     neither the teacher lemma nor the teacher root is anywhere in
                  CAMeL.
  UNRESOLVED      none of the above.

Order matters and is fixed: SEGMENTATION, then HAMZA_CARRIER, then
PARADIGM_GAP, then LEXICON_OOV. The teacher is an oracle here - this file is
diagnostic and feeds no production artefact.
"""

from __future__ import annotations

import argparse
import collections
import gzip
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
V1_CLASSIFICATION = CAND_ROOT / "orthographic-only-v1" / "classification.jsonl"
V1_5_COHORT = CAND_ROOT / "selector-v1_5" / "segmentation-cohort.jsonl"
FROZEN_DUMP = CAMEL_ROOT / "full-analysis-paradigm-ext-v1"
EXTENDED_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
OUT_DIR = CAND_ROOT / "orthographic-residual-v1"

SCHEMA_VERSION = "orthographic-residual-classification-v1"
SOURCE_CLASS = "UNRESOLVED_NOT_ORTHOGRAPHIC"

HAMZA_CARRIERS = ("ء", "أ", "إ", "آ", "ؤ", "ئ")
HAMZA_ABOVE = "ٔ"
TATWEEL = "ـ"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_ro")
SPLIT = load_module(SCRIPT_DIR / "camel_clitic_split_rules.py", "camel_clitic_split_ro")
COVERAGE = V.COVERAGE
RECALL = V.RECALL

import orthographic_production_rules as RULES  # noqa: E402
from hamza_madda_rescue_rules import apply_rules as hamza_pass  # noqa: E402


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


def carrier_variants(form: str):
    """Every single-position carrier substitution, as (variant, position)."""
    out = []
    for index, ch in enumerate(form):
        if ch not in HAMZA_CARRIERS:
            continue
        for replacement in HAMZA_CARRIERS:
            if replacement == ch:
                continue
            out.append((form[:index] + replacement + form[index + 1:], index, ch,
                        replacement))
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    rows = [json.loads(l) for l in V1_CLASSIFICATION.open(encoding="utf-8")]
    scope = [r for r in rows if r["transform_class"] == SOURCE_CLASS]
    keys = {(r["verse_key"], r["word_index"]) for r in scope}

    cohort_open = set()
    for line in V1_5_COHORT.open(encoding="utf-8"):
        obj = json.loads(line)
        if not obj["closed"]:
            cohort_open.add((obj["verse_key"], obj["word_index"]))

    canonical, base_forms = {}, {}
    for line in V.TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        if key in keys:
            canonical[key] = obj["canonical_text"]
            base_forms[key] = list(obj["analysis_forms"])
    teacher = {}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        key = (obj["verse_key"], obj["word_index"])
        if key in keys:
            teacher[key] = obj

    # Everything CAMeL ever emitted for the corpus: the reachable lexicon.
    reachable_lemmas, reachable_roots = set(), set()
    base_pools = {}
    for shard in sorted(FROZEN_DUMP.glob("surah-*.jsonl.gz")):
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                for candidate in obj.get("unique_candidates") or []:
                    lemma = COVERAGE.normalize_lemma(candidate.get("lex"))
                    if lemma:
                        reachable_lemmas.add(lemma)
                    root = COVERAGE.normalize_root(candidate.get("root"))
                    if root:
                        reachable_roots.add(root)
                key = (obj["verse_key"], obj["word_index"])
                if key in keys:
                    base_pools[key] = obj.get("unique_candidates") or []

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB
    analyzer = Analyzer(MorphologyDB(str(EXTENDED_DB), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    # CAMeL roots that already carry a base verb - read off the DB, never guessed.
    roots_with_verb = set()
    section = None
    for raw in EXTENDED_DB.open(encoding="utf-8"):
        if raw.startswith("###"):
            section = raw.strip()
            continue
        if section != "###STEMS###":
            continue
        parts = raw.split("\t")
        if len(parts) < 3:
            continue
        feats = dict(item.split(":", 1) for item in parts[2].split() if ":" in item)
        if feats.get("pos") == "verb" and feats.get("root") and "." in feats["root"]:
            roots_with_verb.add(COVERAGE.normalize_root(feats["root"]))

    tables = SPLIT.CliticTables(EXTENDED_DB, V.skeleton, V.normalize_vocalized)

    def reaches_core(teacher_row, candidates) -> bool:
        t_root = COVERAGE.normalize_root(teacher_row.get("root"))
        t_lemma = COVERAGE.normalize_lemma(teacher_row.get("lemma"))
        for candidate in candidates:
            c_root = COVERAGE.normalize_root(candidate.get("root"))
            c_lemma = COVERAGE.normalize_lemma(candidate.get("lex"))
            if t_lemma is not None and c_lemma == t_lemma:
                return True
            if t_root is not None and c_root == t_root and c_lemma is not None:
                return True
        return False

    def probe_forms(key):
        """Base forms + frozen R1-R5 variants + the O1/O2/O3/O5 forms. Every one
        of these is already available to the pipeline; they are recomputed here
        only so the residue is measured against everything, not less."""
        forms = list(base_forms[key])
        forms += sorted(RECALL.build_variants(canonical[key], base_forms[key]))
        forms += [i["analyzer_form"] for i in
                  RULES.extra_forms(base_forms[key], hamza_pass=hamza_pass)]
        return list(dict.fromkeys(forms))

    counts = collections.Counter()
    out_rows = []
    for key in sorted(keys, key=sort_key):
        teacher_row = teacher[key]
        forms = probe_forms(key)
        evidence = {}

        # 1) SEGMENTATION
        segmentation = key in cohort_open
        seg_witness = None
        if segmentation:
            seg_witness = {"source": "FROZEN_V1_5_OPEN_SEGMENTATION_COHORT"}
        else:
            for form in forms:
                for split in SPLIT.candidate_splits(form) if hasattr(
                        SPLIT, "candidate_splits") else ():
                    body = split.get("body") if isinstance(split, dict) else None
                    if not body:
                        continue
                    if reaches_core(teacher_row, analyze(body)):
                        segmentation = True
                        seg_witness = {"source": "CLITIC_STRIP", "form": form,
                                       "body": body}
                        break
                if segmentation:
                    break
        if not segmentation:
            # Fall back to the DB's own affix inventory: strip one licensed
            # proclitic and/or one licensed enclitic, letters only.
            for form in forms:
                letters = V.skeleton(form)
                for plen in range(0, min(len(letters), 6) + 1):
                    if plen and letters[:plen] not in tables.prefixes:
                        continue
                    for slen in range(0, min(len(letters) - plen, 6) + 1):
                        if plen + slen >= len(letters):
                            continue
                        tail = letters[len(letters) - slen:] if slen else ""
                        if slen and not any(
                                tables.surface_key(e["diac"]) == tail
                                for group in tables.suffixes.values() for e in group):
                            continue
                        if not plen and not slen:
                            continue
                        body = letters[plen:len(letters) - slen] if slen else letters[plen:]
                        if len(body) < 3:
                            continue
                        if reaches_core(teacher_row, analyze(body)):
                            segmentation = True
                            seg_witness = {"source": "DB_AFFIX_STRIP", "form": form,
                                           "body": body,
                                           "prefix_letters": letters[:plen],
                                           "suffix_letters": tail}
                            break
                    if segmentation:
                        break
                if segmentation:
                    break

        # 2) HAMZA_CARRIER
        carrier_witness = None
        if not segmentation:
            for form in forms:
                if not any(ch in HAMZA_CARRIERS for ch in form) and \
                        HAMZA_ABOVE not in form:
                    continue
                for variant, position, was, now in carrier_variants(form):
                    if variant == form:
                        continue
                    if reaches_core(teacher_row, analyze(variant)):
                        carrier_witness = {
                            "form": form, "variant": variant, "offset": position,
                            "from": f"U+{ord(was):04X}", "to": f"U+{ord(now):04X}",
                            "frozen_rules_unchanged": True,
                        }
                        break
                if carrier_witness:
                    break

        t_lemma = COVERAGE.normalize_lemma(teacher_row.get("lemma"))
        t_root = COVERAGE.normalize_root(teacher_row.get("root"))
        lemma_known = bool(t_lemma) and t_lemma in reachable_lemmas
        root_known = bool(t_root) and t_root in reachable_roots
        root_has_verb = bool(t_root) and t_root in roots_with_verb

        if segmentation:
            bucket = "SEGMENTATION"
            evidence = seg_witness
        elif carrier_witness:
            bucket = "HAMZA_CARRIER"
            evidence = carrier_witness
        elif lemma_known or root_has_verb:
            bucket = "PARADIGM_GAP"
            evidence = {"teacher_lemma_reachable_in_corpus": lemma_known,
                        "teacher_root_carries_a_base_verb_in_camel": root_has_verb}
        elif not lemma_known and not root_known:
            bucket = "LEXICON_OOV"
            evidence = {"teacher_lemma_reachable_in_corpus": False,
                        "teacher_root_reachable_in_corpus": False}
        else:
            bucket = "UNRESOLVED"
            evidence = {"teacher_lemma_reachable_in_corpus": lemma_known,
                        "teacher_root_reachable_in_corpus": root_known,
                        "teacher_root_carries_a_base_verb_in_camel": root_has_verb}

        counts[bucket] += 1
        out_rows.append({
            "verse_key": key[0], "word_index": key[1],
            "canonical_text": canonical[key],
            "canonical_codepoints": RULES.codepoints(canonical[key]),
            "bucket": bucket,
            "evidence": evidence,
            "base_pool_size": len(base_pools.get(key, [])),
            "teacher_lemma": teacher_row.get("lemma"),
            "teacher_root": teacher_row.get("root"),
            "teacher_pos": teacher_row.get("pos"),
        })

    by_surface = collections.defaultdict(collections.Counter)
    for row in out_rows:
        by_surface[row["bucket"]][row["canonical_text"]] += 1

    report = {
        "schema_version": SCHEMA_VERSION,
        "contract": {
            "source_class": SOURCE_CLASS,
            "bucket_order": ["SEGMENTATION", "HAMZA_CARRIER", "PARADIGM_GAP",
                             "LEXICON_OOV", "UNRESOLVED"],
            "teacher_use": "oracle for this diagnostic only; feeds no production artefact",
            "frozen_rules_unchanged": True,
            "no_new_segmentation_or_hamza_rule": True,
        },
        "inputs": {
            "v1_classification_sha256": sha256_file(V1_CLASSIFICATION),
            "extended_db_sha256": sha256_file(EXTENDED_DB),
        },
        "scope_tokens": len(out_rows),
        "buckets": dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "buckets_distinct_surfaces": {b: len(s) for b, s in
                                      sorted(by_surface.items())},
        "top_surfaces_by_bucket": {
            bucket: dict(sorted(surfaces.items(), key=lambda kv: (-kv[1], kv[0]))[:12])
            for bucket, surfaces in sorted(by_surface.items())
        },
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "classification.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n"
                for r in out_rows), encoding="utf-8", newline="\n")
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "classification.jsonl": sha256_file(out_dir / "classification.jsonl"),
        "report.json": sha256_file(out_dir / "report.json"),
    }
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({"scope_tokens": report["scope_tokens"],
                      "buckets": report["buckets"],
                      "top_surfaces_by_bucket": report["top_surfaces_by_bucket"],
                      "checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
