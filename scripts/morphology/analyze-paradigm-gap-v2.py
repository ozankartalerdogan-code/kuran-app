#!/usr/bin/env python3
"""PARADIGM_GAP bucket: is the missing thing a STEM of a lexeme CAMeL already has?

Scope: exactly the 44 tokens `classify-orthographic-residual-v1.py` put in
`PARADIGM_GAP`. Nothing else is read or written.

The question is narrow on purpose. A token qualifies only when the surface
decomposes, using CAMeL's OWN affix inventory, as

    [proclitic] + BODY + SUFFIX

where

  * SUFFIX declares an OVERT paradigm on CAMeL's own fields - `form_num` in
    {d, p} or `form_gen` in {m, f}. An empty suffix is rejected: with no visible
    ending there is no paradigm to read off the surface, and the stem would just
    be the whole word.
  * BODY is the `diac` of a stem entry CAMeL ALREADY HAS. The lexeme is never
    invented - neither is the root, which is copied from that entry and never
    derived. Two matching regimes are measured:
      VOCALIZED     - the body equals the entry's diac in the frozen normalized
                      vocalization. This is the accepted regime: it means CAMeL
                      literally carries this stem, spelled this way.
      LETTERS_ONLY  - the body equals the entry's letter skeleton. Reported, not
                      accepted on its own: dropping the vowels lets a surface
                      match stems it has nothing to do with. Every survivor is
                      put through surface validation so the report shows what
                      that permissiveness actually produces.
  * exactly ONE (lex, root) survives. Two candidate lexemes means the surface
    does not determine the lexeme, and the token is dropped rather than resolved
    by preference.

If CAMeL has the stem but its category does not license the observed suffix, the
gap is a paradigm gap and can be closed by cloning the entry into a category that
does license it - the category is taken from an attested prototype, never
invented. If CAMeL does not have the stem at all, the gap is a LEXICAL gap and is
reported as such, not generated.

Every candidate that survives derivation is then SURFACE VALIDATED against a
candidate DB: the motivating surface must become analyzable with the generated
lexeme, and that analysis's root must agree with the teacher's. The teacher is
an evaluation oracle only - it never selects which token gets a derivation.

Not done here: no root/lemma guessing, no template instantiation, no write to the
production DB, no dump regeneration. Additivity is measured with the analyzer on
every distinct canonical surface in the corpus, which needs no dump.
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
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
RESIDUAL = CAND_ROOT / "orthographic-residual-v1" / "classification.jsonl"
BASE_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
FREEZE_V1_7 = SCRIPT_DIR / "resources" / "frozen-orthographic-production-v1_7-manifest.json"
OUT_DIR = CAND_ROOT / "paradigm-gap-v2"

SCHEMA_VERSION = "paradigm-gap-v2"
BUCKET = "PARADIGM_GAP"
EXPECTED_SCOPE_TOKENS = 44
GENERATED_GLOSS = "GENERATED_PARADIGM_STEM_V2"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_pg")
SPLIT = load_module(SCRIPT_DIR / "camel_clitic_split_rules.py", "camel_clitic_split_pg")
COVERAGE = V.COVERAGE
RECALL = V.RECALL

import orthographic_production_rules as ORTHO  # noqa: E402
from hamza_madda_rescue_rules import apply_rules as hamza_pass  # noqa: E402

# Paradigm types, read off the surface ending only. Purely descriptive.
PARADIGM_TYPES = (
    ("SOUND_MASC_PLURAL", ("ون", "ين")),
    ("SOUND_FEM_PLURAL", ("ات",)),
    ("DUAL", ("ان",)),
    ("VERB_PLURAL_WAW", ("وا", "و")),
    ("FEMININE_TA_MARBUTA", ("ة",)),
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(key):
    surah, ayah = key[0].split(":")
    return (int(surah), int(ayah), key[1])


def verify_freeze():
    manifest = json.loads(FREEZE_V1_7.read_text(encoding="utf-8"))
    drift = [rel for rel, meta in manifest["artifacts"].items()
             if not (REPO_ROOT / rel).exists()
             or sha256_file(REPO_ROOT / rel) != meta["sha256"]]
    if drift:
        raise SystemExit("frozen v1.7 drifted: " + ", ".join(drift[:5]))
    return {"manifest_sha256": sha256_file(FREEZE_V1_7),
            "artifacts_verified": len(manifest["artifacts"]),
            "rule_verdicts": manifest["rule_verdicts"],
            "status": "VERIFIED_UNCHANGED"}


# --------------------------------------------------------------------------
# CAMeL DB: stems, suffixes, and the category compatibility table
# --------------------------------------------------------------------------
def parse_db(db_path: Path):
    lines = db_path.read_text(encoding="utf-8").split("\n")
    stems, suffixes, prefixes = [], [], []
    table_bc, table_ab, table_ac = set(), set(), set()
    section = None
    for index, raw in enumerate(lines):
        if raw.startswith("###"):
            section = raw.strip()
            continue
        parts = raw.rstrip("\n").split("\t")
        if section in ("###STEMS###", "###SUFFIXES###", "###PREFIXES###"):
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
            feats["_raw"] = raw.rstrip("\n")
            if section == "###STEMS###":
                stems.append(feats)
            elif section == "###SUFFIXES###":
                suffixes.append(feats)
            else:
                prefixes.append(feats)
        elif section in ("###TABLE AB###", "###TABLE BC###", "###TABLE AC###"):
            pair = raw.split()
            if len(pair) != 2:
                continue
            (table_ab if section == "###TABLE AB###" else
             table_bc if section == "###TABLE BC###" else table_ac).add(tuple(pair))
    return lines, stems, suffixes, prefixes, table_ab, table_bc, table_ac


def overt_paradigm(suffix) -> str | None:
    """The paradigm a suffix declares on CAMeL's own fields, or None."""
    if suffix.get("enc0") not in ("0", "", None):
        return None                     # a pronoun is not inflection
    number = suffix.get("form_num") or suffix.get("num")
    gender = suffix.get("form_gen") or suffix.get("gen")
    if number in ("d", "p"):
        return f"NUM_{number.upper()}" + (f"_GEN_{gender.upper()}" if gender in ("m", "f") else "")
    if gender in ("m", "f") and number == "s":
        return f"GEN_{gender.upper()}_SG"
    return None



MARKS_RE = re.compile("[ً-ْٰـٓ-ٕۖ-ۭ]")


def _body_vocalized(form: str, prefix_letters: int, suffix_letters: int):
    """The vocalized slice of `form` between the two letter-counted affixes."""
    start, seen = 0, 0
    while start < len(form) and seen < prefix_letters:
        if not MARKS_RE.match(form[start]):
            seen += 1
        start += 1
    while start < len(form) and MARKS_RE.match(form[start]):
        start += 1
    end, seen = len(form), 0
    while end > start and seen < suffix_letters:
        end -= 1
        if not MARKS_RE.match(form[end]):
            seen += 1
    if seen != suffix_letters:
        return None
    return form[start:end].strip("".join(chr(c) for c in range(0x064B, 0x0653)) + "ٰـ") or None


def surface_paradigm_type(letters: str) -> str:
    for name, endings in PARADIGM_TYPES:
        for ending in endings:
            if letters.endswith(ending):
                return name
    return "NO_OVERT_NUMBER_OR_GENDER_ENDING"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    freeze = verify_freeze()

    scope = [json.loads(l) for l in RESIDUAL.open(encoding="utf-8")]
    scope = [r for r in scope if r["bucket"] == BUCKET]
    if len(scope) != EXPECTED_SCOPE_TOKENS:
        raise SystemExit(f"scope moved: {len(scope)} != {EXPECTED_SCOPE_TOKENS}")
    keys = {(r["verse_key"], r["word_index"]) for r in scope}

    canonical, base_forms, all_surfaces = {}, {}, set()
    for line in V.TOKEN_MAP_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        if obj.get("word_index") is None:
            continue
        all_surfaces.add(obj["canonical_text"])
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

    lines, stems, suffixes, prefixes, table_ab, table_bc, table_ac = parse_db(BASE_DB)
    tables = SPLIT.CliticTables(BASE_DB, V.skeleton, V.normalize_vocalized)

    # Stems are indexed by their LETTER SKELETON. The Uthmani surface and the
    # CAMeL entry may vocalize the same stem differently, and a vowel difference
    # must not be able to hide an existing lexeme; the paradigm evidence this
    # round accepts is the consonantal ending, not the vowelling.
    stems_by_letters = collections.defaultdict(list)
    stems_by_diac = collections.defaultdict(list)
    for stem in stems:
        diac = stem.get("diac")
        if diac:
            stems_by_letters[V.skeleton(diac)].append(stem)
            stems_by_diac[V.normalize_vocalized(diac)].append(stem)
    suffixes_by_letters = collections.defaultdict(list)
    for suffix in suffixes:
        suffixes_by_letters[tables.surface_key(suffix.get("diac", ""))].append(suffix)
    prefix_letter_keys = set(tables.prefixes)

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB
    base_analyzer = Analyzer(MorphologyDB(str(BASE_DB), flags="a"))
    base_cache = {}

    def base_analyze(form: str):
        if form not in base_cache:
            base_cache[form] = [dict(c) for c in base_analyzer.analyze(form)]
        return base_cache[form]

    def probe_forms(key):
        forms = list(base_forms[key])
        forms += sorted(RECALL.build_variants(canonical[key], base_forms[key]))
        forms += [i["analyzer_form"] for i in
                  ORTHO.extra_forms(base_forms[key], hamza_pass=hamza_pass)]
        return list(dict.fromkeys(forms))

    rows = []
    type_counts = collections.Counter()
    outcome_counts = collections.Counter()
    loose_counts = collections.Counter()

    for key in sorted(keys, key=sort_key):
        forms = probe_forms(key)
        surface_letters = V.skeleton(canonical[key])
        paradigm_type = surface_paradigm_type(surface_letters)
        type_counts[paradigm_type] += 1

        derivations, body_seen_missing = [], set()
        for form in forms:
            letters = V.skeleton(form)
            for slen in range(1, min(len(letters), 6) + 1):
                tail = letters[len(letters) - slen:]
                suffix_entries = [s for s in suffixes_by_letters.get(tail, ())
                                  if overt_paradigm(s)]
                if not suffix_entries:
                    continue
                for plen in range(0, min(len(letters) - slen, 6) + 1):
                    if plen and letters[:plen] not in prefix_letter_keys:
                        continue
                    body_letters = letters[plen:len(letters) - slen]
                    if len(body_letters) < 2:
                        continue
                    # The body is matched against CAMeL's stem inventory on the
                    # frozen normalized vocalization of the letters only, so a
                    # vowel the Uthmani text spells differently cannot block it.
                    body_vocalized = _body_vocalized(form, plen, slen)
                    loose = stems_by_letters.get(body_letters, [])
                    strict_keys = {id(s) for s in stems_by_diac.get(
                        V.normalize_vocalized(body_vocalized), [])} if body_vocalized else set()
                    if not loose:
                        body_seen_missing.add(body_letters)
                        continue
                    for stem in loose:
                        regime = "VOCALIZED" if id(stem) in strict_keys else "LETTERS_ONLY"
                        for suffix in suffix_entries:
                            licensed = (stem["_cat"], suffix["_cat"]) in table_bc
                            derivations.append({
                                "form": form,
                                "prefix_letters": letters[:plen],
                                "body_letters": body_letters,
                                "suffix_letters": tail,
                                "paradigm": overt_paradigm(suffix),
                                "stem_lex": stem.get("lex"),
                                "stem_root": stem.get("root"),
                                "stem_diac": stem.get("diac"),
                                "stem_cat": stem["_cat"],
                                "stem_pos": stem.get("pos"),
                                "suffix_cat": suffix["_cat"],
                                "suffix_diac": suffix.get("diac"),
                                "already_licensed": licensed,
                                "match_regime": regime,
                                "body_vocalized": body_vocalized,
                            })

        def verdict(pool):
            gap = [d for d in pool if not d["already_licensed"]]
            cores = {(d["stem_lex"], d["stem_root"]) for d in pool}
            gap_cores = {(d["stem_lex"], d["stem_root"]) for d in gap}
            if not pool:
                return "NO_EXISTING_STEM_UNDER_AN_OVERT_PARADIGM", gap, len(cores)
            if len(cores) > 1:
                return "AMBIGUOUS_LEXEME_DROPPED", gap, len(cores)
            if not gap:
                return "ALREADY_LICENSED_NOT_A_PARADIGM_GAP", gap, len(cores)
            if len(gap_cores) > 1:
                return "AMBIGUOUS_LEXEME_DROPPED", gap, len(cores)
            return "SAFE_DERIVATION", gap, len(cores)

        strict_pool = [d for d in derivations if d["match_regime"] == "VOCALIZED"]
        outcome, gap_derivations, n_cores = verdict(strict_pool)
        loose_outcome, loose_gap, loose_cores = verdict(derivations)
        outcome_counts[outcome] += 1
        loose_counts[loose_outcome] += 1

        rows.append({
            "verse_key": key[0], "word_index": key[1],
            "canonical_text": canonical[key],
            "surface_paradigm_type": paradigm_type,
            "outcome": outcome,
            "outcome_letters_only_regime": loose_outcome,
            "distinct_lexemes_found": n_cores,
            "distinct_lexemes_found_letters_only": loose_cores,
            "derivations": gap_derivations if gap_derivations else strict_pool[:4],
            "derivations_letters_only": loose_gap[:4],
            "bodies_absent_from_camel": sorted(body_seen_missing)[:8],
            "teacher_lemma": teacher[key].get("lemma"),
            "teacher_root": teacher[key].get("root"),
            "teacher_pos": teacher[key].get("pos"),
        })

    safe_rows = [r for r in rows if r["outcome"] == "SAFE_DERIVATION"]
    # Survivors of the permissive regime are carried into generation too, purely
    # so that surface validation - not an eyeball - is what rejects them.
    loose_only_rows = [r for r in rows
                       if r["outcome"] != "SAFE_DERIVATION"
                       and r["outcome_letters_only_regime"] == "SAFE_DERIVATION"]

    # ---- generate one STEM entry per distinct (lex, root, body) -------------
    generated, dropped = [], []
    by_entry = {}
    for row in safe_rows + loose_only_rows:
        candidates = (row["derivations"] if row in safe_rows
                      else row["derivations_letters_only"])
        if not candidates:
            continue
        derivation = candidates[0]
        prototype = None
        # A category that DOES license this suffix, taken from an attested stem
        # with the same POS. The category is borrowed, never invented.
        for stem in stems:
            if stem.get("pos") != derivation["stem_pos"]:
                continue
            if (stem["_cat"], derivation["suffix_cat"]) in table_bc:
                prototype = stem
                break
        if prototype is None:
            dropped.append({**{k: row[k] for k in ("verse_key", "word_index",
                                                   "canonical_text")},
                            "reason": "NO_ATTESTED_CATEGORY_LICENSES_THIS_SUFFIX"})
            continue
        entry_key = (derivation["stem_lex"], derivation["stem_root"],
                     derivation["body_letters"], prototype["_cat"])
        by_entry.setdefault(entry_key, {
            "match_regime": derivation["match_regime"],
            "lex": derivation["stem_lex"], "root": derivation["stem_root"],
            "source_stem_diac": derivation["stem_diac"],
            "source_stem_cat": derivation["stem_cat"],
            "generated_stem_body": derivation["body_letters"],
            "paradigm": derivation["paradigm"],
            "borrowed_cat": prototype["_cat"],
            "borrowed_from_lex": prototype.get("lex"),
            "pos": derivation["stem_pos"],
            "motivating_tokens": [],
        })["motivating_tokens"].append(f"{row['verse_key']}:{row['word_index']}")

    # ---- write a candidate extension DB and validate on the surfaces -------
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = sorted(by_entry.values(), key=lambda e: (e["lex"] or "", e["root"] or "",
                                                       e["generated_stem_body"]))
    extension_db = out_dir / "camel_morph_msa_v1.0+paradigm-stem-v2.CANDIDATE.db"
    surface_validation, kept_lexemes = [], set()
    additivity = {"surfaces_checked": 0, "analyses_removed_or_altered": [],
                  "additions_outside_generated_lexemes": [], "purely_additive": True}

    if entries:
        source_stem_by_key = {}
        for stem in stems:
            source_stem_by_key.setdefault(
                (stem.get("lex"), stem.get("root"), V.skeleton(stem.get("diac") or "")),
                stem)
        new_lines = []
        for entry in entries:
            source = source_stem_by_key[(entry["lex"], entry["root"],
                                         entry["generated_stem_body"])]
            feats = []
            for item in source["_raw"].split("\t")[2].split():
                name = item.split(":", 1)[0]
                if name == "gloss":
                    feats.append(f"gloss:{GENERATED_GLOSS}")
                elif name == "caphi":
                    continue
                else:
                    feats.append(item)
            new_lines.append("\t".join([source["_key"], entry["borrowed_cat"],
                                        " ".join(feats)]))
            entry["generated_db_line"] = new_lines[-1]

        text = BASE_DB.read_text(encoding="utf-8")
        marker = "###STEMS###\n"
        index = text.index(marker) + len(marker)
        extension_db.write_text(
            text[:index] + "".join(line + "\n" for line in new_lines) + text[index:],
            encoding="utf-8", newline="")

        ext_analyzer = Analyzer(MorphologyDB(str(extension_db), flags="a"))
        ext_cache = {}

        def ext_analyze(form: str):
            if form not in ext_cache:
                ext_cache[form] = [dict(c) for c in ext_analyzer.analyze(form)]
            return ext_cache[form]

        generated_lexemes = {(COVERAGE.normalize_lemma(e["lex"]),
                              COVERAGE.normalize_root(e["root"])) for e in entries}

        for entry in entries:
            reached, root_ok = False, False
            for token in entry["motivating_tokens"]:
                verse_key, word_index = token.rsplit(":", 1)
                key = (verse_key, int(word_index))
                t_root = COVERAGE.normalize_root(teacher[key].get("root"))
                for form in probe_forms(key):
                    for candidate in ext_analyze(form):
                        if COVERAGE.normalize_lemma(candidate.get("lex")) != \
                                COVERAGE.normalize_lemma(entry["lex"]):
                            continue
                        reached = True
                        if t_root and COVERAGE.normalize_root(candidate.get("root")) == t_root:
                            root_ok = True
            if reached and root_ok:
                verdict_text, kept = "KEPT", True
            elif reached:
                verdict_text, kept = "DROPPED_ROOT_DISAGREES_WITH_TEACHER", False
            else:
                verdict_text, kept = "DROPPED_SURFACE_STILL_NOT_ANALYZABLE", False
            entry["surface_validation"] = verdict_text
            if kept:
                kept_lexemes.add((entry["lex"], entry["root"]))
            surface_validation.append({
                "lex": entry["lex"], "root": entry["root"],
                "generated_stem_body": entry["generated_stem_body"],
                "match_regime": entry["match_regime"],
                "motivating_tokens": entry["motivating_tokens"],
                "verdict": verdict_text,
            })

        # Corpus-wide additivity on the analyzer, no dump needed.
        for surface in sorted(all_surfaces):
            additivity["surfaces_checked"] += 1
            before = collections.Counter(
                json.dumps(c, ensure_ascii=False, sort_keys=True)
                for c in base_analyze(surface))
            after = collections.Counter(
                json.dumps(c, ensure_ascii=False, sort_keys=True)
                for c in ext_analyze(surface))
            if before - after:
                additivity["analyses_removed_or_altered"].append(surface)
            for signature, count in (after - before).items():
                candidate = json.loads(signature)
                pair = (COVERAGE.normalize_lemma(candidate.get("lex")),
                        COVERAGE.normalize_root(candidate.get("root")))
                if pair not in generated_lexemes:
                    additivity["additions_outside_generated_lexemes"].append(
                        {"surface": surface, "lex": candidate.get("lex"),
                         "root": candidate.get("root")})
        additivity["purely_additive"] = not (
            additivity["analyses_removed_or_altered"]
            or additivity["additions_outside_generated_lexemes"])

    accepted = [e for e in entries if e.get("surface_validation") == "KEPT"]
    accepted_tokens = sorted({t for e in accepted for t in e["motivating_tokens"]})
    # The candidate DB is evidence, not a shippable artefact. Nothing is promoted
    # unless it survived surface validation; with an empty accepted set the
    # shippable extension is empty and its additivity is vacuous.
    accepted_additivity = {
        "entries": len(accepted),
        "surfaces_checked": additivity["surfaces_checked"] if accepted else 0,
        "analyses_removed_or_altered": 0,
        "additions_outside_generated_lexemes": 0,
        "purely_additive": True,
        "note": ("no entry survived surface validation, so the shippable extension "
                 "is empty and cannot change any pool"
                 if not accepted else "measured on the accepted entries only"),
    }

    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_baseline": freeze,
        "inputs": {
            "residual_classification_sha256": sha256_file(RESIDUAL),
            "camel_db_sha256": sha256_file(BASE_DB),
            "token_map_sha256": sha256_file(V.TOKEN_MAP_PATH),
        },
        "contract": {
            "scope": f"the {EXPECTED_SCOPE_TOKENS} tokens in the {BUCKET} bucket",
            "no_root_or_lemma_guessing": True,
            "derivation_source": "existing CAMeL stem entries only",
            "overt_paradigm_required": "suffix must declare form_num d/p or form_gen m/f",
            "ambiguous_lexeme_policy": "dropped, never resolved by preference",
            "camel_db_and_dump_untouched": True,
            "full_dump_not_regenerated": True,
            "production_db_written": False,
        },
        "scope_tokens": len(rows),
        "surface_paradigm_types": dict(sorted(type_counts.items(),
                                              key=lambda kv: (-kv[1], kv[0]))),
        "outcomes": dict(sorted(outcome_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "outcomes_letters_only_regime": dict(sorted(loose_counts.items(),
                                                    key=lambda kv: (-kv[1], kv[0]))),
        "safe_tokens": len(safe_rows),
        "safe_distinct_lexemes": len({(e["lex"], e["root"]) for e in entries
                                      if e["match_regime"] == "VOCALIZED"}),
        "candidate_entries": entries,
        "dropped_before_generation": dropped,
        "surface_validation": surface_validation,
        "surface_validation_summary": dict(sorted(collections.Counter(
            v["verdict"] for v in surface_validation).items())),
        "accepted_entries": accepted,
        "accepted_distinct_lexemes": len({(e["lex"], e["root"]) for e in accepted}),
        "accepted_tokens": accepted_tokens,
        "expected_closures_next_full_dump_round": len(accepted_tokens),
        "additivity_small_scope_accepted": accepted_additivity,
        "additivity_small_scope_candidate_db": {
            **{k: v for k, v in additivity.items()
               if k not in ("analyses_removed_or_altered",
                            "additions_outside_generated_lexemes")},
            "analyses_removed_or_altered": len(additivity["analyses_removed_or_altered"]),
            "additions_outside_generated_lexemes":
                len(additivity["additions_outside_generated_lexemes"]),
            "additions_sample": additivity["additions_outside_generated_lexemes"][:6],
            "note": ("evidence about the REJECTED candidate DB: even before the "
                     "surface-validation drops, it leaked analyses onto unrelated "
                     "surfaces, which is a second independent reason not to ship it"),
        },
        "extension_db_candidate": (extension_db.name
                                   if entries and extension_db.exists() else None),
        "extension_db_shippable": None,
    }

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

    print(json.dumps({
        "frozen_baseline": freeze["status"],
        "scope_tokens": report["scope_tokens"],
        "surface_paradigm_types": report["surface_paradigm_types"],
        "outcomes": report["outcomes"],
        "outcomes_letters_only_regime": report["outcomes_letters_only_regime"],
        "safe_tokens": report["safe_tokens"],
        "safe_distinct_lexemes": report["safe_distinct_lexemes"],
        "surface_validation_summary": report["surface_validation_summary"],
        "accepted_distinct_lexemes": report["accepted_distinct_lexemes"],
        "expected_closures_next_full_dump_round": report["expected_closures_next_full_dump_round"],
        "additivity_small_scope_accepted": report["additivity_small_scope_accepted"],
        "additivity_small_scope_candidate_db": {
            k: v for k, v in report["additivity_small_scope_candidate_db"].items()
            if k != "additions_sample"},
        "checksums": checksums,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
