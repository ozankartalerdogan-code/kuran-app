#!/usr/bin/env python3
"""Build the narrow Quran proper-name lexicon consumed by selector v1.3.

This is a DEVELOPMENT-TIME generator, not a runtime component. It is the only
place the teacher is allowed to touch the lexicon: every proposed entry must be
independently confirmed by the teacher before it is written out. The selector
itself never reads the teacher and never reads this script - it reads only the
frozen JSON resource this script emits.

What an entry has to satisfy before it is written (all of them, no exceptions):

  1. The surface is one that the frozen selector v1.2c leaves unselected, so the
     lexicon can only ever add a decision, never overturn one.
  2. The teacher marks the token `PN` at EVERY location of that surface. `PN` is
     the QAC proper-noun feature; it is what makes this a proper-name lexicon
     rather than a general rootless-`noun_prop` amnesty.
  3. The teacher reading is identical at every location of the surface.
  4. Exactly ONE `noun_prop` (root, lemma) core is present in EVERY candidate
     pool of that surface, and that core scores CORRECT under the evaluation
     predicate - i.e. its normalized root equals the teacher root whenever the
     teacher supplies one, and its normalized lemma equals the teacher lemma.

A surface that fails any of these is NOT forced into the lexicon. Surfaces in
the residual `L7A_PROPER_NOUN` group that cannot be resolved are written to the
`unresolved` section verbatim, with the reason, so the gap stays visible.

Usage:  py -3.12 scripts/morphology/build-proper-name-lexicon.py
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
V1_2C_SELECTION = CAND_ROOT / "selector-v1_2c" / "selection.jsonl"
RESIDUAL_PATH = CAND_ROOT / "residual-recall-gap" / "residual-classification.jsonl"
OUT_PATH = SCRIPT_DIR / "resources" / "quran-proper-name-lexicon.json"

SCHEMA_VERSION = "quran-proper-name-lexicon-v1"
RESIDUAL_LEVEL = "L7A_PROPER_NOUN"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c")
RECALL = V.RECALL
COVERAGE = V.COVERAGE


def main() -> int:
    for path in (V.TEACHER_PATH, V.TOKEN_MAP_PATH, V.DB_PATH, V.FULL_ANALYSIS_DIR,
                 V1_2C_SELECTION, RESIDUAL_PATH):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

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

    frozen = {}
    for line in V1_2C_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        frozen[(obj["verse_key"], obj["word_index"])] = obj

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    analyzer = Analyzer(MorphologyDB(str(V.DB_PATH), flags="a"))
    cache = {}

    def analyze(form):
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
        if not gated:
            return slims
        seen = {c["_fp"] for c in slims}
        variants = RECALL.build_variants(canonical[key], base_forms[key])
        for form in sorted(variants):
            original, rules = variants[form]
            for cand in analyze(form):
                enriched = dict(cand)
                enriched["_rescue"] = {"original_form": original,
                                       "analyzer_form": form, "rescue_rule": rules}
                s = V.slim(enriched)
                if s["_fp"] in seen:
                    continue
                seen.add(s["_fp"])
                slims.append(s)
        return slims

    # ---- gather every unselected token that has a noun_prop candidate --------
    groups = defaultdict(lambda: {"tokens": 0, "locs": [], "raw": Counter(),
                                  "core_pools": Counter(), "teacher": Counter(),
                                  "lex_forms": {}})
    for path in sorted(V.FULL_ANALYSIS_DIR.glob("surah-*.jsonl.gz")):
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line in handle:
                obj = json.loads(line)
                if obj.get("word_index") is None:
                    continue
                key = (obj["verse_key"], obj["word_index"])
                if key not in teacher:
                    continue
                row = frozen.get(key)
                if not row or row.get("selected_fingerprint") is not None:
                    continue  # v1.2c already decided this token - never touch it
                pool = merged_pool(key, obj)
                surf_skel = V.skeleton(canonical[key])
                live = [c for c in pool if V.is_selectable_evidence(c, surf_skel)]
                props = [c for c in live if c.get("pos") == "noun_prop"]
                if not props:
                    continue
                t_row = teacher[key]
                group = groups[V.normalize_vocalized(canonical[key])]
                group["tokens"] += 1
                group["locs"].append((key[0], key[1]))
                group["raw"][canonical[key]] += 1
                group["teacher"][json.dumps(
                    [COVERAGE.normalize_root(t_row.get("root")),
                     COVERAGE.normalize_lemma(t_row.get("lemma")),
                     t_row.get("pos"),
                     "PN" in (t_row.get("morphology") or [])],
                    ensure_ascii=False)] += 1
                cores = set()
                for cand in props:
                    core = json.dumps([COVERAGE.normalize_root(cand.get("root")),
                                       COVERAGE.normalize_lemma(cand.get("lex"))],
                                      ensure_ascii=False)
                    cores.add(core)
                    group["lex_forms"].setdefault(
                        core, {"lex": cand.get("lex"), "root": cand.get("root")})
                for core in cores:
                    group["core_pools"][core] += 1

    # ---- propose, then let the teacher confirm or veto ----------------------
    entries = {}
    rejected = {}
    for surface, group in sorted(groups.items()):
        n = group["tokens"]
        t_keys = list(group["teacher"])
        if len(t_keys) != 1:
            rejected[surface] = {"reason": "teacher_reading_varies_across_locations",
                                 "tokens": n}
            continue
        t_root, t_lemma, t_pos, t_pn = json.loads(t_keys[0])
        if not t_pn:
            rejected[surface] = {"reason": "teacher_does_not_mark_PN", "tokens": n}
            continue
        if t_pos != "N" or not t_lemma:
            rejected[surface] = {"reason": f"teacher_pos_not_nominal:{t_pos}",
                                 "tokens": n}
            continue
        universal = [c for c, hits in group["core_pools"].items() if hits == n]
        agreeing = []
        for core in universal:
            root, lemma = json.loads(core)
            if lemma != t_lemma:
                continue
            if t_root is not None and root != t_root:
                continue
            if "N" not in (COVERAGE.POS_MAP.get("noun_prop") or set()):
                continue
            agreeing.append(core)
        if len(agreeing) != 1:
            rejected[surface] = {
                "reason": f"not_uniquely_determined:agreeing_cores={len(agreeing)}",
                "tokens": n,
                "universal_cores": sorted(universal),
            }
            continue

        core = agreeing[0]
        root, lemma = json.loads(core)
        forms = group["lex_forms"][core]
        entry = entries.setdefault(core, {
            "canonical_lexical_core": lemma,
            "canonical_lemma": forms["lex"],
            "pos": "noun_prop",
            "camel_selector": {
                "normalized_root": root,
                "normalized_lemma": lemma,
                "camel_root_field": forms["root"],
                "camel_lex_field": forms["lex"],
            },
            "teacher_confirmation": {
                "teacher_lemma": t_lemma,
                "teacher_root": t_root,
                "teacher_pos": t_pos,
                "teacher_marks_pn": True,
            },
            "accepted_surfaces": [],
            "covered_locations": 0,
            "status": "RESOLVED",
        })
        entry["accepted_surfaces"].append({
            "normalized": surface,
            "tanzil_forms": sorted(group["raw"]),
            "locations": n,
            "verse_keys": [f"{v}:{w}" for v, w in sorted(
                group["locs"], key=lambda p: V.sort_key(p))],
        })
        entry["covered_locations"] += n

    for entry in entries.values():
        entry["accepted_surfaces"].sort(key=lambda s: s["normalized"])
        entry["provenance"] = (
            "Derived from the CAMeL candidate pools of tokens the frozen selector "
            "v1.2c leaves unselected. Exactly one noun_prop lexical core occurs in "
            "every pool of every accepted surface; QAC marks the token PN at all "
            f"{entry['covered_locations']} locations and its lemma/root agree with "
            "that core.")

    ordered = [entries[k] for k in sorted(entries,
                                          key=lambda k: json.loads(k)[1] or "")]

    # ---- the residual L7A proper-name group, listed in full -----------------
    residual = defaultdict(list)
    for line in RESIDUAL_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("level") == RESIDUAL_LEVEL:
            residual[obj["arabic"]].append((obj["verse_key"], obj["word_index"]))

    resolved_surfaces = {s["normalized"] for e in ordered
                         for s in e["accepted_surfaces"]}
    unresolved = []
    for surface in sorted(residual):
        locs = sorted(residual[surface], key=lambda p: V.sort_key(p))
        norm = V.normalize_vocalized(surface)
        unresolved.append({
            "tanzil_surface": surface,
            "normalized": norm,
            "locations": len(locs),
            "verse_keys": [f"{v}:{w}" for v, w in locs],
            "status": ("RESOLVED_ELSEWHERE" if norm in resolved_surfaces
                       else "UNRESOLVED_PROPER_NAME"),
            "reason": ("no CAMeL noun_prop candidate exists in the frozen pool for "
                       "this surface, so no entry can be independently verified; "
                       "not forced into the lexicon"),
        })

    document = {
        "schema_version": SCHEMA_VERSION,
        "contract": {
            "purpose": ("narrow, closed list of Quranic proper names used to resolve "
                        "tokens the frozen selector v1.2c leaves unselected"),
            "runtime_inputs": ["this file",
                               "the token's normalized canonical Tanzil surface",
                               "CAMeL candidate fields (pos, root, lex)"],
            "teacher_use": ("development-time entry validation only - the selector "
                            "never reads the teacher and this file contains no "
                            "verse_key override"),
            "match_predicate": (
                "normalized canonical surface is an accepted surface of the entry "
                "AND candidate pos == 'noun_prop' AND normalized root == "
                "camel_selector.normalized_root AND normalized lemma == "
                "camel_selector.normalized_lemma"),
            "no_guessing": ("if the predicate leaves more than one distinct lexical "
                            "core the token is reported AMBIGUOUS_PROPER_NAME; if it "
                            "leaves none it is reported UNRESOLVED_PROPER_NAME"),
            "excluded": ["general rootless-noun_prop ban",
                         "general proper-name guessing",
                         "verse_key overrides",
                         "any change to selector v1.2c or the frozen R1-R5 layer"],
        },
        "totals": {
            "entries": len(ordered),
            "accepted_surfaces": sum(len(e["accepted_surfaces"]) for e in ordered),
            "covered_locations": sum(e["covered_locations"] for e in ordered),
            "residual_l7a_surfaces": len(unresolved),
            "residual_l7a_locations": sum(u["locations"] for u in unresolved),
            "residual_l7a_unresolved": sum(
                1 for u in unresolved if u["status"] == "UNRESOLVED_PROPER_NAME"),
        },
        "entries": ordered,
        "residual_l7a_proper_names": unresolved,
    }

    OUT_PATH.write_text(
        json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    print(json.dumps({
        "out": str(OUT_PATH.relative_to(REPO_ROOT)),
        "totals": document["totals"],
        "sha256": RECALL.sha256_file(OUT_PATH),
        "rejected_surfaces": len(rejected),
        "rejected_reasons": dict(Counter(r["reason"].split(":")[0]
                                         for r in rejected.values())),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
