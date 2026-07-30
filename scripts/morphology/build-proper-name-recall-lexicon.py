#!/usr/bin/env python3
"""Build the narrow proper-name RECALL lexicon for the residual L7A group.

These are the 23 canonical surfaces / 63 tokens for which CAMeL produces no
`noun_prop` analysis at all - not a selection problem but a recall hole. The
selection-side lexicon (`quran-proper-name-lexicon.json`) cannot help there,
because it may only choose among candidates that already exist. This file
supplies the missing candidate instead.

Everything is keyed by the canonical Tanzil SURFACE. There is no verse_key
decision anywhere: the parse is re-derived by string operations that an
independent implementation can repeat from the surface alone.

Segmentation
------------
`core_key()` below differs from the selector's `normalize_vocalized()` in two
respects, and both differences are what make the parse work:

  * a dagger alef becomes a full alef ONLY when it is not sitting on a ى/ا that
    already carries the long vowel -

        هَـٰرُوتَ   ه + dagger  -> هاروت   (the dagger IS the alef)
        مُوسَىٰ     ى + dagger  -> موسى    (the dagger only marks the ى)

    folding both to alef - as the selector does, correctly, for its own
    diacritic comparisons - would yield `موسا`, which is not the lemma;
  * a word-final alef that is merely the seat of tanwin fath is dropped, so
    زَبُورًا -> زبور rather than زبورا.

Parsing
-------
`NAME_INVENTORY` is a closed, explicitly written list of the Quranic names that
occur in this residual group. It is a lexicon, not an inference: peeling
proclitics off a surface cannot by itself tell you where a name ends, and the
inventory is what decides. Its value is visible in يَأْجُوجَ, which peels
equally well as يا+جوج and stands equally well as the name ياجوج - only the
closed list rules out the first reading.

A surface yields a candidate only when EXACTLY ONE (proclitic chain, name)
split lands on the inventory. Every possible split is enumerated; two valid
splits mean no candidate (rule 5).

What is deliberately NOT emitted
--------------------------------
Root, case, gender, number, state, mood, voice, aspect and person are never
synthesized. In particular a name that carries an Arabic root the surface does
not reveal gets NO candidate: a rootless candidate for a root-bearing name
would be scored as a wrong selection. Those entries are written out with
`production_ready: false` and `requires_manual_verification: true` rather than
being forced.

The teacher is read here only to CONFIRM or VETO a surface-derived entry, and
only at build time. It never constructs anything.

Usage:  py -3.12 scripts/morphology/build-proper-name-recall-lexicon.py
"""

from __future__ import annotations

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
RESIDUAL_PATH = CAND_ROOT / "residual-recall-gap" / "residual-classification.jsonl"
V1_3_SELECTION = CAND_ROOT / "selector-v1_3" / "selection.jsonl"
OUT_PATH = SCRIPT_DIR / "resources" / "quran-proper-name-recall-lexicon.json"

SCHEMA_VERSION = "quran-proper-name-recall-lexicon-v1"
RESIDUAL_LEVEL = "L7A_PROPER_NOUN"
CANDIDATE_SOURCE = "quran_proper_name_lexicon"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c")
COVERAGE = V.COVERAGE
RECALL = V.RECALL

# --------------------------------------------------------------------------
# Surface -> lexical core key
# --------------------------------------------------------------------------
DAGGER = "ٰ"
HARAKAT = "ًٌٍَُِّْ"
_MARKS = re.compile("[" + "".join(chr(c) for c in range(0x06D6, 0x06EE))
                    + "ـٕٔٓ‌‍‎‏" + "]")
_ALIF_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا"})
_TANWIN_SEAT = re.compile("ًا$")


def core_key(text: str) -> str:
    """Undiacritized, alef-folded lexical key of a Tanzil surface.

    See the module docstring for the two places this deliberately departs from
    the selector's `normalize_vocalized`."""
    text = _MARKS.sub("", str(text or ""))
    text = _TANWIN_SEAT.sub("", text)
    out = []
    for ch in text:
        if ch == DAGGER:
            prev = next((c for c in reversed(out) if c not in HARAKAT), "")
            if prev in ("ى", "ا"):
                continue          # the dagger only marks an existing long vowel
            out.append("ا")       # the dagger IS the alef
            continue
        out.append(ch)
    text = "".join(c for c in out if c not in HARAKAT)
    return text.translate(_ALIF_FOLD).strip()


# --------------------------------------------------------------------------
# Closed inventories
# --------------------------------------------------------------------------
# Proclitic tags are lexicon-namespaced on purpose. CAMeL has no vocative
# proclitic at all, and picking between `wa_conj` / `wa_sub` / `wa_part` would
# be exactly the feature guess rule 4 forbids: the surface proves the LETTER,
# never the syntactic subtype.
PROCLITICS = (
    {"tag": "yA_voc", "letters": "يا", "slot": "prc3", "class": "VOCATIVE"},
    {"tag": "wa_prc", "letters": "و", "slot": "prc2", "class": "CONJUNCTIVE"},
    {"tag": "fa_prc", "letters": "ف", "slot": "prc2", "class": "CONJUNCTIVE"},
    {"tag": "bi_prc", "letters": "ب", "slot": "prc1", "class": "PREPOSITIONAL"},
    {"tag": "li_prc", "letters": "ل", "slot": "prc1", "class": "PREPOSITIONAL"},
    {"tag": "ka_prc", "letters": "ك", "slot": "prc1", "class": "PREPOSITIONAL"},
    {"tag": "Al_det", "letters": "ال", "slot": "prc0", "class": "DETERMINER"},
)
PROCLITIC_BY_TAG = {p["tag"]: p for p in PROCLITICS}
MAX_PROCLITICS = 3

# The names occurring in this residual group, written as their `core_key` form.
# Closed list: nothing outside it can ever be produced.
NAME_INVENTORY = {
    "احقاف": "al-Ahqaf, the dunes (surah 46 place name)",
    "ثمود": "Thamud, the people of Salih",
    "زبور": "az-Zabur, the psalms given to Dawud",
    "سامرى": "as-Samiri, the man who made the calf",
    "سواع": "Suwa', a pre-Islamic idol (71:23)",
    "شعيب": "Shu'ayb, prophet of Madyan",
    "عيسى": "'Isa, Jesus son of Maryam",
    "فرعون": "Fir'awn, Pharaoh",
    "لوط": "Lut, Lot",
    "مريم": "Maryam, Mary",
    "موسى": "Musa, Moses",
    "هارون": "Harun, Aaron",
    "هاروت": "Harut, the angel of 2:102",
    "هامان": "Haman, minister of Pharaoh",
    "ياجوج": "Ya'juj, Gog",
    "يحيى": "Yahya, John",
    "يعوق": "Ya'uq, a pre-Islamic idol (71:23)",
    "يغوث": "Yaghuth, a pre-Islamic idol (71:23)",
}


def enumerate_parses(key: str):
    """Every (proclitic chain, name) split of `key` landing on the inventory."""
    results = set()

    def walk(rest, chain):
        if rest in NAME_INVENTORY:
            results.add((tuple(chain), rest))
        if len(chain) >= MAX_PROCLITICS:
            return
        for prc in PROCLITICS:
            letters = prc["letters"]
            if rest.startswith(letters) and len(rest) > len(letters):
                walk(rest[len(letters):], chain + [prc["tag"]])

    walk(key, [])
    return sorted(results)


def classify(chain) -> str:
    if not chain:
        return "PLAIN_PROPER_NAME"
    if chain[0] == "yA_voc":
        return "VOCATIVE_FUSED"
    if all(PROCLITIC_BY_TAG[t]["class"] in
           ("CONJUNCTIVE", "PREPOSITIONAL", "DETERMINER") for t in chain):
        return "CLITIC_FUSED"
    return "OTHER"


def main() -> int:
    for path in (RESIDUAL_PATH, V1_3_SELECTION, V.TEACHER_PATH):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    teacher = {}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        teacher[(obj["verse_key"], obj["word_index"])] = obj

    v1_3 = {}
    for line in V1_3_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        v1_3[(obj["verse_key"], obj["word_index"])] = obj

    residual = defaultdict(list)
    for line in RESIDUAL_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("level") == RESIDUAL_LEVEL:
            residual[obj["arabic"]].append((obj["verse_key"], obj["word_index"]))

    entries = []
    for surface in sorted(residual):
        key = core_key(surface)
        locs = sorted(residual[surface], key=V.sort_key)
        parses = enumerate_parses(key)

        record = {
            "tanzil_surface": surface,
            "surface_key": key,
            "locations": len(locs),
            "verse_keys": [f"{v}:{w}" for v, w in locs],
            "expected_pos": "noun_prop",
            "candidate_parses": [{"proclitics": list(c), "lexical_core": n}
                                 for c, n in parses],
        }

        def veto(reason, classification="OTHER", deterministic=False):
            record.setdefault("classification", classification)
            record.update({
                "status": "UNRESOLVED_PROPER_NAME",
                "reason": reason,
                "deterministic_from_surface_alone": deterministic,
                "requires_manual_verification": True,
                "production_ready": False,
            })
            record.pop("synthetic_candidate", None)
            entries.append(record)

        if len(parses) != 1:
            veto(f"surface admits {len(parses)} parses against the closed name "
                 "inventory; rule 5 forbids emitting a candidate")
            continue

        chain, name = parses[0]
        record.update({
            "classification": classify(chain),
            "proclitics": [{"tag": t,
                            "letters": PROCLITIC_BY_TAG[t]["letters"],
                            "slot": PROCLITIC_BY_TAG[t]["slot"],
                            "class": PROCLITIC_BY_TAG[t]["class"]} for t in chain],
            "lexical_core": name,
            "lexical_core_note": NAME_INVENTORY[name],
            "normalized_lemma": COVERAGE.normalize_lemma(name),
            "deterministic_from_surface_alone": True,
        })

        # ---- teacher confirmation: veto only, never construction -----------
        t_rows = {json.dumps([COVERAGE.normalize_root(teacher[k].get("root")),
                              COVERAGE.normalize_lemma(teacher[k].get("lemma")),
                              teacher[k].get("pos")], ensure_ascii=False)
                  for k in locs}
        if len(t_rows) != 1:
            veto("the independently attested reading is not constant across the "
                 "locations", record["classification"], True)
            continue
        t_root, t_lemma, t_pos = json.loads(next(iter(t_rows)))
        record["independent_check"] = {
            "attested_root": t_root, "attested_lemma": t_lemma,
            "attested_pos": t_pos}

        if t_root is not None:
            veto("the name carries an Arabic root that the surface does not reveal "
                 f"(attested root {t_root!r}); rule 4 forbids synthesizing one, and "
                 "a rootless candidate would be scored as a wrong selection",
                 record["classification"], True)
            continue
        if COVERAGE.normalize_lemma(name) != t_lemma:
            veto(f"the lemma reconstructed from the surface "
                 f"({COVERAGE.normalize_lemma(name)!r}) does not match the "
                 f"independently attested lemma ({t_lemma!r})",
                 record["classification"], True)
            continue
        if t_pos != "N" or "N" not in (COVERAGE.POS_MAP.get("noun_prop") or set()):
            veto(f"attested pos {t_pos!r} is not nominal",
                 record["classification"], True)
            continue

        # ---- rule 8: the token must be one v1.3 could not decide -----------
        statuses = Counter(v1_3[k]["verdict"] for k in locs)
        record["v1_3_status"] = dict(sorted(statuses.items()))
        if set(statuses) - {"RECALL_GAP"}:
            veto("v1.3 already reaches a verdict other than RECALL_GAP here; "
                 "rule 8 forbids touching it", record["classification"], True)
            continue

        prc = {PROCLITIC_BY_TAG[t]["slot"]: t for t in chain}
        record.update({
            "status": "RESOLVED",
            "requires_manual_verification": False,
            "production_ready": True,
            "synthetic_candidate": {
                "lex": name,
                "pos": "noun_prop",
                "root": None,
                "prc0": prc.get("prc0", "0"),
                "prc1": prc.get("prc1", "0"),
                "prc2": prc.get("prc2", "0"),
                "prc3": prc.get("prc3", "0"),
                "enc0": "0",
                "source": CANDIDATE_SOURCE,
            },
            "provenance": (
                f"core_key({surface!r}) = {key!r} peels to exactly one "
                f"(proclitic chain, name) split against the closed inventory, giving "
                f"{name!r}. No root, case, gender, number, state, mood, voice, aspect "
                f"or person is synthesized. Independently confirmed against the "
                f"attested lemma at all {len(locs)} locations."),
        })
        entries.append(record)

    for record in entries:
        record.setdefault("v1_3_status", dict(sorted(Counter(
            v1_3[(vk.rsplit(":", 1)[0], int(vk.rsplit(":", 1)[1]))]["verdict"]
            for vk in record["verse_keys"]).items())))

    entries.sort(key=lambda r: (-r["locations"], r["surface_key"]))
    resolved = [e for e in entries if e["status"] == "RESOLVED"]

    document = {
        "schema_version": SCHEMA_VERSION,
        "contract": {
            "purpose": ("supply one verifiable noun_prop candidate for the residual "
                        "L7A surfaces, for which CAMeL produces no noun_prop "
                        "analysis at all"),
            "keyed_by": "canonical Tanzil surface - never a verse key",
            "candidate_fields": ["lex", "pos", "root(null)", "prc0-prc3", "enc0",
                                 f"source({CANDIDATE_SOURCE})"],
            "never_synthesized": ["root", "cas", "gen", "num", "stt", "mod", "vox",
                                  "asp", "per"],
            "proclitic_tags": ("lexicon-namespaced; the surface proves the letter, "
                               "not the syntactic subtype, so wa_conj/wa_sub-style "
                               "tags are deliberately not asserted"),
            "unique_parse_required": ("a surface with more than one valid split "
                                      "against the closed name inventory yields no "
                                      "candidate"),
            "teacher_use": ("build-time confirmation and veto only - never a runtime "
                            "lookup, fingerprint or verse-key decision"),
            "applies_only_to": "tokens v1.3 leaves RECALL_GAP / UNRESOLVED_PROPER_NAME",
            "pool_semantics": "the candidate is ADDED to the pool; nothing is removed",
            "production_readiness": ("entries whose name could not be independently "
                                     "confirmed from the surface are marked "
                                     "production_ready=false and carry "
                                     "requires_manual_verification=true"),
        },
        "totals": {
            "surfaces": len(entries),
            "locations": sum(e["locations"] for e in entries),
            "resolved_surfaces": len(resolved),
            "resolved_locations": sum(e["locations"] for e in resolved),
            "unresolved_surfaces": len(entries) - len(resolved),
            "unresolved_locations": sum(e["locations"] for e in entries
                                        if e["status"] != "RESOLVED"),
            "distinct_names": len({e["lexical_core"] for e in resolved}),
            "by_classification": dict(sorted(Counter(
                e["classification"] for e in entries).items())),
            "by_classification_resolved": dict(sorted(Counter(
                e["classification"] for e in resolved).items())),
            "production_ready_surfaces": sum(1 for e in entries
                                             if e["production_ready"]),
            "requires_manual_verification_surfaces": sum(
                1 for e in entries if e["requires_manual_verification"]),
        },
        "name_inventory": dict(sorted(NAME_INVENTORY.items())),
        "proclitic_inventory": list(PROCLITICS),
        "entries": entries,
    }

    OUT_PATH.write_text(
        json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    print(json.dumps({
        "out": str(OUT_PATH.relative_to(REPO_ROOT)).replace("\\", "/"),
        "totals": document["totals"],
        "sha256": RECALL.sha256_file(OUT_PATH),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
