#!/usr/bin/env python3
"""POS-ontology audit of selector v1.1's 3,646 INCORRECT rows. Read-only.

This run changes NO selector rule and NO candidate selection. It reads the
persisted v1.1 selection and the teacher, and answers one question per incorrect
token: is this a real lexical selection error, or a label-boundary difference
between the QAC coarse POS inventory (N/V/P) and the CAMeL fine POS tagset?

It then proposes an explicit POS_COMPATIBILITY_MAP that is used ONLY to score the
teacher comparison. The map is never an input to the selector and never a
selection rule.

Nothing is written to the production DB.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
SELECTION_PATH = CAND_ROOT / "selector-v1_1" / "selection.jsonl"
SELECTOR_REPORT = CAND_ROOT / "selector-v1_1" / "report.json"
OUT_DIR = CAND_ROOT / "pos-ontology-audit-v1_1"

SCHEMA_VERSION = "pos-ontology-audit-v1_1"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


COVERAGE = load_module(SCRIPT_DIR / "analyze-teacher-camel-coverage.py",
                       "coverage_analysis")
sha256_file = COVERAGE.sha256_file


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


# ==========================================================================
# POS_COMPATIBILITY_MAP - EVALUATION ONLY
# ==========================================================================
# Each entry says: "when the teacher's coarse tag is A and CAMeL's fine tag is B
# (under `condition`), the two ontologies are describing the same analysis and
# the POS difference must not be scored as a selection error."
#
# `condition` values:
#   teacher_morphology_has_PRON - the QAC word is <particle + attached pronoun>.
#       QAC assigns the word's coarse POS from the PRONOUN head, CAMeL from the
#       PREPOSITION/PARTICLE head. Both agree on the segmentation; only the
#       head-selection convention differs.
#   lemma_matches - accepted only when the normalized lemma is identical, so the
#       equivalence can never paper over a different lexical item.
POS_COMPATIBILITY_MAP = {
    ("N", "prep"): {
        "condition": "teacher_morphology_has_PRON",
        "justification": ("QAC takes the attached pronoun as the word head (PREF:P + "
                          "PRON -> N); CAMeL takes the preposition as head. Same "
                          "segmentation, different head convention."),
    },
    ("N", "part"): {
        "condition": "teacher_morphology_has_PRON",
        "justification": ("Same head convention as (N, prep), for the إِيَّا + pronoun "
                          "family."),
    },
    ("V", "part_neg"): {
        "condition": "lemma_matches",
        "justification": ("لَيْسَ: QAC analyses it as a defective verb of the كَان family, "
                          "the MSA tagset treats it as a negation particle. Identical "
                          "lemma, two traditions."),
    },
}

# Pairs reviewed by hand in this audit. Anything else is reported as an
# unreviewed tail rather than silently judged.
PAIR_DECISIONS = {
    ("N", "prep"): "ESDEGER",
    ("P", "abbrev"): "FALLBACK_ARTEFAKTI",
    ("P", "noun"): "GERCEK_CATISMA",
    ("V", "noun"): "BAGLAMA_BAGLI",
    ("P", "verb"): "GERCEK_CATISMA",
    ("N", "verb"): "GERCEK_CATISMA",
    ("V", "verb"): "GERCEK_CATISMA",
    ("N", "noun"): "GERCEK_CATISMA",
    ("N", "noun_prop"): "FALLBACK_ARTEFAKTI",
    ("N", "foreign"): "FALLBACK_ARTEFAKTI",
    ("V", "part_neg"): "ESDEGER",
    ("P", "noun_prop"): "GERCEK_CATISMA",
    ("V", "adj_comp"): "BAGLAMA_BAGLI",
    ("V", "noun_prop"): "FALLBACK_ARTEFAKTI",
    ("N", "adj"): "GERCEK_CATISMA",
    ("V", "adj"): "BAGLAMA_BAGLI",
    ("V", "foreign"): "FALLBACK_ARTEFAKTI",
    ("N", "part"): "ESDEGER",
}

ARTIFACT_POS = {"foreign", "abbrev"}
NO_INFO_ROOTS = {"FOREIGN", "NOAN"}


def is_artifact(selected, teacher_row) -> bool:
    """A candidate carrying no usable lexical evidence.

    `foreign` is CAMeL's non-Arabic-script fallback. `abbrev` is a real lexicon
    entry but for the letter-abbreviation reading (gloss "N.") - never the right
    analysis of a Quranic particle. A rootless `noun_prop` on a token the teacher
    does not consider a proper name is the same kind of empty agreement v1.1
    already refuses to build consensus on.
    """
    pos = selected.get("pos")
    if pos in ARTIFACT_POS:
        return True
    if str(selected.get("root") or "").strip() in NO_INFO_ROOTS:
        return True
    if (COVERAGE.normalize_root(selected.get("root")) is None
            and pos == "noun_prop" and teacher_row.get("role") != "PN"):
        return True
    return False


def pos_compatible(teacher_row, selected) -> bool:
    entry = POS_COMPATIBILITY_MAP.get((teacher_row.get("pos"), selected.get("pos")))
    if not entry:
        return False
    condition = entry["condition"]
    if condition == "teacher_morphology_has_PRON":
        return "PRON" in (teacher_row.get("morphology") or [])
    if condition == "lemma_matches":
        return (COVERAGE.normalize_lemma(teacher_row.get("lemma")) is not None
                and COVERAGE.normalize_lemma(teacher_row.get("lemma"))
                == COVERAGE.normalize_lemma(selected.get("lex")))
    raise SystemExit(f"unknown compatibility condition: {condition}")


def classify_row(teacher_row, selected):
    t_root = COVERAGE.normalize_root(teacher_row.get("root"))
    t_lemma = COVERAGE.normalize_lemma(teacher_row.get("lemma"))
    s_root = COVERAGE.normalize_root(selected.get("root"))
    s_lemma = COVERAGE.normalize_lemma(selected.get("lex"))

    root_applicable = t_root is not None
    lemma_applicable = t_lemma is not None
    root_ok = root_applicable and t_root == s_root
    lemma_ok = lemma_applicable and t_lemma == s_lemma
    core_ok = ((root_ok or not root_applicable)
               and (lemma_ok or not lemma_applicable))

    if is_artifact(selected, teacher_row):
        label = "FALLBACK_OR_ARTIFACT"
    elif core_ok:
        label = ("LEXICAL_CORE_CORRECT_POS_EQUIVALENT"
                 if pos_compatible(teacher_row, selected)
                 else "LEXICAL_CORE_CORRECT_POS_CONFLICT")
    elif root_ok and not lemma_ok:
        label = "ROOT_ONLY_CORRECT"
    elif lemma_ok and not root_ok:
        label = "LEMMA_ONLY_CORRECT"
    else:
        label = "LEXICAL_CORE_WRONG"

    return {
        "class": label,
        "root_applicable": root_applicable, "root_ok": root_ok,
        "lemma_applicable": lemma_applicable, "lemma_ok": lemma_ok,
        "core_ok": core_ok,
        "pos_compatible": pos_compatible(teacher_row, selected),
    }


def main() -> int:
    for path in (TEACHER_PATH, SELECTION_PATH):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    teacher = {}
    for line in TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    incorrect_rows = []
    judged = 0
    correct_baseline = 0
    ambiguous = 0
    recall_gap = 0
    core_correct_total = 0
    pos_correct_mapped_total = 0

    for line in SELECTION_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        verdict = obj.get("verdict")
        if verdict == "AMBIGUOUS":
            ambiguous += 1
            continue
        if verdict == "RECALL_GAP":
            recall_gap += 1
            continue
        judged += 1
        key = (obj["verse_key"], obj["word_index"])
        t_row = teacher[key]
        selected = obj["selected"]
        if verdict == "CORRECT":
            correct_baseline += 1
            core_correct_total += 1
            pos_correct_mapped_total += 1
            continue
        detail = classify_row(t_row, selected)
        core_correct_total += detail["core_ok"] and not is_artifact(selected, t_row)
        pos_correct_mapped_total += detail["pos_compatible"]
        incorrect_rows.append({
            "verse_key": obj["verse_key"], "word_index": obj["word_index"],
            "arabic": obj["arabic"], "selection_rule": obj.get("selection_rule"),
            "teacher_pos": t_row.get("pos"), "teacher_role": t_row.get("role"),
            "teacher_morphology": t_row.get("morphology"),
            "teacher_root": t_row.get("root"), "teacher_lemma": t_row.get("lemma"),
            "camel_pos": selected.get("pos"), "camel_root": selected.get("root"),
            "camel_lex": selected.get("lex"), "camel_diac": selected.get("diac"),
            "camel_features": {f: selected.get(f) for f in
                               ("cas", "mod", "vox", "asp", "per", "gen", "num", "stt")},
            **detail,
        })

    # ---- per (teacher_pos, camel_pos) pair --------------------------------
    pairs = defaultdict(list)
    for row in incorrect_rows:
        pairs[(row["teacher_pos"], row["camel_pos"])].append(row)

    pair_table = {}
    for pair, rows in sorted(pairs.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        n = len(rows)
        root_app = sum(r["root_applicable"] for r in rows)
        lemma_app = sum(r["lemma_applicable"] for r in rows)
        pair_table[f"{pair[0]}->{pair[1]}"] = {
            "tokens": n,
            "distinct_teacher_lemmas": len({r["teacher_lemma"] for r in rows}),
            "distinct_teacher_roots": len({r["teacher_root"] for r in rows}),
            "distinct_camel_lemmas": len({r["camel_lex"] for r in rows}),
            "distinct_camel_roots": len({r["camel_root"] for r in rows}),
            "root_agreement_pct": round(100.0 * sum(r["root_ok"] for r in rows) / root_app, 2)
            if root_app else None,
            "root_applicable": root_app,
            "lemma_agreement_pct": round(100.0 * sum(r["lemma_ok"] for r in rows) / lemma_app, 2)
            if lemma_app else None,
            "lemma_applicable": lemma_app,
            "classes": dict(sorted(Counter(r["class"] for r in rows).items())),
            "qac_roles": dict(sorted(Counter(r["teacher_role"] for r in rows).items(),
                                     key=lambda kv: (-kv[1], kv[0]))[:5]),
            "qac_segment_tags_top": dict(sorted(
                Counter(tag for r in rows for tag in (r["teacher_morphology"] or [])).items(),
                key=lambda kv: (-kv[1], kv[0]))[:8]),
            "camel_features_top": dict(sorted(
                Counter(f"cas={r['camel_features']['cas']},stt={r['camel_features']['stt']}"
                        for r in rows).items(), key=lambda kv: (-kv[1], kv[0]))[:4]),
            "decision": PAIR_DECISIONS.get(pair, "UNREVIEWED_TAIL"),
            "examples": [
                {k: r[k] for k in ("verse_key", "word_index", "arabic", "teacher_root",
                                   "teacher_lemma", "teacher_role", "teacher_morphology",
                                   "camel_root", "camel_lex", "camel_diac", "class")}
                for r in sorted(rows, key=lambda r: sort_key(
                    (r["verse_key"], r["word_index"])))[:4]
            ],
        }

    class_counts = Counter(r["class"] for r in incorrect_rows)
    pos_ontology_only = class_counts["LEXICAL_CORE_CORRECT_POS_EQUIVALENT"]
    real_lexical_errors = (class_counts["ROOT_ONLY_CORRECT"]
                           + class_counts["LEMMA_ONLY_CORRECT"]
                           + class_counts["LEXICAL_CORE_WRONG"]
                           + class_counts["FALLBACK_OR_ARTIFACT"])

    # ---- abbrev evidence question -----------------------------------------
    abbrev_rows = [r for r in incorrect_rows if r["camel_pos"] == "abbrev"]
    abbrev_finding = {
        "tokens": len(abbrev_rows),
        "distinct_surfaces": len({r["arabic"] for r in abbrev_rows}),
        "surfaces": dict(sorted(Counter(r["arabic"] for r in abbrev_rows).items(),
                                key=lambda kv: (-kv[1], kv[0]))[:8]),
        "camel_lexicon_status": (
            "real lexicon entry, not a synthesized fallback: source='spvar', "
            "bw='<lex>/ABBREV', root='NTWS', gloss='N.' - i.e. the Latin letter "
            "abbreviation reading"),
        "verdict": ("ARTEFAKT - lexically real but semantically inapplicable to a "
                    "Quranic particle; it must never outrank a genuine particle "
                    "analysis"),
        "teacher_pos_distribution": dict(sorted(
            Counter(r["teacher_pos"] for r in abbrev_rows).items())),
    }

    # ---- R8 question -------------------------------------------------------
    selector_report = json.loads(SELECTOR_REPORT.read_text(encoding="utf-8"))
    r8 = selector_report["rule_coverage_and_accuracy"]["R8_NEXT_TOKEN_GENITIVE_CONSTRUCT"]
    r8_finding = {
        "selected_tokens": r8["selected_tokens"],
        "correct": r8["correct"],
        "accuracy_pct": r8["accuracy_pct"],
        "corpus_accuracy_on_judged": selector_report["verdicts"]["accuracy_on_judged"],
        "recommendation": (
            "DEMOTE to diagnostic-only. Its accuracy (58.8%) is far below the "
            "selector's own judged accuracy (89.1%) and below every other selecting "
            "rule, so on the tokens it claims it is worse than leaving them to R9 or "
            "to AMBIGUOUS. Its coverage is 17 tokens, so demoting it can move at most "
            "17 tokens (-10 correct, -7 incorrect) - statistically negligible, while "
            "removing a rule that is measurably anti-informative."),
        "note": ("Not applied in this run: no selector rule was changed here."),
    }

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "selection_sha256": sha256_file(SELECTION_PATH),
            "teacher_sha256": sha256_file(TEACHER_PATH),
            "selector_report_sha256": sha256_file(SELECTOR_REPORT),
        },
        "scope": {
            "selector_rules_changed": "none - audit only",
            "candidate_selection_changed": "none",
            "map_role": "evaluation scoring only; never a selector input or rule",
            "production_db_writes": "none",
        },
        "incorrect_rows_audited": len(incorrect_rows),
        "class_breakdown": dict(sorted(class_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "split": {
            "pos_ontology_difference_only": pos_ontology_only,
            "real_root_or_lemma_selection_errors": real_lexical_errors,
            "lexical_core_correct_but_pos_genuinely_conflicting":
                class_counts["LEXICAL_CORE_CORRECT_POS_CONFLICT"],
        },
        "pair_table": pair_table,
        "pos_compatibility_map": {
            f"{k[0]}->{k[1]}": v for k, v in POS_COMPATIBILITY_MAP.items()
        },
        "scores_after_compatibility_map": {
            "note": ("Selection is unchanged; only scoring changes. AMBIGUOUS and "
                     "RECALL_GAP are unaffected because the map is applied to the "
                     "candidate that was actually selected."),
            "correct": correct_baseline + pos_ontology_only,
            "incorrect": len(incorrect_rows) - pos_ontology_only,
            "ambiguous": ambiguous,
            "recall_gap": recall_gap,
            "accuracy_on_judged_pct": round(
                100.0 * (correct_baseline + pos_ontology_only) / judged, 3) if judged else None,
            "baseline_correct": correct_baseline,
            "baseline_incorrect": len(incorrect_rows),
            "baseline_accuracy_on_judged_pct": round(
                100.0 * correct_baseline / judged, 3) if judged else None,
        },
        "lexical_core_accuracy_root_plus_lemma": {
            "judged_tokens": judged,
            "core_correct": core_correct_total,
            "pct": round(100.0 * core_correct_total / judged, 3) if judged else None,
            "definition": ("root and lemma both agree with the teacher wherever the "
                           "teacher supplies them, and the candidate is not a "
                           "fallback/artifact; POS ignored"),
        },
        "canonical_pos_accuracy_with_map": {
            "judged_tokens": judged,
            "pos_correct": pos_correct_mapped_total,
            "pct": round(100.0 * pos_correct_mapped_total / judged, 3) if judged else None,
        },
        "abbrev_finding": abbrev_finding,
        "r8_finding": r8_finding,
    }

    out_rows = OUT_DIR / "incorrect-audit.jsonl"
    with out_rows.open("w", encoding="utf-8", newline="\n") as sink:
        for row in sorted(incorrect_rows,
                          key=lambda r: sort_key((r["verse_key"], r["word_index"]))):
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "report.json": sha256_file(out_report),
        "incorrect-audit.jsonl": sha256_file(out_rows),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    digest = {k: report[k] for k in
              ("incorrect_rows_audited", "class_breakdown", "split",
               "scores_after_compatibility_map", "lexical_core_accuracy_root_plus_lemma",
               "canonical_pos_accuracy_with_map", "abbrev_finding", "r8_finding")}
    digest["pair_table_top"] = {
        k: {kk: vv for kk, vv in v.items() if kk != "examples"}
        for k, v in list(pair_table.items())[:8]
    }
    digest["checksums"] = checksums
    print(json.dumps(digest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
