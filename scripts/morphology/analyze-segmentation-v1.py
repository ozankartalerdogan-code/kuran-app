#!/usr/bin/env python3
"""SEGMENTATION bucket (2 tokens): preparation only, no rule is applied.

For each token this lays out, from the surface and CAMeL's own affix inventory:
  * the canonical Tanzil surface, unchanged;
  * every proclitic/enclitic split CAMeL's PREFIX/SUFFIX tables license;
  * the candidates CAMeL returns for each split body;
  * whether the decomposition is UNIQUE on surface evidence alone.

A safe generation contract is proposed only when exactly one split survives and
the affix it strips is spelled by an existing `prc*`/`enc*` slot - i.e. when
CAMeL's own tables, not this script, decide the boundary. Anything else stays
UNRESOLVED. No verse-key override, no surface allowlist, no teacher-gated
decision: the teacher is read only to score what the split reaches.

Nothing is written to the CAMeL DB and no dump is regenerated.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
RESIDUAL = CAND_ROOT / "orthographic-residual-v1" / "classification.jsonl"
BASE_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
FREEZE = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"
OUT_DIR = CAND_ROOT / "segmentation-v1"

SCHEMA_VERSION = "segmentation-prep-v1"
BUCKET = "SEGMENTATION"
EXPECTED_SCOPE_TOKENS = 2
CLITIC_SLOTS = ("prc0", "prc1", "prc1.5", "prc2", "prc3", "enc0")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_seg")
SPLIT = load_module(SCRIPT_DIR / "camel_clitic_split_rules.py", "camel_clitic_split_seg")
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


def codepoints(text: str) -> str:
    return " ".join(f"U+{ord(ch):04X}" for ch in text)


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


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
        key = (obj["verse_key"], obj["word_index"])
        if key in keys:
            canonical[key] = obj["canonical_text"]
            base_forms[key] = list(obj["analysis_forms"])
    teacher = {}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        key = (obj["verse_key"], obj["word_index"])
        if key in keys:
            teacher[key] = obj

    tables = SPLIT.CliticTables(BASE_DB, V.skeleton, V.normalize_vocalized)
    prefix_keys = set(tables.prefixes)
    suffix_by_letters = collections.defaultdict(list)
    for group in tables.suffixes.values():
        for entry in group:
            suffix_by_letters[tables.surface_key(entry["diac"])].append(entry)

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB
    analyzer = Analyzer(MorphologyDB(str(BASE_DB), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def pipeline_forms(key):
        forms = list(base_forms[key])
        forms += sorted(RECALL.build_variants(canonical[key], base_forms[key]))
        forms += [i["analyzer_form"] for i in
                  ORTHO.extra_forms(base_forms[key], hamza_pass=HAMZA.apply_rules)]
        return list(dict.fromkeys(forms))

    def core(candidate):
        return (COVERAGE.normalize_root(candidate.get("root")),
                COVERAGE.normalize_lemma(candidate.get("lex")))

    rows = []
    for key in sorted(keys, key=sort_key):
        teacher_row = teacher[key]
        t_core = (COVERAGE.normalize_root(teacher_row.get("root")),
                  COVERAGE.normalize_lemma(teacher_row.get("lemma")))
        forms = pipeline_forms(key)
        whole_word = [c for f in forms for c in analyze(f)]

        splits = []
        for form in forms:
            letters = V.skeleton(form)
            for plen in range(0, min(len(letters), 6) + 1):
                if plen and letters[:plen] not in prefix_keys:
                    continue
                for slen in range(0, min(len(letters) - plen, 6) + 1):
                    if plen == 0 and slen == 0:
                        continue
                    tail = letters[len(letters) - slen:] if slen else ""
                    if slen and tail not in suffix_by_letters:
                        continue
                    body = letters[plen:len(letters) - slen] if slen else letters[plen:]
                    if len(body) < 2:
                        continue
                    candidates = analyze(body)
                    if not candidates:
                        continue
                    reaches = any(
                        (core(c)[1] and core(c)[1] == t_core[1])
                        or (core(c)[0] and core(c)[0] == t_core[0]
                            and core(c)[1] is not None)
                        for c in candidates)
                    slot_spelled = sorted({
                        slot for c in candidates for slot in CLITIC_SLOTS
                        if c.get(slot) not in ("0", "", None)})
                    splits.append({
                        "form": form,
                        "proclitic_letters": letters[:plen],
                        "proclitic_codepoints": codepoints(letters[:plen]),
                        "body_letters": body,
                        "enclitic_letters": tail,
                        "enclitic_codepoints": codepoints(tail),
                        "body_candidate_count": len(candidates),
                        "body_cores": sorted({f"{c[0]}|{c[1]}" for c in
                                              (core(x) for x in candidates)}),
                        "reaches_teacher_core": reaches,
                        "clitic_slots_spelled_by_camel": slot_spelled,
                    })

        reaching = [s for s in splits if s["reaches_teacher_core"]]
        distinct_frames = {(s["proclitic_letters"], s["body_letters"],
                            s["enclitic_letters"]) for s in reaching}
        distinct_cores = set()
        for split in reaching:
            distinct_cores.update(split["body_cores"])

        if not reaching:
            verdict = "UNRESOLVED_NO_LICENSED_SPLIT_REACHES_THE_CORE"
            contract = None
        elif len(distinct_frames) > 1:
            verdict = "UNRESOLVED_SPLIT_NOT_UNIQUE"
            contract = None
        elif len(distinct_cores) > 1:
            verdict = "UNRESOLVED_BODY_CORE_NOT_UNIQUE"
            contract = None
        elif not any(s["clitic_slots_spelled_by_camel"] for s in reaching):
            verdict = "UNRESOLVED_NO_EXISTING_CLITIC_SLOT_SPELLS_THE_AFFIX"
            contract = None
        else:
            frame = next(iter(distinct_frames))
            verdict = "SAFE_UNIQUE_DECOMPOSITION"
            contract = {
                "trigger": ("the surface, after the frozen R1-R5 and O1a/O2a/O5 "
                            "forms, splits into exactly this frame under CAMeL's "
                            "own affix tables and no other"),
                "proclitic_letters": frame[0],
                "body_letters": frame[1],
                "enclitic_letters": frame[2],
                "emitted_candidate": ("the body analysis, with the stripped affix "
                                      "recorded in the clitic slot CAMeL already "
                                      "spells it in"),
                "clitic_slots": sorted({slot for s in reaching
                                        for slot in s["clitic_slots_spelled_by_camel"]}),
                "no_verse_key_or_allowlist": True,
                "teacher_role": "scoring only; the frame is decided by the tables",
            }

        rows.append({
            "verse_key": key[0], "word_index": key[1],
            "canonical_text": canonical[key],
            "canonical_codepoints": codepoints(canonical[key]),
            "teacher_lemma": teacher_row.get("lemma"),
            "teacher_root": teacher_row.get("root"),
            "teacher_pos": teacher_row.get("pos"),
            "whole_word_candidate_count": len(whole_word),
            "whole_word_cores": sorted({f"{c[0]}|{c[1]}" for c in
                                        (core(x) for x in whole_word)})[:8],
            "licensed_splits": splits,
            "splits_reaching_teacher_core": len(reaching),
            "distinct_reaching_frames": len(distinct_frames),
            "verdict": verdict,
            "proposed_contract": contract,
        })

    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_chain": {"manifest": str(FREEZE.relative_to(REPO_ROOT)).replace("\\", "/"),
                         "sha256": sha256_file(FREEZE), "status": "VERIFIED_UNCHANGED"},
        "contract": {
            "preparation_only": "no rule is applied, no candidate is emitted",
            "boundary_decided_by": "CAMeL's own PREFIX/SUFFIX tables",
            "no_verse_key_override_no_allowlist_no_teacher_gate": True,
            "teacher_use": "scoring only",
            "camel_db_untouched": True,
            "full_dump_not_regenerated": True,
        },
        "scope_tokens": len(rows),
        "verdicts": dict(sorted(collections.Counter(r["verdict"] for r in rows).items())),
        "safe_records": [r for r in rows if r["verdict"] == "SAFE_UNIQUE_DECOMPOSITION"],
        "unresolved_records": [
            {"verse_key": r["verse_key"], "word_index": r["word_index"],
             "canonical_text": r["canonical_text"], "verdict": r["verdict"],
             "teacher_lemma": r["teacher_lemma"], "teacher_root": r["teacher_root"],
             "splits_reaching_teacher_core": r["splits_reaching_teacher_core"],
             "distinct_reaching_frames": r["distinct_reaching_frames"]}
            for r in rows if r["verdict"] != "SAFE_UNIQUE_DECOMPOSITION"],
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
    print(json.dumps({"scope_tokens": report["scope_tokens"],
                      "verdicts": report["verdicts"],
                      "safe_records": len(report["safe_records"]),
                      "unresolved_records": report["unresolved_records"],
                      "checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
