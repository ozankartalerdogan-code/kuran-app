#!/usr/bin/env python3
"""Build the candidate CAMeL lexicon extension for the safe paradigm-gap set.

Input: the `safe_for_extension` rows of `classify-lexicon-oov.py`.
Output: one new STEM entry per missing lexeme, plus an extended copy of the
CAMeL database. The original database is never modified.

Every entry is generated, not authored:
  * `diac`/`lex` come from instantiating a CAMeL stem template with a root;
  * `root` is the root that unification recovered AND that CAMeL already carries
    with a base verb lexeme - never invented;
  * `stemcat`, and with it the whole inflection and clitic behaviour, is the
    category of the attested prototype entry that uses the same template, so
    CAMeL conjugates the new lexeme exactly as it conjugates its siblings;
  * `gloss` and `caphi` are NOT inherited from the prototype - an inherited
    gloss would assert a meaning nobody verified - and are emitted as an
    explicit generated-entry marker instead.

Validation performed here, before anything is written:
  * the template must round-trip every sound-root entry it already covers;
  * re-instantiating the generated entry must reproduce its own `diac`;
  * the lexeme must not already exist in CAMeL under that root;
  * the extended database must load, and the analyzer must return the generated
    lexeme for the very surfaces that motivated it.
"""

from __future__ import annotations

import collections
import importlib.util
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
CLASSIFICATION = CAND_ROOT / "lexicon-oov" / "classification.jsonl"
OUT_DIR = CAND_ROOT / "lexicon-extension-v1"

SCHEMA_VERSION = "camel-lexicon-extension-v1"
GENERATED_GLOSS = "GENERATED_PARADIGM_EXTENSION"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c")
OOV = load_module(SCRIPT_DIR / "classify-lexicon-oov.py", "lexicon_oov_classifier")

DIACRITICS = "ًٌٍَُِّْٰ"


def undiacritized(text: str) -> str:
    return "".join(ch for ch in text if ch not in DIACRITICS)


def build_line(prototype: dict, raw_line: str, lex: str, root: str, pattern: str) -> str:
    """Clone the prototype STEM line field by field.

    Rebuilt from the parsed fields rather than by string substitution, so a
    prototype whose gloss happens to contain its own lemma cannot corrupt the
    generated entry.
    """
    key, cat, blob = raw_line.split("\t", 2)
    fields = []
    for item in blob.split():
        if ":" not in item:
            fields.append(item)
            continue
        name, _value = item.split(":", 1)
        if name == "diac":
            fields.append(f"diac:{lex}")
        elif name == "lex":
            fields.append(f"lex:{lex}")
        elif name == "root":
            fields.append(f"root:{root}")
        elif name == "pattern":
            fields.append(f"pattern:{pattern}")
        elif name == "pattern_abstract":
            fields.append(f"pattern_abstract:{prototype.get('pattern_abstract', '')}")
        elif name == "gloss":
            fields.append(f"gloss:{GENERATED_GLOSS}")
        elif name == "caphi":
            fields.append("caphi:")
        elif name == "bw":
            fields.append(f"bw:{lex}/{prototype.get('pos', 'noun').upper()}")
        elif name in ("stem", "cm_stem"):
            fields.append(f"{name}:{lex}")
        elif name in ("d1seg", "d2seg", "d3seg", "atbseg", "d1tok", "d2tok",
                      "d3tok", "atbtok", "bwtok", "stemgloss"):
            fields.append(f"{name}:{lex}")
        else:
            fields.append(item)
    return f"{undiacritized(lex)}\t{cat}\t{' '.join(fields)}"


def main() -> int:
    for path in (CLASSIFICATION, V.DB_PATH):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    rows = [json.loads(line) for line in CLASSIFICATION.open(encoding="utf-8")]
    safe = [r for r in rows if r.get("safe_for_extension")]
    if not safe:
        raise SystemExit("FAIL-CLOSED: the safe set is empty")

    lines, stems, last_stem_line = OOV.parse_stems(V.DB_PATH)
    templates = OOV.build_templates(stems)
    lexemes_by_root = collections.defaultdict(set)
    roots_with_verb = set()
    for stem in stems:
        root = stem.get("root")
        if root and "." in root:
            lexemes_by_root[root].add(V.normalize_vocalized(stem.get("diac")))
            if stem.get("pos") == "verb":
                roots_with_verb.add(root)

    wanted = {}
    for row in safe:
        cand = row["paradigm_candidates"][0]
        key = (cand["generated_lex"], cand["root"], cand["stemcat"], cand["pos"])
        entry = wanted.setdefault(key, {
            "lex": cand["generated_lex"], "root": cand["root"],
            "stemcat": cand["stemcat"], "pos": cand["pos"],
            "pattern": cand["pattern"],
            "template_support_roots": cand["template_support_roots"],
            "tokens": [], "surfaces": collections.Counter(),
        })
        entry["tokens"].append(f"{row['verse_key']}:{row['word_index']}")
        entry["surfaces"][row["arabic"]] += 1

    entries, rejected = [], []
    for key in sorted(wanted):
        entry = wanted[key]
        template = templates.get((entry["pattern"], entry["stemcat"], entry["pos"]))
        if template is None:
            rejected.append({**{k: entry[k] for k in ("lex", "root")},
                             "why": "template_no_longer_trusted"})
            continue
        if entry["root"] not in roots_with_verb:
            rejected.append({**{k: entry[k] for k in ("lex", "root")},
                             "why": "root_has_no_base_verb_in_camel"})
            continue
        if V.normalize_vocalized(entry["lex"]) in lexemes_by_root[entry["root"]]:
            rejected.append({**{k: entry[k] for k in ("lex", "root")},
                             "why": "lexeme_already_present"})
            continue
        regenerated = OOV.instantiate(entry["pattern"], entry["root"])
        if V.normalize_vocalized(regenerated) != V.normalize_vocalized(entry["lex"]):
            rejected.append({**{k: entry[k] for k in ("lex", "root")},
                             "why": "does_not_reproduce_itself"})
            continue
        prototype = template["prototype"]
        line = build_line(prototype, lines[prototype["_line"]],
                          entry["lex"], entry["root"], entry["pattern"])
        entries.append({
            "lex": entry["lex"], "root": entry["root"], "pos": entry["pos"],
            "stemcat": entry["stemcat"], "pattern": entry["pattern"],
            "template_support_roots": entry["template_support_roots"],
            "prototype_lex": prototype.get("lex"),
            "prototype_root": prototype.get("root"),
            "tokens": sorted(entry["tokens"]),
            "surfaces": dict(sorted(entry["surfaces"].items())),
            "db_line": line,
        })

    if not entries:
        raise SystemExit("FAIL-CLOSED: no entry survived validation")

    extended = list(lines)
    for offset, entry in enumerate(entries):
        extended.insert(last_stem_line + 1 + offset, entry["db_line"])
    extended_db = OUT_DIR / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
    extended_db.write_text("\n".join(extended), encoding="utf-8", newline="\n")

    # ---- the extension must actually work -------------------------------
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    base = Analyzer(MorphologyDB(str(V.DB_PATH), flags="a"))
    ext = Analyzer(MorphologyDB(str(extended_db), flags="a"))
    new_lexemes = {(V.normalize_vocalized(e["lex"]), e["root"]) for e in entries}

    def fingerprint(analysis: dict) -> tuple:
        return tuple(analysis.get(f) for f in
                     ("diac", "lex", "root", "pos", "prc0", "prc1", "prc1.5",
                      "prc2", "prc3", "enc0", "cas", "stt", "num", "gen"))

    verification, unverified = [], []
    for entry in entries:
        for surface in entry["surfaces"]:
            probe = undiacritized(V.normalize_vocalized(surface))
            reached = [a for a in ext.analyze(probe)
                       if V.normalize_vocalized(a.get("lex")) == V.normalize_vocalized(entry["lex"])
                       and a.get("root") == entry["root"]]
            verification.append({"lex": entry["lex"], "surface": surface,
                                 "reaches_generated_lexeme": bool(reached)})
            if not reached:
                unverified.append({"lex": entry["lex"], "surface": surface})

    # ---- ADDITIVITY over the WHOLE corpus -------------------------------
    # The acceptance requirement "existing correct unchanged / new incorrect 0"
    # is proven at the source: over every distinct surface the corpus contains,
    # the extended analyzer must (a) keep every analysis the base analyzer gave
    # - none removed, none altered - and (b) add nothing except the generated
    # lexemes. If both hold, no pre-existing candidate pool anywhere in the
    # corpus can change, so no prior selection can flip.
    surfaces = set()
    for line in V.TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        surfaces.add(obj["canonical_text"])
        for form in obj.get("analysis_forms") or []:
            surfaces.add(form)

    removed_or_altered, foreign_additions = [], []
    probes = sorted({undiacritized(V.normalize_vocalized(s)) for s in surfaces})
    for probe in probes:
        before = {fingerprint(a) for a in base.analyze(probe)}
        after_list = ext.analyze(probe)
        after = {fingerprint(a) for a in after_list}
        if not before <= after:
            removed_or_altered.append(probe)
        for a in after_list:
            fp = fingerprint(a)
            if fp in before:
                continue
            if (V.normalize_vocalized(a.get("lex")), a.get("root")) not in new_lexemes:
                foreign_additions.append({"probe": probe, "lex": a.get("lex"),
                                          "root": a.get("root")})
    regressions = removed_or_altered

    # An entry whose borrowed category does not license a single one of its
    # motivating surfaces has demonstrably not been made analyzable, so it is
    # dropped rather than shipped. Surfaces that stay unreachable are reported
    # and remain open - the extension never claims coverage it cannot show.
    reached_by_lex = collections.defaultdict(set)
    for item in verification:
        if item["reaches_generated_lexeme"]:
            reached_by_lex[item["lex"]].add(item["surface"])
    dropped = [e for e in entries if not reached_by_lex.get(e["lex"])]
    if dropped:
        for entry in dropped:
            rejected.append({"lex": entry["lex"], "root": entry["root"],
                             "why": "no_motivating_surface_became_analyzable"})
        entries = [e for e in entries if reached_by_lex.get(e["lex"])]
        if not entries:
            raise SystemExit("FAIL-CLOSED: every entry failed surface verification")
        extended = list(lines)
        for offset, entry in enumerate(entries):
            extended.insert(last_stem_line + 1 + offset, entry["db_line"])
        extended_db.write_text("\n".join(extended), encoding="utf-8", newline="\n")
        ext = Analyzer(MorphologyDB(str(extended_db), flags="a"))

    covered_surfaces = {(e["lex"], s) for e in entries for s in reached_by_lex[e["lex"]]}
    open_surfaces = sorted({(v["lex"], v["surface"]) for v in verification
                            if not v["reaches_generated_lexeme"]
                            and any(e["lex"] == v["lex"] for e in entries)})

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "classification_sha256": V.sha256_file(CLASSIFICATION),
            "camel_db_sha256": V.sha256_file(V.DB_PATH),
        },
        "contract": {
            "original_db_untouched": True,
            "root_policy": ("recovered by unification and required to already carry a "
                            "base verb in CAMeL; never invented"),
            "gloss_policy": f"generated entries carry gloss:{GENERATED_GLOSS}, never an inherited one",
            "inflection_policy": ("stemcat borrowed from the attested prototype, so "
                                  "CAMeL supplies all inflection and clitic behaviour"),
            "frame_policy": ("only surfaces differing from the stem by a sound "
                             "masculine plural/dual ending entered the safe set"),
        },
        "scope": {
            "safe_tokens": len(safe),
            "requested_lexemes": len(wanted),
            "written_entries": len(entries),
            "rejected": rejected,
        },
        "verification": {
            "motivating_surface_probes": len(verification),
            "reaching_generated_lexeme": sum(1 for v in verification
                                             if v["reaches_generated_lexeme"]),
            "surfaces_still_open": unverified,
        },
        "additivity_over_corpus": {
            "distinct_surface_probes": len(probes),
            "analyses_removed_or_altered": removed_or_altered,
            "additions_outside_generated_lexemes": foreign_additions,
            "purely_additive": not removed_or_altered and not foreign_additions,
        },
        "entries": [{k: v for k, v in e.items() if k != "db_line"} for e in entries],
    }

    (OUT_DIR / "extension.jsonl").write_text(
        "".join(json.dumps(e, ensure_ascii=False, sort_keys=True) + "\n" for e in entries),
        encoding="utf-8", newline="\n")
    (OUT_DIR / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    (OUT_DIR / "checksums.json").write_text(
        json.dumps({"schema_version": SCHEMA_VERSION,
                    "extension.jsonl": V.sha256_file(OUT_DIR / "extension.jsonl"),
                    "extended_db": V.sha256_file(extended_db),
                    "report.json": V.sha256_file(OUT_DIR / "report.json")},
                   ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")

    print(json.dumps({k: report[k] for k in
                      ("scope", "verification", "additivity_over_corpus")},
                     ensure_ascii=False, indent=2, default=str)[:3500])
    # Hard gate: purely additive over the whole corpus. Individual motivating
    # surfaces that stay open are reported, not fatal - the entry that reaches
    # none of its surfaces was already dropped above.
    if removed_or_altered or foreign_additions:
        print("EXTENSION NOT PURELY ADDITIVE - REJECTED", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
