#!/usr/bin/env python3
"""Classify the CAMeL recall gap that survives the frozen hamza rescue rules.

Input scope: the 1,020 tokens that are still CAMEL_OOV or NO_MATCH after
`rescue-hamza-madda-recall.py`. The 892 tokens with no bare hamza on the surface
are the priority; the 128 hamza-class leftovers are reported separately and are
NOT given a wider rule.

Method: a closed set of narrow, surface-only probe transforms is applied to the
existing analyzer forms. Each probe is tried on its own, then in a fixed
escalation ladder. A token is assigned to the *smallest* probe level whose extra
candidates make the teacher reading reachable. Nothing is ranked or selected.

Guarantees:
  * `arabic` and the token identity always come from Tanzil / the teacher row.
  * No general dediacritization and no broad character folding: every probe is a
    single named orthographic operation.
  * Teacher root/lemma/POS are read only when scoring a probe, never when
    building one.
  * The three frozen hamza rules are imported unchanged and are always applied
    first, so every number here is the *marginal* gain on top of them.
  * full-analysis/, token-map.jsonl, the teacher export and the production DB
    are read-only.
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

from hamza_madda_rescue_rules import apply_rules, motifs  # noqa: E402

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
DB_PATH = CAMEL_ROOT / "sources/camel-morph-msa-v1.0/camel_morph_msa_v1.0.db"
TOKEN_MAP_PATH = CAMEL_ROOT / "token-map.jsonl"
FULL_ANALYSIS_DIR = CAMEL_ROOT / "full-analysis"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
RESCUE_TOKENS = CAND_ROOT / "hamza-madda-rescue" / "rescue-tokens.jsonl"
OUT_DIR = CAND_ROOT / "residual-recall-gap"

SCHEMA_VERSION = "residual-recall-gap-v1"
RESIDUAL_CLASSES = {"NO_MATCH", "CAMEL_OOV"}


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


COVERAGE = load_module(SCRIPT_DIR / "analyze-teacher-camel-coverage.py", "coverage_analysis")

# --------------------------------------------------------------------------
# Closed probe set. Each entry is ONE named orthographic operation.
# --------------------------------------------------------------------------
WASLA = "ٱ"
ALEF = "ا"
DAGGER = "ٰ"
TATWEEL = "ـ"
MAQSURA = "ى"
YEH = "ي"
TA_MARBUTA = "ة"
HA = "ه"
MADDAH_ABOVE = "ٓ"
ALEF_MADDA = "آ"
SMALL_MARKS = "".join(chr(c) for c in range(0x06D6, 0x06EE))
# U+06E5/U+06E6 are the Uthmani small waw/yeh that spell a lengthened pronoun
# vowel (هُۥ, هِۦ); U+06DF marks a silent alef. They are separated from the pure
# recitation/waqf marks so the minimal contract can be stated precisely.
SILENT_LETTER_MARKS = "ۥۦ۟"
WAQF_MARKS = "".join(ch for ch in SMALL_MARKS if ch not in SILENT_LETTER_MARKS)
HARAKAT = "ًٌٍَُِّْ"

_SMALL_RE = re.compile(f"[{SMALL_MARKS}]")
_SILENT_RE = re.compile(f"[{SILENT_LETTER_MARKS}]")
_WAQF_RE = re.compile(f"[{WAQF_MARKS}]")
_FINAL_WAW_RE = re.compile(r"و([" + HARAKAT + r"]*)$")
_HARAKAT_RE = re.compile(f"[{HARAKAT}]")
_PREFIX_RE = re.compile(r"^(?:وَ|فَ|بِ|كَ|لِ|لَ|سَ|و|ف|ب|ك|ل|س)")
_DET_RE = re.compile(r"^(?:ٱل|ال)")
_SUFFIX_RE = re.compile(
    r"(?:هُمَا|هِمَا|كُمَا|هُمْ|هِمْ|هُنَّ|هِنَّ|كُمْ|كُنَّ|نَا|هُۥ|هُ|هِ|هَا|كَ|كِ|نِى|نِي|ىَ|ي)$"
)


def p_strip_small_marks(text: str) -> str:
    return _SMALL_RE.sub("", text)


def p_wasla_to_alef(text: str) -> str:
    return text.replace(WASLA, ALEF)


def p_dagger_to_alef(text: str) -> str:
    return text.replace(DAGGER, ALEF)


def p_strip_tatweel(text: str) -> str:
    return text.replace(TATWEEL, "")


def p_maqsura_to_yeh(text: str) -> str:
    return text.replace(MAQSURA, YEH)


def p_yeh_to_maqsura(text: str) -> str:
    return text[:-1] + MAQSURA if text.endswith(YEH) else text


def p_ta_marbuta_to_ha(text: str) -> str:
    return text[:-1] + HA if text.endswith(TA_MARBUTA) else text


def p_ha_to_ta_marbuta(text: str) -> str:
    return text[:-1] + TA_MARBUTA if text.endswith(HA) else text


def p_compose_maddah(text: str) -> str:
    return text.replace(ALEF + MADDAH_ABOVE, ALEF_MADDA).replace(WASLA + MADDAH_ABOVE, ALEF_MADDA)


def p_strip_harakat(text: str) -> str:
    return _HARAKAT_RE.sub("", text)


def p_strip_silent_letter_marks(text: str) -> str:
    return _SILENT_RE.sub("", text)


def p_strip_waqf_marks(text: str) -> str:
    return _WAQF_RE.sub("", text)


def p_final_waw_otiose_alef(text: str) -> str:
    return _FINAL_WAW_RE.sub(lambda m: "و" + m.group(1) + ALEF, text)


PROBES = {
    "P1a_STRIP_SILENT_LETTER_MARKS": p_strip_silent_letter_marks,
    "P1b_STRIP_WAQF_MARKS": p_strip_waqf_marks,
    "P1_STRIP_UTHMANI_SMALL_MARKS": p_strip_small_marks,
    "P11_FINAL_WAW_ADD_OTIOSE_ALEF": p_final_waw_otiose_alef,
    "P2_WASLA_TO_ALEF": p_wasla_to_alef,
    "P3_DAGGER_ALEF_TO_ALEF": p_dagger_to_alef,
    "P4_STRIP_TATWEEL": p_strip_tatweel,
    "P5_MAQSURA_TO_YEH": p_maqsura_to_yeh,
    "P6_FINAL_YEH_TO_MAQSURA": p_yeh_to_maqsura,
    "P7_FINAL_TA_MARBUTA_TO_HA": p_ta_marbuta_to_ha,
    "P8_FINAL_HA_TO_TA_MARBUTA": p_ha_to_ta_marbuta,
    "P9_COMPOSE_MADDAH_ABOVE": p_compose_maddah,
    "P10_STRIP_HARAKAT": p_strip_harakat,
}

PROBE_DOC = {
    "P1a_STRIP_SILENT_LETTER_MARKS": "drop U+06E5/U+06E6 small waw+yeh and U+06DF rounded zero (silent-letter notation)",
    "P1b_STRIP_WAQF_MARKS": "drop the remaining U+06D6..U+06ED recitation/waqf marks",
    "P1_STRIP_UTHMANI_SMALL_MARKS": "drop all of U+06D6..U+06ED (superset of P1a+P1b)",
    "P11_FINAL_WAW_ADD_OTIOSE_ALEF": "word-final و -> وا (restore the otiose alef of the plural verb ending)",
    "P2_WASLA_TO_ALEF": "ٱ -> ا (hamzat wasl alef to plain alef)",
    "P3_DAGGER_ALEF_TO_ALEF": "U+0670 superscript alef -> ا",
    "P4_STRIP_TATWEEL": "drop U+0640 kashida",
    "P5_MAQSURA_TO_YEH": "ى -> ي",
    "P6_FINAL_YEH_TO_MAQSURA": "word-final ي -> ى",
    "P7_FINAL_TA_MARBUTA_TO_HA": "word-final ة -> ه",
    "P8_FINAL_HA_TO_TA_MARBUTA": "word-final ه -> ة",
    "P9_COMPOSE_MADDAH_ABOVE": "ا/ٱ + U+0653 -> آ",
    "P10_STRIP_HARAKAT": "drop short vowels / shadda / sukun (already in the frozen ladder)",
}

# Escalation ladder applied after the single-probe pass.
ORTHO_ALL = [
    "P1_STRIP_UTHMANI_SMALL_MARKS", "P4_STRIP_TATWEEL", "P9_COMPOSE_MADDAH_ABOVE",
    "P3_DAGGER_ALEF_TO_ALEF", "P2_WASLA_TO_ALEF",
]

LEVEL_ORTHO_COMBO = "L2_ORTHO_COMBINATION"
LEVEL_ORTHO_LETTER = "L3_ORTHO_PLUS_LETTER_VARIANT"
LEVEL_SEG_PREFIX = "L4_PROCLITIC_SEGMENTATION"
LEVEL_SEG_SUFFIX = "L5_ENCLITIC_SEGMENTATION"
LEVEL_SEG_BOTH = "L6_PROCLITIC_AND_ENCLITIC"
LEVEL_NONE = "L7_NOT_REACHABLE"


def chain(text: str, probe_ids) -> str:
    for probe_id in probe_ids:
        text = PROBES[probe_id](text)
    return text


def strip_proclitic(text: str) -> str:
    stripped = _DET_RE.sub("", text)
    if stripped != text:
        return stripped
    stripped = _PREFIX_RE.sub("", text)
    stripped = _DET_RE.sub("", stripped)
    return stripped


def strip_enclitic(text: str) -> str:
    """Strip up to two stacked enclitics (فَسَيَكْفِيكَهُمُ = ...كَ + هُمُ)."""
    for _ in range(2):
        stripped = _SUFFIX_RE.sub("", text)
        if stripped == text or not stripped:
            break
        text = stripped
    return text


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


def main() -> int:
    for path in (RESCUE_TOKENS, TEACHER_PATH, TOKEN_MAP_PATH, DB_PATH, FULL_ANALYSIS_DIR):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    residual = {}
    for line in RESCUE_TOKENS.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj["in_target_set"] and obj["classification_after"] in RESIDUAL_CLASSES:
            residual[(obj["verse_key"], obj["word_index"])] = obj

    teacher = {}
    for line in TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        key = (obj["verse_key"], obj["word_index"])
        if key in residual:
            teacher[key] = obj

    forms_by_token = {}
    canonical = {}
    all_surfaces = Counter()
    for line in TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        key = (obj["verse_key"], obj["word_index"])
        all_surfaces[obj["canonical_text"]] += 1
        if key in residual:
            forms_by_token[key] = list(obj["analysis_forms"])
            canonical[key] = obj["canonical_text"]

    # One pass over the frozen dump: the residual pools plus the *reachable*
    # CAMeL lexicon (every lemma/root the analyzer ever emitted for the Quran).
    # That set is what separates a true lexicon OOV from a surface-reachability
    # gap.
    base_pools = {}
    reachable_lemmas = set()
    reachable_roots = set()
    for path in sorted(FULL_ANALYSIS_DIR.glob("surah-*.jsonl.gz")):
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                for candidate in obj.get("unique_candidates") or []:
                    lemma = COVERAGE.normalize_lemma(candidate.get("lex"))
                    if lemma:
                        reachable_lemmas.add(lemma)
                    root = COVERAGE.normalize_root(candidate.get("root"))
                    if root:
                        reachable_roots.add(root)
                if key in residual:
                    base_pools[key] = obj.get("unique_candidates") or []

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def label_for(key, extra_forms):
        """Classify the token with base + hamza-rescue + extra_forms candidates."""
        pool = list(base_pools.get(key, []))
        for form in extra_forms:
            pool.extend(analyze(form))
        return COVERAGE.classify(teacher[key], COVERAGE.summarize_candidates({"unique_candidates": pool}))[0]

    rows = []
    level_counts = Counter()
    probe_counts = Counter()
    probe_surfaces = defaultdict(set)
    probe_examples = defaultdict(list)
    exact_after = Counter()

    for key in sorted(residual, key=sort_key):
        base_forms = forms_by_token[key]
        # The three frozen hamza rules are always applied first.
        hamza_forms = []
        for form in base_forms:
            variant, rules = apply_rules(form)
            if rules and variant not in base_forms:
                hamza_forms.append(variant)
        start_forms = list(dict.fromkeys(base_forms + hamza_forms))

        probed_any_candidate = False
        winner_level = None
        winner_probe = None
        winner_form = None
        winner_label = None

        # L1: one single probe.
        for probe_id in PROBES:
            extra = []
            for form in start_forms:
                variant = PROBES[probe_id](form)
                hamza_variant, hamza_rules = apply_rules(variant)
                if hamza_rules:
                    variant = hamza_variant
                if variant not in start_forms:
                    extra.append(variant)
            if not extra:
                continue
            probed_any_candidate = probed_any_candidate or any(analyze(f) for f in extra)
            label = label_for(key, extra)
            if label not in RESIDUAL_CLASSES:
                winner_level = f"L1_SINGLE::{probe_id}"
                winner_probe = probe_id
                winner_form = extra[0]
                winner_label = label
                break

        # L2..L6: escalation.
        if winner_level is None:
            ladders = [
                (LEVEL_ORTHO_COMBO, ORTHO_ALL, None),
                (LEVEL_ORTHO_COMBO, ORTHO_ALL + ["P11_FINAL_WAW_ADD_OTIOSE_ALEF"], None),
                (LEVEL_ORTHO_LETTER, ORTHO_ALL + ["P5_MAQSURA_TO_YEH"], None),
                (LEVEL_ORTHO_LETTER, ORTHO_ALL + ["P6_FINAL_YEH_TO_MAQSURA"], None),
                (LEVEL_ORTHO_LETTER, ORTHO_ALL + ["P7_FINAL_TA_MARBUTA_TO_HA"], None),
                (LEVEL_ORTHO_LETTER, ORTHO_ALL + ["P8_FINAL_HA_TO_TA_MARBUTA"], None),
                (LEVEL_SEG_PREFIX, ORTHO_ALL, "prefix"),
                (LEVEL_SEG_SUFFIX, ORTHO_ALL, "suffix"),
                (LEVEL_SEG_BOTH, ORTHO_ALL, "both"),
            ]
            for level, probe_ids, segmentation in ladders:
                extra = []
                for form in start_forms:
                    variant = chain(form, probe_ids)
                    if segmentation in ("prefix", "both"):
                        variant = strip_proclitic(variant)
                    if segmentation in ("suffix", "both"):
                        variant = strip_enclitic(variant)
                    hamza_variant, hamza_rules = apply_rules(variant)
                    if hamza_rules:
                        variant = hamza_variant
                    if variant and variant not in start_forms:
                        extra.append(variant)
                if not extra:
                    continue
                probed_any_candidate = probed_any_candidate or any(analyze(f) for f in extra)
                label = label_for(key, extra)
                if label not in RESIDUAL_CLASSES:
                    winner_level = level
                    winner_probe = "+".join(probe_ids) + (f"+SEG:{segmentation}" if segmentation else "")
                    winner_form = extra[0]
                    winner_label = label
                    break

        if winner_level is None:
            winner_level = LEVEL_NONE
            winner_probe = None
            winner_label = residual[key]["classification_after"]

        if winner_level == LEVEL_NONE:
            # Sub-classify the unreachable group: is the teacher lemma/root known
            # to CAMeL anywhere in the Quran, or absent from the lexicon?
            t_lemma = COVERAGE.normalize_lemma(teacher[key].get("lemma"))
            t_root = COVERAGE.normalize_root(teacher[key].get("root"))
            lemma_known = bool(t_lemma) and t_lemma in reachable_lemmas
            root_known = bool(t_root) and t_root in reachable_roots
            if teacher[key].get("role") == "PN":
                winner_level = "L7A_PROPER_NOUN"
            elif not lemma_known and not root_known:
                winner_level = "L7B_LEXICON_OOV"
            elif lemma_known:
                winner_level = "L7C_LEMMA_KNOWN_FORM_UNANALYZABLE"
            else:
                winner_level = "L7D_ROOT_KNOWN_LEMMA_ABSENT"

        surface = canonical[key]
        motif = "+".join(motifs(surface))
        hamza_leftover = motif != "NO_BARE_HAMZA"
        bucket = f"{winner_level}" if not hamza_leftover else f"HAMZA_LEFTOVER::{winner_level}"

        level_counts[bucket] += 1
        probe_counts[winner_probe or "-"] += 1
        probe_surfaces[bucket].add(surface)
        if winner_label == "EXACT_CORE":
            exact_after[bucket] += 1
        if len(probe_examples[bucket]) < 5:
            probe_examples[bucket].append(
                {
                    "verse_key": key[0],
                    "word_index": key[1],
                    "arabic": surface,
                    "analyzer_form": winner_form,
                    "probe": winner_probe,
                    "label_after": winner_label,
                    "teacher_root": teacher[key]["root"],
                    "teacher_lemma": teacher[key]["lemma"],
                    "teacher_pos": teacher[key]["pos"],
                }
            )

        rows.append(
            {
                "verse_key": key[0],
                "word_index": key[1],
                "arabic": surface,
                "hamza_motif": motif,
                "level": winner_level,
                "probe": winner_probe,
                "analyzer_form": winner_form,
                "any_probe_variant_analyzable": probed_any_candidate,
                "label_before": residual[key]["classification_after"],
                "label_after": winner_label,
            }
        )

    # ---- repo-wide trigger sizing for each probe (surface only) -------------
    trigger_repo_wide = {}
    for probe_id, fn in PROBES.items():
        trigger_repo_wide[probe_id] = sum(
            count for surface, count in all_surfaces.items() if fn(surface) != surface
        )

    out_tokens = OUT_DIR / "residual-classification.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for row in rows:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    no_hamza = [r for r in rows if r["hamza_motif"] == "NO_BARE_HAMZA"]
    hamza_left = [r for r in rows if r["hamza_motif"] != "NO_BARE_HAMZA"]

    def summarize(subset):
        counter = Counter(r["level"] for r in subset)
        return dict(sorted(counter.items(), key=lambda kv: (-kv[1], kv[0])))

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "rescue_tokens_sha256": sha256_file(RESCUE_TOKENS),
            "teacher_sha256": sha256_file(TEACHER_PATH),
            "camel_db_sha256": sha256_file(DB_PATH),
        },
        "scope": {
            "residual_tokens": len(rows),
            "no_bare_hamza": len(no_hamza),
            "hamza_leftover": len(hamza_left),
            "distinct_surfaces": len({r["arabic"] for r in rows}),
        },
        "probe_contract": {
            "probes": {p: PROBE_DOC[p] for p in sorted(PROBE_DOC)},
            "ortho_combination": ORTHO_ALL,
            "frozen_hamza_rules_applied_first": True,
            "teacher_used_only_for_scoring": True,
        },
        "levels_no_bare_hamza": summarize(no_hamza),
        "levels_hamza_leftover": summarize(hamza_left),
        "clusters": {
            bucket: {
                "tokens": count,
                "distinct_surfaces": len(probe_surfaces[bucket]),
                "reaching_exact_core": exact_after.get(bucket, 0),
                "examples": probe_examples[bucket],
            }
            for bucket, count in sorted(level_counts.items(), key=lambda kv: (-kv[1], kv[0]))
        },
        "probe_repo_wide_trigger_tokens": dict(sorted(trigger_repo_wide.items())),
        "winning_probe_counts": dict(sorted(probe_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
    }

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n",
    )
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "report.json": sha256_file(out_report),
        "residual-classification.jsonl": sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n",
    )
    print(json.dumps(
        {"scope": report["scope"], "levels_no_bare_hamza": report["levels_no_bare_hamza"],
         "levels_hamza_leftover": report["levels_hamza_leftover"], "checksums": checksums},
        ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
