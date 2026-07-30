#!/usr/bin/env python3
"""Deterministic CAMeL candidate selector v1.2a - two surgical revisions of v1.2.

v1.2 is NOT accepted as final: its rootless-`noun_prop` restriction cost 7
legitimate proper names, and no candidate-only field separates those from the
artifacts. v1.2a keeps everything else and changes exactly two things:

  1. The rootless-`noun_prop` restriction is REMOVED - v1.1 behaviour is restored.
     No general `noun_prop` ban and no proper-name allowlist is introduced.
     v1.1's R9 guard (a rootless-`noun_prop`-only agreement is not a consensus)
     still stands, because that is v1.1 behaviour.
  2. The `abbrev` artifact test no longer asks "is the stem a single letter". It
     asks whether the normalized stem skeleton is SHORTER than the canonical
     Tanzil token's skeleton, i.e. whether CAMeL had to peel letters off the word
     to reach an abbreviation letter. Equal length is never a rejection reason on
     its own, so صٓ and نٓ - single-letter tokens whose abbreviation reading is
     genuine - remain selectable, while أَن -> أ + ن is rejected.

Everything else is carried over unchanged from v1.2/v1.1: the shared eligibility
gate for `foreign` (exactly the v1.1 restriction, not widened), FOREIGN/NOAN
roots and self-gloss echoes; R8 stays diagnostic-only; no new context rule, model
or ranker; the frozen R1-R5 recall layer is untouched.

R1's "one candidate after dedupe" test, R2's lexical half, R4, R5, R7 and R9 are
otherwise unchanged.

The teacher is still evaluation-only. The narrow POS_COMPATIBILITY_MAP is applied
only when scoring against the teacher, never as a selector input.

--------------------------------------------------------------------------
Inherited from v1.1:

v1 stays as the baseline and its outputs are untouched. This revision changes
nothing about the architecture, adds no context rule, no ranker, no model and no
token override. It only repairs which candidates are allowed to COUNT AS
EVIDENCE:

  R2  a CAMeL fallback analysis (`foreign`/`source=foreign`, or a rootless
      analysis whose gloss is just the input echoed back) is no longer positive
      surface evidence. CAMeL echoing the input is not a reason to select it.
  R9  consensus now requires real shared lexical content: fallbacks are dropped
      first, at least one of root/lemma must be non-null, and a rootless
      `noun_prop`-only agreement no longer counts as consensus.
  R3  clitic consistency and R6 skeleton match no longer select. They narrow the
      field as diagnostic/tie-break evidence; if they are the only thing left
      pointing at a candidate, the token stays AMBIGUOUS.

R1, R4, R5 and the frozen recall layer are untouched.

--------------------------------------------------------------------------
Inherited from v1:

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
OUT_DIR = CAND_ROOT / "selector-v1_2a"
BASELINE_SELECTION = CAND_ROOT / "selector-v1_1" / "selection.jsonl"

SCHEMA_VERSION = "camel-selector-v1_2a"

# v1.2a: no rootless-noun_prop policy at all - v1.1 behaviour restored.
FAILED_V1_2_SELECTION = CAND_ROOT / "selector-v1_2" / "selection.jsonl"

# The 7 legitimate proper-name selections v1.2 lost; v1.2a must restore them.
EXPECTED_RESTORED_PROPER_NAMES = (
    ("9:30", 3), ("11:77", 4), ("27:44", 25), ("29:32", 4),
    ("29:33", 5), ("37:123", 2), ("37:133", 2),
)
# The two muqatta'at whose abbreviation reading is genuine.
EXPECTED_PRESERVED_ABBREV = (("38:1", 1), ("68:1", 1))


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
               "prc2", "prc3", "enc0", "source", "gloss")

# --------------------------------------------------------------------------
# What is NOT a real lexical analysis
# --------------------------------------------------------------------------
# CAMeL returns a synthesized record instead of a lexicon hit in two situations,
# and in both the `diac` it reports is simply the input echoed back - which made
# v1's R2 surface test vacuously true.
#   * the `not _is_ar(word)` branch: pos/source == 'foreign', root == 'FOREIGN'
#   * no-information root markers with the surface reused as its own gloss
# A genuine closed-class entry (مَا, لَا, ...) is rootless too but carries a real
# gloss, so it stays valid evidence.
_NO_INFO_ROOTS = {"FOREIGN", "NOAN"}


def is_fallback_analysis(candidate: dict) -> bool:
    if candidate.get("pos") == "foreign" or candidate.get("source") == "foreign":
        return True
    root = str(candidate.get("root") or "").strip()
    if root in _NO_INFO_ROOTS:
        return True
    if root in COVERAGE.CAMEL_ROOTLESS_MARKERS:
        gloss = normalize_vocalized(candidate.get("gloss"))
        if gloss and gloss == normalize_vocalized(candidate.get("diac")):
            return True  # the analyzer glossed the word with itself
    return False


# --------------------------------------------------------------------------
# v1.2: shared candidate eligibility gate
# --------------------------------------------------------------------------
# ABBREV_NOTE: `abbrev` is a genuine CAMeL lexicon class (source='lex'), so it is
# not banned wholesale - that would discard 469 correct إِن selections. The
# artifact subset is identified by a candidate-only field: its stem is a SINGLE
# letter, i.e. the Latin letter-name reading ("N.;14th") that CAMeL reaches by
# analysing أَن as interrogative أ + the letter ن. Real entries such as إِن have a
# multi-letter stem.


def _stem_letters(candidate: dict) -> int:
    stem = candidate.get("stem") or candidate.get("lex") or ""
    return len(skeleton(stem))


def is_letter_name_abbrev(candidate: dict, surf_skel: str) -> bool:
    """v1.2a: an `abbrev` analysis is an artifact when its stem covers LESS of the
    word than the token itself contains - i.e. CAMeL had to peel letters off the
    surface to reach an abbreviation letter (أَن -> أ + ن).

    Equal length is never a reason to reject on its own, so the single-letter
    surah openers صٓ and نٓ - where the abbreviation reading is the real one -
    stay selectable. The v1.2 "stem is one letter" test wrongly caught those.
    """
    if candidate.get("pos") != "abbrev":
        return False
    return _stem_letters(candidate) < len(surf_skel)


def is_rootless_noun_prop(candidate: dict) -> bool:
    return (candidate.get("pos") == "noun_prop"
            and COVERAGE.normalize_root(candidate.get("root")) is None)


def is_selectable_evidence(candidate: dict, surf_skel: str) -> bool:
    """May this candidate WIN a selection? It always stays in the pool.

    `foreign` handling is exactly the v1.1 restriction - not widened. There is no
    general `noun_prop` ban and no proper-name allowlist: a rootless `noun_prop`
    is eligible again, as in v1.1.
    """
    if candidate.get("pos") == "foreign" or candidate.get("source") == "foreign":
        return False
    if str(candidate.get("root") or "").strip() in _NO_INFO_ROOTS:
        return False
    if is_letter_name_abbrev(candidate, surf_skel):
        return False
    if is_fallback_analysis(candidate):
        return False
    return True


def ineligibility_reason(candidate: dict, surf_skel: str):
    if candidate.get("pos") == "foreign" or candidate.get("source") == "foreign":
        return "foreign_fallback"
    if str(candidate.get("root") or "").strip() in _NO_INFO_ROOTS:
        return "no_information_root"
    if is_letter_name_abbrev(candidate, surf_skel):
        return "abbrev_stem_shorter_than_token"
    if is_fallback_analysis(candidate):
        return "self_gloss_echo"
    return None


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
    "R1B_UNIQUE_ELIGIBLE_CANDIDATE",
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
    "R1B_UNIQUE_ELIGIBLE_CANDIDATE": "high",
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
    deduped = sorted(seen.values(), key=lambda c: c["_fp"])
    if not deduped:
        return None, None, chain, "EMPTY_POOL"

    norm_surface = normalize_vocalized(surface)
    surf_skel = skeleton(surface)

    # R1 is unchanged: one candidate after dedupe still decides the token - unless
    # that single candidate is an artifact, which is reported, not selected.
    if len(deduped) == 1:
        if not is_selectable_evidence(deduped[0], surf_skel):
            return None, None, chain, (
                f"AMBIGUOUS_ARTIFACT_ONLY::{ineligibility_reason(deduped[0], surf_skel)}")
        return deduped[0], "R1_UNIQUE_AFTER_DEDUPE", chain, None

    # Ineligible analyses stay in `deduped` for diagnostics but never compete.
    live = [c for c in deduped if is_selectable_evidence(c, surf_skel)]
    if not live:
        reasons = sorted({ineligibility_reason(c, surf_skel) for c in deduped})
        return None, None, chain, f"AMBIGUOUS_ARTIFACT_ONLY::{'+'.join(reasons)}"
    if len(live) == 1:
        return live[0], "R1B_UNIQUE_ELIGIBLE_CANDIDATE", chain, None

    diagnostic_only = False

    def narrow(subset, rule, selecting=True):
        """Apply a filter only when it keeps at least one candidate.

        `selecting=False` marks a diagnostic rule: it may narrow the field, but
        it is never allowed to be the reason a candidate is chosen."""
        nonlocal live, diagnostic_only
        if subset and len(subset) < len(live):
            live = subset
            chain.append(rule)
            if not selecting:
                diagnostic_only = True
        return selecting and len(live) == 1

    # R2: the candidate spells the token exactly, vowels and all - but only real
    # lexical analyses count. A fallback's diac IS the input, so it would match
    # every time without carrying any evidence.
    exact = [c for c in live if c["_norm_diac"] == norm_surface]
    if narrow(exact, "R2_EXACT_VOCALIZED_DIAC"):
        return live[0], "R2_EXACT_VOCALIZED_DIAC", chain, None

    # v1.2a: the v1.2 "rootless noun_prop may only win under R2" restriction is
    # removed. It cost 7 legitimate proper names (عُزَيْر, لُوط x4, سُلَيْمَان, إِلْيَاس)
    # and no candidate-only field separates those from the artifacts, so v1.1
    # behaviour is restored: rootless `noun_prop` competes normally, and v1.1's
    # R9 guard still refuses to build a consensus out of it alone.

    # R3 (diagnostic only): drop readings whose clitics contradict the surface.
    ok = [c for c in live if clitics_consistent(c, surf_skel)]
    narrow(ok, "R3_CLITIC_SURFACE_CONSISTENCY", selecting=False)

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

    # R6 (diagnostic only): same consonant skeleton as the token.
    same = [c for c in live if c["_skel"] == surf_skel]
    narrow(same, "R6_SKELETON_MATCH", selecting=False)

    # R7: after a token whose whole pool is a preposition, a nominal is genitive.
    if prev_pool and all(c.get("pos") == "prep" for c in prev_pool):
        gen = [c for c in live if c.get("cas") == "g"]
        if narrow(gen, "R7_PREV_TOKEN_PREPOSITION_GENITIVE"):
            return live[0], "R7_PREV_TOKEN_PREPOSITION_GENITIVE", chain, None

    # R8: idafa - a nominal followed by a token whose whole pool is genitive is
    # itself in construct state.
    # R8 (diagnostic only as of v1.2): measured at 58.8% accuracy over 17 tokens,
    # below every selecting rule and below the selector's own judged accuracy, so
    # it narrows but no longer decides.
    if next_pool and all(
            c.get("cas") == "g" and COVERAGE.POS_MAP.get(c.get("pos")) == {"N"}
            for c in next_pool):
        construct = [c for c in live if c.get("stt") == "c"]
        narrow(construct, "R8_NEXT_TOKEN_GENITIVE_CONSTRUCT", selecting=False)

    # R9: every survivor agrees on root+lemma+POS. The lexical reading is then
    # decided even though the morphosyntactic features are not; pick the
    # fingerprint-ordered first and flag the residual feature ambiguity.
    # Fallbacks carry no lexical content, so they can neither form nor break a
    # consensus - they are dropped before the agreement is tested.
    real_live = [c for c in live if not is_fallback_analysis(c)]
    cores = {(COVERAGE.normalize_root(c.get("root")),
              COVERAGE.normalize_lemma(c.get("lex")),
              c.get("pos")) for c in real_live}
    if real_live and len(cores) == 1:
        root, lemma, pos = next(iter(cores))
        # Agreement must rest on a real shared value, not on shared emptiness.
        has_content = root is not None or lemma is not None
        rootless_prop_only = root is None and pos == "noun_prop"
        if has_content and not rootless_prop_only:
            if diagnostic_only and len(live) == 1:
                return None, None, chain, "ONLY_NON_SELECTING_EVIDENCE::1_survivor"
            return sorted(real_live, key=lambda c: c["_fp"])[0], \
                "R9_UNANIMOUS_LEXICAL_CORE", chain, None

    if diagnostic_only and len(live) == 1:
        return None, None, chain, "ONLY_NON_SELECTING_EVIDENCE::1_survivor"

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

    # ---- EVALUATION ONLY: narrow POS compatibility map ---------------------
    # Never consulted by select(); applied solely when scoring against the
    # teacher, to stop QAC/CAMeL label-boundary differences counting as errors.
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
    # v1 -> v1.1 comparison (v1 outputs are read-only and never modified)
    # ======================================================================
    def fallback_row(sel):
        """Fallback test applied to a persisted row (no `source`/`gloss` in v1)."""
        if not sel:
            return False
        if sel.get("pos") == "foreign":
            return True
        return str(sel.get("root") or "").strip() in _NO_INFO_ROOTS

    baseline = {}
    if BASELINE_SELECTION.exists():
        for line in BASELINE_SELECTION.open(encoding="utf-8"):
            obj = json.loads(line)
            baseline[(obj["verse_key"], obj["word_index"])] = obj

    transition = Counter()
    correct_to_incorrect = []
    incorrect_to_ambiguous = 0
    v1_r2_foreign = 0
    v1_r9_null_consensus = 0
    for key, obj in baseline.items():
        sel = obj.get("selected")
        if obj.get("selection_rule") == "R2_EXACT_VOCALIZED_DIAC" and fallback_row(sel):
            v1_r2_foreign += 1
        if obj.get("selection_rule") == "R9_UNANIMOUS_LEXICAL_CORE" and sel:
            root = COVERAGE.normalize_root(sel.get("root"))
            lemma = COVERAGE.normalize_lemma(sel.get("lex"))
            if (root is None and lemma is None) or fallback_row(sel) or (
                    root is None and sel.get("pos") == "noun_prop"):
                v1_r9_null_consensus += 1

    by_key = {(r["verse_key"], r["word_index"]): r for r in rows}
    v11_r2_foreign = 0
    v11_r9_null_consensus = 0
    for key, row in by_key.items():
        sel = row.get("selected")
        if row.get("selection_rule") == "R2_EXACT_VOCALIZED_DIAC" and fallback_row(sel):
            v11_r2_foreign += 1
        if row.get("selection_rule") == "R9_UNANIMOUS_LEXICAL_CORE" and sel:
            root = COVERAGE.normalize_root(sel.get("root"))
            lemma = COVERAGE.normalize_lemma(sel.get("lex"))
            if (root is None and lemma is None) or fallback_row(sel) or (
                    root is None and sel.get("pos") == "noun_prop"):
                v11_r9_null_consensus += 1
        old = baseline.get(key)
        if not old:
            continue
        transition[f"{old.get('verdict')}->{row['verdict']}"] += 1
        if old.get("verdict") == "CORRECT" and row["verdict"] == "INCORRECT":
            correct_to_incorrect.append({
                "verse_key": row["verse_key"], "word_index": row["word_index"],
                "arabic": row["arabic"],
                "v1_rule": old.get("selection_rule"),
                "v1_selected": old.get("selected"),
                "v1_1_rule": row.get("selection_rule"),
                "v1_1_selected": row.get("selected"),
            })
        if old.get("verdict") == "INCORRECT" and row["verdict"] == "AMBIGUOUS":
            incorrect_to_ambiguous += 1

    # ---- artifact-selection targets ---------------------------------------
    def artifact_kind(sel, t_row=None):
        if not sel:
            return None
        if sel.get("pos") == "foreign":
            return "foreign"
        if str(sel.get("root") or "").strip() in _NO_INFO_ROOTS:
            return "no_information_root"
        if sel.get("pos") == "abbrev":
            return "abbrev"
        if (COVERAGE.normalize_root(sel.get("root")) is None
                and sel.get("pos") == "noun_prop"):
            return "rootless_noun_prop"
        return None

    v11_artifacts = Counter()
    v12_artifacts = Counter()
    for obj in baseline.values():
        if obj.get("verdict") in ("CORRECT", "INCORRECT"):
            kind = artifact_kind(obj.get("selected"))
            if kind:
                v11_artifacts[kind] += 1
    for row in rows:
        if row.get("verdict") in ("CORRECT", "INCORRECT"):
            kind = artifact_kind(row.get("selected"))
            if kind:
                v12_artifacts[kind] += 1

    # Legitimate proper names that the rootless-noun_prop policy cost us.
    legit_prop_lost = []
    for key, obj in baseline.items():
        if obj.get("verdict") != "CORRECT":
            continue
        if artifact_kind(obj.get("selected")) != "rootless_noun_prop":
            continue
        new = by_key.get(key)
        if new and new.get("verdict") != "CORRECT":
            legit_prop_lost.append({
                "verse_key": key[0], "word_index": key[1],
                "arabic": obj.get("arabic"),
                "teacher_role": teacher[key].get("role"),
                "teacher_lemma": teacher[key].get("lemma"),
                "v1_1_rule": obj.get("selection_rule"),
                "v1_1_selected_lex": (obj.get("selected") or {}).get("lex"),
                "v1_2_verdict": new.get("verdict"),
                "v1_2_reason": new.get("ambiguous_reason"),
            })

    legit_abbrev_lost = []
    for key, obj in baseline.items():
        if obj.get("verdict") != "CORRECT":
            continue
        if artifact_kind(obj.get("selected")) != "abbrev":
            continue
        new = by_key.get(key)
        if new and new.get("verdict") != "CORRECT":
            legit_abbrev_lost.append({
                "verse_key": key[0], "word_index": key[1],
                "arabic": obj.get("arabic"),
                "v1_2_verdict": new.get("verdict"),
                "v1_2_reason": new.get("ambiguous_reason"),
            })

    # R8's former 17 selections.
    r8_followup = []
    for key, obj in baseline.items():
        if obj.get("selection_rule") != "R8_NEXT_TOKEN_GENITIVE_CONSTRUCT":
            continue
        new = by_key.get(key)
        r8_followup.append({
            "verse_key": key[0], "word_index": key[1], "arabic": obj.get("arabic"),
            "v1_1_verdict": obj.get("verdict"),
            "v1_2_rule": new.get("selection_rule") if new else None,
            "v1_2_verdict": new.get("verdict") if new else None,
            "v1_2_reason": new.get("ambiguous_reason") if new else None,
        })

    # How many v1.1 abbrev selections does the new stem-length test rule out?
    abbrev_blocked_count = 0
    abbrev_blocked_by_verdict = Counter()
    for key, obj in baseline.items():
        sel = obj.get("selected") or {}
        if sel.get("pos") != "abbrev" or obj.get("verdict") not in ("CORRECT", "INCORRECT"):
            continue
        stem_len = len(skeleton(sel.get("lex") or ""))
        if stem_len < len(skeleton(obj.get("arabic") or "")):
            abbrev_blocked_count += 1
            abbrev_blocked_by_verdict[obj["verdict"]] += 1

    # ---- the failed v1.2, for the three-way comparison --------------------
    failed_v12 = {}
    if FAILED_V1_2_SELECTION.exists():
        for line in FAILED_V1_2_SELECTION.open(encoding="utf-8"):
            obj = json.loads(line)
            failed_v12[(obj["verse_key"], obj["word_index"])] = obj

    def status_of(store, key):
        row = store.get(key)
        if not row:
            return None
        return {
            "verdict": row.get("verdict"),
            "rule": row.get("selection_rule"),
            "selected_lex": (row.get("selected") or {}).get("lex"),
            "selected_pos": (row.get("selected") or {}).get("pos"),
            "reason": row.get("ambiguous_reason"),
        }

    restored_proper_names = {}
    for key in EXPECTED_RESTORED_PROPER_NAMES:
        restored_proper_names[f"{key[0]}:{key[1]}"] = {
            "arabic": (by_key.get(key) or {}).get("arabic"),
            "v1_1": status_of(baseline, key),
            "v1_2_failed": status_of(failed_v12, key),
            "v1_2a": status_of(by_key, key),
            "restored": (by_key.get(key) or {}).get("verdict") == "CORRECT",
        }
    muqattaat = {}
    for key in EXPECTED_PRESERVED_ABBREV:
        muqattaat[f"{key[0]}:{key[1]}"] = {
            "arabic": (by_key.get(key) or {}).get("arabic"),
            "v1_1": status_of(baseline, key),
            "v1_2_failed": status_of(failed_v12, key),
            "v1_2a": status_of(by_key, key),
            "preserved": (by_key.get(key) or {}).get("verdict") == "CORRECT",
        }

    baseline_report = {}
    baseline_report_path = BASELINE_SELECTION.parent / "report.json"
    if baseline_report_path.exists():
        baseline_report = json.loads(baseline_report_path.read_text(encoding="utf-8"))

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
            "diagnostic_only_rules": ["R3_CLITIC_SURFACE_CONSISTENCY",
                                      "R6_SKELETON_MATCH"],
            "v1_1_changes": [
                "R2 ignores fallback analyses (foreign/source=foreign/FOREIGN/NOAN "
                "roots and rootless self-gloss echoes) as surface evidence",
                "R9 drops fallbacks, requires a non-null shared root or lemma, and "
                "rejects rootless noun_prop-only agreement",
                "R3 and R6 narrow but never select; if only they point at a "
                "candidate the token stays AMBIGUOUS",
            ],
            "unchanged": ["R1", "R4", "R5", "R7", "R8",
                          "frozen recall layer (R1-R5 + gate + Dawud allowlist)"],
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
        "comparison_v1_1_to_v1_2a": {
            "v1": {
                "verdicts": baseline_report.get("verdicts"),
                "field_accuracy": baseline_report.get("field_accuracy"),
                "rule_coverage_and_accuracy": baseline_report.get(
                    "rule_coverage_and_accuracy"),
            },
            "targets": {
                "artifact_selections_target_0": sum(v12_artifacts.values()) == 0,
                "abbrev_selections_target_0": v12_artifacts["abbrev"] == 0,
                "rootless_noun_prop_selections_target_0":
                    v12_artifacts["rootless_noun_prop"] == 0,
                "correct_to_incorrect_target_0": len(correct_to_incorrect) == 0,
            },
            "artifact_selections": {
                "v1_1": dict(sorted(v11_artifacts.items())),
                "v1_1_total": sum(v11_artifacts.values()),
                "v1_2": dict(sorted(v12_artifacts.items())),
                "v1_2_total": sum(v12_artifacts.values()),
            },
            "restored_proper_names": {
                "expected": len(EXPECTED_RESTORED_PROPER_NAMES),
                "restored": sum(1 for v in restored_proper_names.values() if v["restored"]),
                "rows": restored_proper_names,
            },
            "muqattaat_abbrev_preserved": {
                "expected": len(EXPECTED_PRESERVED_ABBREV),
                "preserved": sum(1 for v in muqattaat.values() if v["preserved"]),
                "rows": muqattaat,
            },
            "abbrev_blocked_by_shorter_stem": {
                "definition": ("v1.1 selections whose abbrev analysis v1.2a rules out "
                               "because its stem skeleton is shorter than the token's"),
                "tokens": abbrev_blocked_count,
                "by_v1_1_verdict": dict(sorted(abbrev_blocked_by_verdict.items())),
                "tokens_all_candidates_ineligible": sum(
                    1 for r in rows
                    if "abbrev_stem_shorter_than_token" in str(r.get("ambiguous_reason") or "")),
            },
            "legitimate_selections_lost": {
                "proper_names_rootless_noun_prop": len(legit_prop_lost),
                "proper_names_rows": legit_prop_lost,
                "abbrev": len(legit_abbrev_lost),
                "abbrev_sample": legit_abbrev_lost[:10],
            },
            "r8_former_selections": {
                "tokens": len(r8_followup),
                "rows": sorted(r8_followup,
                               key=lambda r: sort_key((r["verse_key"], r["word_index"]))),
            },
            "scoring_with_compatibility_map": {
                "raw_correct": verdicts["CORRECT"],
                "mapped_correct": verdicts["MAPPED_CORRECT"],
                "judged": verdicts["CORRECT"] + verdicts["INCORRECT"],
                "raw_accuracy_pct": round(
                    100.0 * verdicts["CORRECT"]
                    / (verdicts["CORRECT"] + verdicts["INCORRECT"]), 3)
                if (verdicts["CORRECT"] + verdicts["INCORRECT"]) else None,
                "mapped_accuracy_pct": round(
                    100.0 * verdicts["MAPPED_CORRECT"]
                    / (verdicts["CORRECT"] + verdicts["INCORRECT"]), 3)
                if (verdicts["CORRECT"] + verdicts["INCORRECT"]) else None,
                "lexical_core_correct": verdicts["LEXICAL_CORE_CORRECT"],
                "lexical_core_accuracy_pct": round(
                    100.0 * verdicts["LEXICAL_CORE_CORRECT"]
                    / (verdicts["CORRECT"] + verdicts["INCORRECT"]), 3)
                if (verdicts["CORRECT"] + verdicts["INCORRECT"]) else None,
            },
            "verdict_transitions": dict(sorted(transition.items(),
                                               key=lambda kv: (-kv[1], kv[0]))),
            "correct_to_incorrect": len(correct_to_incorrect),
            "correct_to_incorrect_rows": correct_to_incorrect[:50],
            "incorrect_to_ambiguous": incorrect_to_ambiguous,
        },
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

    digest_comparison = {
        k: v for k, v in report["comparison_v1_1_to_v1_2a"].items()
        if k != "correct_to_incorrect_rows"
    }
    digest_comparison["v1"] = {
        "verdicts": digest_comparison["v1"]["verdicts"],
        "field_accuracy": digest_comparison["v1"]["field_accuracy"],
    }
    digest_comparison["r8_former_selections"] = {
        "tokens": report["comparison_v1_1_to_v1_2a"]["r8_former_selections"]["tokens"],
        "new_status": dict(sorted(Counter(
            f"{r['v1_1_verdict']}->{r['v1_2_verdict']}"
            for r in report["comparison_v1_1_to_v1_2a"]["r8_former_selections"]["rows"]
        ).items())),
    }
    lost = report["comparison_v1_1_to_v1_2a"]["legitimate_selections_lost"]
    digest_comparison["legitimate_selections_lost"] = {
        "proper_names_rootless_noun_prop": lost["proper_names_rootless_noun_prop"],
        "abbrev": lost["abbrev"],
    }
    print(json.dumps({k: report[k] for k in
                      ("verdicts", "field_accuracy", "rule_coverage_and_accuracy",
                       "ambiguous_reasons")}
                     | {"comparison_v1_1_to_v1_2a": digest_comparison}
                     | {"top_3_error_classes": [
                         {"signature": e["signature"], "tokens": e["tokens"]}
                         for e in report["top_3_error_classes"]]}
                     | {"checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
