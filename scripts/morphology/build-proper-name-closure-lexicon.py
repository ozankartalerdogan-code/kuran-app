#!/usr/bin/env python3
"""Build the closure lexicon for the 11 residual surfaces v1.3r could not close.

v1.3r is frozen. It closed 48 of the 63 residual L7A tokens and declined the
other 15 for two distinct reasons, which this file addresses separately.

Group 1 - the name carries an Arabic root (6 tokens / 5 surfaces)
-----------------------------------------------------------------
v1.3r refused to invent a root, so its rootless candidate would have been
scored wrong. The root cannot come from the surface: taking the consonant
skeleton of a name IS the guess that was forbidden. It therefore has to be an
AUTHORED lexicon field, sourced from standard Arabic lexicography, and then
cross-checked. `AUTHORED_NAMES` below records the derivation for each one.

`سُواع` is deliberately NOT given a root. It is a pre-Islamic idol name with no
accepted derivation; the only "root" available for it is its own skeleton
س-و-ع, which is precisely the surface guess this pipeline refuses to make. It
stays UNRESOLVED rather than being closed on a value nobody can defend.

Group 2 - CAMeL offers competing analyses (9 tokens / 6 surfaces)
-----------------------------------------------------------------
These names are not root-bearing; the problem is that CAMeL reads يَـٰلُوطُ as
a verb (لاط), يَغُوثَ as غَوَّث, هَـٰرُوتَ as هَرَا, and so on. The rules cannot
be re-ordered to fix this, so the lexicon entry is used as INDEPENDENT LEXICAL
EVIDENCE that takes precedence over a general CAMeL verb/noun reading - but
only on the closed surface list, and only where the entry's lemma and root are
independently confirmed.

Verification
------------
Every authored lemma/root pair is checked against the independently attested
reading (QAC) at every location of the surface. The authored value is written
first, from lexicography, and the check can only CONFIRM or VETO it - a
mismatch leaves the entry UNRESOLVED and it is never silently overwritten with
the attested value.

Usage:  py -3.12 scripts/morphology/build-proper-name-closure-lexicon.py
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
V1_3R_SELECTION = CAND_ROOT / "selector-v1_3r" / "selection.jsonl"
RECALL_LEXICON = SCRIPT_DIR / "resources" / "quran-proper-name-recall-lexicon.json"
OUT_PATH = SCRIPT_DIR / "resources" / "quran-proper-name-closure-lexicon.json"

SCHEMA_VERSION = "quran-proper-name-closure-lexicon-v1"
CANDIDATE_SOURCE = "quran_proper_name_lexicon"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c")
BUILDER = load_module(SCRIPT_DIR / "build-proper-name-recall-lexicon.py",
                      "proper_name_recall_lexicon_builder")
COVERAGE = V.COVERAGE
RECALL = V.RECALL

# --------------------------------------------------------------------------
# Authored lexicon content. Keyed by the canonical Tanzil surface - the closed
# list, never a verse key. `root: None` means "this name is not derived from an
# Arabic root", which is a positive lexicographic claim, not a missing value.
# --------------------------------------------------------------------------
AUTHORED_NAMES = {
    # ---- group 1: root-bearing names -------------------------------------
    "زَبُورًا": {
        "group": "ROOT_BEARING",
        "lemma": "زَبُور",
        "root": "زبر",
        "lemma_source": "az-Zabur, the scripture given to Dawud",
        "root_source": ("derived from zabara (ز-ب-ر) 'to write, to inscribe'; "
                        "zabur is the written thing"),
    },
    "بِٱلْأَحْقَافِ": {
        "group": "ROOT_BEARING",
        "lemma": "أَحْقاف",
        "root": "حقف",
        "lemma_source": "al-Ahqaf, the place name that titles surah 46",
        "root_source": ("plural of hiqf (ح-ق-ف), a curved elongated sand dune; "
                        "the place is named after the dunes"),
    },
    "يَـٰسَـٰمِرِىُّ": {
        "group": "ROOT_BEARING",
        "lemma": "سامِرِيّ",
        "root": "سمر",
        "lemma_source": ("as-Samiri, the man who made the calf; the lemma keeps the "
                         "nisba ya', which the Uthmani surface writes as alif "
                         "maqsura - it cannot be read off the surface"),
        "root_source": "nisba formed on س-م-ر",
    },
    "يَـٰيَحْيَىٰ": {
        "group": "ROOT_BEARING",
        "lemma": "يَحْيَى",
        "root": "حيي",
        "lemma_source": "Yahya, John the Baptist",
        "root_source": ("formed on hayiya (ح-ي-ي) 'to live'; the name is treated as "
                        "derived in the Arabic grammatical tradition"),
    },
    "سُوَاعًا": {
        "group": "ROOT_BEARING",
        "lemma": "سُواع",
        "root": None,
        "unverifiable_root": True,
        "lemma_source": "Suwa', a pre-Islamic idol named in 71:23",
        "root_source": ("NOT AUTHORED: the name has no accepted derivation. The only "
                        "candidate root is its own skeleton س-و-ع, which is exactly "
                        "the surface guess this pipeline refuses to make"),
    },

    # ---- group 2: non-derived names with competing CAMeL analyses --------
    "يَـٰفِرْعَوْنُ": {
        "group": "COMPETING_ANALYSES",
        "lemma": "فِرْعَوْن",
        "root": None,
        "lemma_source": "Fir'awn, Pharaoh - an Egyptian title borrowed into Arabic",
        "root_source": "not derived from an Arabic root (loan word)",
        "competing_camel_reading": "verb فرع",
    },
    "يَـٰلُوطُ": {
        "group": "COMPETING_ANALYSES",
        "lemma": "لُوط",
        "root": None,
        "lemma_source": "Lut, the prophet Lot",
        "root_source": "foreign name; the homographic Arabic verb لاط is unrelated",
        "competing_camel_reading": "verb لاط",
    },
    "يَـٰهَـٰمَـٰنُ": {
        "group": "COMPETING_ANALYSES",
        "lemma": "هامان",
        "root": None,
        "lemma_source": "Haman, the minister of Pharaoh",
        "root_source": "foreign name",
        "competing_camel_reading": "assorted nominal readings of the ه-م-ن skeleton",
    },
    "هَـٰرُوتَ": {
        "group": "COMPETING_ANALYSES",
        "lemma": "هارُوت",
        "root": None,
        "lemma_source": "Harut, one of the two angels of 2:102",
        "root_source": "foreign name; the CAMeL verb هَرَا is unrelated",
        "competing_camel_reading": "verb هَرَا",
    },
    "وَيَعُوقَ": {
        "group": "COMPETING_ANALYSES",
        "lemma": "يَعُوق",
        "root": None,
        "lemma_source": "Ya'uq, a pre-Islamic idol named in 71:23",
        "root_source": ("treated as a non-derived name; the CAMeL verbs عَاق / عَوَّق "
                        "are homographic only"),
        "competing_camel_reading": "verbs عَاق / عَوَّق",
    },
    "يَغُوثَ": {
        "group": "COMPETING_ANALYSES",
        "lemma": "يَغُوث",
        "root": None,
        "lemma_source": "Yaghuth, a pre-Islamic idol named in 71:23",
        "root_source": ("treated as a non-derived name; the CAMeL verb غَوَّث is "
                        "homographic only"),
        "competing_camel_reading": "verb غَوَّث",
    },
}


def main() -> int:
    for path in (V.TEACHER_PATH, RECALL_LEXICON, V1_3R_SELECTION):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")

    teacher = {}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    v1_3r = {}
    for line in V1_3R_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        v1_3r[(obj["verse_key"], obj["word_index"])] = obj

    recall_doc = json.loads(RECALL_LEXICON.read_text(encoding="utf-8"))
    recall_by_surface = {e["tanzil_surface"]: e for e in recall_doc["entries"]}

    unknown = set(AUTHORED_NAMES) - set(recall_by_surface)
    if unknown:
        raise SystemExit(f"FAIL-CLOSED: surfaces not in the residual group: {unknown}")

    entries = []
    for surface in sorted(AUTHORED_NAMES):
        authored = AUTHORED_NAMES[surface]
        source_entry = recall_by_surface[surface]
        locs = [(vk.rsplit(":", 1)[0], int(vk.rsplit(":", 1)[1]))
                for vk in source_entry["verse_keys"]]

        # Proclitic chain is re-derived from the surface, exactly as v1.3r does.
        key = BUILDER.core_key(surface)
        parses = BUILDER.enumerate_parses(key)

        record = {
            "tanzil_surface": surface,
            "surface_key": key,
            "group": authored["group"],
            "classification": source_entry["classification"],
            "locations": len(locs),
            "verse_keys": [f"{v}:{w}" for v, w in locs],
            "expected_pos": "noun_prop",
            "canonical_lemma": authored["lemma"],
            "normalized_lemma": COVERAGE.normalize_lemma(authored["lemma"]),
            "verified_root": authored["root"],
            "normalized_root": COVERAGE.normalize_root(authored["root"]),
            "lemma_provenance": authored["lemma_source"],
            "root_provenance": authored["root_source"],
            "root_is_authored_not_surface_derived": True,
        }
        if "competing_camel_reading" in authored:
            record["competing_camel_reading"] = authored["competing_camel_reading"]

        def veto(reason):
            record.update({
                "status": "UNRESOLVED_PROPER_NAME",
                "reason": reason,
                "independently_verified": False,
                "production_ready": False,
                "requires_manual_verification": True,
            })
            record.pop("synthetic_candidate", None)
            entries.append(record)

        if authored.get("unverifiable_root"):
            veto("no defensible independent root exists for this name; closing it "
                 "would require taking the surface skeleton as the root")
            continue

        if len(parses) != 1:
            veto(f"surface admits {len(parses)} proclitic parses")
            continue
        chain, _surface_core = parses[0]
        record["proclitics"] = [
            {"tag": t,
             "letters": BUILDER.PROCLITIC_BY_TAG[t]["letters"],
             "slot": BUILDER.PROCLITIC_BY_TAG[t]["slot"],
             "class": BUILDER.PROCLITIC_BY_TAG[t]["class"]} for t in chain]

        # ---- independent confirmation: may confirm or veto, never overwrite --
        attested = {json.dumps([COVERAGE.normalize_root(teacher[k].get("root")),
                                COVERAGE.normalize_lemma(teacher[k].get("lemma")),
                                teacher[k].get("pos")], ensure_ascii=False)
                    for k in locs}
        if len(attested) != 1:
            veto("the independently attested reading is not constant across the "
                 "locations")
            continue
        a_root, a_lemma, a_pos = json.loads(next(iter(attested)))
        record["independent_check"] = {
            "attested_lemma": a_lemma, "attested_root": a_root,
            "attested_pos": a_pos,
            "authored_lemma_matches": record["normalized_lemma"] == a_lemma,
            "authored_root_matches": record["normalized_root"] == a_root,
        }
        if record["normalized_lemma"] != a_lemma:
            veto(f"authored lemma {record['normalized_lemma']!r} is not confirmed by "
                 f"the independently attested lemma {a_lemma!r}")
            continue
        if record["normalized_root"] != a_root:
            veto(f"authored root {record['normalized_root']!r} is not confirmed by "
                 f"the independently attested root {a_root!r}")
            continue
        if a_pos != "N" or "N" not in (COVERAGE.POS_MAP.get("noun_prop") or set()):
            veto(f"attested pos {a_pos!r} is not nominal")
            continue

        # ---- the token must be one v1.3r could not close --------------------
        verdicts = Counter(v1_3r[k]["verdict"] for k in locs)
        record["v1_3r_status"] = dict(sorted(verdicts.items()))
        if verdicts["CORRECT"]:
            veto("v1.3r already selects correctly here; the closure layer must not "
                 "touch a settled token")
            continue

        slots = {BUILDER.PROCLITIC_BY_TAG[t]["slot"]: t for t in chain}
        record.update({
            "status": "RESOLVED",
            "independently_verified": True,
            "production_ready": True,
            "requires_manual_verification": False,
            "synthetic_candidate": {
                "lex": authored["lemma"],
                "pos": "noun_prop",
                "root": authored["root"],
                "prc0": slots.get("prc0", "0"),
                "prc1": slots.get("prc1", "0"),
                "prc2": slots.get("prc2", "0"),
                "prc3": slots.get("prc3", "0"),
                "enc0": "0",
                "source": CANDIDATE_SOURCE,
            },
        })
        entries.append(record)

    entries.sort(key=lambda r: (r["group"], -r["locations"], r["surface_key"]))
    resolved = [e for e in entries if e["status"] == "RESOLVED"]

    document = {
        "schema_version": SCHEMA_VERSION,
        "contract": {
            "purpose": ("close the 15 residual L7A tokens that frozen v1.3r declined, "
                        "with independently verified lemma and root"),
            "keyed_by": "canonical Tanzil surface - never a verse key",
            "root_policy": ("authored from Arabic lexicography and then confirmed "
                            "against the independently attested reading; never "
                            "derived from the surface, never copied from the check"),
            "precedence": ("for the closed surface list only, a lexicon entry whose "
                           "lemma and root are confirmed counts as independent "
                           "lexical evidence ahead of a general CAMeL verb/noun "
                           "analysis"),
            "rules_untouched": "R1-R9 and the frozen recall layer are unchanged",
            "applies_only_to": "tokens v1.3r leaves non-CORRECT",
            "teacher_use": "build-time confirmation and veto only",
        },
        "totals": {
            "surfaces": len(entries),
            "locations": sum(e["locations"] for e in entries),
            "resolved_surfaces": len(resolved),
            "resolved_locations": sum(e["locations"] for e in resolved),
            "unresolved_surfaces": len(entries) - len(resolved),
            "unresolved_locations": sum(e["locations"] for e in entries
                                        if e["status"] != "RESOLVED"),
            "by_group": dict(sorted(Counter(e["group"] for e in entries).items())),
            "by_group_resolved": dict(sorted(Counter(
                e["group"] for e in resolved).items())),
            "root_bearing_resolved": sum(
                1 for e in resolved if e["verified_root"] is not None),
        },
        "entries": entries,
    }

    OUT_PATH.write_text(
        json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({
        "out": str(OUT_PATH.relative_to(REPO_ROOT)).replace("\\", "/"),
        "totals": document["totals"],
        "unresolved": [{"surface": e["tanzil_surface"], "locations": e["locations"],
                        "reason": e["reason"]}
                       for e in entries if e["status"] != "RESOLVED"],
        "sha256": RECALL.sha256_file(OUT_PATH),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
