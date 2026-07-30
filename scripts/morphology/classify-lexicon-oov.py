#!/usr/bin/env python3
"""Reclassify the lexicon/paradigm OOV group left after selector v1.5.

Scope (all read-only, teacher used as an oracle for reporting only):
  * the L7B/L7C/L7D residual tokens still RECALL_GAP under v1.5, and
  * the segmentation tokens v1.5 left open.

The question this answers is NOT "which token can be closed" but "which SETS of
tokens are closable by a general lexical entry or a paradigm extension, and
nothing else". So every token is put in exactly one bucket:

  ORTHOGRAPHIC_ONLY       a named, frozen orthographic probe already makes the
                          surface analyzable - CAMeL has the word, the Uthmani
                          spelling hides it. Not a lexicon problem.
  SEGMENTATION_RESIDUAL   left open by the frozen v1.5 clitic-split contract.
                          No new segmentation rule is added here.
  DERIVABLE_PARADIGM_GAP  the surface unifies with a stem template CAMeL already
                          uses productively, over a root CAMeL already carries
                          with a base verb. Closable by a paradigm extension.
  LEXICAL_ENTRY_GAP       neither the lemma nor the root is anywhere in CAMeL.
                          Closable only by authoring a new entry from an
                          independent source - out of scope for automation.
  UNCLASSIFIED            none of the above.

Root policy: a root is never invented. In DERIVABLE_PARADIGM_GAP the root falls
out of unifying the surface with a CAMeL template, and is then REQUIRED to
already exist in CAMeL's lexicon carrying at least one base verb lexeme. A root
that CAMeL does not already know is rejected, never guessed.
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
RESIDUAL = CAND_ROOT / "residual-recall-gap" / "residual-classification.jsonl"
V1_5_SELECTION = CAND_ROOT / "selector-v1_5" / "selection.jsonl"
V1_5_COHORT = CAND_ROOT / "selector-v1_5" / "segmentation-cohort.jsonl"
FREEZE_MANIFEST = SCRIPT_DIR / "resources" / "frozen-v1_5-manifest.json"
OUT_DIR = CAND_ROOT / "lexicon-oov"

SCHEMA_VERSION = "lexicon-oov-classification-v1"
WEAK_RADICALS = set("ايوء")
MIN_TEMPLATE_SUPPORT = 20      # distinct sound roots that already use the template


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c")
SPLIT = load_module(SCRIPT_DIR / "camel_clitic_split_rules.py", "camel_clitic_split_rules")
CLASSIFIER = load_module(SCRIPT_DIR / "classify-residual-recall-gap.py",
                         "residual_gap_classifier")
COVERAGE = V.COVERAGE
RECALL = V.RECALL


# --------------------------------------------------------------------------
# CAMeL stem inventory
# --------------------------------------------------------------------------
def parse_stems(db_path: Path):
    """Every STEM line, with its raw text kept so an extension can clone it."""
    lines = db_path.read_text(encoding="utf-8").split("\n")
    stems, last_line = [], 0
    section = None
    for index, raw in enumerate(lines):
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
        stems.append(feats)
        last_line = index
    return lines, stems, last_line


def is_sound_root(root: str) -> bool:
    """Three plain radicals. Weak and hamzated roots are excluded because
    CAMeL's own templates do not round-trip on them (ش.ه.و + ٱِ1ْتِ2َا spells
    ٱِشْتِهَاء, not ٱِشْتِهَا), so generating over them would fabricate forms."""
    radicals = root.split(".")
    return len(radicals) == 3 and not any(r in WEAK_RADICALS for r in radicals)


def instantiate(pattern: str, root: str):
    radicals = root.split(".")
    out = []
    for ch in pattern:
        if ch.isdigit():
            index = int(ch) - 1
            if index >= len(radicals):
                return None
            out.append(radicals[index])
        else:
            out.append(ch)
    return "".join(out)


def build_templates(stems):
    """Nominal stem templates that reproduce their own lexicon entries exactly.

    A template is kept only when EVERY sound-root entry using it round-trips:
    instantiating the pattern with the entry's own root must give back the
    entry's own `diac`. A template that cannot rebuild what CAMeL already has is
    not trusted to build anything new.
    """
    grouped = collections.defaultdict(list)
    for stem in stems:
        if stem.get("pos") not in ("noun", "adj"):
            continue
        pattern, root, diac = stem.get("pattern"), stem.get("root"), stem.get("diac")
        if not pattern or not root or not diac or "." not in root:
            continue
        if not is_sound_root(root):
            continue
        grouped[(pattern, stem["_cat"], stem["pos"])].append(stem)

    templates = {}
    for key, entries in grouped.items():
        exact = [e for e in entries if instantiate(key[0], e["root"]) == e["diac"]]
        if len(exact) != len(entries):
            continue                      # not perfectly productive: drop it
        if len(entries) < MIN_TEMPLATE_SUPPORT:
            continue
        # A broken-plural template (زُرُوع for زَرْع) is a plural STEM, so taking it
        # as the lexeme contradicts the singular-lemma convention this pipeline
        # is evaluated under. CAMeL marks it itself: the entries carry num:p.
        if any(e.get("num") == "p" for e in entries):
            continue
        templates[key] = {
            "pattern": key[0], "stemcat": key[1], "pos": key[2],
            "support_roots": len({e["root"] for e in entries}),
            "support_entries": len(entries),
            "prototype": min(entries, key=lambda e: (e["_key"], e["_line"])),
        }
    return templates


def unify(pattern: str, target: str):
    """Radicals implied by reading `target` through `pattern`, or None.

    Both sides are compared in the frozen normalized vocalization, so a
    difference in combining-mark order can never silently block a match.
    """
    npattern = V.normalize_vocalized(pattern)
    ntarget = V.normalize_vocalized(target)
    radicals, cursor = {}, 0
    for ch in npattern:
        if ch.isdigit():
            if cursor >= len(ntarget):
                return None
            radicals[int(ch)] = ntarget[cursor]
            cursor += 1
        else:
            if cursor >= len(ntarget) or ntarget[cursor] != ch:
                return None
            cursor += 1
    if cursor != len(ntarget) or len(radicals) < 3:
        return None
    return ".".join(radicals[i] for i in sorted(radicals))


def main() -> int:
    for path in (RESIDUAL, V1_5_SELECTION, V1_5_COHORT, FREEZE_MANIFEST, V.DB_PATH):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    residual = {}
    for line in RESIDUAL.open(encoding="utf-8"):
        obj = json.loads(line)
        residual[(obj["verse_key"], obj["word_index"])] = obj
    selection = {}
    for line in V1_5_SELECTION.open(encoding="utf-8"):
        obj = json.loads(line)
        selection[(obj["verse_key"], obj["word_index"])] = obj
    cohort_open = set()
    for line in V1_5_COHORT.open(encoding="utf-8"):
        obj = json.loads(line)
        if not obj["closed"]:
            cohort_open.add((obj["verse_key"], obj["word_index"]))

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
        canonical[key] = obj["canonical_text"]
        base_forms[key] = list(obj["analysis_forms"])

    oov = [k for k, obj in residual.items()
           if obj["level"].startswith("L7") and obj["level"] != "L7A_PROPER_NOUN"
           and selection[k]["verdict"] == "RECALL_GAP"]
    scope = sorted(set(oov) | cohort_open, key=V.sort_key)

    lines, stems, _last = parse_stems(V.DB_PATH)
    templates = build_templates(stems)
    roots_with_verb = {s["root"] for s in stems
                       if s.get("pos") == "verb" and s.get("root") and "." in s["root"]}
    lexemes_by_root = collections.defaultdict(set)
    for stem in stems:
        if stem.get("root") and "." in stem["root"]:
            lexemes_by_root[stem["root"]].add(V.normalize_vocalized(stem.get("diac")))

    tables = SPLIT.CliticTables(V.DB_PATH, V.skeleton, V.normalize_vocalized)
    prefix_keys = sorted(tables.prefixes, key=len, reverse=True)
    suffix_letters = sorted({tables.surface_key(e["diac"])
                             for group in tables.suffixes.values() for e in group}
                            | {""}, key=len, reverse=True)
    # CAMeL's LEMMA-PRESERVING nominal endings, letters only, straight from the
    # DB. Two whole classes are excluded, both on CAMeL's own fields:
    #   * entries carrying an enclitic (`enc0`): a pronoun is not inflection, and
    #     stripping ـنا off أَرَاذِلُنَا mutilates the stem.
    #   * entries declaring `gen:f`: CAMeL spells feminine derivation INSIDE the
    #     stem pattern (`مُ1ا2َ3+َة`), so a feminine surface must be matched by a
    #     feminine template. Stripping ـات/ـة instead changes the lemma
    #     (مُسافِحَة -> مُسافِح, مَرْضات -> مَرْض) rather than the inflection.
    nominal_suffix_letters = set()
    excluded_suffix_letters = set()
    sound_masculine_endings = set()
    section = None
    for raw in V.DB_PATH.open(encoding="utf-8"):
        if raw.startswith("###"):
            section = raw.strip()
            continue
        if section != "###SUFFIXES###":
            continue
        parts = raw.rstrip("\n").split("\t")
        if len(parts) < 3:
            continue
        feats = {}
        for item in parts[2].split():
            if ":" in item:
                name, value = item.split(":", 1)
                feats[name] = value
        if (feats.get("enc0") not in ("0", "", None)
                or feats.get("gen") == "f" or feats.get("form_gen") == "f"):
            excluded_suffix_letters.add(parts[0])
        else:
            nominal_suffix_letters.add(parts[0])
        # The sound MASCULINE plural/dual ending is the one ending that is pure
        # agreement: it never belongs to the lexeme, in CAMeL or in QAC. It is
        # read off CAMeL's own fields, not listed by hand.
        if (feats.get("enc0") in ("0", "", None) and feats.get("form_gen") == "m"
                and feats.get("form_num") in ("p", "d")):
            sound_masculine_endings.add(parts[0])
    nominal_suffix_letters -= excluded_suffix_letters
    nominal_suffix_letters |= sound_masculine_endings
    nominal_suffix_letters.add("")

    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB
    analyzer = Analyzer(MorphologyDB(str(V.DB_PATH), flags="a"))
    cache = {}

    def analyze(form: str):
        if form not in cache:
            cache[form] = [dict(c) for c in analyzer.analyze(form)]
        return cache[form]

    def orthographically_reachable(key) -> bool:
        """Does one frozen orthographic probe already make this analyzable?"""
        forms = list(base_forms[key])
        variants = RECALL.build_variants(canonical[key], base_forms[key])
        for form in list(forms) + sorted(variants):
            for probe in CLASSIFIER.PROBES.values():
                variant = probe(form)
                if variant and variant != form and analyze(variant):
                    return True
            if analyze(form):
                return True
        return False

    # Unification needs the normalized pattern and the normalized stem to have
    # the SAME length, so templates are bucketed by that length once. Without
    # this the search is a full cross-product per token and never finishes.
    templates_by_length = collections.defaultdict(list)
    for key, template in templates.items():
        templates_by_length[len(V.normalize_vocalized(template["pattern"]))].append(template)

    MARKS = "ًٌٍَُِّْٰـ"

    def _strip_leading_letters(text: str, count: int):
        index, seen_letters = 0, 0
        while index < len(text) and seen_letters < count:
            if text[index] not in MARKS:
                seen_letters += 1
            index += 1
        # a clitic's own vowel belongs to the clitic, not to the stem
        while index < len(text) and text[index] in MARKS:
            index += 1
        return text[index:] if seen_letters == count else None

    def _strip_trailing_letters(text: str, count: int):
        index, seen_letters = len(text), 0
        while index > 0 and seen_letters < count:
            index -= 1
            if text[index] not in MARKS:
                seen_letters += 1
        return text[:index] if seen_letters == count else None

    def paradigm_candidates(surface: str):
        """Every (template, root) that rebuilds this surface's stem from a root
        CAMeL already carries with a base verb.

        The affix frame is enumerated FROM THE SURFACE - only the letter strings
        the surface actually starts and ends with are looked up in CAMeL's affix
        inventory - so the search stays linear in the token's length.
        """
        found, seen = [], set()
        for form in dict.fromkeys((surface, V.normalize_vocalized(surface))):
            letters = V.skeleton(form)
            prefix_lengths = {0} | {n for n in range(1, min(len(letters), 6) + 1)
                                    if letters[:n] in tables.prefixes}
            suffix_lengths = {0} | {n for n in range(1, min(len(letters), 6) + 1)
                                    if letters[len(letters) - n:] in nominal_suffix_letters}
            for plen in sorted(prefix_lengths):
                body_head = form if plen == 0 else _strip_leading_letters(form, plen)
                if body_head is None:
                    continue
                for slen in sorted(suffix_lengths):
                    if plen + slen >= len(letters):
                        continue
                    body = (body_head if slen == 0
                            else _strip_trailing_letters(body_head, slen))
                    if body is None:
                        continue
                    body = body.strip(MARKS)
                    if len(V.skeleton(body)) < 3:
                        continue
                    nbody = V.normalize_vocalized(body)
                    for template in templates_by_length.get(len(nbody), ()):
                        root = unify(template["pattern"], body)
                        if root is None or not is_sound_root(root):
                            continue
                        if root not in roots_with_verb:
                            continue        # CAMeL does not know this root: reject
                        generated = instantiate(template["pattern"], root)
                        if V.normalize_vocalized(generated) != nbody:
                            continue
                        if V.normalize_vocalized(generated) in lexemes_by_root[root]:
                            continue        # CAMeL already has this lexeme
                        signature = (generated, root, template["stemcat"], template["pos"])
                        if signature in seen:
                            continue
                        seen.add(signature)
                        found.append({
                            "generated_lex": generated, "root": root,
                            "stemcat": template["stemcat"], "pos": template["pos"],
                            "pattern": template["pattern"],
                            "template_support_roots": template["support_roots"],
                            "surface_prefix_letters": letters[:plen],
                            "surface_suffix_letters": letters[len(letters) - slen:] if slen else "",
                        })
        return found

    rows = []
    for key in scope:
        surface = canonical[key]
        obj = residual.get(key, {})
        level = obj.get("level", "SEGMENTATION_OPEN")
        if key in cohort_open:
            bucket, candidates = "SEGMENTATION_RESIDUAL", []
        elif orthographically_reachable(key):
            bucket, candidates = "ORTHOGRAPHIC_ONLY", []
        else:
            candidates = paradigm_candidates(surface)
            if candidates:
                bucket = "DERIVABLE_PARADIGM_GAP"
            elif level == "L7B_LEXICON_OOV":
                bucket = "LEXICAL_ENTRY_GAP"
            else:
                bucket = "UNCLASSIFIED"
        # The safe set: a paradigm gap whose derivation is UNIQUE. A surface that
        # two templates rebuild as two different lexemes is left open rather than
        # resolved by preference.
        cores = {(c["generated_lex"], c["root"]) for c in candidates}
        # Only the sound masculine plural/dual frame is admitted into the first
        # set. With an empty or feminine ending the stem IS the whole word, and
        # then CAMeL's stem inventory and QAC's singular-lemma convention can
        # legitimately disagree about what the lexeme is (زُرُوع vs زَرْع,
        # مُسافِحَة vs مُسافِح) - a disagreement no surface evidence resolves.
        frame_is_agreement_only = bool(candidates) and all(
            c["surface_suffix_letters"] in sound_masculine_endings
            and c["surface_suffix_letters"] for c in candidates)
        rows.append({
            "verse_key": key[0], "word_index": key[1], "arabic": surface,
            "residual_level": level, "bucket": bucket,
            "safe_for_extension": (bucket == "DERIVABLE_PARADIGM_GAP"
                                   and len(cores) == 1 and frame_is_agreement_only),
            "paradigm_candidates": candidates,
            "teacher_lemma": teacher[key].get("lemma"),
            "teacher_root": teacher[key].get("root"),
            "teacher_pos": teacher[key].get("pos"),
        })

    # ---- families: repeated Quranic surfaces of one lemma/inflection group ---
    families = collections.defaultdict(lambda: {"tokens": 0, "surfaces": collections.Counter(),
                                                "verse_keys": []})
    for row in rows:
        if row["bucket"] != "DERIVABLE_PARADIGM_GAP":
            continue
        for cand in row["paradigm_candidates"]:
            name = f"{cand['generated_lex']}|{cand['root']}|{cand['pos']}"
            fam = families[name]
            fam["tokens"] += 1
            fam["surfaces"][row["arabic"]] += 1
            fam["verse_keys"].append(f"{row['verse_key']}:{row['word_index']}")
            fam["lex"] = cand["generated_lex"]
            fam["root"] = cand["root"]
            fam["pos"] = cand["pos"]
            fam["stemcat"] = cand["stemcat"]
            fam["pattern"] = cand["pattern"]
            fam["template_support_roots"] = cand["template_support_roots"]

    family_rows = sorted(
        ({"family": name, "tokens": fam["tokens"],
          "distinct_surfaces": len(fam["surfaces"]),
          "surfaces": dict(sorted(fam["surfaces"].items())),
          "lex": fam["lex"], "root": fam["root"], "pos": fam["pos"],
          "stemcat": fam["stemcat"], "pattern": fam["pattern"],
          "template_support_roots": fam["template_support_roots"],
          "verse_keys": sorted(fam["verse_keys"])}
         for name, fam in families.items()),
        key=lambda f: (-f["tokens"], f["family"]))

    buckets = collections.Counter(r["bucket"] for r in rows)
    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "freeze_manifest_sha256": V.sha256_file(FREEZE_MANIFEST),
            "v1_5_selection_sha256": V.sha256_file(V1_5_SELECTION),
            "camel_db_sha256": V.sha256_file(V.DB_PATH),
        },
        "contract": {
            "teacher_use": "reporting oracle only; never consulted to build a bucket",
            "root_policy": ("roots fall out of unifying the surface with a CAMeL "
                            "template and must already exist in CAMeL carrying a base "
                            "verb lexeme; a root CAMeL does not know is rejected, "
                            "never guessed"),
            "no_new_segmentation_rule": True,
            "template_admission": ("a nominal template is trusted only when every "
                                   "sound-root entry already using it round-trips "
                                   f"exactly, with at least {MIN_TEMPLATE_SUPPORT} "
                                   "supporting entries"),
            "weak_roots_excluded": ("CAMeL templates do not round-trip on weak or "
                                    "hamzated roots, so generating over them would "
                                    "fabricate forms"),
        },
        "scope": {
            "lexicon_oov_tokens": len(oov),
            "segmentation_residual_tokens": len(cohort_open),
            "total": len(scope),
        },
        "buckets": dict(sorted(buckets.items(), key=lambda kv: (-kv[1], kv[0]))),
        "buckets_by_residual_level": {
            level: dict(sorted(collections.Counter(
                r["bucket"] for r in rows if r["residual_level"] == level).items()))
            for level in sorted({r["residual_level"] for r in rows})
        },
        "templates_trusted": len(templates),
        "safe_first_set": {
            "tokens": sum(1 for r in rows if r["safe_for_extension"]),
            "distinct_lexemes": len({
                (r["paradigm_candidates"][0]["generated_lex"],
                 r["paradigm_candidates"][0]["root"])
                for r in rows if r["safe_for_extension"]}),
            "distinct_surfaces": len({r["arabic"] for r in rows
                                      if r["safe_for_extension"]}),
        },
        "paradigm_families": {
            "families": len(family_rows),
            "tokens_covered": sum(f["tokens"] for f in family_rows),
            "top": family_rows[:40],
        },
    }

    (OUT_DIR / "classification.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows),
        encoding="utf-8", newline="\n")
    (OUT_DIR / "families.json").write_text(
        json.dumps(family_rows, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    (OUT_DIR / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in
                      ("scope", "buckets", "buckets_by_residual_level",
                       "templates_trusted")}, ensure_ascii=False, indent=2))
    print(json.dumps({"families": report["paradigm_families"]["families"],
                      "tokens_covered": report["paradigm_families"]["tokens_covered"],
                      "top10": [{"lex": f["lex"], "root": f["root"], "tokens": f["tokens"]}
                                for f in family_rows[:10]]},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
