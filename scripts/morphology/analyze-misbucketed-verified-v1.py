#!/usr/bin/env python3
"""The 8 VERIFIED-but-misbucketed groups: why does the surface still fail?

CAMeL carries the lemma, the root and a compatible POS for all eight of these
lexemes, so nothing lexical is missing. This round asks the only remaining
question: what, at codepoint level, separates the canonical Tanzil surface from a
form CAMeL actually recognises?

The recognised form is not guessed. It is GENERATED from CAMeL's own tables -
prefix + stem + suffix, admitted only when (prefix,stem) is in TABLE AB,
(stem,suffix) in TABLE BC and (prefix,suffix) in TABLE AC - and then confirmed by
running the analyzer over it. The difference is reported as a codepoint edit
script against that generated form.

Problem classes are decided on which codepoints the edit touches:
  HAMZA_CARRIER        only hamza-family codepoints are substituted
  UTHMANI_ORTHOGRAPHY  the edit touches an Uthmani notation codepoint
                       (U+06DF, U+06E5, U+06E6, U+0670, U+0653, U+0640+U+0654)
                       or the ا/ى alternation
  CLITIC               the differing material is at a word edge and is spelled by
                       CAMeL's own prefix/suffix inventory
  PARADIGM             no generated realisation of the lexeme comes close
  OTHER                none of the above

Rules that were withdrawn or rejected earlier - O3, O4X, O6X, HC2..HC6X - are not
re-animated. Where the only thing that would close a token is one of them, that
is reported as such, not worked around.

The teacher is read only when scoring. No surface allowlist, no verse-key
override. No dump is regenerated and the selector is not run.
"""

from __future__ import annotations

import argparse
import collections
import difflib
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
VERIFICATION = CAND_ROOT / "lexicon-authoring-v1" / "verification.jsonl"
BASE_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
V1_7_SELECTION = CAND_ROOT / "selector-v1_7" / "selection.jsonl"
FREEZE = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"
OUT_DIR = CAND_ROOT / "misbucketed-verified-v1"

SCHEMA_VERSION = "misbucketed-verified-v1"
EXPECTED_GROUPS = 8
EXPECTED_TOKENS = 16
MAX_REALISATIONS = 400_000

CARRIERS = set("ءأإؤئآ")
UTHMANI_NOTATION = {"۟", "ۥ", "ۦ", "ٰ", "ٓ", "ـ",
                    "ٔ", "ۜ", "ۢ"}
ALEF_MAQSURA_PAIR = {"ا", "ى"}
_LEMMA_TAIL = re.compile(r"-.?$")
MARKS = re.compile("[ً-ْٰـٓ-ٕۖ-ۭ]")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_mb")
COVERAGE = V.COVERAGE
RECALL = V.RECALL
import orthographic_production_rules as ORTHO  # noqa: E402
import hamza_madda_rescue_rules as HAMZA  # noqa: E402
HC = load_module(SCRIPT_DIR / "analyze-hamza-carrier-v1.py", "hamza_carrier_v1")
HC1 = "HC1_BARE_AFTER_LONG_ALEF_BEFORE_WAW"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def camel_lemma_key(lex):
    return COVERAGE.normalize_lemma(_LEMMA_TAIL.sub("", lex)) if lex else None


def letters(text):
    return MARKS.sub("", text)


def codepoints(text):
    return " ".join(f"U+{ord(ch):04X}" for ch in text) if text else "(none)"


def parse_db(path: Path):
    prefixes, stems, suffixes = [], [], []
    ab, bc, ac = set(), set(), set()
    section = None
    for raw in path.read_text(encoding="utf-8").split("\n"):
        if raw.startswith("###"):
            section = raw.strip()
            continue
        if section in ("###PREFIXES###", "###STEMS###", "###SUFFIXES###"):
            parts = raw.split("\t")
            if len(parts) < 3:
                continue
            feats = {}
            for item in parts[2].split():
                if ":" in item:
                    name, value = item.split(":", 1)
                    feats[name] = value
            feats["_cat"] = parts[1]
            target = (prefixes if section == "###PREFIXES###" else
                      stems if section == "###STEMS###" else suffixes)
            target.append(feats)
        elif section in ("###TABLE AB###", "###TABLE BC###", "###TABLE AC###"):
            pair = raw.split()
            if len(pair) == 2:
                (ab if section == "###TABLE AB###" else
                 bc if section == "###TABLE BC###" else ac).add(tuple(pair))
    return prefixes, stems, suffixes, ab, bc, ac


def classify_edit(source, target):
    """Classify on the LETTER SKELETON.

    CAMeL vocalizes an MSA lemma; Tanzil vocalizes Uthmani recitation. Those two
    always differ in short vowels, so diffing the vocalized strings puts every
    token in the same bucket and says nothing. What discriminates is which
    LETTERS differ, plus which Uthmani notation codepoints sit in the differing
    span of the original surface."""
    src, tgt = letters(source), letters(target)
    ops = difflib.SequenceMatcher(None, src, tgt).get_opcodes()
    touched_src, touched_tgt, interior = set(), set(), False
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            continue
        touched_src |= set(src[i1:i2])
        touched_tgt |= set(tgt[j1:j2])
        if i1 != 0 and i2 != len(src):
            interior = True
    touched = touched_src | touched_tgt
    notation = {ch for ch in source if ch in UTHMANI_NOTATION}

    if not touched:
        # letters identical: only vocalization / notation differs
        return ("UTHMANI_ORTHOGRAPHY" if notation else "OTHER"), sorted(touched)
    if touched <= CARRIERS:
        return "HAMZA_CARRIER", sorted(touched)
    if not interior:
        return "CLITIC", sorted(touched)
    if notation or touched >= ALEF_MAQSURA_PAIR:
        return "UTHMANI_ORTHOGRAPHY", sorted(touched)
    return "OTHER", sorted(touched)


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

    groups = [json.loads(l) for l in VERIFICATION.open(encoding="utf-8")]
    groups = [g for g in groups if g["decision"] == "VERIFIED"]
    if len(groups) != EXPECTED_GROUPS:
        raise SystemExit(f"scope moved: {len(groups)} != {EXPECTED_GROUPS}")
    if sum(g["tokens"] for g in groups) != EXPECTED_TOKENS:
        raise SystemExit("token count moved")

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

    prefixes, stems, suffixes, ab, bc, ac = parse_db(BASE_DB)
    stems_by_lemma = collections.defaultdict(list)
    for stem in stems:
        key = camel_lemma_key(stem.get("lex"))
        if key:
            stems_by_lemma[key].append(stem)
    prefixes_by_cat = collections.defaultdict(list)
    for prefix in prefixes:
        prefixes_by_cat[prefix["_cat"]].append(prefix)
    suffixes_by_cat = collections.defaultdict(list)
    for suffix in suffixes:
        suffixes_by_cat[suffix["_cat"]].append(suffix)
    prefix_cats_for_stem = collections.defaultdict(set)
    for prefix_cat, stem_cat in ab:
        prefix_cats_for_stem[stem_cat].add(prefix_cat)
    suffix_cats_for_stem = collections.defaultdict(set)
    for stem_cat, suffix_cat in bc:
        suffix_cats_for_stem[stem_cat].add(suffix_cat)

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

    def realisations(lemma_key, target_letters):
        """CAMeL's own surface realisations of the lexeme, pruned by length."""
        out, budget = set(), MAX_REALISATIONS
        limit = len(target_letters) + 2
        for stem in stems_by_lemma.get(lemma_key, []):
            stem_diac = stem.get("diac") or ""
            stem_len = len(letters(stem_diac))
            if stem_len > limit:
                continue
            for prefix_cat in prefix_cats_for_stem.get(stem["_cat"], ()):
                for prefix in prefixes_by_cat.get(prefix_cat, ()):
                    prefix_diac = prefix.get("diac") or ""
                    if stem_len + len(letters(prefix_diac)) > limit:
                        continue
                    for suffix_cat in suffix_cats_for_stem.get(stem["_cat"], ()):
                        if (prefix_cat, suffix_cat) not in ac:
                            continue
                        for suffix in suffixes_by_cat.get(suffix_cat, ()):
                            suffix_diac = suffix.get("diac") or ""
                            total = (stem_len + len(letters(prefix_diac))
                                     + len(letters(suffix_diac)))
                            if total > limit:
                                continue
                            out.add(prefix_diac + stem_diac + suffix_diac)
                            budget -= 1
                            if budget <= 0:
                                return out
        return out

    rows = []
    for group in groups:
        lemma_key = group["normalized_core"]["lemma"]
        root_key = group["normalized_core"]["root"]
        for location in group["locations"]:
            key = (location["verse_key"], location["word_index"])
            surface = canonical[key]
            forms = pipeline_forms(key)

            # --- does anything the pipeline already has reach the lexeme? ----
            reached_now = any(camel_lemma_key(c.get("lex")) == lemma_key
                              for f in forms for c in analyze(f))

            # --- HC1 coverage, measured not assumed --------------------------
            hc1_forms, hc1_reaches = [], False
            for form in forms:
                variant, _ = HC.derive(form, HC1)
                if variant is None or variant in forms:
                    continue
                hc1_forms.append(variant)
                if any(camel_lemma_key(c.get("lex")) == lemma_key
                       for c in analyze(variant)):
                    hc1_reaches = True

            # --- nearest form CAMeL actually recognises ----------------------
            target_letters = letters(forms[0])
            candidates = realisations(lemma_key, target_letters)
            # Rank by containment first, similarity second. A realisation whose
            # letters sit inside the token's letters is the token's stem with
            # extra material around it - that is the shape a clitic difference
            # takes, and plain string similarity would rank a wrong inflection
            # above it (بَئِسْتُمَا scores higher against بِئْسَمَا than بِئْس does).
            best, best_score = None, None
            for candidate in sorted(candidates):
                candidate_letters = letters(candidate)
                if not any(camel_lemma_key(c.get("lex")) == lemma_key
                           for c in analyze(candidate)):
                    continue
                contained = candidate_letters in target_letters
                score = (1 if contained else 0,
                         len(candidate_letters) if contained else 0,
                         difflib.SequenceMatcher(None, candidate_letters,
                                                 target_letters).ratio())
                if best_score is None or score > best_score:
                    best, best_score = candidate, score
            edit_ops, problem_class, touched = [], "PARADIGM", []
            if best is not None:
                source = forms[0]
                problem_class, touched = classify_edit(source, best)
                for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(
                        None, source, best).get_opcodes():
                    if tag == "equal":
                        continue
                    edit_ops.append({
                        "op": tag, "offset": i1,
                        "delete": source[i1:i2], "insert": best[j1:j2],
                        "delete_codepoints": codepoints(source[i1:i2]),
                        "insert_codepoints": codepoints(best[j1:j2]),
                    })

            rows.append({
                "lemma": group["lemma"], "root": group["root"], "pos": group["pos"],
                "verse_key": key[0], "word_index": key[1],
                "canonical_text": surface,
                "canonical_codepoints": codepoints(surface),
                "analysis_form": forms[0],
                "camel_recognised_form": best,
                "camel_recognised_codepoints": codepoints(best) if best else None,
                "camel_form_letters_contained_in_token": bool(best_score[0]) if best_score else None,
                "similarity": round(best_score[2], 4) if best_score is not None else None,
                "edit_ops": edit_ops,
                "codepoints_touched": touched,
                "problem_class": problem_class,
                "already_reached_by_current_pipeline": reached_now,
                "hc1_fires": bool(hc1_forms),
                "hc1_variants": hc1_forms[:3],
                "hc1_reaches_lexeme": hc1_reaches,
                "teacher_lemma": teacher[key].get("lemma"),
                "teacher_root": teacher[key].get("root"),
                "v1_7_verdict": (selection.get(key) or {}).get("verdict"),
            })

    by_class = collections.Counter(r["problem_class"] for r in rows)
    hc1_covered = [r for r in rows if r["hc1_reaches_lexeme"]]
    already = [r for r in rows if r["already_reached_by_current_pipeline"]]

    # ---- what a safe general transform would have to be ---------------------
    withdrawn = {"O3_SILENT_LETTER_DROP", "O4X_PLURAL_WAW_OTIOSE_ALEF",
                 "O6X_FINAL_ALEF_TO_MAQSURA", "HC2_BARE_AFTER_SUKUN_GLIDE",
                 "HC3_BARE_AFTER_LONG_YEH", "HC4X_WAW_SEAT_TO_YEH_SEAT",
                 "HC5X_YEH_SEAT_TO_ALEF_SEAT", "HC6X_WAW_SEAT_TO_ALEF_SEAT"}
    safe_transform_available = []
    for row in rows:
        if row["hc1_reaches_lexeme"]:
            verdict = {"available": True, "rule": HC1,
                       "note": "already covered by the proposed HC1"}
        elif row["problem_class"] == "CLITIC":
            verdict = {"available": False, "rule": None,
                       "note": ("the difference is a clitic boundary; that is the "
                                "frozen v1.5 clitic-split contract's domain and it "
                                "is not reopened here")}
        elif row["problem_class"] == "UTHMANI_ORTHOGRAPHY":
            verdict = {"available": False, "rule": None,
                       "note": ("the edit touches an Uthmani notation codepoint "
                                "whose rule was withdrawn or rejected earlier "
                                f"({', '.join(sorted(withdrawn))[:80]}...); not "
                                "re-animated")}
        elif row["problem_class"] == "HAMZA_CARRIER":
            verdict = {"available": False, "rule": None,
                       "note": ("a carrier change is needed but HC1's precondition "
                                "does not hold and the other carrier rules were "
                                "rejected for regression risk")}
        else:
            verdict = {"available": False, "rule": None,
                       "note": "no general transform identified"}
        row["safe_general_transform"] = verdict
        if verdict["available"]:
            safe_transform_available.append(f"{row['verse_key']}:{row['word_index']}")

    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_chain": {"manifest": str(FREEZE.relative_to(REPO_ROOT)).replace("\\", "/"),
                         "sha256": sha256_file(FREEZE), "status": "VERIFIED_UNCHANGED"},
        "contract": {
            "camel_verb_lemma_suffix_normalised": True,
            "recognised_form_generated_from_camel_tables_not_guessed": True,
            "teacher_use": "scoring only",
            "no_surface_allowlist_no_verse_override": True,
            "withdrawn_rules_not_reanimated": sorted(withdrawn),
            "full_dump_not_regenerated": True,
            "selector_not_run": True,
            "production_db_written": False,
        },
        "scope": {"groups": len(groups), "tokens": len(rows)},
        "problem_classes": dict(sorted(by_class.items(), key=lambda kv: (-kv[1], kv[0]))),
        "already_reached_by_current_pipeline": len(already),
        "hc1_covered_tokens": sorted(f"{r['verse_key']}:{r['word_index']}"
                                     for r in hc1_covered),
        "hc1_covered_count": len(hc1_covered),
        "safe_general_transform_available": safe_transform_available,
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
                      ("scope", "problem_classes", "already_reached_by_current_pipeline",
                       "hc1_covered_count", "hc1_covered_tokens",
                       "safe_general_transform_available")}
                     | {"checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
