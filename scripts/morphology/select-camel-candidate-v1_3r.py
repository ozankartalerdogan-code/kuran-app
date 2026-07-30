#!/usr/bin/env python3
"""Selector v1.3r - v1.3 plus the proper-name RECALL candidate layer.

v1.3 is FROZEN and is not edited. This script imports it as a module and reuses
its parts verbatim: the frozen v1.2c cascade (via `v1_3.V.select`) and v1.3's
proper-name SELECTION lexicon layer (`v1_3.ProperNameLexicon`). No selector rule
is added, and no rule is re-ordered.

The one difference is upstream of selection: for the 23 residual `L7A` surfaces,
where CAMeL emits no `noun_prop` analysis at all, a single surface-derived
candidate from `resources/quran-proper-name-recall-lexicon.json` is ADDED to the
pool. Nothing is removed from the pool. The existing rules then decide what to
do with the enlarged pool exactly as they always would.

Injection is gated three ways, all of which must hold:

  * the token's canonical Tanzil surface is one of the closed, RESOLVED surfaces
    in the recall lexicon - a surface key, never a verse key;
  * `core_key(surface)` re-derives to the same parse the lexicon stores, so the
    candidate is reproducible from the surface alone and cannot have been
    hand-edited into the JSON;
  * v1.3 left the token `RECALL_GAP` or `UNRESOLVED_PROPER_NAME` (rule 8).

The synthetic candidate carries only `lex`, `pos`, `root=null`, the
surface-verified `prc*`/`enc0`, and `source`. It asserts no `diac`, and no root,
case, gender, number, state, mood, voice, aspect or person - so it can win a
token only where nothing else competes, which is precisely the recall hole it
was built for. Where real CAMeL analyses do compete, no rule can adjudicate
between them and the token honestly stays AMBIGUOUS rather than being guessed.

The teacher is used only in the evaluation section below.
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
OUT_DIR = CAND_ROOT / "selector-v1_3r"
BASELINE_SELECTION = CAND_ROOT / "selector-v1_3" / "selection.jsonl"
RECALL_LEXICON_PATH = SCRIPT_DIR / "resources" / "quran-proper-name-recall-lexicon.json"

SCHEMA_VERSION = "camel-selector-v1_3r"
RECALL_RULE = "R1_UNIQUE_AFTER_DEDUPE"          # no new rule is introduced
CANDIDATE_SOURCE = "quran_proper_name_lexicon"
EXPECTED_RESOLVED = ("27:44", 25)
EXPECTED_V1_3_CORRECT = 30548


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V1_3 = load_module(SCRIPT_DIR / "select-camel-candidate-v1_3.py", "camel_selector_v1_3")
BUILDER = load_module(SCRIPT_DIR / "build-proper-name-recall-lexicon.py",
                      "proper_name_recall_lexicon_builder")
V = V1_3.V                 # the frozen v1.2c module
RECALL = V.RECALL
COVERAGE = V.COVERAGE

SYNTHETIC_FIELDS = ("lex", "pos", "root", "prc0", "prc1", "prc2", "prc3",
                    "enc0", "source")


class ProperNameRecallLexicon:
    """Closed surface -> one synthetic noun_prop candidate."""

    def __init__(self, document: dict):
        self.document = document
        self.by_surface = {}
        for entry in document["entries"]:
            if entry.get("status") != "RESOLVED":
                continue
            if not entry.get("production_ready"):
                continue
            surface = entry["tanzil_surface"]
            if surface in self.by_surface:
                raise SystemExit(f"FAIL-CLOSED: duplicate surface {surface!r}")
            self.by_surface[surface] = entry

    def rederive(self, surface: str):
        """Rebuild the entry's candidate from the SURFACE alone.

        Proves the stored JSON is what the documented algorithm produces, so a
        hand-edited or verse-key-derived entry cannot slip through."""
        key = BUILDER.core_key(surface)
        parses = BUILDER.enumerate_parses(key)
        if len(parses) != 1:
            return None, f"{len(parses)}_parses"
        chain, name = parses[0]
        slots = {BUILDER.PROCLITIC_BY_TAG[t]["slot"]: t for t in chain}
        return {
            "lex": name,
            "pos": "noun_prop",
            "root": None,
            "prc0": slots.get("prc0", "0"),
            "prc1": slots.get("prc1", "0"),
            "prc2": slots.get("prc2", "0"),
            "prc3": slots.get("prc3", "0"),
            "enc0": "0",
            "source": CANDIDATE_SOURCE,
        }, key

    def candidate_for(self, surface: str):
        """(candidate|None, diagnostics). Only returns one when the stored entry
        and the surface-only rederivation agree field for field."""
        entry = self.by_surface.get(surface)
        if entry is None:
            return None, None
        rederived, key = self.rederive(surface)
        stored = entry["synthetic_candidate"]
        if rederived is None:
            return None, {"surface": surface, "reproducible": False, "why": key}
        if rederived != stored or key != entry["surface_key"]:
            return None, {"surface": surface, "reproducible": False,
                          "why": "rederivation_differs_from_stored"}
        return dict(rederived), {"surface": surface, "reproducible": True,
                                 "lexical_core": entry["lexical_core"],
                                 "classification": entry["classification"]}


def main() -> int:
    for path in (V.TEACHER_PATH, V.TOKEN_MAP_PATH, V.DB_PATH, V.FULL_ANALYSIS_DIR,
                 V1_3.LEXICON_PATH, RECALL_LEXICON_PATH, BASELINE_SELECTION):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if len(RECALL.DAWUD_ALLOWLIST) != RECALL.EXPECTED_DAWUD_SURFACES:
        raise SystemExit("FAIL-CLOSED: frozen recall layer changed under this selector")

    selection_lexicon = V1_3.ProperNameLexicon(
        json.loads(V1_3.LEXICON_PATH.read_text(encoding="utf-8")))
    recall_doc = json.loads(RECALL_LEXICON_PATH.read_text(encoding="utf-8"))
    recall_lexicon = ProperNameRecallLexicon(recall_doc)

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

    # Rule 8: only tokens v1.3 could not decide are eligible for injection.
    def injection_allowed(key) -> bool:
        row = baseline.get(key)
        if row is None:
            return False
        if row.get("verdict") == "RECALL_GAP":
            return True
        return str(row.get("ambiguous_reason") or "").startswith(
            "UNRESOLVED_PROPER_NAME")

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(V.DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    injection_log = {}
    blocked_log = Counter()

    def merged_pool(key, record):
        """v1.3's pool, then the recall candidate appended - never a removal."""
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
        if surface in recall_lexicon.by_surface:
            # The layer exists for the genuine recall hole: tokens where CAMeL
            # offers NO usable analysis at all. Where it does offer real (if
            # wrong) analyses, a candidate that asserts no diac and no features
            # cannot outrank them under R2/R4/R6 - and those rules may not be
            # changed. Injecting there would not select the name; it would only
            # break R9's unanimity and unmask a wrong verb reading that was
            # previously hidden behind RECALL_GAP. So the layer declines, and
            # the token is reported instead of being half-resolved.
            if any(V.is_selectable_evidence(c, V.skeleton(surface)) for c in slims):
                blocked_log["declined_competing_camel_analyses"] += 1
            elif not injection_allowed(key):
                blocked_log["blocked_by_rule_8"] += 1
            else:
                synthetic, diag = recall_lexicon.candidate_for(surface)
                if synthetic is None:
                    blocked_log["blocked_not_reproducible"] += 1
                else:
                    synthetic["_synthetic"] = {
                        "source": CANDIDATE_SOURCE,
                        "lexical_core": diag["lexical_core"],
                        "classification": diag["classification"],
                    }
                    s = V.slim(synthetic)
                    s["_synthetic"] = synthetic["_synthetic"]
                    existing = {c["_fp"] for c in slims}
                    if s["_fp"] not in existing:
                        slims.append(s)          # ADD only
                        raw_count += 1
                    injection_log[key] = diag
        return slims, raw_count

    # ---- EVALUATION ONLY ---------------------------------------------------
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

                chosen, rule, chain, reason = V.select(
                    canonical[key], pool, prev_pool, next_pool)

                lexicon_applied = False
                if chosen is None:
                    picked, lex_reason, _diag = selection_lexicon.select(
                        canonical[key], pool)
                    if picked is not None:
                        chosen, rule, lexicon_applied, reason = (
                            picked, V1_3.LEXICON_RULE, True, None)
                    elif lex_reason is not None:
                        reason = lex_reason

                from_recall = bool(chosen and "_synthetic" in chosen)
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
                    "confidence": (V1_3.LEXICON_CONFIDENCE if lexicon_applied
                                   else (V.CONFIDENCE.get(rule) if rule else None)),
                    "proper_name_lexicon_applied": lexicon_applied,
                    "proper_name_recall_candidate_injected": key in injection_log,
                    "selected_from_proper_name_recall": from_recall,
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
    # Evaluation
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
            COVERAGE.normalize_lemma(sel.get("lex")),
            sel.get("pos"), t_row)
        verdicts["CORRECT" if ok else "INCORRECT"] += 1
        verdicts["MAPPED_CORRECT"] += ok or (root_ok and lemma_ok
                                             and pos_compatible(t_row, sel))
        row["verdict"] = "CORRECT" if ok else "INCORRECT"
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

    # ======================================================================
    # Gates
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
        if old.get("selected_fingerprint") is not None and \
                row["selected_fingerprint"] != old.get("selected_fingerprint"):
            changed_selection.append({
                "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"],
                "v1_3_fingerprint": old.get("selected_fingerprint"),
                "v1_3r_fingerprint": row["selected_fingerprint"]})
        if old.get("verdict") == "CORRECT" and row["verdict"] == "INCORRECT":
            correct_to_incorrect.append({
                "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"]})
        if old.get("verdict") != "INCORRECT" and row["verdict"] == "INCORRECT":
            new_incorrect.append({
                "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"],
                "v1_3_verdict": old.get("verdict"),
                "rule": row.get("selection_rule"),
                "from_recall": row.get("selected_from_proper_name_recall"),
                "selected_lex": (row.get("selected") or {}).get("lex"),
                "attested_lemma": teacher[key].get("lemma"),
                "attested_root": teacher[key].get("root")})

    recall_rows = [r for r in rows if r["selected_from_proper_name_recall"]]
    recall_verdicts = Counter(r["verdict"] for r in recall_rows)
    injected_rows = [r for r in rows if r["proper_name_recall_candidate_injected"]]

    # ---- per-surface outcome for all 23 residual surfaces -----------------
    surface_rows = []
    for entry in sorted(recall_doc["entries"],
                        key=lambda e: (-e["locations"], e["surface_key"])):
        locs = [(vk.rsplit(":", 1)[0], int(vk.rsplit(":", 1)[1]))
                for vk in entry["verse_keys"]]
        selected = [k for k in locs
                    if by_key[k]["selected_from_proper_name_recall"]]
        declined = [k for k in locs
                    if not by_key[k]["proper_name_recall_candidate_injected"]
                    and entry["status"] == "RESOLVED"]
        surface_rows.append({
            "declined_competing_camel_analyses": len(declined),
            "declined_verse_keys": [f"{v}:{w}" for v, w in declined],
            # Both conditions must hold: the entry itself has to be independently
            # confirmed AND no location may have been declined. Reporting only
            # the second would flag a root-vetoed name as production ready.
            "production_ready_for_these_locations": (
                entry["production_ready"] and not declined),
            "tanzil_surface": entry["tanzil_surface"],
            "surface_key": entry["surface_key"],
            "classification": entry["classification"],
            "status": entry["status"],
            "production_ready": entry["production_ready"],
            "requires_manual_verification": entry["requires_manual_verification"],
            "lexical_core": entry.get("lexical_core"),
            "proclitics": [p["tag"] for p in entry.get("proclitics", [])],
            "locations": entry["locations"],
            "candidate_injected": sum(
                1 for k in locs
                if by_key[k]["proper_name_recall_candidate_injected"]),
            "selected_from_recall_candidate": len(selected),
            "verdicts": dict(sorted(Counter(by_key[k]["verdict"]
                                            for k in locs).items())),
            "reason": entry.get("reason"),
        })

    # Every injected candidate must be reproducible from its surface alone.
    reproducible = {s: recall_lexicon.candidate_for(s)[1]
                    for s in sorted(recall_lexicon.by_surface)}
    not_reproducible = [s for s, d in reproducible.items()
                        if not (d or {}).get("reproducible")]

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
            "camel_db_sha256": V.sha256_file(V.DB_PATH),
            "selection_lexicon_sha256": V.sha256_file(V1_3.LEXICON_PATH),
            "recall_lexicon_sha256": V.sha256_file(RECALL_LEXICON_PATH),
            "v1_3_selection_sha256": V.sha256_file(BASELINE_SELECTION),
            "tokens": len(rows),
        },
        "contract": {
            "base_selector": ("select-camel-candidate-v1_3.py imported as a module; "
                              "its cascade and its selection lexicon are unchanged"),
            "added": ("one surface-derived noun_prop candidate ADDED to the pool for "
                      "the residual L7A surfaces"),
            "no_new_selector_rule": True,
            "recall_lexicon": str(RECALL_LEXICON_PATH.relative_to(REPO_ROOT)
                                  ).replace("\\", "/"),
            "synthetic_candidate_fields": list(SYNTHETIC_FIELDS),
            "never_synthesized": ["diac", "root", "cas", "gen", "num", "stt",
                                  "mod", "vox", "asp", "per"],
            "gating": ["closed surface list",
                       "candidate reproducible from the surface alone",
                       "v1.3 left the token RECALL_GAP / UNRESOLVED_PROPER_NAME",
                       "the token has NO selectable CAMeL analysis - the genuine "
                       "recall hole; tokens with competing real analyses are "
                       "declined and reported, never half-resolved"],
            "teacher_use": "evaluation oracle only",
        },
        "verdicts": {
            "correct": verdicts["CORRECT"],
            "incorrect": verdicts["INCORRECT"],
            "ambiguous": verdicts["AMBIGUOUS"],
            "recall_gap": verdicts["RECALL_GAP"],
            "total": len(rows),
            "accuracy_on_judged": round(100.0 * verdicts["CORRECT"] / judged, 3)
            if judged else None,
        },
        "field_accuracy": {
            name: {
                "applicable": field_stats[f"{name}_applicable"],
                "correct": field_stats[f"{name}_correct"],
                "pct": round(100.0 * field_stats[f"{name}_correct"]
                             / field_stats[f"{name}_applicable"], 3)
                if field_stats[f"{name}_applicable"] else None,
            } for name in ("root", "lemma", "pos")
        },
        "acceptance_gates": {
            "all_23_surfaces_classified": len(surface_rows) == 23 and all(
                s["classification"] in ("VOCATIVE_FUSED", "CLITIC_FUSED",
                                        "PLAIN_PROPER_NAME", "OTHER")
                for s in surface_rows),
            "v1_3_selections_never_changed": len(changed_selection) == 0,
            "correct_to_incorrect_is_0": len(correct_to_incorrect) == 0,
            "new_incorrect_is_0": len(new_incorrect) == 0,
            "v1_3_correct_count_preserved":
                verdicts["CORRECT"] >= EXPECTED_V1_3_CORRECT,
            "every_injected_candidate_reproducible": len(not_reproducible) == 0,
            "target_27_44_still_correct": target_row["verdict"] == "CORRECT",
            "recall_layer_zero_incorrect": recall_verdicts["INCORRECT"] == 0,
            "changed_selection_rows": changed_selection[:20],
            "new_incorrect_rows": new_incorrect[:20],
            "not_reproducible_surfaces": not_reproducible,
        },
        "proper_name_recall_layer": {
            "lexicon_surfaces": recall_doc["totals"]["surfaces"],
            "resolved_surfaces": recall_doc["totals"]["resolved_surfaces"],
            "unresolved_surfaces": recall_doc["totals"]["unresolved_surfaces"],
            "distinct_names": recall_doc["totals"]["distinct_names"],
            "by_classification": recall_doc["totals"]["by_classification"],
            "tokens_with_candidate_injected": len(injected_rows),
            "tokens_selected_from_candidate": len(recall_rows),
            "verdicts": dict(sorted(recall_verdicts.items())),
            "tokens_injected_but_not_selected": len(injected_rows) - len(recall_rows),
            "injection_blocked": dict(sorted(blocked_log.items())),
            "reproducibility_checked_surfaces": len(reproducible),
            "reproducibility_failures": not_reproducible,
        },
        "residual_l7a_outcome": {
            "surfaces": len(surface_rows),
            "locations": sum(s["locations"] for s in surface_rows),
            "candidate_injected": sum(s["candidate_injected"] for s in surface_rows),
            "closed_by_recall_candidate": sum(
                s["selected_from_recall_candidate"] for s in surface_rows),
            "declined_competing_camel_analyses": sum(
                s["declined_competing_camel_analyses"] for s in surface_rows),
            "declined_rows": [
                {"tanzil_surface": s["tanzil_surface"],
                 "classification": s["classification"],
                 "lexical_core": s["lexical_core"],
                 "verse_keys": s["declined_verse_keys"],
                 "reason": ("CAMeL offers real competing analyses here; a candidate "
                            "asserting no diac and no morphological features cannot "
                            "outrank them under the frozen R2/R4/R6, so no candidate "
                            "was injected and these locations are NOT production "
                            "ready without independent manual verification")}
                for s in surface_rows if s["declined_competing_camel_analyses"]],
            "not_production_ready": [
                {"tanzil_surface": s["tanzil_surface"],
                 "classification": s["classification"], "locations": s["locations"],
                 "reason": s["reason"]}
                for s in surface_rows if not s["production_ready"]],
            "rows": surface_rows,
        },
        "comparison_v1_3_to_v1_3r": {
            "verdict_transitions": dict(sorted(transition.items(),
                                               key=lambda kv: (-kv[1], kv[0]))),
            "correct_to_incorrect": len(correct_to_incorrect),
            "new_incorrect": len(new_incorrect),
            "recall_gap_to_correct": transition["RECALL_GAP->CORRECT"],
            "recall_gap_to_ambiguous": transition["RECALL_GAP->AMBIGUOUS"],
        },
        "rule_coverage_and_accuracy": {
            rule: {"selected_tokens": rule_stats[rule]["total"],
                   "correct": rule_stats[rule]["correct"],
                   "accuracy_pct": round(100.0 * rule_stats[rule]["correct"]
                                         / rule_stats[rule]["total"], 3)
                   if rule_stats[rule]["total"] else None}
            for rule in list(V.RULES) + [V1_3.LEXICON_RULE]
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
        "recall-lexicon.json": V.sha256_file(RECALL_LEXICON_PATH),
        "report.json": V.sha256_file(out_report),
        "selection.jsonl": V.sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {k: report[k] for k in
              ("verdicts", "field_accuracy", "proper_name_recall_layer",
               "comparison_v1_3_to_v1_3r")}
    digest["acceptance_gates"] = {
        k: v for k, v in report["acceptance_gates"].items()
        if isinstance(v, bool)}
    digest["residual_l7a_outcome"] = {
        k: v for k, v in report["residual_l7a_outcome"].items() if k != "rows"}
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
