#!/usr/bin/env python3
"""Independently verify the LEXICON_OOV cores and draft entries for VERIFIED ones.

The rule this round runs on: a lemma/POS coming from QAC is not evidence for
itself. QAC, app.db's `morfoloji` and the legacy `words` table are one lineage
and count once. `root_meanings` may support a ROOT and nothing else. Nothing is
inferred from the surface, and no entry is written without a citable source.

Independent sources actually available:

  A. the CAMeL Morph MSA lexicon itself - an MSA morphological lexicon built
     independently of the Quranic Arabic Corpus. If it already carries the
     lemma with the same root and a compatible POS, that is machine-checkable
     independent corroboration - and it also means no entry needs authoring.
  B. per-lexeme external lookups, recorded in `external-evidence.json`. The
     script never touches the network: it reads that frozen record, so two runs
     stay byte-identical.

CAMeL stores verb lemmas with a trailing imperfect-vowel marker (`خَاف-َ`,
`رَأَى-َ`, `سَأَل-َ`). Comparing without stripping it reports common verbs as
absent, which is exactly the error this script exists to correct.

Decisions:
  VERIFIED     an independent source confirms lemma, root and POS
  CONFLICTING  an independent source disagrees on at least one of them
  UNRESOLVED   no independent source speaks to it

Only VERIFIED cores may produce an authored entry. Nothing is written to the
CAMeL DB or the production DB, and no dump is regenerated.
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
GROUPS = CAND_ROOT / "lexicon-oov-sources-v1" / "groups.jsonl"
BASE_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
EXTERNAL = CAND_ROOT / "lexicon-authoring-v1" / "external-evidence.json"
FREEZE = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"
OUT_DIR = CAND_ROOT / "lexicon-authoring-v1"

SCHEMA_VERSION = "lexicon-authoring-v1"
EXPECTED_GROUPS = 25
GENERATED_GLOSS = "AUTHORED_LEXICON_V1"

# CAMeL's coarse POS -> the teacher's N/V/P classes.
POS_MAP = {
    "N": {"noun", "noun_prop", "noun_num", "noun_quant", "adj", "adj_comp", "adj_num"},
    "V": {"verb"},
    "P": {"part", "part_neg", "part_interrog", "part_restrict", "part_verb",
          "part_focus", "part_fut", "part_det", "part_voc", "part_connect",
          "part_dem", "part_rc", "part_empahsis", "prep", "conj", "conj_sub",
          "pron", "pron_rel", "pron_dem", "pron_exclam", "pron_interrog",
          "interj", "verb_pseudo", "adv_rel"},
}
_LEMMA_TAIL = re.compile(r"-.?$")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_au")
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


def camel_lemma_key(lex: str | None):
    """CAMeL's lemma key with its trailing imperfect-vowel marker removed."""
    if not lex:
        return None
    return COVERAGE.normalize_lemma(_LEMMA_TAIL.sub("", lex))


def parse_stems(db_path: Path):
    stems, section = [], None
    for index, raw in enumerate(db_path.read_text(encoding="utf-8").split("\n")):
        if raw.startswith("###"):
            section = raw.strip()
            continue
        if section != "###STEMS###":
            continue
        parts = raw.split("\t")
        if len(parts) < 3:
            continue
        feats = {}
        for item in parts[2].split():
            if ":" in item:
                name, value = item.split(":", 1)
                feats[name] = value
        feats["_key"] = parts[0]
        feats["_cat"] = parts[1]
        feats["_line"] = index
        feats["_raw"] = raw
        stems.append(feats)
    return stems


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

    groups = [json.loads(l) for l in GROUPS.open(encoding="utf-8")]
    if len(groups) != EXPECTED_GROUPS:
        raise SystemExit(f"scope moved: {len(groups)} != {EXPECTED_GROUPS}")

    stems = parse_stems(BASE_DB)
    camel_by_lemma = collections.defaultdict(list)
    for stem in stems:
        key = camel_lemma_key(stem.get("lex"))
        if key:
            camel_by_lemma[key].append(stem)

    external = json.loads(EXTERNAL.read_text(encoding="utf-8"))
    external_by_lemma = {COVERAGE.normalize_lemma(e["qac_lemma"]): e
                         for e in external["lexemes"]}

    canonical, base_forms = {}, {}
    for line in V.TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        canonical[(obj["verse_key"], obj["word_index"])] = obj["canonical_text"]
        base_forms[(obj["verse_key"], obj["word_index"])] = list(obj["analysis_forms"])

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

    rows = []
    for group in groups:
        core = group["normalized_core"]
        display = group["lexical_core"]
        keys = [(t.rsplit(":", 1)[0], int(t.rsplit(":", 1)[1]))
                for t in group["token_keys"]]

        # --- source A: the CAMeL MSA lexicon --------------------------------
        matches = camel_by_lemma.get(core["lemma"], [])
        allowed_pos = POS_MAP.get(display["pos"], set())
        exact = [s for s in matches
                 if s.get("pos") in allowed_pos
                 and COVERAGE.normalize_root(s.get("root")) == core["root"]]
        pos_only = [s for s in matches if s.get("pos") in allowed_pos]
        camel_evidence = {
            "lemma_present": bool(matches),
            "pos_compatible_entries": len(pos_only),
            "lemma_root_pos_all_match": bool(exact),
            "witness": sorted({(s.get("lex"), s.get("pos"), s.get("root"))
                               for s in (exact or pos_only or matches)})[:3],
            "note": ("CAMeL Morph MSA is built independently of the Quranic Arabic "
                     "Corpus, so a full match here is independent corroboration"),
        }

        # --- source B: the frozen external record ---------------------------
        ext = external_by_lemma.get(core["lemma"])
        external_evidence = ext["lookups"] if ext else []

        conflicts = []
        if ext:
            for lookup in ext["lookups"]:
                if lookup.get("conflict"):
                    conflicts.append({"url": lookup["url"],
                                      "conflict": lookup["conflict"]})
        if matches and not exact and pos_only:
            conflicts.append({
                "source": "CAMeL Morph MSA",
                "conflict": (f"lemma present with a compatible POS but a different "
                             f"root: CAMeL {sorted({s.get('root') for s in pos_only})} "
                             f"vs QAC {display['root']}")})

        if exact:
            decision = "VERIFIED"
            basis = "CAMEL_MSA_LEXICON_FULL_MATCH"
        elif conflicts:
            decision = "CONFLICTING"
            basis = "INDEPENDENT_SOURCE_DISAGREES"
        else:
            decision = "UNRESOLVED"
            basis = "NO_INDEPENDENT_SOURCE_SPEAKS_TO_THIS_LEMMA"

        entry_needed = decision == "VERIFIED" and not exact
        rows.append({
            "lemma": display["lemma"], "root": display["root"], "pos": display["pos"],
            "normalized_core": core,
            "tokens": group["tokens"],
            "token_keys": group["token_keys"],
            "surfaces": group["surfaces"],
            "locations": [{"verse_key": k[0], "word_index": k[1],
                           "canonical_text": canonical[k]} for k in keys],
            "required_camel_fields": {
                "diac": None, "lex": display["lemma"], "root": display["root"],
                "pos": None, "stemcat": None, "gloss": GENERATED_GLOSS,
                "status": ("not needed - CAMeL already carries this lexeme"
                           if exact else "cannot be filled without a verified source"),
            },
            "camel_evidence": camel_evidence,
            "external_evidence": external_evidence,
            "root_support_only": group["root_corroboration_outside_qac_lineage"],
            "conflicts": conflicts,
            "decision": decision,
            "decision_basis": basis,
            "authored_entry_required": entry_needed,
        })

    rows.sort(key=lambda r: (-r["tokens"], r["normalized_core"]["lemma"] or ""))

    verified = [r for r in rows if r["decision"] == "VERIFIED"]
    to_author = [r for r in verified if r["authored_entry_required"]]

    # ---- authored lexicon draft: VERIFIED entries only ----------------------
    authored = {
        "schema_version": "authored-lexicon-v1",
        "policy": {
            "only_verified_cores": True,
            "no_value_inferred_from_the_surface": True,
            "every_entry_carries_its_source": True,
        },
        "entries": [
            {"lex": r["lemma"], "root": r["root"], "pos": r["pos"],
             "tokens": r["tokens"], "surfaces": sorted(r["surfaces"]),
             "source": r["decision_basis"],
             "camel_witness": r["camel_evidence"]["witness"]}
            for r in to_author],
        "entries_written": len(to_author),
        "note": ("every VERIFIED core was verified BY CAMeL already carrying it, so "
                 "no new entry is required and this list is empty by construction, "
                 "not by omission" if verified and not to_author else ""),
    }

    # ---- small-scope validation --------------------------------------------
    validation = []
    for row in verified:
        reachable, cores = 0, set()
        for key in [(k[0], int(k[1])) for k in
                    (t.rsplit(":", 1) for t in row["token_keys"])]:
            hit = False
            for form in pipeline_forms(key):
                for candidate in analyze(form):
                    if camel_lemma_key(candidate.get("lex")) == row["normalized_core"]["lemma"]:
                        hit = True
                        cores.add((COVERAGE.normalize_root(candidate.get("root")),
                                   camel_lemma_key(candidate.get("lex"))))
            reachable += int(hit)
        validation.append({
            "lemma": row["lemma"], "root": row["root"],
            "tokens": row["tokens"],
            "motivating_surfaces_analyzable_with_this_lexeme": reachable,
            "expected_core_unique": len(cores) <= 1,
            "observed_cores": sorted(f"{a}|{b}" for a, b in cores),
        })

    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_chain": {"manifest": str(FREEZE.relative_to(REPO_ROOT)).replace("\\", "/"),
                         "sha256": sha256_file(FREEZE), "status": "VERIFIED_UNCHANGED"},
        "contract": {
            "qac_app_db_and_legacy_words_count_as_one_source": True,
            "root_meanings_supports_root_only": True,
            "no_lemma_or_root_inferred_from_the_surface": True,
            "no_verse_key_override": True,
            "no_entry_without_a_citable_source": True,
            "no_bulk_copying_from_copyrighted_sources": (
                "only the lexeme under verification was looked up, and only the "
                "minimum quotation was recorded"),
            "network_access_at_run_time": False,
            "camel_db_written": False,
            "production_db_written": False,
            "full_dump_not_regenerated": True,
        },
        "correction": {
            "what": ("CAMeL stores verb lemmas with a trailing imperfect-vowel "
                     "marker (خَاف-َ, رَأَى-َ, سَأَل-َ). The previous round compared "
                     "without stripping it and reported those lexemes as absent."),
            "effect": ("groups whose lexeme CAMeL already carries were classified as "
                       "LEXICON_OOV; they are not lexicon gaps at all"),
        },
        "groups": len(rows),
        "tokens": sum(r["tokens"] for r in rows),
        "decisions": dict(sorted(collections.Counter(r["decision"] for r in rows).items())),
        "tokens_by_decision": {
            decision: sum(r["tokens"] for r in rows if r["decision"] == decision)
            for decision in sorted({r["decision"] for r in rows})},
        "authored_entries_written": len(to_author),
        "authored_entries_reason": authored["note"],
        "extension_db_written": None,
        "small_scope_validation": validation,
        "group_detail": rows,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "verification.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows),
        encoding="utf-8", newline="\n")
    (out_dir / "authored-lexicon.json").write_text(
        json.dumps(authored, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "authored-lexicon.json": sha256_file(out_dir / "authored-lexicon.json"),
        "report.json": sha256_file(out_dir / "report.json"),
        "verification.jsonl": sha256_file(out_dir / "verification.jsonl"),
    }
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in
                      ("groups", "tokens", "decisions", "tokens_by_decision",
                       "authored_entries_written")}
                     | {"validation": validation, "checksums": checksums},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
