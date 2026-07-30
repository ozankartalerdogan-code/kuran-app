#!/usr/bin/env python3
"""HAMZA_CARRIER bucket: general analyzer-form rules that move ONLY the carrier.

Scope: exactly the 42 tokens in the `HAMZA_CARRIER` bucket. The question is
whether a GENERAL, deterministic rule - stated on codepoints, with no verse key,
no surface allowlist and no teacher gate - can rewrite the seat the Uthmani text
gives a hamza into the seat CAMeL's MSA lexicon expects.

What a rule may do:
  * replace ONE hamza-family codepoint with another hamza-family codepoint.
That is all. It may not delete a hamza, may not turn a hamza into a non-hamza
letter, and may not touch any other letter or any diacritic - the edit script is
a single-codepoint substitution and that is enforced, not just intended.

Each rule carries an explicit edit script and its inverse is checked on every
variant before the variant is used.

Evaluation:
  * the 42 in-scope tokens - does the variant reach the teacher core, and how
    many compatible / incompatible candidates does it add;
  * a BROAD NEGATIVE SAMPLE - every other corpus surface the rule also fires on,
    scored against the FROZEN v1.7 selection: a rule that would hand a competing
    lexical core to a token v1.7 already gets CORRECT is a regression risk, and
    is reported as one.

The teacher is read only when scoring. It never decides which token a rule fires
on: a rule fires wherever its codepoint precondition holds.

No dump is regenerated. The production DB, the selector, the frozen dumps and
the frozen rule sets are untouched.
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
FREEZE_PARADIGM = SCRIPT_DIR / "resources" / "frozen-paradigm-gap-v2-manifest.json"
OUT_DIR = CAND_ROOT / "hamza-carrier-v1"

SCHEMA_VERSION = "hamza-carrier-v1"
BUCKET = "HAMZA_CARRIER"
EXPECTED_SCOPE_TOKENS = 42


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_hc")
COVERAGE = V.COVERAGE
RECALL = V.RECALL

import orthographic_production_rules as ORTHO  # noqa: E402
import hamza_madda_rescue_rules as HAMZA  # noqa: E402

# --------------------------------------------------------------------------
# Codepoints
# --------------------------------------------------------------------------
BARE = "ء"        # ء
ALEF_HAMZA = "أ"  # أ
WAW_HAMZA = "ؤ"   # ؤ
ALEF_BELOW = "إ"  # إ
YEH_HAMZA = "ئ"   # ئ
ALEF_MADDA = "آ"  # آ
CARRIERS = (BARE, ALEF_MADDA, ALEF_HAMZA, WAW_HAMZA, ALEF_BELOW, YEH_HAMZA)

ALEF = "ا"
WAW = "و"
YEH = "ي"
MAQSURA = "ى"
WASLA = "ٱ"
SUKUN = "ْ"
SHORT_VOWELS = set("ًٌٍَُِّ")
LONG_ALEF = {ALEF, ALEF_MADDA, WASLA}

MARK_RE = re.compile("[ً-ْٰـٓ-ٕۖ-ۭ]")


def is_mark(ch: str) -> bool:
    return bool(MARK_RE.match(ch))


def prev_letter(text: str, index: int):
    cursor = index - 1
    marks = set()
    while cursor >= 0 and is_mark(text[cursor]):
        marks.add(text[cursor])
        cursor -= 1
    return (text[cursor] if cursor >= 0 else None), marks, cursor


def own_marks(text: str, index: int):
    marks, cursor = set(), index + 1
    while cursor < len(text) and is_mark(text[cursor]):
        marks.add(text[cursor])
        cursor += 1
    return marks


def next_letter(text: str, index: int):
    cursor = index + 1
    while cursor < len(text) and is_mark(text[cursor]):
        cursor += 1
    return text[cursor] if cursor < len(text) else None


# --------------------------------------------------------------------------
# Candidate rules. Each returns the replacement carrier or None.
# --------------------------------------------------------------------------
def hc1(text, i, carrier, prev, prev_marks, own, nxt):
    """Bare hamza after an unvowelled alef, before a waw -> waw seat.

    جَآءُو / يَشَآءُونَ: word-finally MSA writes the hamza on the line (جاء), but with
    a following waw the seat is a waw (جاؤوا). The frozen R2 declines here on
    purpose - it keeps a hamza after a long vowel on the line - so this is a new
    context, not a change to R2."""
    if carrier != BARE or prev not in LONG_ALEF or nxt != WAW:
        return None
    if prev_marks & SHORT_VOWELS:
        return None
    return WAW_HAMZA


def hc2(text, i, carrier, prev, prev_marks, own, nxt):
    """Bare hamza after a SUKUN-bearing yeh/waw -> the carrier the frozen R2
    strength rule picks.

    ٱسْتَيْـَٔسَ: the yeh carries a sukun, so it is a consonant, not a long vowel -
    but R2's `_is_long_vowel` does not test for sukun and therefore leaves the
    hamza on the line. R2 itself is not modified; its own `_carrier_for` is
    called for the seat."""
    if carrier != BARE or prev not in (YEH, WAW) or SUKUN not in prev_marks:
        return None
    seat = HAMZA._carrier_for(prev_marks, own)
    return seat if seat != BARE else None


def hc3(text, i, carrier, prev, prev_marks, own, nxt):
    """Bare hamza after an unvowelled, unsukuned yeh -> yeh seat (سِيٓـَٔتْ = سيئت)."""
    if carrier != BARE or prev not in (YEH, MAQSURA):
        return None
    if prev_marks & SHORT_VOWELS or SUKUN in prev_marks:
        return None
    return YEH_HAMZA


def hc4x(text, i, carrier, prev, prev_marks, own, nxt):
    """Waw seat -> yeh seat. Measured, expected to be junk (يبدؤا -> يبدئا)."""
    return YEH_HAMZA if carrier == WAW_HAMZA else None


def hc5x(text, i, carrier, prev, prev_marks, own, nxt):
    """Yeh seat -> alef seat. Measured, expected to be junk (ائتوا -> اأتوا)."""
    return ALEF_HAMZA if carrier == YEH_HAMZA else None


def hc6x(text, i, carrier, prev, prev_marks, own, nxt):
    """Waw seat -> alef seat. Measured (يبدؤ -> يبدأ needs a dropped alef too)."""
    return ALEF_HAMZA if carrier == WAW_HAMZA else None


RULES = {
    "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW": hc1,
    "HC2_BARE_AFTER_SUKUN_GLIDE": hc2,
    "HC3_BARE_AFTER_LONG_YEH": hc3,
    "HC4X_WAW_SEAT_TO_YEH_SEAT": hc4x,
    "HC5X_YEH_SEAT_TO_ALEF_SEAT": hc5x,
    "HC6X_WAW_SEAT_TO_ALEF_SEAT": hc6x,
}

RULE_DOC = {
    "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW":
        "U+0621 -> U+0624 when the preceding letter is U+0627/U+0622/U+0671 with "
        "no short vowel and the following letter is U+0648.",
    "HC2_BARE_AFTER_SUKUN_GLIDE":
        "U+0621 -> the seat the frozen R2 strength rule picks, when the preceding "
        "letter is U+064A/U+0648 carrying U+0652.",
    "HC3_BARE_AFTER_LONG_YEH":
        "U+0621 -> U+0626 when the preceding letter is U+064A/U+0649 with neither "
        "a short vowel nor a sukun.",
    "HC4X_WAW_SEAT_TO_YEH_SEAT": "U+0624 -> U+0626, unconditional. Measured only.",
    "HC5X_YEH_SEAT_TO_ALEF_SEAT": "U+0626 -> U+0623, unconditional. Measured only.",
    "HC6X_WAW_SEAT_TO_ALEF_SEAT": "U+0624 -> U+0623, unconditional. Measured only.",
}
RULE_ORDER = tuple(sorted(RULES))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


def carrier_edits(text: str, rule_id: str):
    """Every single-codepoint carrier substitution the rule licenses in `text`."""
    rule = RULES[rule_id]
    edits = []
    for index, ch in enumerate(text):
        if ch not in CARRIERS:
            continue
        prev, prev_marks, _ = prev_letter(text, index)
        replacement = rule(text, index, ch, prev, prev_marks,
                           own_marks(text, index), next_letter(text, index))
        if replacement is None or replacement == ch:
            continue
        if replacement not in CARRIERS:
            raise SystemExit(f"{rule_id} produced a non-carrier codepoint")
        edits.append({"offset": index, "delete": ch, "insert": replacement})
    return edits


def apply_edits(text: str, edits) -> str:
    out, cursor = [], 0
    for edit in edits:
        out.append(text[cursor:edit["offset"]])
        if text[edit["offset"]] != edit["delete"]:
            raise ValueError("edit does not match its input")
        out.append(edit["insert"])
        cursor = edit["offset"] + 1
    out.append(text[cursor:])
    return "".join(out)


def invert(result: str, edits) -> str:
    out, cursor = [], 0
    for edit in edits:
        out.append(result[cursor:edit["offset"]])
        if result[edit["offset"]] != edit["insert"]:
            raise ValueError("inverse does not match its input")
        out.append(edit["delete"])
        cursor = edit["offset"] + 1
    out.append(result[cursor:])
    return "".join(out)


def derive(text: str, rule_id: str):
    edits = carrier_edits(text, rule_id)
    if not edits:
        return None, []
    variant = apply_edits(text, edits)
    if variant == text:
        return None, []
    if invert(variant, edits) != text:
        raise SystemExit(f"{rule_id} is not reverse-verifiable on {text!r}")
    if len(variant) != len(text):
        raise SystemExit(f"{rule_id} changed the length of {text!r}")
    for position, (before, after) in enumerate(zip(text, variant)):
        if before == after:
            continue
        if before not in CARRIERS or after not in CARRIERS:
            raise SystemExit(f"{rule_id} touched a non-carrier at {position}")
    return variant, edits


def core(candidate):
    return (COVERAGE.normalize_root(candidate.get("root")),
            COVERAGE.normalize_lemma(candidate.get("lex")))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    parser.add_argument("--negative-sample-limit", type=int, default=0,
                        help="0 = every corpus surface the rule fires on")
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    manifest = json.loads(FREEZE_PARADIGM.read_text(encoding="utf-8"))
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
        key = (obj["verse_key"], obj["word_index"])
        canonical[key] = obj["canonical_text"]
        base_forms[key] = list(obj["analysis_forms"])
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

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def pipeline_forms(key):
        """Everything the frozen pipeline already has for this token."""
        forms = list(base_forms[key])
        forms += sorted(RECALL.build_variants(canonical[key], base_forms[key]))
        forms += [i["analyzer_form"] for i in
                  ORTHO.extra_forms(base_forms[key], hamza_pass=HAMZA.apply_rules)]
        return list(dict.fromkeys(forms))

    # ---- families, read off the surface only --------------------------------
    families = collections.Counter()
    family_of = {}
    for row in scope:
        key = (row["verse_key"], row["word_index"])
        labels = set()
        for form in pipeline_forms(key):
            for index, ch in enumerate(form):
                if ch not in CARRIERS:
                    continue
                prev, prev_marks, _ = prev_letter(form, index)
                nxt = next_letter(form, index)
                if ch == BARE and prev in LONG_ALEF and not (prev_marks & SHORT_VOWELS):
                    labels.add("BARE_AFTER_LONG_ALEF_BEFORE_WAW" if nxt == WAW
                               else "BARE_AFTER_LONG_ALEF_OTHER")
                elif ch == BARE and prev in (YEH, WAW) and SUKUN in prev_marks:
                    labels.add("BARE_AFTER_SUKUN_GLIDE")
                elif ch == BARE and prev in (YEH, MAQSURA):
                    labels.add("BARE_AFTER_LONG_YEH")
                elif ch == BARE:
                    labels.add("BARE_OTHER_CONTEXT")
                elif ch in (WAW_HAMZA, YEH_HAMZA, ALEF_HAMZA, ALEF_BELOW):
                    labels.add(f"SEATED_{'WAW' if ch == WAW_HAMZA else 'YEH' if ch == YEH_HAMZA else 'ALEF'}")
        family = "+".join(sorted(labels)) or "NO_HAMZA_FAMILY_CODEPOINT"
        families[family] += 1
        family_of[key] = family

    # ---- in-scope evaluation ------------------------------------------------
    rows, rule_stats = [], {r: collections.Counter() for r in RULE_ORDER}
    rule_cores = collections.defaultdict(list)
    for key in sorted(keys, key=sort_key):
        teacher_row = teacher[key]
        t_core = (COVERAGE.normalize_root(teacher_row.get("root")),
                  COVERAGE.normalize_lemma(teacher_row.get("lemma")))
        forms = pipeline_forms(key)
        base_pool = [c for f in forms for c in analyze(f)]
        base_cores = {core(c) for c in base_pool}
        per_rule = {}
        for rule_id in RULE_ORDER:
            produced, edits_seen = [], []
            for form in forms:
                variant, edits = derive(form, rule_id)
                if variant is None or variant in forms:
                    continue
                produced.append(variant)
                edits_seen.append({"from_form": form, "variant": variant,
                                   "edits": edits})
            produced = list(dict.fromkeys(produced))
            if not produced:
                continue
            added = [c for f in produced for c in analyze(f)]
            new_cores = {core(c) for c in added} - base_cores
            compatible = sum(1 for c in added
                             if core(c)[0] == t_core[0] and t_core[0]
                             or core(c)[1] == t_core[1] and t_core[1])
            reaches = any((core(c)[1] and core(c)[1] == t_core[1])
                          or (core(c)[0] and core(c)[0] == t_core[0]
                              and core(c)[1] is not None)
                          for c in added)
            rule_stats[rule_id]["tokens_fired"] += 1
            rule_stats[rule_id]["tokens_reached_teacher_core"] += int(reaches)
            rule_stats[rule_id]["candidates_added"] += len(added)
            rule_stats[rule_id]["candidates_compatible"] += compatible
            rule_stats[rule_id]["candidates_incompatible"] += len(added) - compatible
            rule_cores[rule_id].append(len(new_cores))
            per_rule[rule_id] = {
                "variants": produced[:4],
                "edits": edits_seen[:2],
                "reaches_teacher_core": reaches,
                "candidates_added": len(added),
                "candidates_compatible": compatible,
                "candidates_incompatible": len(added) - compatible,
                "new_lexical_cores": len(new_cores),
            }
        rows.append({
            "verse_key": key[0], "word_index": key[1],
            "canonical_text": canonical[key],
            "family": family_of[key],
            "teacher_lemma": teacher_row.get("lemma"),
            "teacher_root": teacher_row.get("root"),
            "closed_by": sorted(r for r, info in per_rule.items()
                                if info["reaches_teacher_core"]),
            "rules": per_rule,
        })

    # ---- broad negative sample ---------------------------------------------
    negative = {}
    for rule_id in RULE_ORDER:
        fired, risky, added_total, new_core_total = 0, [], 0, 0
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
            if args.negative_sample_limit and fired > args.negative_sample_limit:
                break
            base_cores = {core(c) for f in forms for c in analyze(f)}
            added = [c for f in dict.fromkeys(variants) for c in analyze(f)]
            added_total += len(added)
            new_cores = {core(c) for c in added} - base_cores
            new_core_total += len(new_cores)
            row = selection.get(key) or {}
            if row.get("verdict") == "CORRECT" and new_cores:
                selected = row.get("selected") or {}
                selected_core = (COVERAGE.normalize_root(selected.get("root")),
                                 COVERAGE.normalize_lemma(selected.get("lex")))
                competing = {c for c in new_cores if c != selected_core}
                if competing:
                    risky.append({"verse_key": key[0], "word_index": key[1],
                                  "arabic": surface,
                                  "competing_cores": len(competing)})
        negative[rule_id] = {
            "surfaces_fired_on": fired,
            "candidates_added": added_total,
            "new_lexical_cores_added": new_core_total,
            "v1_7_correct_tokens_given_a_competing_core": len(risky),
            "risky_sample": risky[:8],
        }

    def verdict_for(rule_id):
        """Stated criterion, applied uniformly - no rule gets a special case.

        A rule is proposed only when it hands a competing lexical core to ZERO
        tokens the frozen v1.7 selection already gets right. If it does create
        such competition, the comparison is against what it buys: risking more
        already-correct tokens than it closes is a rejection, risking fewer is a
        deferral. Narrowing by allowlist is not on the menu."""
        closed = rule_stats[rule_id]["tokens_reached_teacher_core"]
        risk = negative[rule_id]["v1_7_correct_tokens_given_a_competing_core"]
        if not closed:
            return "REJECTED_RISK_WITHOUT_GAIN" if risk else "REJECTED_NO_GAIN"
        if not risk:
            return "PROPOSED_FOR_PRODUCTION"
        return ("REJECTED_RISK_EXCEEDS_GAIN" if risk > closed
                else "DEFERRED_RISK_WITHIN_GAIN")

    verdicts = {rule_id: verdict_for(rule_id) for rule_id in RULE_ORDER}
    closed_tokens = sorted({f"{r['verse_key']}:{r['word_index']}" for r in rows
                            if any(verdicts[c] == "PROPOSED_FOR_PRODUCTION"
                                   for c in r["closed_by"])})
    unresolved = [{"verse_key": r["verse_key"], "word_index": r["word_index"],
                   "canonical_text": r["canonical_text"], "family": r["family"],
                   "teacher_lemma": r["teacher_lemma"]}
                  for r in rows if not r["closed_by"]]

    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_chain": {"manifest": str(FREEZE_PARADIGM.relative_to(REPO_ROOT)).replace("\\", "/"),
                         "sha256": sha256_file(FREEZE_PARADIGM),
                         "status": "VERIFIED_UNCHANGED"},
        "contract": {
            "carrier_only": "every edit replaces one hamza-family codepoint with "
                            "another; enforced by an assertion, not by intent",
            "no_hamza_deleted_or_folded_to_a_non_hamza_letter": True,
            "edit_script_and_inverse_checked_on_every_variant": True,
            "no_verse_key_no_surface_allowlist_no_teacher_gate": True,
            "teacher_use": "scoring only",
            "frozen_rules_unchanged": ["R1-R3 hamza", "R1-R5 recall", "selector",
                                       "O1a/O2a/O5 orthographic"],
            "full_dump_not_regenerated": True,
            "production_db_written": False,
        },
        "rule_doc": RULE_DOC,
        "families": dict(sorted(families.items(), key=lambda kv: (-kv[1], kv[0]))),
        "in_scope": {rule_id: dict(stats) for rule_id, stats in rule_stats.items()},
        "multi_core_tokens": {rule_id: sum(1 for n in rule_cores[rule_id] if n > 1)
                              for rule_id in RULE_ORDER},
        "negative_sample": negative,
        "verdicts": verdicts,
        "closable_tokens": closed_tokens,
        "closable_token_count": len(closed_tokens),
        "unresolved_tokens": unresolved,
        "unresolved_count": len(unresolved),
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "classification.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows),
        encoding="utf-8", newline="\n")
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
    print(json.dumps({
        "families": report["families"],
        "in_scope": report["in_scope"],
        "multi_core_tokens": report["multi_core_tokens"],
        "negative_sample": {r: {k: v for k, v in n.items() if k != "risky_sample"}
                            for r, n in negative.items()},
        "verdicts": verdicts,
        "closable_token_count": report["closable_token_count"],
        "unresolved_count": report["unresolved_count"],
        "checksums": checksums,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
