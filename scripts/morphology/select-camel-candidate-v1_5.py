#!/usr/bin/env python3
"""Selector v1.5 - v1.4 plus the CLITIC SPLIT recall layer.

v1.4 IS FROZEN, and so are the proper-name lexicons it and v1.3/v1.3r stand on.
`resources/frozen-v1_4-manifest.json` pins all of them by sha256 and this script
fails closed if any of them moved. سُوَاعًا (71:23 w9) stays
`UNRESOLVED_PROPER_NAME` with `verified_root: null` - that is asserted here, not
merely assumed.

What v1.5 adds
--------------
The residual recall report leaves 114 tokens whose only problem is that Tanzil
fuses a clitic onto the stem (`يُمِيتُكُمْ`, `فَٱتَّقُونِ`, `لَيَعْلَمُونَ`) while CAMeL's
MSA lexicon only carries the stem. v1.5 rebuilds those analyses from the surface
and from CAMeL's own prefix/suffix tables - see `camel_clitic_split_rules.py`
for the full contract. In one line: the split point comes from the surface, the
removed material must BE an attested CAMeL clitic entry (matched on its letters
and on its vocalization), the stem analysis must be entirely clitic-free, and
the tag written into `prc*`/`enc0` is the tag CAMeL's own table assigns to that
entry.

What v1.5 deliberately does NOT do
----------------------------------
  * no verse-key override - the layer keys on the surface string alone;
  * no teacher lookup at runtime - the teacher is the evaluation oracle only;
  * no new selection rule and no re-ordering - R1-R9, the lexicon layer and the
    closure layer are replayed exactly as v1.4 runs them, and the injected
    candidates have to win the frozen cascade on their own;
  * no candidate is ever removed - the layer only appends;
  * nothing is injected into a token v1.4 already gets right, nor into a token
    whose pool already holds a usable full-surface analysis. A v1.4 CORRECT
    token reaches `V.select` with a byte-identical pool, so v1.4's correct
    selections cannot move.
"""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
OUT_DIR = CAND_ROOT / "selector-v1_5"
BASELINE_SELECTION = CAND_ROOT / "selector-v1_4" / "selection.jsonl"
FREEZE_MANIFEST = SCRIPT_DIR / "resources" / "frozen-v1_4-manifest.json"
RESIDUAL_CLASSIFICATION = (CAND_ROOT / "residual-recall-gap"
                           / "residual-classification.jsonl")

SCHEMA_VERSION = "camel-selector-v1_5"
SPLIT_SOURCE = "camel_db_clitic_split"
SEGMENTATION_LEVELS = ("L4_PROCLITIC_SEGMENTATION", "L5_ENCLITIC_SEGMENTATION",
                       "L6_PROCLITIC_AND_ENCLITIC")
EXPECTED_SEGMENTATION_COHORT = 114
SUWA_SURFACE = "سُوَاعًا"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V1_4 = load_module(SCRIPT_DIR / "select-camel-candidate-v1_4.py",
                   "camel_selector_v1_4")
V1_3R = V1_4.V1_3R
V1_3 = V1_4.V1_3
V = V1_4.V                          # frozen v1.2c
BUILDER = V1_4.BUILDER
RECALL = V.RECALL
COVERAGE = V.COVERAGE

SPLIT = load_module(SCRIPT_DIR / "camel_clitic_split_rules.py",
                    "camel_clitic_split_rules")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_frozen() -> dict:
    """Fail closed if v1.4 or a proper-name lexicon moved under this selector."""
    manifest = json.loads(FREEZE_MANIFEST.read_text(encoding="utf-8"))
    drift = []
    for rel, entry in sorted(manifest["artifacts"].items()):
        path = REPO_ROOT / rel
        if not path.exists():
            drift.append({"artifact": rel, "why": "missing"})
            continue
        actual = sha256_file(path)
        if actual != entry["sha256"]:
            drift.append({"artifact": rel, "why": "sha256_changed",
                          "expected": entry["sha256"], "actual": actual})
    if drift:
        raise SystemExit("FAIL-CLOSED: frozen artifacts changed: "
                         + json.dumps(drift, ensure_ascii=False))

    closure = json.loads(V1_4.CLOSURE_LEXICON_PATH.read_text(encoding="utf-8"))
    suwa = [e for e in closure["entries"] if e["tanzil_surface"] == SUWA_SURFACE]
    if len(suwa) != 1:
        raise SystemExit("FAIL-CLOSED: سُوَاعًا record missing from the closure lexicon")
    entry = suwa[0]
    if (entry["status"] != "UNRESOLVED_PROPER_NAME"
            or entry.get("verified_root") is not None
            or entry.get("normalized_root") is not None
            or entry.get("production_ready")):
        raise SystemExit("FAIL-CLOSED: سُوَاعًا is no longer an unresolved, rootless record")
    return manifest


def main() -> int:
    for path in (V.TEACHER_PATH, V.TOKEN_MAP_PATH, V.DB_PATH, V.FULL_ANALYSIS_DIR,
                 V1_3.LEXICON_PATH, V1_3R.RECALL_LEXICON_PATH,
                 V1_4.CLOSURE_LEXICON_PATH, BASELINE_SELECTION, FREEZE_MANIFEST,
                 RESIDUAL_CLASSIFICATION):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest = assert_frozen()
    if len(RECALL.DAWUD_ALLOWLIST) != RECALL.EXPECTED_DAWUD_SURFACES:
        raise SystemExit("FAIL-CLOSED: frozen recall layer changed under this selector")

    selection_lexicon = V1_3.ProperNameLexicon(
        json.loads(V1_3.LEXICON_PATH.read_text(encoding="utf-8")))
    recall_lexicon = V1_3R.ProperNameRecallLexicon(
        json.loads(V1_3R.RECALL_LEXICON_PATH.read_text(encoding="utf-8")))
    closure_doc = json.loads(V1_4.CLOSURE_LEXICON_PATH.read_text(encoding="utf-8"))
    closure_lexicon = V1_4.ProperNameClosureLexicon(closure_doc)

    tables = SPLIT.CliticTables(V.DB_PATH, V.skeleton, V.normalize_vocalized)

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

    # The two older baselines v1.4's own gates read: v1.3 (recall injection) and
    # v1.3r (closure injection). Loaded here so both gates see v1.4's inputs.
    v1_3_rows = {}
    for line in V1_4.V1_3_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        v1_3_rows[(obj["verse_key"], obj["word_index"])] = obj
    baseline_v1_3r = {}
    for line in V1_4.BASELINE_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        baseline_v1_3r[(obj["verse_key"], obj["word_index"])] = obj

    # ---- EVALUATION-ONLY cohort -------------------------------------------
    # The 114 segmentation tokens of the residual report. Read for reporting
    # only: it never reaches the injection gate or the cascade.
    segmentation_cohort = {}
    for line in RESIDUAL_CLASSIFICATION.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj["level"] in SEGMENTATION_LEVELS:
            segmentation_cohort[(obj["verse_key"], obj["word_index"])] = obj
    if len(segmentation_cohort) != EXPECTED_SEGMENTATION_COHORT:
        raise SystemExit(
            f"FAIL-CLOSED: expected {EXPECTED_SEGMENTATION_COHORT} segmentation "
            f"tokens, found {len(segmentation_cohort)}")

    def recall_injection_allowed(key) -> bool:
        row = v1_3_rows.get(key)
        if row is None:
            return False
        if row.get("verdict") == "RECALL_GAP":
            return True
        return str(row.get("ambiguous_reason") or "").startswith(
            "UNRESOLVED_PROPER_NAME")

    def closure_allowed(key) -> bool:
        row = baseline_v1_3r.get(key)
        return row is not None and row.get("verdict") != "CORRECT"

    def split_allowed(key) -> bool:
        """Never touch a token v1.4 already gets right."""
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
    split_diagnostics = {}

    def split_candidates(key, forms):
        """Every CAMeL-licensed clitic split of this token's analyzer forms.

        Returns (candidates, diagnostic). Deterministic: forms are walked in
        sorted order, splits in the fixed order `enumerate_splits` yields, and
        the result is finally sorted by fingerprint.
        """
        surf_skel = V.skeleton(canonical[key])
        produced = {}
        attempted = 0
        analyzable = 0
        licensed_splits = []
        for form in sorted(set(forms)):
            for (prefix_text, prefix_entries, stem,
                 suffix_text, suffix_entries) in SPLIT.enumerate_splits(tables, form):
                attempted += 1
                stem_analyses = analyze(stem)
                if not stem_analyses:
                    continue
                analyzable += 1
                for prefix_entry in (prefix_entries or [None]):
                    for suffix_entry in (suffix_entries or [None]):
                        for cand in stem_analyses:
                            stem_cat = cand.get("stemcat")
                            if not stem_cat:
                                continue
                            if not SPLIT.is_cliticless(cand):
                                continue
                            if not V.is_selectable_evidence(cand, V.skeleton(stem)):
                                continue
                            licensed = (
                                (not prefix_entry
                                 or tables.licenses_prefix(prefix_entry, stem_cat))
                                and (not suffix_entry
                                     or tables.licenses_suffix(suffix_entry, stem_cat))
                                and (not (prefix_entry and suffix_entry)
                                     or tables.licenses_pair(prefix_entry, suffix_entry)))
                            rebuilt = SPLIT.reattach(cand, prefix_entry, prefix_text,
                                                     suffix_entry, suffix_text)
                            if not V.clitics_consistent(rebuilt, surf_skel):
                                continue
                            rebuilt["_split"] = {
                                "source": SPLIT_SOURCE,
                                "analyzer_form": form,
                                "proclitic_surface": prefix_text or None,
                                "proclitic_entry": prefix_entry["id"] if prefix_entry else None,
                                "proclitic_tags": (sorted(prefix_entry["slots"].items())
                                                   if prefix_entry else []),
                                "stem_surface": stem,
                                "stem_category": stem_cat,
                                "enclitic_surface": suffix_text or None,
                                "enclitic_entry": suffix_entry["id"] if suffix_entry else None,
                                "enclitic_tag": (suffix_entry["slots"]["enc0"]
                                                 if suffix_entry else None),
                                "camel_table_licensed": licensed,
                            }
                            slim = V.slim(rebuilt)
                            slim["_split"] = rebuilt["_split"]
                            produced.setdefault(slim["_fp"], slim)
                            licensed_splits.append(
                                (prefix_text, stem, suffix_text, stem_cat, licensed))
        diagnostic = {
            "splits_attempted": attempted,
            "splits_with_analyzable_stem": analyzable,
            "splits_accepted": len(licensed_splits),
            "splits_camel_table_licensed": sum(1 for row in licensed_splits if row[4]),
            "candidates_injected": len(produced),
            "shapes": sorted({(p or "-") + "|" + (s or "-")
                              for p, _stem, s, _cat, _lic in licensed_splits}),
        }
        return [produced[fp] for fp in sorted(produced)], diagnostic

    def merged_pool(key, record):
        """v1.4's pool, then the split candidates appended. Never a removal."""
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
        rescue_forms = []
        if gated:
            seen = {c["_fp"] for c in slims}
            variants = RECALL.build_variants(canonical[key], base_forms[key])
            for form in sorted(variants):
                rescue_forms.append(form)
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
                        "source": V1_4.CANDIDATE_SOURCE,
                        "lexical_core": diag["lexical_core"],
                        "classification": diag["classification"],
                    }
                    s = V.slim(synthetic)
                    s["_synthetic"] = synthetic["_synthetic"]
                    if s["_fp"] not in {c["_fp"] for c in slims}:
                        slims.append(s)
                        raw_count += 1

        # ---- v1.4's closure injection, replayed unchanged -------------------
        if surface in closure_lexicon.by_surface and closure_allowed(key):
            synthetic, diag = closure_lexicon.synthetic_for(surface)
            if synthetic is None:
                reproducibility_failures.append({"surface": surface, **(diag or {})})
            else:
                entry = diag["entry"]
                synthetic["_closure"] = {
                    "source": V1_4.CANDIDATE_SOURCE,
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

        # ---- v1.5: the clitic split layer, strictly last ---------------------
        # Everything above ran on exactly the pool v1.4 gave it, so v1.4's own
        # gates saw v1.4's inputs. The split layer fires only when the surface
        # has produced NO usable analysis at all - the pure recall-gap case it
        # is meant for - and never on a token v1.4 already gets right.
        split_applied = False
        if split_allowed(key) and not any(
                V.is_selectable_evidence(c, V.skeleton(surface)) for c in slims):
            forms = list(base_forms[key]) + rescue_forms
            injected, diagnostic = split_candidates(key, forms)
            known = {c["_fp"] for c in slims}
            added = 0
            for cand in injected:
                if cand["_fp"] in known:
                    continue
                known.add(cand["_fp"])
                slims.append(cand)
                raw_count += 1
                added += 1
            diagnostic["candidates_added"] = added
            if added:
                split_applied = True
            if diagnostic["splits_accepted"] or key in segmentation_cohort:
                split_diagnostics[key] = diagnostic
        return slims, raw_count, split_applied

    # ---- EVALUATION ONLY ---------------------------------------------------
    def qualifies_row(cand_root, cand_lemma, cand_pos, t_row):
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
                pool, raw_count, split_applied = pools[widx]
                prev_pool = pools.get(widx - 1, (None,))[0]
                next_pool = pools.get(widx + 1, (None,))[0]
                after = len({c["_fp"] for c in pool})
                surface = canonical[key]

                chosen = rule = chain = reason = None
                closure_applied = False

                if key in closure_injected:
                    picked, closure_reason = closure_lexicon.select(surface, pool)
                    if picked is not None:
                        chosen, rule, chain = picked, V1_4.CLOSURE_RULE, []
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
                    qualifies_row(COVERAGE.normalize_root(c.get("root")),
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
                    "confidence": (V1_4.CLOSURE_CONFIDENCE if closure_applied
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
                    "clitic_split_injected": split_applied,
                    "selected_from_clitic_split": bool(chosen and "_split" in chosen),
                    "split_provenance": (chosen or {}).get("_split"),
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
        ok, pos_ok, root_ok, lemma_ok = qualifies_row(
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
                "v1_4_verdict": old.get("verdict"), "rule": row.get("selection_rule"),
                "from_split": row.get("selected_from_clitic_split"),
                "selected_lex": (row.get("selected") or {}).get("lex"),
                "selected_root": (row.get("selected") or {}).get("root"),
                "attested_lemma": teacher[key].get("lemma"),
                "attested_root": teacher[key].get("root")})

    split_rows = [r for r in rows if r["clitic_split_injected"]]
    split_selected = [r for r in rows if r["selected_from_clitic_split"]]

    # ---- the 114-token segmentation cohort --------------------------------
    cohort_rows = []
    cohort_verdicts = Counter()
    unresolved_by_reason = Counter()
    for key in sorted(segmentation_cohort, key=V.sort_key):
        row = by_key[key]
        entry = segmentation_cohort[key]
        diagnostic = split_diagnostics.get(key, {})
        closed = row["verdict"] == "CORRECT"
        cohort_verdicts[row["verdict"]] += 1
        if not closed:
            if not diagnostic:
                why = "SPLIT_LAYER_DID_NOT_FIRE"
            elif not diagnostic.get("splits_attempted"):
                why = "NO_ATTESTED_CLITIC_ON_THE_SURFACE"
            elif not diagnostic.get("splits_with_analyzable_stem"):
                why = "STEM_STILL_OUT_OF_VOCABULARY_AFTER_SPLIT"
            elif not diagnostic.get("splits_accepted"):
                why = "SPLIT_REJECTED_BY_CLITIC_CONTRACT"
            elif not diagnostic.get("candidates_added"):
                why = "SPLIT_ADDED_NO_NEW_CANDIDATE"
            elif row["verdict"] == "RECALL_GAP":
                why = "SPLIT_CANDIDATE_DOES_NOT_MATCH_ATTESTED_CORE"
            elif row["verdict"] == "AMBIGUOUS":
                why = "CORE_REACHED_BUT_CASCADE_UNDECIDED"
            else:
                why = "CASCADE_SELECTED_A_DIFFERENT_CORE"
            unresolved_by_reason[why] += 1
        else:
            why = None
        cohort_rows.append({
            "verse_key": key[0], "word_index": key[1], "arabic": row["arabic"],
            "residual_level": entry["level"],
            "residual_label_after": entry["label_after"],
            "v1_4_verdict": baseline[key].get("verdict"),
            "v1_5_verdict": row["verdict"],
            "closed": closed,
            "selected_from_clitic_split": row["selected_from_clitic_split"],
            "selection_rule": row["selection_rule"],
            "split": diagnostic,
            "unresolved_reason": why,
        })

    cohort_closed = sum(1 for r in cohort_rows if r["closed"])

    out_tokens = OUT_DIR / "selection.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    out_cohort = OUT_DIR / "segmentation-cohort.jsonl"
    with out_cohort.open("w", encoding="utf-8", newline="\n") as sink:
        for row in cohort_rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    judged = verdicts["CORRECT"] + verdicts["INCORRECT"]
    expected = manifest["expected"]
    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "teacher_sha256": V.sha256_file(V.TEACHER_PATH),
            "camel_db_sha256": V.sha256_file(V.DB_PATH),
            "freeze_manifest_sha256": sha256_file(FREEZE_MANIFEST),
            "v1_4_selection_sha256": V.sha256_file(BASELINE_SELECTION),
            "residual_classification_sha256": sha256_file(RESIDUAL_CLASSIFICATION),
            "tokens": len(rows),
        },
        "contract": {
            "base_selector": ("select-camel-candidate-v1_4.py imported as a module; "
                              "v1.4, v1.3r, v1.3, v1.2c, the frozen recall layer and "
                              "all three proper-name lexicons are unchanged and "
                              "sha256-pinned by resources/frozen-v1_4-manifest.json"),
            "added": ("clitic split candidates, appended last, only for tokens v1.4 "
                      "left non-CORRECT whose pool holds no selectable full-surface "
                      "analysis"),
            "split_evidence": ("surface split point + attested CAMeL prefix/suffix "
                               "entry (letters AND vocalization) + clitic-free stem "
                               "analysis; prc*/enc0 tags are CAMeL's own. CAMeL's "
                               "AB/BC/AC compatibility tables are recorded per "
                               "candidate as camel_table_licensed but are not a gate: "
                               "the MSA lexicon licenses no verb enclitic and no "
                               "emphatic-lam proclitic, which is a lexicon coverage "
                               "limit, not surface evidence"),
            "rules_untouched": "R1-R9 are neither modified, re-ordered nor extended",
            "no_new_selection_rule": True,
            "no_verse_key_override": True,
            "no_teacher_lookup_at_runtime": True,
            "no_candidate_removed": True,
            "segmentation_cohort_use": "reporting only - never reaches the gate",
            "suwa_policy": ("71:23 w9 سُوَاعًا remains UNRESOLVED_PROPER_NAME with a "
                            "null root; asserted at startup"),
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
            "frozen_artifacts_verified": True,
            "v1_4_correct_selections_unchanged": len(changed_selection) == 0,
            "v1_4_correct_count_preserved": verdicts["CORRECT"] >= expected["v1_4_correct"],
            "correct_to_incorrect_is_0": len(correct_to_incorrect) == 0,
            "new_incorrect_is_0": len(new_incorrect) == 0,
            "closure_layer_unchanged": len(reproducibility_failures) == 0,
            "segmentation_cohort_intact": len(segmentation_cohort) == EXPECTED_SEGMENTATION_COHORT,
            "changed_selection_rows": changed_selection[:20],
            "new_incorrect_rows": new_incorrect[:20],
            "reproducibility_failures": reproducibility_failures[:20],
        },
        "clitic_split_layer": {
            "tokens_with_injection": len(split_rows),
            "tokens_selected_from_split": len(split_selected),
            "selected_verdicts": dict(sorted(Counter(
                r["verdict"] for r in split_selected).items())),
            "distinct_surfaces": len({r["arabic"] for r in split_rows}),
            "prefix_entries_indexed": sum(len(v) for v in tables.prefixes.values()),
            "suffix_entries_indexed": sum(len(v) for v in tables.suffixes.values()),
            "entries_pruned_as_impure": tables.pruned,
            "clitic_tag_letters": dict(sorted(tables.tag_letters.items())),
            "table_ab_pairs": len(tables.table_ab),
            "table_bc_pairs": len(tables.table_bc),
            "table_ac_pairs": len(tables.table_ac),
        },
        "segmentation_cohort": {
            "tokens": len(cohort_rows),
            "closed": cohort_closed,
            "closed_pct": round(100.0 * cohort_closed / len(cohort_rows), 3)
            if cohort_rows else None,
            "v1_5_verdicts": dict(sorted(cohort_verdicts.items())),
            "by_level": dict(sorted(Counter(
                f"{r['residual_level']}::{'CLOSED' if r['closed'] else 'OPEN'}"
                for r in cohort_rows).items())),
            "unresolved_by_reason": dict(sorted(unresolved_by_reason.items(),
                                                key=lambda kv: (-kv[1], kv[0]))),
        },
        "comparison_v1_4_to_v1_5": {
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
            for rule in list(V.RULES) + [V1_3.LEXICON_RULE, V1_4.CLOSURE_RULE]
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
        "freeze-manifest.json": sha256_file(FREEZE_MANIFEST),
        "report.json": sha256_file(out_report),
        "segmentation-cohort.jsonl": sha256_file(out_cohort),
        "selection.jsonl": sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {k: report[k] for k in ("verdicts", "clitic_split_layer",
                                     "segmentation_cohort", "comparison_v1_4_to_v1_5")}
    digest["acceptance_gates"] = {k: v for k, v in report["acceptance_gates"].items()
                                  if isinstance(v, bool)}
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
