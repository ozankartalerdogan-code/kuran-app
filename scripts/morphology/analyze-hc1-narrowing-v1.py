#!/usr/bin/env python3
"""HC1 narrowing and composition: measure HC1a and HC1_PLUS_O4.

HC1 as proposed reaches the correct LEMMA on 20 of the 42 HAMZA_CARRIER tokens
and, on 9 more, only a root-matching but lemma-wrong candidate (جاؤو analyses as
the adjective جَائِي, not the verb جَاء). Two candidates are measured here:

  HC1a          the same carrier substitution, but only where the waw that
                follows the hamza is itself followed by real affix material.
                Word-final waw - with or without an otiose alef after it - does
                not fire. The condition is codepoint neighbourhood only.

  HC1_PLUS_O4   inside the HC1 context and nowhere else, the carrier
                substitution and the otiose-alef restoration are issued as ONE
                edit script. O4X is not revived as a standalone rule: it has no
                independent trigger here and cannot fire without the carrier
                edit in the same script.

Both rules emit explicit edit scripts with source offsets and are inverted back
to their input before any variant is used.

Success is counted only as exact lemma AND root AND POS agreement with the
teacher. Root-only agreement is not success. The teacher is read for scoring
only; neither rule consults it, and neither carries a surface list or a verse
key.

No dump is regenerated, the selector is not run, and nothing is written to the
CAMeL DB or the production DB.
"""

from __future__ import annotations

import argparse
import collections
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
RESIDUAL = CAND_ROOT / "orthographic-residual-v1" / "classification.jsonl"
BASE_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
V1_7_SELECTION = CAND_ROOT / "selector-v1_7" / "selection.jsonl"
FREEZE = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"
OUT_DIR = CAND_ROOT / "hc1-narrowing-v1"

SCHEMA_VERSION = "hc1-narrowing-v1"
BUCKET = "HAMZA_CARRIER"
EXPECTED_SCOPE_TOKENS = 42

BARE = "ء"          # U+0621
WAW_HAMZA = "ؤ"     # U+0624
ALEF = "ا"          # U+0627
ALEF_MADDA = "آ"    # U+0622
WASLA = "ٱ"         # U+0671
WAW = "و"           # U+0648
ROUNDED_ZERO = "۟"  # U+06DF
LONG_ALEF = {ALEF, ALEF_MADDA, WASLA}
SHORT_VOWELS = set("ًٌٍَُِّ")
CARRIERS = set("ءأإؤئآ")
MARK_RE = re.compile("[ً-ْٰـٓ-ٕۖ-ۭ]")
_LEMMA_TAIL = re.compile(r"-.?$")

POS_MAP = {
    "N": {"noun", "noun_prop", "noun_num", "noun_quant", "adj", "adj_comp", "adj_num"},
    "V": {"verb"},
    "P": {"part", "part_neg", "part_interrog", "part_restrict", "part_verb",
          "part_focus", "part_fut", "part_det", "part_voc", "part_connect",
          "part_dem", "part_rc", "part_empahsis", "prep", "conj", "conj_sub",
          "pron", "pron_rel", "pron_dem", "pron_exclam", "pron_interrog",
          "interj", "verb_pseudo", "adv_rel"},
}


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_nr")
COVERAGE = V.COVERAGE
RECALL = V.RECALL
import orthographic_production_rules as ORTHO  # noqa: E402
import hamza_madda_rescue_rules as HAMZA  # noqa: E402


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_mark(ch):
    return bool(MARK_RE.match(ch))


def prev_letter(text, index):
    cursor, marks = index - 1, set()
    while cursor >= 0 and is_mark(text[cursor]):
        marks.add(text[cursor])
        cursor -= 1
    return (text[cursor] if cursor >= 0 else None), marks


def next_letter_index(text, index):
    cursor = index + 1
    while cursor < len(text) and is_mark(text[cursor]):
        cursor += 1
    return cursor if cursor < len(text) else None


def codepoints(text):
    return " ".join(f"U+{ord(ch):04X}" for ch in text) if text else "(none)"


# --------------------------------------------------------------------------
# The two candidates. Both return edit scripts in input coordinates.
# --------------------------------------------------------------------------
def _hc1_sites(text):
    """Positions where HC1's precondition holds: bare hamza, preceded by an
    unvowelled alef, followed by a waw. Returns (hamza_index, waw_index)."""
    sites = []
    for index, ch in enumerate(text):
        if ch != BARE:
            continue
        previous, marks = prev_letter(text, index)
        if previous not in LONG_ALEF or (marks & SHORT_VOWELS):
            continue
        waw_index = next_letter_index(text, index)
        if waw_index is None or text[waw_index] != WAW:
            continue
        sites.append((index, waw_index))
    return sites


def _after_waw(text, waw_index):
    """(next_letter_index, classification) for what follows the plural waw."""
    nxt = next_letter_index(text, waw_index)
    if nxt is None:
        return None, "WORD_FINAL"
    if text[nxt] == ALEF:
        after_alef = next_letter_index(text, nxt)
        if after_alef is None:
            return nxt, "OTIOSE_ALEF_ONLY"
        if text[after_alef] == ROUNDED_ZERO:
            return nxt, "OTIOSE_ALEF_ONLY"
        return nxt, "REAL_AFFIX"
    return nxt, "REAL_AFFIX"


def rule_hc1a(text):
    """Carrier substitution only where real affix material follows the waw."""
    edits = []
    for hamza_index, waw_index in _hc1_sites(text):
        _, kind = _after_waw(text, waw_index)
        if kind != "REAL_AFFIX":
            continue
        edits.append({"offset": hamza_index, "delete": BARE, "insert": WAW_HAMZA,
                      "role": "HAMZA_CARRIER"})
    return edits


def rule_hc1_plus_o4(text):
    """One script: the carrier substitution AND the otiose alef, together.

    The alef edit has no trigger of its own - it is emitted only alongside a
    carrier edit produced by the very same HC1 site, so O4X is not resurrected
    as an independent rule."""
    edits = []
    for hamza_index, waw_index in _hc1_sites(text):
        _, kind = _after_waw(text, waw_index)
        if kind != "WORD_FINAL":
            continue
        insert_at = waw_index + 1
        while insert_at < len(text) and is_mark(text[insert_at]):
            insert_at += 1
        edits.append({"offset": hamza_index, "delete": BARE, "insert": WAW_HAMZA,
                      "role": "HAMZA_CARRIER"})
        edits.append({"offset": insert_at, "delete": "", "insert": ALEF,
                      "role": "OTIOSE_ALEF", "bound_to_carrier_at": hamza_index})
    return sorted(edits, key=lambda e: e["offset"])


RULES = {"HC1a": rule_hc1a, "HC1_PLUS_O4": rule_hc1_plus_o4}
RULE_DOC = {
    "HC1a": ("U+0621 -> U+0624 when the preceding letter is U+0627/U+0622/U+0671 "
             "with no short vowel, the following letter is U+0648, and that waw is "
             "followed by a letter that is not merely a word-final otiose alef."),
    "HC1_PLUS_O4": ("in the same HC1 site, when the waw IS word-final: U+0621 -> "
                    "U+0624 and U+0627 inserted after the waw, as one script. The "
                    "alef edit carries `bound_to_carrier_at` and cannot be emitted "
                    "on its own."),
}


def apply_edits(text, edits):
    out, cursor = [], 0
    for edit in edits:
        out.append(text[cursor:edit["offset"]])
        if text[edit["offset"]:edit["offset"] + len(edit["delete"])] != edit["delete"]:
            raise ValueError("edit does not match its input")
        out.append(edit["insert"])
        cursor = edit["offset"] + len(edit["delete"])
    out.append(text[cursor:])
    return "".join(out)


def invert(result, edits):
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


def derive(text, rule_id):
    edits = RULES[rule_id](text)
    if not edits:
        return None, []
    variant = apply_edits(text, edits)
    if variant == text:
        return None, []
    if invert(variant, edits) != text:
        raise SystemExit(f"{rule_id} is not reverse-verifiable on {text!r}")
    for edit in edits:
        if edit["role"] == "HAMZA_CARRIER" and not (
                edit["delete"] in CARRIERS and edit["insert"] in CARRIERS):
            raise SystemExit(f"{rule_id} carrier edit left the carrier set")
        if edit["role"] == "OTIOSE_ALEF" and "bound_to_carrier_at" not in edit:
            raise SystemExit(f"{rule_id} emitted an unbound alef edit")
    return variant, edits


def camel_lemma_key(lex):
    return COVERAGE.normalize_lemma(_LEMMA_TAIL.sub("", lex)) if lex else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    manifest = json.loads(FREEZE.read_text(encoding="utf-8"))
    drift = [rel for rel, meta in manifest["artifacts"].items()
             if not (REPO_ROOT / rel).exists()
             or sha256_file(REPO_ROOT / rel) != meta["sha256"]]
    if drift:
        raise SystemExit("frozen chain drifted: " + ", ".join(drift[:5]))

    scope = [json.loads(l) for l in RESIDUAL.open(encoding="utf-8")]
    scope = [r for r in scope if r["bucket"] == BUCKET]
    if len(scope) != EXPECTED_SCOPE_TOKENS:
        raise SystemExit(f"scope moved: {len(scope)} != {EXPECTED_SCOPE_TOKENS}")
    keys = {(r["verse_key"], r["word_index"]) for r in scope}

    canonical, base_forms = {}, {}
    for line in V.TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        canonical[(obj["verse_key"], obj["word_index"])] = obj["canonical_text"]
        base_forms[(obj["verse_key"], obj["word_index"])] = list(obj["analysis_forms"])
    teacher = {}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj
    selection = {}
    for line in V1_7_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        selection[(obj["verse_key"], obj["word_index"])] = obj

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB
    analyzer = Analyzer(MorphologyDB(str(BASE_DB), flags="a"))
    cache = {}

    def analyze(form):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def pipeline_forms(key):
        forms = list(base_forms[key])
        forms += sorted(RECALL.build_variants(canonical[key], base_forms[key]))
        forms += [i["analyzer_form"] for i in
                  ORTHO.extra_forms(base_forms[key], hamza_pass=HAMZA.apply_rules)]
        return list(dict.fromkeys(forms))

    def exact_match(candidate, teacher_row):
        t_lemma = COVERAGE.normalize_lemma(teacher_row.get("lemma"))
        t_root = COVERAGE.normalize_root(teacher_row.get("root"))
        t_pos = teacher_row.get("pos")
        if not t_lemma:
            return False
        if camel_lemma_key(candidate.get("lex")) != t_lemma:
            return False
        if t_root and COVERAGE.normalize_root(candidate.get("root")) != t_root:
            return False
        return candidate.get("pos") in POS_MAP.get(t_pos, set())

    rows = []
    for key in sorted(keys, key=lambda k: (int(k[0].split(":")[0]),
                                           int(k[0].split(":")[1]), k[1])):
        teacher_row = teacher[key]
        t_lemma = COVERAGE.normalize_lemma(teacher_row.get("lemma"))
        forms = pipeline_forms(key)
        base_cores = {(COVERAGE.normalize_root(c.get("root")),
                       camel_lemma_key(c.get("lex")))
                      for f in forms for c in analyze(f)}
        per_rule = {}
        for rule_id in RULES:
            variants, scripts = [], []
            for form in forms:
                variant, edits = derive(form, rule_id)
                if variant is None or variant in forms:
                    continue
                variants.append(variant)
                scripts.append({"from_form": form, "variant": variant,
                                "edits": [{**e,
                                           "delete_codepoints": codepoints(e["delete"]),
                                           "insert_codepoints": codepoints(e["insert"])}
                                          for e in edits]})
            variants = list(dict.fromkeys(variants))
            if not variants:
                continue
            added = [c for f in variants for c in analyze(f)]
            exact = [c for c in added if exact_match(c, teacher_row)]
            wrong_lemma = [c for c in added
                           if camel_lemma_key(c.get("lex")) not in (None, t_lemma)]
            new_cores = {(COVERAGE.normalize_root(c.get("root")),
                          camel_lemma_key(c.get("lex"))) for c in added} - base_cores
            per_rule[rule_id] = {
                "fires": True,
                "variants": variants[:3],
                "edit_scripts": scripts[:2],
                "candidates_added": len(added),
                "exact_lemma_root_pos": len(exact),
                "reaches_exact": bool(exact),
                "wrong_lemma_candidates": len(wrong_lemma),
                "only_wrong_lemma": bool(added) and not exact and bool(wrong_lemma),
                "new_lexical_cores": len(new_cores),
            }
        rows.append({
            "verse_key": key[0], "word_index": key[1],
            "canonical_text": canonical[key],
            "teacher_lemma": teacher_row.get("lemma"),
            "teacher_root": teacher_row.get("root"),
            "teacher_pos": teacher_row.get("pos"),
            "rules": per_rule,
        })

    # ---- broad negative corpus ---------------------------------------------
    negative = {}
    for rule_id in RULES:
        fired, added_total, new_core_total, risky, wrong_only = 0, 0, 0, [], 0
        for key, surface in canonical.items():
            if key in keys:
                continue
            forms = list(base_forms[key])
            variants = []
            for form in forms:
                variant, _ = derive(form, rule_id)
                if variant is not None and variant not in forms:
                    variants.append(variant)
            if not variants:
                continue
            fired += 1
            base_cores = {(COVERAGE.normalize_root(c.get("root")),
                           camel_lemma_key(c.get("lex")))
                          for f in forms for c in analyze(f)}
            added = [c for f in dict.fromkeys(variants) for c in analyze(f)]
            added_total += len(added)
            new_cores = {(COVERAGE.normalize_root(c.get("root")),
                          camel_lemma_key(c.get("lex"))) for c in added} - base_cores
            new_core_total += len(new_cores)
            if new_cores:
                wrong_only += 1
            row = selection.get(key) or {}
            if row.get("verdict") == "CORRECT" and new_cores:
                selected = row.get("selected") or {}
                selected_core = (COVERAGE.normalize_root(selected.get("root")),
                                 camel_lemma_key(selected.get("lex")))
                if {c for c in new_cores if c != selected_core}:
                    risky.append({"verse_key": key[0], "word_index": key[1],
                                  "arabic": surface})
        negative[rule_id] = {
            "surfaces_fired_on": fired,
            "candidates_added": added_total,
            "new_lexical_cores_added": new_core_total,
            "tokens_receiving_a_new_core": wrong_only,
            "v1_7_correct_tokens_given_a_competing_core": len(risky),
            "risky_sample": risky[:6],
        }

    def summary(rule_id):
        fired = [r for r in rows if rule_id in r["rules"]]
        exact = [r for r in fired if r["rules"][rule_id]["reaches_exact"]]
        wrong_only = [r for r in fired if r["rules"][rule_id]["only_wrong_lemma"]]
        any_wrong = [r for r in fired if r["rules"][rule_id]["wrong_lemma_candidates"]]
        return {
            "tokens_fired": len(fired),
            "tokens_reaching_exact_lemma_root_pos": len(exact),
            "exact_tokens": sorted(f"{r['verse_key']}:{r['word_index']}" for r in exact),
            "tokens_with_only_wrong_lemma_candidates": len(wrong_only),
            "tokens_with_any_wrong_lemma_candidate": len(any_wrong),
            "surfaces": dict(sorted(collections.Counter(
                r["canonical_text"] for r in exact).items(),
                key=lambda kv: (-kv[1], kv[0]))),
        }

    hc1a, comp = summary("HC1a"), summary("HC1_PLUS_O4")
    hc1a_tokens = set(hc1a["exact_tokens"])
    comp_tokens = set(comp["exact_tokens"])
    overlap = sorted(hc1a_tokens & comp_tokens)
    fired_overlap = sorted({f"{r['verse_key']}:{r['word_index']}" for r in rows
                            if "HC1a" in r["rules"] and "HC1_PLUS_O4" in r["rules"]})

    gates = {
        "HC1a": {
            "no_competing_core_on_v1_7_correct":
                negative["HC1a"]["v1_7_correct_tokens_given_a_competing_core"] == 0,
            "no_token_left_with_only_a_wrong_lemma_candidate":
                hc1a["tokens_with_only_wrong_lemma_candidates"] == 0,
        },
        "HC1_PLUS_O4": {
            "no_competing_core_on_v1_7_correct":
                negative["HC1_PLUS_O4"]["v1_7_correct_tokens_given_a_competing_core"] == 0,
            "no_token_left_with_only_a_wrong_lemma_candidate":
                comp["tokens_with_only_wrong_lemma_candidates"] == 0,
        },
    }
    verdicts = {rule_id: ("PROPOSED_FOR_PRODUCTION"
                          if all(gate.values()) and summary(rule_id)[
                              "tokens_reaching_exact_lemma_root_pos"]
                          else "REJECTED")
                for rule_id, gate in gates.items()}

    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_chain": {"manifest": str(FREEZE.relative_to(REPO_ROOT)).replace("\\", "/"),
                         "sha256": sha256_file(FREEZE), "status": "VERIFIED_UNCHANGED"},
        "contract": {
            "success_counted_only_as_exact_lemma_root_and_pos": True,
            "teacher_use": "scoring only",
            "no_allowlist_no_verse_key_no_selector_change": True,
            "o4x_not_revived_standalone": ("the alef edit is emitted only inside a "
                                           "script that also carries the carrier "
                                           "edit and records `bound_to_carrier_at`"),
            "edits_reversible_with_source_offsets": True,
            "full_dump_not_regenerated": True,
            "selector_not_run": True,
            "production_db_written": False,
        },
        "rule_doc": RULE_DOC,
        "in_scope": {"HC1a": hc1a, "HC1_PLUS_O4": comp},
        "negative_corpus": negative,
        "interaction": {
            "tokens_where_both_rules_fire": fired_overlap,
            "tokens_both_close_exactly": overlap,
            "disjoint": not overlap and not fired_overlap,
        },
        "acceptance_gates": gates,
        "verdicts": verdicts,
        "expected_closure": {
            "HC1a": hc1a["tokens_reaching_exact_lemma_root_pos"]
            if verdicts["HC1a"] == "PROPOSED_FOR_PRODUCTION" else 0,
            "HC1_PLUS_O4": comp["tokens_reaching_exact_lemma_root_pos"]
            if verdicts["HC1_PLUS_O4"] == "PROPOSED_FOR_PRODUCTION" else 0,
        },
        "tokens": rows,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "tokens.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows),
        encoding="utf-8", newline="\n")
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "report.json": sha256_file(out_dir / "report.json"),
        "tokens.jsonl": sha256_file(out_dir / "tokens.jsonl"),
    }
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in
                      ("in_scope", "negative_corpus", "interaction",
                       "acceptance_gates", "verdicts", "expected_closure")}
                     | {"checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
