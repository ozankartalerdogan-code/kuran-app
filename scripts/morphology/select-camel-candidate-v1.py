#!/usr/bin/env python3
"""First deterministic CAMeL candidate selector on top of the frozen R1-R5 layer.

The recall layer is imported verbatim from
`verify-recall-contract-r1r5-gate-final.py` (R1-R5, the final gate and the frozen
two-surface Dawud exception). Nothing in it is re-tuned here; this script only
picks ONE analysis out of the pool that layer produces.

Selection uses only:
  * CAMeL candidate fields (diac, pos, cas, mod, vox, asp, per, gen, num, stt,
    prc0/prc1/prc1.5/prc2/prc3, enc0, root, lex)
  * the vocalized canonical Tanzil surface of the token itself
  * the pools of the neighbouring tokens inside the same verse

`qac-tanzil-teacher.jsonl` is read ONLY in the final evaluation. It is never a
runtime input, never a lookup table and never a verse_key override. No token is
special-cased, no ranker/model/LLM is trained, and nothing is written to the
production DB. When the ordered rules cannot decide, the token is left
`AMBIGUOUS` rather than guessed.
"""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
DB_PATH = CAMEL_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
TOKEN_MAP_PATH = CAMEL_ROOT / "token-map.jsonl"
FULL_ANALYSIS_DIR = CAMEL_ROOT / "full-analysis"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
OUT_DIR = CAND_ROOT / "selector-v1"

SCHEMA_VERSION = "camel-selector-v1"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


RECALL = load_module(SCRIPT_DIR / "verify-recall-contract-r1r5-gate-final.py",
                     "recall_contract_gate_final")
COVERAGE = RECALL.COVERAGE

fingerprint = RECALL.fingerprint
sha256_file = RECALL.sha256_file
sort_key = RECALL.sort_key

# --------------------------------------------------------------------------
# Surface normalization for diac comparison
# --------------------------------------------------------------------------
# Uthmani orthography vs. CAMeL's MSA spelling. Quranic annotation marks are
# dropped, dagger alif becomes alif, the alif family is folded. Short vowels,
# tanwin, shadda and sukun are KEPT - they carry the case/mood evidence.
_DROP = re.compile("[" + "".join(chr(c) for c in range(0x06D6, 0x06EE))
                   + "ـٕٓٔ‌‍‎‏" + "]")
_DAGGER = "ٰ"
_ALIF_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا"})
_HARAKAT = "ًٌٍَُِّْ"
_SHADDA = "ّ"
_TANWIN = {"ً": "a", "ٌ": "n", "ٍ": "g"}
_SHORT = {"َ": "a", "ُ": "n", "ِ": "g"}


def normalize_vocalized(text: str) -> str:
    """Uthmani/MSA-comparable vocalized form. Mark order inside one cluster is
    canonicalized (shadda first) so ّـَ and َـّ compare equal."""
    if not text:
        return ""
    text = _DROP.sub("", str(text)).replace(_DAGGER, "ا").translate(_ALIF_FOLD)
    out = []
    marks = []
    for ch in text:
        if ch in _HARAKAT:
            marks.append(ch)
            continue
        if marks:
            out.append(_SHADDA if _SHADDA in marks else "")
            out.extend(sorted(m for m in marks if m != _SHADDA))
            marks = []
        out.append(ch)
    if marks:
        out.append(_SHADDA if _SHADDA in marks else "")
        out.extend(sorted(m for m in marks if m != _SHADDA))
    return "".join(out)


def skeleton(text: str) -> str:
    """Consonant skeleton: normalized and fully undiacritized."""
    return "".join(c for c in normalize_vocalized(text) if c not in _HARAKAT)


def final_case_marker(surface: str):
    """(case, definiteness-hint) implied by the token's final vowel.

    Returns (cas, stt_hint) where cas is CAMeL's n/a/g or None when the surface
    ends unvocalized (pausal form - case is simply not marked)."""
    norm = normalize_vocalized(surface)
    # A word-final silent alif / alif maqsura carries no vowel of its own; the
    # case mark sits on the letter before it (هُدًى, فَتًى).
    while norm and norm[-1] in ("ا", "ى"):
        norm = norm[:-1]
    trailing = ""
    for ch in reversed(norm):
        if ch in _HARAKAT:
            trailing = ch + trailing
        else:
            break
    if not trailing:
        return None, None
    for mark, cas in _TANWIN.items():
        if mark in trailing:
            return cas, "i"
    for mark, cas in _SHORT.items():
        if mark in trailing:
            return cas, None
    return None, None  # sukun only


SLIM_FIELDS = ("diac", "lex", "root", "pos", "cas", "mod", "vox", "asp",
               "per", "gen", "num", "stt", "prc0", "prc1", "prc1.5",
               "prc2", "prc3", "enc0")


def slim(candidate: dict) -> dict:
    out = {f: candidate.get(f) for f in SLIM_FIELDS}
    out["_fp"] = fingerprint(candidate)
    out["_norm_diac"] = normalize_vocalized(candidate.get("diac"))
    out["_skel"] = skeleton(candidate.get("diac"))
    if "_rescue" in candidate:
        out["_rescue"] = candidate["_rescue"]
    return out


# --------------------------------------------------------------------------
# Clitic <-> surface consistency (Tanzil surface only)
# --------------------------------------------------------------------------
_PROCLITIC_LETTER = {
    "wa_": "و", "fa_": "ف", "bi_": "ب", "li_": "ل", "ka_": "ك", "sa_": "س",
    "ta_": "ت", "Al_": "ال", ">a_": "ا",
}
_ENCLITIC_LETTER = {
    "1s": "ي", "1p": "نا", "2ms": "ك", "2fs": "ك", "2mp": "كم", "2fp": "كن",
    "2d": "كما", "3ms": "ه", "3fs": "ها", "3mp": "هم", "3fp": "هن", "3d": "هما",
}
_PRC_FIELDS = ("prc0", "prc1", "prc1.5", "prc2", "prc3")


def clitics_consistent(candidate: dict, surf_skel: str) -> bool:
    """A candidate that claims a proclitic the surface does not start with, or an
    enclitic the surface does not end with, is impossible for this token."""
    for field in _PRC_FIELDS:
        value = candidate.get(field)
        if not value or value == "0":
            continue
        for prefix, letters in _PROCLITIC_LETTER.items():
            if str(value).startswith(prefix):
                if not surf_skel.startswith(letters):
                    return False
                break
    enc = candidate.get("enc0")
    if enc and enc != "0":
        person = str(enc).split("_")[0]
        letters = _ENCLITIC_LETTER.get(person)
        if letters and not surf_skel.endswith(letters):
            return False
    return True


# --------------------------------------------------------------------------
# The ordered rule cascade
# --------------------------------------------------------------------------
RULES = (
    "R1_UNIQUE_AFTER_DEDUPE",
    "R2_EXACT_VOCALIZED_DIAC",
    "R3_CLITIC_SURFACE_CONSISTENCY",
    "R4_FINAL_VOWEL_CASE",
    "R5_DEFINITENESS_STATE",
    "R6_SKELETON_MATCH",
    "R7_PREV_TOKEN_PREPOSITION_GENITIVE",
    "R8_NEXT_TOKEN_GENITIVE_CONSTRUCT",
    "R9_UNANIMOUS_LEXICAL_CORE",
)
CONFIDENCE = {
    "R1_UNIQUE_AFTER_DEDUPE": "high",
    "R2_EXACT_VOCALIZED_DIAC": "high",
    "R3_CLITIC_SURFACE_CONSISTENCY": "medium",
    "R4_FINAL_VOWEL_CASE": "medium",
    "R5_DEFINITENESS_STATE": "medium",
    "R6_SKELETON_MATCH": "low",
    "R7_PREV_TOKEN_PREPOSITION_GENITIVE": "low",
    "R8_NEXT_TOKEN_GENITIVE_CONSTRUCT": "low",
    "R9_UNANIMOUS_LEXICAL_CORE": "medium",
}


def coarse_pos_set(pool):
    classes = set()
    for cand in pool:
        mapped = COVERAGE.POS_MAP.get(cand.get("pos"))
        if mapped:
            classes |= mapped
        else:
            classes.add("?")
    return classes


def select(surface: str, pool, prev_pool, next_pool):
    """Ordered, deterministic. Returns (selected|None, rule, chain, reason)."""
    chain = []

    # ---- dedupe -----------------------------------------------------------
    seen = {}
    for cand in pool:
        seen.setdefault(cand["_fp"], cand)
    live = sorted(seen.values(), key=lambda c: c["_fp"])
    if not live:
        return None, None, chain, "EMPTY_POOL"
    if len(live) == 1:
        return live[0], "R1_UNIQUE_AFTER_DEDUPE", chain, None

    norm_surface = normalize_vocalized(surface)
    surf_skel = skeleton(surface)

    def narrow(subset, rule):
        """Apply a filter only when it keeps at least one candidate."""
        nonlocal live
        if subset and len(subset) < len(live):
            live = subset
            chain.append(rule)
        return len(live) == 1

    # R2: the candidate spells the token exactly, vowels and all.
    exact = [c for c in live if c["_norm_diac"] == norm_surface]
    if narrow(exact, "R2_EXACT_VOCALIZED_DIAC"):
        return live[0], "R2_EXACT_VOCALIZED_DIAC", chain, None

    # R3: drop readings whose clitics contradict the surface.
    ok = [c for c in live if clitics_consistent(c, surf_skel)]
    if narrow(ok, "R3_CLITIC_SURFACE_CONSISTENCY"):
        return live[0], "R3_CLITIC_SURFACE_CONSISTENCY", chain, None

    # R4: the final short vowel fixes the case.
    cas, stt_hint = final_case_marker(surface)
    if cas:
        matching = [c for c in live if c.get("cas") == cas]
        if narrow(matching, "R4_FINAL_VOWEL_CASE"):
            return live[0], "R4_FINAL_VOWEL_CASE", chain, None

    # R5: tanwin means indefinite; a leading article means definite.
    state = stt_hint or ("d" if surf_skel.startswith("ال") else None)
    if state:
        matching = [c for c in live if c.get("stt") == state]
        if narrow(matching, "R5_DEFINITENESS_STATE"):
            return live[0], "R5_DEFINITENESS_STATE", chain, None

    # R6: same consonant skeleton as the token.
    same = [c for c in live if c["_skel"] == surf_skel]
    if narrow(same, "R6_SKELETON_MATCH"):
        return live[0], "R6_SKELETON_MATCH", chain, None

    # R7: after a token whose whole pool is a preposition, a nominal is genitive.
    if prev_pool and all(c.get("pos") == "prep" for c in prev_pool):
        gen = [c for c in live if c.get("cas") == "g"]
        if narrow(gen, "R7_PREV_TOKEN_PREPOSITION_GENITIVE"):
            return live[0], "R7_PREV_TOKEN_PREPOSITION_GENITIVE", chain, None

    # R8: idafa - a nominal followed by a token whose whole pool is genitive is
    # itself in construct state.
    if next_pool and next_pool is not None and all(
            c.get("cas") == "g" and COVERAGE.POS_MAP.get(c.get("pos")) == {"N"}
            for c in next_pool):
        construct = [c for c in live if c.get("stt") == "c"]
        if narrow(construct, "R8_NEXT_TOKEN_GENITIVE_CONSTRUCT"):
            return live[0], "R8_NEXT_TOKEN_GENITIVE_CONSTRUCT", chain, None

    # R9: every survivor agrees on root+lemma+POS. The lexical reading is then
    # decided even though the morphosyntactic features are not; pick the
    # fingerprint-ordered first and flag the residual feature ambiguity.
    cores = {(COVERAGE.normalize_root(c.get("root")),
              COVERAGE.normalize_lemma(c.get("lex")),
              c.get("pos")) for c in live}
    if len(cores) == 1:
        return live[0], "R9_UNANIMOUS_LEXICAL_CORE", chain, None

    distinct_pos = {c.get("pos") for c in live}
    distinct_lex = {COVERAGE.normalize_lemma(c.get("lex")) for c in live}
    if len(distinct_pos) > 1:
        reason = "POS_AMBIGUOUS"
    elif len(distinct_lex) > 1:
        reason = "LEMMA_AMBIGUOUS"
    else:
        reason = "ROOT_AMBIGUOUS"
    return None, None, chain, f"{reason}::{len(live)}_survivors"


# --------------------------------------------------------------------------
def main() -> int:
    for path in (TEACHER_PATH, TOKEN_MAP_PATH, DB_PATH, FULL_ANALYSIS_DIR):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Teacher keys are needed to know which spans are tokens at all; the teacher's
    # morphology (root/lemma/pos) is only touched in the evaluation section.
    teacher = {}
    for line in TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    canonical = {}
    base_forms = {}
    for line in TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        if key in teacher:
            canonical[key] = obj["canonical_text"]
            base_forms[key] = list(obj["analysis_forms"])

    if len(RECALL.DAWUD_ALLOWLIST) != RECALL.EXPECTED_DAWUD_SURFACES:
        raise SystemExit("FAIL-CLOSED: frozen recall layer changed under this selector")

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def merged_pool(key, record):
        """The frozen recall layer, replayed. Rules and gate are untouched.

        Returns (slim candidates, raw candidate count before dedupe)."""
        pool = record.get("unique_candidates") or []
        input_keys = {COVERAGE.normalize_lemma(f.get("form"))
                      for f in record.get("analysis_forms") or []}
        input_keys.add(COVERAGE.normalize_lemma(record.get("canonical_text")))
        input_keys.discard(None)
        tags = RECALL.full_surface_pos_tags(pool, input_keys)
        gated = (RECALL.gate_v2(pool, tags)
                 and not RECALL.dawud_suppressed(record.get("canonical_text", ""), tags))
        slims = [slim(c) for c in pool]
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
                s = slim(enriched)
                if s["_fp"] in seen:
                    continue
                seen.add(s["_fp"])
                slims.append(s)
        return slims, raw_count

    def qualifies(cand_root, cand_lemma, cand_pos, t_row):
        t_root = COVERAGE.normalize_root(t_row.get("root"))
        t_lemma = COVERAGE.normalize_lemma(t_row.get("lemma"))
        pos_classes = COVERAGE.POS_MAP.get(cand_pos)
        pos_ok = pos_classes is not None and t_row.get("pos") in pos_classes
        root_ok = (t_root is None) or (cand_root == t_root)
        lemma_ok = (t_lemma is None) or (cand_lemma == t_lemma)
        return pos_ok and root_ok and lemma_ok, pos_ok, root_ok, lemma_ok

    rows = []
    # Oracle side-channel: whether the frozen pool contains the teacher reading at
    # all. Recorded here to avoid a second expensive pass; `select()` has no
    # access to it and it is consumed only by the evaluation section below.
    answers = {}
    for path in sorted(FULL_ANALYSIS_DIR.glob("surah-*.jsonl.gz")):
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
                key = (verse_key, widx)
                pools[widx] = merged_pool(key, words[widx])

            for widx in sorted(words):
                key = (verse_key, widx)
                pool, raw_count = pools[widx]
                prev_pool = pools.get(widx - 1, (None,))[0]
                next_pool = pools.get(widx + 1, (None,))[0]
                after = len({c["_fp"] for c in pool})
                chosen, rule, chain, reason = select(
                    canonical[key], pool, prev_pool, next_pool)
                answers[key] = any(
                    qualifies(COVERAGE.normalize_root(c.get("root")),
                              COVERAGE.normalize_lemma(c.get("lex")),
                              c.get("pos"), teacher[key])[0]
                    for c in pool)
                row = {
                    "verse_key": verse_key,
                    "word_index": widx,
                    "arabic": canonical[key],
                    "candidate_count_before_dedupe": raw_count,
                    "candidate_count_after_dedupe": after,
                    "selected_fingerprint": chosen["_fp"] if chosen else None,
                    "selection_rule": rule,
                    "rule_chain": chain,
                    "confidence": CONFIDENCE.get(rule) if rule else None,
                    "rescue_provenance": (chosen or {}).get("_rescue"),
                    "selected_from_rescue": bool(chosen and "_rescue" in chosen),
                    "ambiguous_reason": reason,
                    "selected": {
                        f: chosen.get(f) for f in ("root", "lex", "pos", "cas", "mod",
                                                   "vox", "asp", "per", "gen", "num",
                                                   "stt", "diac")
                    } if chosen else None,
                }
                rows.append(row)

    rows.sort(key=lambda r: sort_key((r["verse_key"], r["word_index"])))

    # ======================================================================
    # Evaluation against the teacher oracle (development / verification only)
    # ======================================================================
    # A token is only judged when the frozen pool actually contains the teacher
    # reading; otherwise it is a recall gap, not a selection error.
    verdicts = Counter()
    rule_stats = defaultdict(lambda: Counter())
    field_stats = Counter()
    error_classes = Counter()
    error_examples = defaultdict(list)
    ambiguous_reasons = Counter()

    for row in rows:
        key = (row["verse_key"], row["word_index"])
        t_row = teacher[key]
        has_answer = answers.get(key, False)
        if not has_answer:
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

    out_tokens = OUT_DIR / "selection.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    total = len(rows)
    judged = verdicts["CORRECT"] + verdicts["INCORRECT"]
    top_errors = error_classes.most_common(3)

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "teacher_sha256": sha256_file(TEACHER_PATH),
            "camel_db_sha256": sha256_file(DB_PATH),
            "token_map_sha256": sha256_file(TOKEN_MAP_PATH),
            "tokens": total,
        },
        "contract": {
            "recall_layer": "R1-R5 + final gate + Dawud allowlist, imported verbatim",
            "teacher_use": "evaluation oracle only - not a runtime input, lookup or override",
            "selection_evidence": ["CAMeL candidate fields",
                                   "vocalized canonical Tanzil surface",
                                   "neighbouring token pools inside the same verse"],
            "rules_in_order": list(RULES),
            "no_guessing": "unresolved ties are reported AMBIGUOUS",
            "excluded_this_run": ["ranker/model/LLM", "per-token hardcoding",
                                  "verse_key overrides", "teacher fingerprint lookup",
                                  "production DB writes",
                                  "the 711 recall-gap tokens"],
        },
        "verdicts": {
            "correct": verdicts["CORRECT"],
            "incorrect": verdicts["INCORRECT"],
            "ambiguous": verdicts["AMBIGUOUS"],
            "recall_gap": verdicts["RECALL_GAP"],
            "total": total,
            "accuracy_on_judged": round(100.0 * verdicts["CORRECT"] / judged, 3) if judged else None,
            "accuracy_on_all_non_gap": round(
                100.0 * verdicts["CORRECT"] / (judged + verdicts["AMBIGUOUS"]), 3)
            if (judged + verdicts["AMBIGUOUS"]) else None,
        },
        "field_accuracy": {
            "root": {
                "applicable": field_stats["root_applicable"],
                "correct": field_stats["root_correct"],
                "pct": round(100.0 * field_stats["root_correct"] / field_stats["root_applicable"], 3)
                if field_stats["root_applicable"] else None,
            },
            "lemma": {
                "applicable": field_stats["lemma_applicable"],
                "correct": field_stats["lemma_correct"],
                "pct": round(100.0 * field_stats["lemma_correct"] / field_stats["lemma_applicable"], 3)
                if field_stats["lemma_applicable"] else None,
            },
            "pos": {
                "applicable": field_stats["pos_applicable"],
                "correct": field_stats["pos_correct"],
                "pct": round(100.0 * field_stats["pos_correct"] / field_stats["pos_applicable"], 3)
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
                "confidence": CONFIDENCE[rule],
            }
            for rule in RULES
        },
        "ambiguous_reasons": dict(sorted(ambiguous_reasons.items(),
                                         key=lambda kv: (-kv[1], kv[0]))),
        "top_3_error_classes": [
            {"signature": sig, "tokens": count, "examples": error_examples[sig]}
            for sig, count in top_errors
        ],
    }

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "report.json": sha256_file(out_report),
        "selection.jsonl": sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    print(json.dumps({k: report[k] for k in
                      ("verdicts", "field_accuracy", "rule_coverage_and_accuracy",
                       "ambiguous_reasons")}
                     | {"top_3_error_classes": [
                         {"signature": e["signature"], "tokens": e["tokens"]}
                         for e in report["top_3_error_classes"]]}
                     | {"checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
