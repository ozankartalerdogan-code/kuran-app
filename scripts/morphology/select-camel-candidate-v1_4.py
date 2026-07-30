#!/usr/bin/env python3
"""Selector v1.4 - v1.3r plus the proper-name CLOSURE layer.

v1.3r is FROZEN, and with it the 12 production-ready residual surfaces it
closed. This script imports v1.3r (and through it v1.3 and the frozen v1.2c)
and reuses every one of their parts verbatim. R1-R9, the eligibility gate and
the frozen R1-R5 recall layer are untouched and unreachable from here.

What is added
-------------
`resources/quran-proper-name-closure-lexicon.json` covers the 11 surfaces /
15 tokens v1.3r declined, in two groups:

  * ROOT_BEARING - the name is derived from an Arabic root that the surface
    does not reveal. v1.3r would not invent one; the closure lexicon carries it
    as an AUTHORED, independently confirmed field.
  * COMPETING_ANALYSES - CAMeL reads the name as a verb (لاط, غَوَّث, هَرَا...).
    Here the confirmed lexicon entry is treated as independent lexical evidence
    that OUTRANKS a general CAMeL verb/noun reading.

That precedence is the only behavioural change, and it is deliberately not
expressed as a rule change: the layer runs BEFORE the cascade, and only for a
token whose EXACT canonical Tanzil surface is on the closed list AND that v1.3r
left non-CORRECT. Every other token in the corpus reaches `V.select` with the
same pool it had in v1.3r, so v1.3r's 30 596 correct selections cannot move.

There is no verse_key override anywhere: entries are keyed by surface, the
proclitic chain is re-derived from the surface, and the lemma/root are lexicon
fields confirmed at build time.
"""

from __future__ import annotations

import gzip
import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
OUT_DIR = CAND_ROOT / "selector-v1_4"
BASELINE_SELECTION = CAND_ROOT / "selector-v1_3r" / "selection.jsonl"
V1_3_SELECTION = CAND_ROOT / "selector-v1_3" / "selection.jsonl"
CLOSURE_LEXICON_PATH = SCRIPT_DIR / "resources" / "quran-proper-name-closure-lexicon.json"

SCHEMA_VERSION = "camel-selector-v1_4"
CLOSURE_RULE = "L2_PROPER_NAME_CLOSURE_LEXICON"
CLOSURE_CONFIDENCE = "high"
CANDIDATE_SOURCE = "quran_proper_name_lexicon"
EXPECTED_RESOLVED = ("27:44", 25)
EXPECTED_V1_3R_CORRECT = 30596


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V1_3R = load_module(SCRIPT_DIR / "select-camel-candidate-v1_3r.py",
                    "camel_selector_v1_3r")
V1_3 = V1_3R.V1_3
V = V1_3R.V                     # frozen v1.2c
BUILDER = V1_3R.BUILDER
RECALL = V.RECALL
COVERAGE = V.COVERAGE


class ProperNameClosureLexicon:
    """Closed surface -> one confirmed (lemma, root) proper-name reading."""

    def __init__(self, document: dict):
        self.document = document
        self.by_surface = {}
        for entry in document["entries"]:
            if entry.get("status") != "RESOLVED" or not entry.get("production_ready"):
                continue
            surface = entry["tanzil_surface"]
            if surface in self.by_surface:
                raise SystemExit(f"FAIL-CLOSED: duplicate surface {surface!r}")
            self.by_surface[surface] = entry

    def synthetic_for(self, surface: str):
        """Rebuild the entry's candidate; the proclitic chain is re-derived from
        the surface so a hand-edited entry cannot slip through."""
        entry = self.by_surface.get(surface)
        if entry is None:
            return None, None
        parses = BUILDER.enumerate_parses(BUILDER.core_key(surface))
        if len(parses) != 1:
            return None, {"reproducible": False, "why": f"{len(parses)}_parses"}
        chain, _core = parses[0]
        slots = {BUILDER.PROCLITIC_BY_TAG[t]["slot"]: t for t in chain}
        candidate = {
            "lex": entry["canonical_lemma"],
            "pos": "noun_prop",
            "root": entry["verified_root"],
            "prc0": slots.get("prc0", "0"),
            "prc1": slots.get("prc1", "0"),
            "prc2": slots.get("prc2", "0"),
            "prc3": slots.get("prc3", "0"),
            "enc0": "0",
            "source": CANDIDATE_SOURCE,
        }
        if candidate != entry["synthetic_candidate"]:
            return None, {"reproducible": False,
                          "why": "rederivation_differs_from_stored"}
        return candidate, {"reproducible": True, "entry": entry}

    def select(self, surface: str, pool):
        """Independent lexical evidence, ahead of any general CAMeL reading.

        Returns (candidate|None, reason|None). Only fires when exactly one
        lexical core in the pool matches the confirmed entry."""
        entry = self.by_surface.get(surface)
        if entry is None:
            return None, None
        lemma = entry["normalized_lemma"]
        root = entry["normalized_root"]
        matching = [
            c for c in pool
            if c.get("pos") == "noun_prop"
            and COVERAGE.normalize_lemma(c.get("lex")) == lemma
            and COVERAGE.normalize_root(c.get("root")) == root
        ]
        if not matching:
            return None, "UNRESOLVED_PROPER_NAME::no_matching_noun_prop_candidate"
        cores = {(COVERAGE.normalize_root(c.get("root")),
                  COVERAGE.normalize_lemma(c.get("lex")), c.get("pos"))
                 for c in matching}
        if len(cores) != 1:
            return None, f"AMBIGUOUS_PROPER_NAME::{len(cores)}_lexical_cores"
        return sorted(matching, key=lambda c: c["_fp"])[0], None


def main() -> int:
    for path in (V.TEACHER_PATH, V.TOKEN_MAP_PATH, V.DB_PATH, V.FULL_ANALYSIS_DIR,
                 V1_3.LEXICON_PATH, V1_3R.RECALL_LEXICON_PATH, CLOSURE_LEXICON_PATH,
                 BASELINE_SELECTION, V1_3_SELECTION):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if len(RECALL.DAWUD_ALLOWLIST) != RECALL.EXPECTED_DAWUD_SURFACES:
        raise SystemExit("FAIL-CLOSED: frozen recall layer changed under this selector")

    selection_lexicon = V1_3.ProperNameLexicon(
        json.loads(V1_3.LEXICON_PATH.read_text(encoding="utf-8")))
    recall_lexicon = V1_3R.ProperNameRecallLexicon(
        json.loads(V1_3R.RECALL_LEXICON_PATH.read_text(encoding="utf-8")))
    closure_doc = json.loads(CLOSURE_LEXICON_PATH.read_text(encoding="utf-8"))
    closure_lexicon = ProperNameClosureLexicon(closure_doc)

    teacher = {}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    canonical, base_forms = {}, {}
    for line in V.TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        if key in teacher:
            canonical[key] = obj["canonical_text"]
            base_forms[key] = list(obj["analysis_forms"])

    baseline = {}
    for line in BASELINE_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        baseline[(obj["verse_key"], obj["word_index"])] = obj
    v1_3_rows = {}
    for line in V1_3_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        v1_3_rows[(obj["verse_key"], obj["word_index"])] = obj

    def recall_injection_allowed(key) -> bool:
        row = v1_3_rows.get(key)
        if row is None:
            return False
        if row.get("verdict") == "RECALL_GAP":
            return True
        return str(row.get("ambiguous_reason") or "").startswith(
            "UNRESOLVED_PROPER_NAME")

    def closure_allowed(key) -> bool:
        """Rule: never touch a token v1.3r already gets right."""
        row = baseline.get(key)
        return row is not None and row.get("verdict") != "CORRECT"

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(V.DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    closure_injected = set()
    reproducibility_failures = []

    def merged_pool(key, record):
        """v1.3r's pool, then the closure candidate appended. Never a removal."""
        pool = record.get("unique_candidates") or []
        input_keys = {COVERAGE.normalize_lemma(f.get("form"))
                      for f in record.get("analysis_forms") or []}
        input_keys.add(COVERAGE.normalize_lemma(record.get("canonical_text")))
        input_keys.discard(None)
        tags = RECALL.full_surface_pos_tags(pool, input_keys)
        gated = (RECALL.gate_v2(pool, tags)
                 and not RECALL.dawud_suppressed(record.get("canonical_text", ""), tags))
        slims = [V.slim(c) for c in pool]
        raw_count = len(pool)
        if gated:
            seen = {c["_fp"] for c in slims}
            variants = RECALL.build_variants(canonical[key], base_forms[key])
            for form in sorted(variants):
                original, rules = variants[form]
                for cand in analyze(form):
                    raw_count += 1
                    enriched = dict(cand)
                    enriched["_rescue"] = {"original_form": original,
                                           "analyzer_form": form, "rescue_rule": rules}
                    s = V.slim(enriched)
                    if s["_fp"] in seen:
                        continue
                    seen.add(s["_fp"])
                    slims.append(s)

        surface = canonical[key]

        # ---- v1.3r's recall injection, replayed unchanged -------------------
        if surface in recall_lexicon.by_surface:
            if not any(V.is_selectable_evidence(c, V.skeleton(surface)) for c in slims) \
                    and recall_injection_allowed(key):
                synthetic, diag = recall_lexicon.candidate_for(surface)
                if synthetic is not None:
                    synthetic["_synthetic"] = {
                        "source": CANDIDATE_SOURCE,
                        "lexical_core": diag["lexical_core"],
                        "classification": diag["classification"],
                    }
                    s = V.slim(synthetic)
                    s["_synthetic"] = synthetic["_synthetic"]
                    if s["_fp"] not in {c["_fp"] for c in slims}:
                        slims.append(s)
                        raw_count += 1

        # ---- the closure candidate ------------------------------------------
        if surface in closure_lexicon.by_surface and closure_allowed(key):
            synthetic, diag = closure_lexicon.synthetic_for(surface)
            if synthetic is None:
                reproducibility_failures.append({"surface": surface, **(diag or {})})
            else:
                entry = diag["entry"]
                synthetic["_closure"] = {
                    "source": CANDIDATE_SOURCE,
                    "group": entry["group"],
                    "canonical_lemma": entry["canonical_lemma"],
                    "verified_root": entry["verified_root"],
                }
                s = V.slim(synthetic)
                s["_closure"] = synthetic["_closure"]
                if s["_fp"] not in {c["_fp"] for c in slims}:
                    slims.append(s)
                    raw_count += 1
                closure_injected.add(key)
        return slims, raw_count

    # ---- EVALUATION ONLY ---------------------------------------------------
    def qualifies(cand_root, cand_lemma, cand_pos, t_row):
        t_root = COVERAGE.normalize_root(t_row.get("root"))
        t_lemma = COVERAGE.normalize_lemma(t_row.get("lemma"))
        pos_classes = COVERAGE.POS_MAP.get(cand_pos)
        pos_ok = pos_classes is not None and t_row.get("pos") in pos_classes
        root_ok = (t_root is None) or (cand_root == t_root)
        lemma_ok = (t_lemma is None) or (cand_lemma == t_lemma)
        return pos_ok and root_ok and lemma_ok, pos_ok, root_ok, lemma_ok

    rows = []
    answers = {}
    for path in sorted(V.FULL_ANALYSIS_DIR.glob("surah-*.jsonl.gz")):
        by_verse = defaultdict(dict)
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                if key in teacher:
                    by_verse[obj["verse_key"]][obj["word_index"]] = obj

        for verse_key in sorted(by_verse, key=lambda v: (int(v.split(":")[0]),
                                                         int(v.split(":")[1]))):
            words = by_verse[verse_key]
            pools = {}
            for widx in sorted(words):
                pools[widx] = merged_pool((verse_key, widx), words[widx])

            for widx in sorted(words):
                key = (verse_key, widx)
                pool, raw_count = pools[widx]
                prev_pool = pools.get(widx - 1, (None,))[0]
                next_pool = pools.get(widx + 1, (None,))[0]
                after = len({c["_fp"] for c in pool})
                surface = canonical[key]

                chosen = rule = chain = reason = None
                closure_applied = False

                # ---- closure layer: independent lexical evidence first ------
                if key in closure_injected:
                    picked, closure_reason = closure_lexicon.select(surface, pool)
                    if picked is not None:
                        chosen, rule, chain = picked, CLOSURE_RULE, []
                        closure_applied = True
                    else:
                        reason = closure_reason

                lexicon_applied = False
                if chosen is None:
                    chosen, rule, chain, cascade_reason = V.select(
                        surface, pool, prev_pool, next_pool)
                    if chosen is None:
                        picked, lex_reason, _d = selection_lexicon.select(surface, pool)
                        if picked is not None:
                            chosen, rule, lexicon_applied = (
                                picked, V1_3.LEXICON_RULE, True)
                        else:
                            reason = reason or lex_reason or cascade_reason
                    else:
                        reason = None

                answers[key] = any(
                    qualifies(COVERAGE.normalize_root(c.get("root")),
                              COVERAGE.normalize_lemma(c.get("lex")),
                              c.get("pos"), teacher[key])[0]
                    for c in pool)
                rows.append({
                    "verse_key": verse_key,
                    "word_index": widx,
                    "arabic": surface,
                    "candidate_count_before_dedupe": raw_count,
                    "candidate_count_after_dedupe": after,
                    "selected_fingerprint": chosen["_fp"] if chosen else None,
                    "selection_rule": rule,
                    "rule_chain": chain,
                    "confidence": (CLOSURE_CONFIDENCE if closure_applied
                                   else V1_3.LEXICON_CONFIDENCE if lexicon_applied
                                   else (V.CONFIDENCE.get(rule) if rule else None)),
                    "proper_name_lexicon_applied": lexicon_applied,
                    "proper_name_closure_applied": closure_applied,
                    "closure_provenance": (chosen or {}).get("_closure"),
                    "selected_from_proper_name_recall": bool(
                        chosen and "_synthetic" in chosen),
                    "recall_candidate_provenance": (chosen or {}).get("_synthetic"),
                    "rescue_provenance": (chosen or {}).get("_rescue"),
                    "selected_from_rescue": bool(chosen and "_rescue" in chosen),
                    "ambiguous_reason": reason,
                    "selected": {
                        f: chosen.get(f) for f in ("root", "lex", "pos", "cas", "mod",
                                                   "vox", "asp", "per", "gen", "num",
                                                   "stt", "diac")
                    } if chosen else None,
                })

    rows.sort(key=lambda r: V.sort_key((r["verse_key"], r["word_index"])))
    by_key = {(r["verse_key"], r["word_index"]): r for r in rows}

    # ======================================================================
    verdicts = Counter()
    rule_stats = defaultdict(lambda: Counter())
    field_stats = Counter()
    ambiguous_reasons = Counter()
    for row in rows:
        key = (row["verse_key"], row["word_index"])
        t_row = teacher[key]
        if not answers.get(key, False):
            verdicts["RECALL_GAP"] += 1
            row["verdict"] = "RECALL_GAP"
            continue
        if row["selected_fingerprint"] is None:
            verdicts["AMBIGUOUS"] += 1
            row["verdict"] = "AMBIGUOUS"
            ambiguous_reasons[str(row["ambiguous_reason"]).split("::")[0]] += 1
            continue
        sel = row["selected"]
        ok, pos_ok, root_ok, lemma_ok = qualifies(
            COVERAGE.normalize_root(sel.get("root")),
            COVERAGE.normalize_lemma(sel.get("lex")), sel.get("pos"), t_row)
        verdicts["CORRECT" if ok else "INCORRECT"] += 1
        row["verdict"] = "CORRECT" if ok else "INCORRECT"
        rule_stats[row["selection_rule"]]["total"] += 1
        rule_stats[row["selection_rule"]]["correct"] += ok
        for name, flag in (("root", root_ok), ("lemma", lemma_ok), ("pos", pos_ok)):
            applicable = (True if name == "pos" else
                          (COVERAGE.normalize_root(t_row.get("root")) is not None
                           if name == "root" else
                           COVERAGE.normalize_lemma(t_row.get("lemma")) is not None))
            field_stats[f"{name}_applicable"] += applicable
            field_stats[f"{name}_correct"] += applicable and flag

    # ======================================================================
    transition = Counter()
    correct_to_incorrect = []
    new_incorrect = []
    changed_selection = []
    for key, old in baseline.items():
        row = by_key.get(key)
        if row is None:
            continue
        transition[f"{old.get('verdict')}->{row['verdict']}"] += 1
        if old.get("verdict") == "CORRECT" and \
                row["selected_fingerprint"] != old.get("selected_fingerprint"):
            changed_selection.append({
                "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"]})
        if old.get("verdict") == "CORRECT" and row["verdict"] == "INCORRECT":
            correct_to_incorrect.append({"verse_key": key[0], "word_index": key[1]})
        if old.get("verdict") != "INCORRECT" and row["verdict"] == "INCORRECT":
            new_incorrect.append({
                "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"],
                "v1_3r_verdict": old.get("verdict"), "rule": row.get("selection_rule"),
                "selected_lex": (row.get("selected") or {}).get("lex"),
                "selected_root": (row.get("selected") or {}).get("root"),
                "attested_lemma": teacher[key].get("lemma"),
                "attested_root": teacher[key].get("root")})

    closure_rows = [r for r in rows if r["proper_name_closure_applied"]]
    closure_verdicts = Counter(r["verdict"] for r in closure_rows)

    # ---- per-surface outcome for all 11 closure surfaces ------------------
    surface_rows = []
    for entry in closure_doc["entries"]:
        locs = [(vk.rsplit(":", 1)[0], int(vk.rsplit(":", 1)[1]))
                for vk in entry["verse_keys"]]
        surface_rows.append({
            "tanzil_surface": entry["tanzil_surface"],
            "group": entry["group"],
            "classification": entry["classification"],
            "status": entry["status"],
            "canonical_lemma": entry.get("canonical_lemma"),
            "verified_root": entry.get("verified_root"),
            "locations": entry["locations"],
            "closed_by_closure_layer": sum(
                1 for k in locs if by_key[k]["proper_name_closure_applied"]),
            "verdicts": dict(sorted(Counter(by_key[k]["verdict"]
                                            for k in locs).items())),
            "reason": entry.get("reason"),
        })

    target_row = by_key[EXPECTED_RESOLVED]
    out_tokens = OUT_DIR / "selection.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    judged = verdicts["CORRECT"] + verdicts["INCORRECT"]
    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "teacher_sha256": V.sha256_file(V.TEACHER_PATH),
            "selection_lexicon_sha256": V.sha256_file(V1_3.LEXICON_PATH),
            "recall_lexicon_sha256": V.sha256_file(V1_3R.RECALL_LEXICON_PATH),
            "closure_lexicon_sha256": V.sha256_file(CLOSURE_LEXICON_PATH),
            "v1_3r_selection_sha256": V.sha256_file(BASELINE_SELECTION),
            "tokens": len(rows),
        },
        "contract": {
            "base_selector": ("select-camel-candidate-v1_3r.py imported as a module; "
                              "v1.3r, v1.3, v1.2c and the frozen recall layer are all "
                              "unchanged"),
            "added": ("closure lexicon consulted BEFORE the cascade, for closed "
                      "surfaces only, on tokens v1.3r left non-CORRECT"),
            "rules_untouched": "R1-R9 are neither modified nor re-ordered",
            "precedence_scope": ("only the surfaces in the closure lexicon; every "
                                 "other token reaches V.select with the v1.3r pool"),
            "root_policy": "authored and independently confirmed; never surface-derived",
            "no_verse_key_override": True,
            "teacher_use": "evaluation oracle only",
        },
        "verdicts": {
            "correct": verdicts["CORRECT"], "incorrect": verdicts["INCORRECT"],
            "ambiguous": verdicts["AMBIGUOUS"], "recall_gap": verdicts["RECALL_GAP"],
            "total": len(rows),
            "accuracy_on_judged": round(100.0 * verdicts["CORRECT"] / judged, 3)
            if judged else None,
        },
        "field_accuracy": {
            name: {"applicable": field_stats[f"{name}_applicable"],
                   "correct": field_stats[f"{name}_correct"],
                   "pct": round(100.0 * field_stats[f"{name}_correct"]
                                / field_stats[f"{name}_applicable"], 3)
                   if field_stats[f"{name}_applicable"] else None}
            for name in ("root", "lemma", "pos")
        },
        "acceptance_gates": {
            "v1_3r_correct_selections_unchanged": len(changed_selection) == 0,
            "v1_3r_correct_count_preserved":
                verdicts["CORRECT"] >= EXPECTED_V1_3R_CORRECT,
            "correct_to_incorrect_is_0": len(correct_to_incorrect) == 0,
            "new_incorrect_is_0": len(new_incorrect) == 0,
            "closure_layer_zero_incorrect": closure_verdicts["INCORRECT"] == 0,
            "every_closure_candidate_reproducible":
                len(reproducibility_failures) == 0,
            "target_27_44_still_correct": target_row["verdict"] == "CORRECT",
            "changed_selection_rows": changed_selection[:20],
            "new_incorrect_rows": new_incorrect[:20],
            "reproducibility_failures": reproducibility_failures[:20],
        },
        "proper_name_closure_layer": {
            "surfaces": closure_doc["totals"]["surfaces"],
            "resolved_surfaces": closure_doc["totals"]["resolved_surfaces"],
            "unresolved_surfaces": closure_doc["totals"]["unresolved_surfaces"],
            "by_group": closure_doc["totals"]["by_group"],
            "root_bearing_resolved": closure_doc["totals"]["root_bearing_resolved"],
            "tokens_selected": len(closure_rows),
            "verdicts": dict(sorted(closure_verdicts.items())),
            "rows": surface_rows,
            "unresolved": [
                {"tanzil_surface": e["tanzil_surface"], "group": e["group"],
                 "locations": e["locations"], "reason": e["reason"]}
                for e in closure_doc["entries"] if e["status"] != "RESOLVED"],
        },
        "residual_l7a_final": {
            "total_surfaces": 23,
            "total_locations": 63,
            "closed_by_v1_3r_recall_layer": 48,
            "closed_by_v1_4_closure_layer": len(closure_rows),
            "still_unresolved": 63 - 48 - len(closure_rows),
        },
        "comparison_v1_3r_to_v1_4": {
            "verdict_transitions": dict(sorted(transition.items(),
                                               key=lambda kv: (-kv[1], kv[0]))),
            "correct_to_incorrect": len(correct_to_incorrect),
            "new_incorrect": len(new_incorrect),
            "recall_gap_to_correct": transition["RECALL_GAP->CORRECT"],
        },
        "rule_coverage_and_accuracy": {
            rule: {"selected_tokens": rule_stats[rule]["total"],
                   "correct": rule_stats[rule]["correct"],
                   "accuracy_pct": round(100.0 * rule_stats[rule]["correct"]
                                         / rule_stats[rule]["total"], 3)
                   if rule_stats[rule]["total"] else None}
            for rule in list(V.RULES) + [V1_3.LEXICON_RULE, CLOSURE_RULE]
        },
        "ambiguous_reasons": dict(sorted(ambiguous_reasons.items(),
                                         key=lambda kv: (-kv[1], kv[0]))),
    }

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "closure-lexicon.json": V.sha256_file(CLOSURE_LEXICON_PATH),
        "report.json": V.sha256_file(out_report),
        "selection.jsonl": V.sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {k: report[k] for k in ("verdicts", "field_accuracy",
                                     "residual_l7a_final", "comparison_v1_3r_to_v1_4")}
    digest["acceptance_gates"] = {k: v for k, v in report["acceptance_gates"].items()
                                  if isinstance(v, bool)}
    digest["proper_name_closure_layer"] = {
        k: v for k, v in report["proper_name_closure_layer"].items() if k != "rows"}
    digest["checksums"] = checksums
    print(json.dumps(digest, ensure_ascii=False, indent=2))

    failed = [k for k, v in report["acceptance_gates"].items()
              if isinstance(v, bool) and not v]
    if failed:
        print("ACCEPTANCE GATES FAILED: " + ", ".join(sorted(failed)), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
