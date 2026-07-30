#!/usr/bin/env python3
"""Deterministic CAMeL candidate selector v1.3 - v1.2c plus a proper-name lexicon.

v1.2c is FROZEN. This script does not re-implement it: it imports
`select-camel-candidate-v1_2c.py` as a module and calls its `select()` verbatim,
so the rule cascade R1-R9, the eligibility gate and the frozen R1-R5 recall layer
are structurally impossible to change from here.

The only addition is a narrow, closed lexicon of Quranic proper names,
`resources/quran-proper-name-lexicon.json`, applied as a LAST layer:

    chosen, rule, chain, reason = v1_2c.select(...)
    if chosen is None:            # and ONLY then
        chosen, rule, reason = proper_name_lexicon_select(...)

Because the layer runs only where v1.2c returned no selection, it can add a
decision but can never overturn one. Every v1.2c selection is carried through
byte-for-byte.

What the layer is allowed to do
-------------------------------
An entry fires for a token only when all of the following hold:

  * the token's normalized canonical Tanzil surface is one of the entry's
    accepted surfaces (they are enumerated explicitly - prefix and final-vowel
    variants are listed, never inferred by stripping letters);
  * the candidate is `noun_prop`;
  * the candidate's normalized root AND normalized lemma both equal the entry's,
    so the entry names one lexical core and nothing else can satisfy it.

If more than one distinct lexical core survives, the token is left
`AMBIGUOUS_PROPER_NAME` - the layer never guesses between names. If no candidate
matches, it is left `UNRESOLVED_PROPER_NAME` - a surface that cannot be resolved
against a real CAMeL candidate is reported, not forced.

Residual feature ambiguity (several fingerprints of the SAME core differing only
in cas/stt) is resolved fingerprint-first, exactly the convention R9 already uses.

What the layer is NOT
---------------------
No general rootless-`noun_prop` ban and no general proper-name guessing: CAMeL
offers a `noun_prop` reading for 3999 distinct ambiguous surfaces, and only the
95 surfaces enumerated in the lexicon may be touched. No verse_key override, no
per-token hardcoding, no ranker/model. The teacher is not read by the selection
path at all; it is used here only in the evaluation section below, and it was
used at build time only to validate lexicon entries
(see `build-proper-name-lexicon.py`).
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
OUT_DIR = CAND_ROOT / "selector-v1_3"
BASELINE_SELECTION = CAND_ROOT / "selector-v1_2c" / "selection.jsonl"
LEXICON_PATH = SCRIPT_DIR / "resources" / "quran-proper-name-lexicon.json"
RESIDUAL_PATH = CAND_ROOT / "residual-recall-gap" / "residual-classification.jsonl"

SCHEMA_VERSION = "camel-selector-v1_3"
RESIDUAL_LEVEL = "L7A_PROPER_NOUN"

LEXICON_RULE = "L1_PROPER_NAME_LEXICON"
LEXICON_CONFIDENCE = "high"

# The one AMBIGUOUS record this revision is required to resolve.
EXPECTED_RESOLVED = ("27:44", 25)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


# The frozen selector. Imported, never edited.
V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c")
RECALL = V.RECALL
COVERAGE = V.COVERAGE


# --------------------------------------------------------------------------
# The proper-name lexicon layer
# --------------------------------------------------------------------------
class ProperNameLexicon:
    """Closed list of Quranic proper names, keyed by normalized surface."""

    def __init__(self, document: dict):
        self.document = document
        self.by_surface = {}
        for entry in document["entries"]:
            if entry.get("status") != "RESOLVED":
                continue
            key = (entry["camel_selector"]["normalized_root"],
                   entry["camel_selector"]["normalized_lemma"])
            for surface in entry["accepted_surfaces"]:
                norm = surface["normalized"]
                if norm in self.by_surface:
                    raise SystemExit(
                        f"FAIL-CLOSED: surface {norm!r} claimed by two entries")
                self.by_surface[norm] = {"core": key, "entry": entry}

    def select(self, surface: str, pool):
        """Returns (candidate|None, reason|None, diagnostics).

        `pool` is the full frozen pool for the token - NOT whatever v1.2c's
        cascade narrowed it down to. v1.2c's diagnostic rules (R3/R6) can strip
        the correct reading before reporting AMBIGUOUS, so the layer re-derives
        its own eligible set from scratch.
        """
        norm = V.normalize_vocalized(surface)
        hit = self.by_surface.get(norm)
        if hit is None:
            return None, None, None

        entry = hit["entry"]
        root, lemma = hit["core"]
        surf_skel = V.skeleton(surface)
        live = [c for c in pool if V.is_selectable_evidence(c, surf_skel)]
        matching = [
            c for c in live
            if c.get("pos") == "noun_prop"
            and COVERAGE.normalize_root(c.get("root")) == root
            and COVERAGE.normalize_lemma(c.get("lex")) == lemma
        ]
        diagnostics = {
            "entry": entry["canonical_lexical_core"],
            "eligible_candidates": len(live),
            "matching_candidates": len(matching),
        }
        if not matching:
            return None, ("UNRESOLVED_PROPER_NAME::"
                          "no_matching_noun_prop_candidate"), diagnostics

        # Guard, not a formality: the entry must name exactly one lexical core.
        cores = {(COVERAGE.normalize_root(c.get("root")),
                  COVERAGE.normalize_lemma(c.get("lex")),
                  c.get("pos")) for c in matching}
        diagnostics["distinct_cores"] = len(cores)
        if len(cores) != 1:
            return None, (f"AMBIGUOUS_PROPER_NAME::{len(cores)}_lexical_cores"), \
                diagnostics
        return sorted(matching, key=lambda c: c["_fp"])[0], None, diagnostics


# --------------------------------------------------------------------------
def main() -> int:
    for path in (V.TEACHER_PATH, V.TOKEN_MAP_PATH, V.DB_PATH, V.FULL_ANALYSIS_DIR,
                 LEXICON_PATH, BASELINE_SELECTION, RESIDUAL_PATH):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if len(RECALL.DAWUD_ALLOWLIST) != RECALL.EXPECTED_DAWUD_SURFACES:
        raise SystemExit("FAIL-CLOSED: frozen recall layer changed under this selector")

    lexicon_doc = json.loads(LEXICON_PATH.read_text(encoding="utf-8"))
    lexicon = ProperNameLexicon(lexicon_doc)

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

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(V.DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def merged_pool(key, record):
        """The frozen recall layer, replayed exactly as v1.2c replays it."""
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
        if not gated:
            return slims, raw_count
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
        return slims, raw_count

    # ---- EVALUATION ONLY (identical to v1.2c) ------------------------------
    def pos_compatible(t_row, selected) -> bool:
        pair = (t_row.get("pos"), selected.get("pos"))
        if pair in (("N", "prep"), ("N", "part")):
            return "PRON" in (t_row.get("morphology") or [])
        if pair == ("V", "part_neg"):
            t_lemma = COVERAGE.normalize_lemma(t_row.get("lemma"))
            return (t_lemma is not None
                    and t_lemma == COVERAGE.normalize_lemma(selected.get("lex")))
        return False

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
    lexicon_diagnostics = {}
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

                # ---- the frozen selector decides first ----------------------
                chosen, rule, chain, reason = V.select(
                    canonical[key], pool, prev_pool, next_pool)

                # ---- the lexicon layer only fills in a non-decision ---------
                lexicon_applied = False
                if chosen is None:
                    picked, lex_reason, diag = lexicon.select(canonical[key], pool)
                    if diag is not None:
                        lexicon_diagnostics[key] = diag
                    if picked is not None:
                        chosen = picked
                        rule = LEXICON_RULE
                        lexicon_applied = True
                        reason = None
                    elif lex_reason is not None:
                        reason = lex_reason

                answers[key] = any(
                    qualifies(COVERAGE.normalize_root(c.get("root")),
                              COVERAGE.normalize_lemma(c.get("lex")),
                              c.get("pos"), teacher[key])[0]
                    for c in pool)
                rows.append({
                    "verse_key": verse_key,
                    "word_index": widx,
                    "arabic": canonical[key],
                    "candidate_count_before_dedupe": raw_count,
                    "candidate_count_after_dedupe": after,
                    "selected_fingerprint": chosen["_fp"] if chosen else None,
                    "selection_rule": rule,
                    "rule_chain": chain,
                    "confidence": (LEXICON_CONFIDENCE if lexicon_applied
                                   else (V.CONFIDENCE.get(rule) if rule else None)),
                    "proper_name_lexicon_applied": lexicon_applied,
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
    # Evaluation against the teacher oracle (verification only)
    # ======================================================================
    verdicts = Counter()
    rule_stats = defaultdict(lambda: Counter())
    field_stats = Counter()
    ambiguous_reasons = Counter()
    error_classes = Counter()
    error_examples = defaultdict(list)

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
            COVERAGE.normalize_lemma(sel.get("lex")),
            sel.get("pos"), t_row)
        compatible = ok or (root_ok and lemma_ok and pos_compatible(t_row, sel))
        verdicts["CORRECT" if ok else "INCORRECT"] += 1
        verdicts["MAPPED_CORRECT"] += compatible
        row["verdict"] = "CORRECT" if ok else "INCORRECT"
        row["pos_compatible_under_map"] = bool(compatible and not ok)
        if (root_ok or not COVERAGE.normalize_root(t_row.get("root"))) and \
           (lemma_ok or not COVERAGE.normalize_lemma(t_row.get("lemma"))):
            verdicts["LEXICAL_CORE_CORRECT"] += 1
        rule_stats[row["selection_rule"]]["total"] += 1
        rule_stats[row["selection_rule"]]["correct"] += ok
        field_stats["root_applicable"] += COVERAGE.normalize_root(t_row.get("root")) is not None
        field_stats["root_correct"] += (
            COVERAGE.normalize_root(t_row.get("root")) is not None and root_ok)
        field_stats["lemma_applicable"] += COVERAGE.normalize_lemma(t_row.get("lemma")) is not None
        field_stats["lemma_correct"] += (
            COVERAGE.normalize_lemma(t_row.get("lemma")) is not None and lemma_ok)
        field_stats["pos_applicable"] += 1
        field_stats["pos_correct"] += pos_ok
        if not ok:
            signature = (f"teacher_pos={t_row.get('pos')}|selected_pos={sel.get('pos')}"
                         f"|root_ok={root_ok}|lemma_ok={lemma_ok}"
                         f"|rule={row['selection_rule']}")
            error_classes[signature] += 1
            if len(error_examples[signature]) < 5:
                error_examples[signature].append({
                    "verse_key": row["verse_key"], "word_index": row["word_index"],
                    "arabic": row["arabic"], "teacher_root": t_row.get("root"),
                    "teacher_lemma": t_row.get("lemma"), "teacher_pos": t_row.get("pos"),
                    "selected_root": sel.get("root"), "selected_lex": sel.get("lex"),
                    "selected_pos": sel.get("pos"), "selected_diac": sel.get("diac"),
                })

    # ======================================================================
    # v1.2c -> v1.3 comparison and the acceptance gates
    # ======================================================================
    baseline = {}
    for line in BASELINE_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        baseline[(obj["verse_key"], obj["word_index"])] = obj

    transition = Counter()
    correct_to_incorrect = []
    overturned_v1_2c_selections = []
    new_incorrect_rows = []
    for key, old in baseline.items():
        row = by_key.get(key)
        if row is None:
            continue
        transition[f"{old.get('verdict')}->{row['verdict']}"] += 1
        # v1.2c's definite selections must survive untouched.
        if old.get("selected_fingerprint") is not None and \
                row["selected_fingerprint"] != old.get("selected_fingerprint"):
            overturned_v1_2c_selections.append({
                "verse_key": key[0], "word_index": key[1],
                "arabic": row["arabic"],
                "v1_2c_fingerprint": old.get("selected_fingerprint"),
                "v1_3_fingerprint": row["selected_fingerprint"],
            })
        if old.get("verdict") == "CORRECT" and row["verdict"] == "INCORRECT":
            correct_to_incorrect.append({
                "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"],
                "v1_2c_rule": old.get("selection_rule"),
                "v1_2c_selected": old.get("selected"),
                "v1_3_rule": row.get("selection_rule"),
                "v1_3_selected": row.get("selected"),
            })
        if old.get("verdict") != "INCORRECT" and row["verdict"] == "INCORRECT":
            new_incorrect_rows.append({
                "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"],
                "v1_2c_verdict": old.get("verdict"),
                "v1_3_rule": row.get("selection_rule"),
                "lexicon_applied": row.get("proper_name_lexicon_applied"),
                "teacher_lemma": teacher[key].get("lemma"),
                "teacher_root": teacher[key].get("root"),
                "selected_lex": (row.get("selected") or {}).get("lex"),
                "selected_root": (row.get("selected") or {}).get("root"),
            })

    lexicon_rows = [r for r in rows if r["proper_name_lexicon_applied"]]
    lexicon_verdicts = Counter(r["verdict"] for r in lexicon_rows)
    lexicon_incorrect = [
        {"verse_key": r["verse_key"], "word_index": r["word_index"],
         "arabic": r["arabic"], "selected_lex": (r["selected"] or {}).get("lex"),
         "selected_root": (r["selected"] or {}).get("root"),
         "teacher_lemma": teacher[(r["verse_key"], r["word_index"])].get("lemma"),
         "teacher_root": teacher[(r["verse_key"], r["word_index"])].get("root")}
        for r in lexicon_rows if r["verdict"] == "INCORRECT"]

    # Every lexicon selection must have rested on exactly one lexical core.
    single_core_violations = [
        {"verse_key": k[0], "word_index": k[1], "distinct_cores": d.get("distinct_cores")}
        for k, d in sorted(lexicon_diagnostics.items(), key=lambda kv: V.sort_key(kv[0]))
        if by_key[k]["proper_name_lexicon_applied"] and d.get("distinct_cores") != 1]

    # ---- the residual L7A proper-name group -------------------------------
    residual = defaultdict(list)
    for line in RESIDUAL_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("level") == RESIDUAL_LEVEL:
            residual[obj["arabic"]].append((obj["verse_key"], obj["word_index"]))

    residual_surfaces = []
    residual_closed = 0
    for surface in sorted(residual):
        locs = sorted(residual[surface], key=V.sort_key)
        closed = [f"{v}:{w}" for v, w in locs
                  if by_key[(v, w)]["proper_name_lexicon_applied"]]
        residual_closed += len(closed)
        residual_surfaces.append({
            "tanzil_surface": surface,
            "normalized": V.normalize_vocalized(surface),
            "locations": len(locs),
            "verse_keys": [f"{v}:{w}" for v, w in locs],
            "in_lexicon": V.normalize_vocalized(surface) in lexicon.by_surface,
            "closed_by_lexicon": len(closed),
            "status": ("CLOSED" if len(closed) == len(locs)
                       else "PARTIALLY_CLOSED" if closed
                       else "UNRESOLVED_PROPER_NAME"),
            "verdicts": dict(sorted(Counter(
                by_key[(v, w)]["verdict"] for v, w in locs).items())),
        })

    target_row = by_key[EXPECTED_RESOLVED]
    target_teacher = teacher[EXPECTED_RESOLVED]

    baseline_report_path = BASELINE_SELECTION.parent / "report.json"
    baseline_report = (json.loads(baseline_report_path.read_text(encoding="utf-8"))
                       if baseline_report_path.exists() else {})

    out_tokens = OUT_DIR / "selection.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    total = len(rows)
    judged = verdicts["CORRECT"] + verdicts["INCORRECT"]
    all_rules = list(V.RULES) + [LEXICON_RULE]

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "teacher_sha256": V.sha256_file(V.TEACHER_PATH),
            "camel_db_sha256": V.sha256_file(V.DB_PATH),
            "token_map_sha256": V.sha256_file(V.TOKEN_MAP_PATH),
            "proper_name_lexicon_sha256": V.sha256_file(LEXICON_PATH),
            "v1_2c_selection_sha256": V.sha256_file(BASELINE_SELECTION),
            "tokens": total,
        },
        "contract": {
            "base_selector": ("select-camel-candidate-v1_2c.py imported as a module "
                              "and called verbatim - R1-R9, the eligibility gate and "
                              "the frozen R1-R5 recall layer are unchanged"),
            "added_layer": ("closed Quranic proper-name lexicon, applied only where "
                            "v1.2c returned no selection"),
            "lexicon": str(LEXICON_PATH.relative_to(REPO_ROOT)).replace("\\", "/"),
            "match_predicate": lexicon_doc["contract"]["match_predicate"],
            "teacher_use": ("evaluation oracle only - not a runtime input, lookup or "
                            "override; used at lexicon build time solely to validate "
                            "entries"),
            "no_guessing": ("AMBIGUOUS_PROPER_NAME when more than one lexical core "
                            "survives, UNRESOLVED_PROPER_NAME when none does"),
            "excluded_this_run": ["general rootless-noun_prop ban",
                                  "general proper-name guessing",
                                  "ranker/model/LLM", "per-token hardcoding",
                                  "verse_key overrides", "production DB writes"],
        },
        "verdicts": {
            "correct": verdicts["CORRECT"],
            "incorrect": verdicts["INCORRECT"],
            "ambiguous": verdicts["AMBIGUOUS"],
            "recall_gap": verdicts["RECALL_GAP"],
            "total": total,
            "accuracy_on_judged": round(100.0 * verdicts["CORRECT"] / judged, 3)
            if judged else None,
            "accuracy_on_all_non_gap": round(
                100.0 * verdicts["CORRECT"] / (judged + verdicts["AMBIGUOUS"]), 3)
            if (judged + verdicts["AMBIGUOUS"]) else None,
        },
        "field_accuracy": {
            "root": {
                "applicable": field_stats["root_applicable"],
                "correct": field_stats["root_correct"],
                "pct": round(100.0 * field_stats["root_correct"]
                             / field_stats["root_applicable"], 3)
                if field_stats["root_applicable"] else None,
            },
            "lemma": {
                "applicable": field_stats["lemma_applicable"],
                "correct": field_stats["lemma_correct"],
                "pct": round(100.0 * field_stats["lemma_correct"]
                             / field_stats["lemma_applicable"], 3)
                if field_stats["lemma_applicable"] else None,
            },
            "pos": {
                "applicable": field_stats["pos_applicable"],
                "correct": field_stats["pos_correct"],
                "pct": round(100.0 * field_stats["pos_correct"]
                             / field_stats["pos_applicable"], 3)
                if field_stats["pos_applicable"] else None,
            },
        },
        "rule_coverage_and_accuracy": {
            rule: {
                "selected_tokens": rule_stats[rule]["total"],
                "correct": rule_stats[rule]["correct"],
                "accuracy_pct": round(
                    100.0 * rule_stats[rule]["correct"] / rule_stats[rule]["total"], 3)
                if rule_stats[rule]["total"] else None,
                "confidence": (LEXICON_CONFIDENCE if rule == LEXICON_RULE
                               else V.CONFIDENCE[rule]),
            }
            for rule in all_rules
        },
        "ambiguous_reasons": dict(sorted(ambiguous_reasons.items(),
                                         key=lambda kv: (-kv[1], kv[0]))),
        "acceptance_gates": {
            "v1_2c_selections_never_overturned":
                len(overturned_v1_2c_selections) == 0,
            "correct_to_incorrect_is_0": len(correct_to_incorrect) == 0,
            "new_incorrect_is_0": len(new_incorrect_rows) == 0,
            "every_lexicon_selection_had_exactly_one_core":
                len(single_core_violations) == 0,
            "residual_l7a_surfaces_all_listed":
                len(residual_surfaces) == lexicon_doc["totals"]["residual_l7a_surfaces"],
            "target_27_44_resolved": target_row["verdict"] == "CORRECT",
            "overturned_rows": overturned_v1_2c_selections[:20],
            "correct_to_incorrect_rows": correct_to_incorrect[:20],
            "new_incorrect_rows": new_incorrect_rows[:20],
            "single_core_violations": single_core_violations[:20],
        },
        "proper_name_lexicon_layer": {
            "entries": lexicon_doc["totals"]["entries"],
            "accepted_surfaces": lexicon_doc["totals"]["accepted_surfaces"],
            "tokens_selected": len(lexicon_rows),
            "verdicts": dict(sorted(lexicon_verdicts.items())),
            "accuracy_pct": round(
                100.0 * lexicon_verdicts["CORRECT"]
                / (lexicon_verdicts["CORRECT"] + lexicon_verdicts["INCORRECT"]), 3)
            if (lexicon_verdicts["CORRECT"] + lexicon_verdicts["INCORRECT"]) else None,
            "incorrect_rows": lexicon_incorrect[:20],
            "tokens_left_unresolved_by_layer": sum(
                1 for r in rows
                if str(r.get("ambiguous_reason") or "").startswith(
                    "UNRESOLVED_PROPER_NAME")),
            "tokens_left_ambiguous_by_layer": sum(
                1 for r in rows
                if str(r.get("ambiguous_reason") or "").startswith(
                    "AMBIGUOUS_PROPER_NAME")),
        },
        "residual_l7a_proper_names": {
            "surfaces": len(residual_surfaces),
            "locations": sum(s["locations"] for s in residual_surfaces),
            "closed_by_lexicon": residual_closed,
            "unresolved": sum(1 for s in residual_surfaces
                              if s["status"] == "UNRESOLVED_PROPER_NAME"),
            "why_unresolved": ("none of these surfaces has a CAMeL noun_prop candidate "
                               "in the frozen pool, so no entry could be verified "
                               "against a real candidate and none was forced"),
            "rows": residual_surfaces,
        },
        "target_27_44": {
            "verse_key": EXPECTED_RESOLVED[0],
            "word_index": EXPECTED_RESOLVED[1],
            "arabic": target_row["arabic"],
            "v1_2c": {
                "verdict": baseline[EXPECTED_RESOLVED].get("verdict"),
                "reason": baseline[EXPECTED_RESOLVED].get("ambiguous_reason"),
            },
            "v1_3": {
                "verdict": target_row["verdict"],
                "rule": target_row["selection_rule"],
                "lexicon_applied": target_row["proper_name_lexicon_applied"],
                "selected": target_row["selected"],
            },
            "teacher": {"root": target_teacher.get("root"),
                        "lemma": target_teacher.get("lemma"),
                        "pos": target_teacher.get("pos")},
        },
        "comparison_v1_2c_to_v1_3": {
            "v1_2c": {
                "verdicts": baseline_report.get("verdicts"),
                "field_accuracy": baseline_report.get("field_accuracy"),
            },
            "verdict_transitions": dict(sorted(transition.items(),
                                               key=lambda kv: (-kv[1], kv[0]))),
            "correct_to_incorrect": len(correct_to_incorrect),
            "new_incorrect": len(new_incorrect_rows),
            "ambiguous_to_correct": transition["AMBIGUOUS->CORRECT"],
            "ambiguous_to_incorrect": transition["AMBIGUOUS->INCORRECT"],
        },
        "top_3_error_classes": [
            {"signature": sig, "tokens": count, "examples": error_examples[sig]}
            for sig, count in error_classes.most_common(3)
        ],
    }

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "proper-name-lexicon.json": V.sha256_file(LEXICON_PATH),
        "report.json": V.sha256_file(out_report),
        "selection.jsonl": V.sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {k: report[k] for k in
              ("verdicts", "field_accuracy", "ambiguous_reasons",
               "proper_name_lexicon_layer", "target_27_44")}
    digest["rule_coverage_and_accuracy"] = {
        r: report["rule_coverage_and_accuracy"][r]
        for r in all_rules if report["rule_coverage_and_accuracy"][r]["selected_tokens"]
    }
    digest["acceptance_gates"] = {
        k: v for k, v in report["acceptance_gates"].items()
        if not k.endswith("_rows") and k != "single_core_violations"}
    digest["residual_l7a_proper_names"] = {
        k: v for k, v in report["residual_l7a_proper_names"].items() if k != "rows"}
    digest["comparison_v1_2c_to_v1_3"] = report["comparison_v1_2c_to_v1_3"]
    digest["checksums"] = checksums
    print(json.dumps(digest, ensure_ascii=False, indent=2))

    gates = report["acceptance_gates"]
    failed = [k for k, v in gates.items() if isinstance(v, bool) and not v]
    if failed:
        print("ACCEPTANCE GATES FAILED: " + ", ".join(sorted(failed)),
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
