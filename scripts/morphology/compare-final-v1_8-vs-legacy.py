#!/usr/bin/env python3
"""Token-token comparison: final v1.8 artifact vs the legacy production `words`.

Read-only on both sides. `data/app.db` is opened with mode=ro and is never
written, and no candidate row is promoted anywhere by this script.

Join key: (verse_key, word_index). Both sides hold exactly 77,429 tokens and the
key is unique on both, so the join is total and 1:1 - verified, not assumed.

Bridging the two ontologies is done ONLY through the frozen maps already used by
the evaluation layer:
  * root  - dots/diacritics stripped, alif folded (identical to
             analyze-teacher-camel-coverage.normalize_root)
  * lemma - diacritics stripped, alif folded
  * POS   - the legacy composite tag ("P+N") is reduced to the QAC head coarse
             tag by the same rule export-qac-tanzil-teacher.derive() uses (the
             first non-PREF segment), and the CAMeL fine tag is mapped to the
             set of coarse tags it can legitimately correspond to. A CAMeL tag
             whose set is >1 is reported as UNDECIDABLE, never scored as a match
             or a conflict.
  * morphology - only the three features both encodings genuinely carry (case,
             gender, number) are compared. Everything else is reported as
             not-comparable rather than guessed.

Outputs (candidate folder only):
  data/candidates/morphology/final-v1_8/legacy-comparison.jsonl
  data/candidates/morphology/final-v1_8/legacy-comparison-report.json
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
FINAL_DIR = CAND_ROOT / "final-v1_8"
FINAL_JSONL = FINAL_DIR / "final-morphology-v1_8.jsonl"
LEGACY_DB = REPO_ROOT / "data" / "app.db"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"

SCHEMA_VERSION = "final-v1_8-vs-legacy-v1"
EXPECT_TOKENS = 77429
REPLACEMENT = "�"

_DIACRITICS = re.compile("[ً-ْٓ-ٰٕۖ-ۭـ]")
_ALIF_FOLD = str.maketrans({"أ": "ا", "إ": "ا",
                            "آ": "ا", "ٱ": "ا"})
ROOTLESS_MARKERS = {"NTWS", "FOREIGN", "na", "NOAN", "", "_"}

# Frozen CAMeL fine POS -> QAC coarse class set (copy of the map in
# analyze-teacher-camel-coverage.py; a tag missing from it is reported, never
# guessed).
POS_MAP = {
    "verb": {"V"}, "noun": {"N"}, "noun_prop": {"N"}, "noun_num": {"N"},
    "noun_quant": {"N"}, "adj": {"N"}, "adj_comp": {"N"}, "adj_num": {"N"},
    "pron": {"N"}, "pron_rel": {"N"}, "pron_dem": {"N"}, "pron_exclam": {"N"},
    "prep": {"P"}, "conj": {"P"}, "conj_sub": {"P"}, "interj": {"P"},
    "part": {"P"}, "part_neg": {"P"}, "part_interrog": {"P"},
    "part_restrict": {"P"}, "part_verb": {"P"}, "part_focus": {"P"},
    "part_fut": {"P"}, "part_det": {"P"}, "part_voc": {"P"},
    "adv": {"N", "P"}, "adv_rel": {"N", "P"}, "abbrev": {"N", "P"},
    "foreign": {"N", "P"}, "verb_pseudo": {"V", "P"},
}

LEGACY_CASE = {"NOM": "n", "GEN": "g", "ACC": "a"}
LEGACY_GENDER = {"M": "m", "F": "f"}
LEGACY_NUMBER = {"S": "s", "D": "d", "P": "p"}
# Legacy packs gender+number into one token (MS, MP, FD, ...).
LEGACY_GENDER_NUMBER = {
    f"{g}{n}": (gv, nv)
    for g, gv in LEGACY_GENDER.items()
    for n, nv in LEGACY_NUMBER.items()
}


def normalize_lemma(value):
    if value is None:
        return None
    text = _DIACRITICS.sub("", str(value)).translate(_ALIF_FOLD).strip()
    return text or None


def normalize_root(value):
    if value is None:
        return None
    text = str(value).strip()
    if text in ROOTLESS_MARKERS:
        return None
    text = text.replace(".", "").replace("-", "")
    text = _DIACRITICS.sub("", text).translate(_ALIF_FOLD)
    return text or None


# Alignment-only folding. Wider than the lexical normalization above because
# its job is to decide "is this the same TOKEN", not "is this the same lexeme":
# the legacy table is Uthmani/Hafs orthography and writes ya-maqsura where
# Tanzil writes ya, etc. Never used for a root/lemma verdict.
_ALIGN_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
                             "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي", "ء": ""})


def skeleton(value: str) -> str:
    """Consonant skeleton used ONLY to decide whether two rows are the same token.

    Every combining mark is dropped (this covers the Quranic annotation range
    and the Uthmani small-vowel marks, which the frozen lexical regex does not),
    then the letter foldings above are applied.
    """
    text = unicodedata.normalize("NFC", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    # Standalone (non-combining) Quranic annotation signs, e.g. U+06DE.
    text = "".join(ch for ch in text if not ("ۖ" <= ch <= "ۭ"))
    text = text.translate(_ALIGN_FOLD)
    return text.replace("ـ", "").replace(" ", "").strip()


def parse_legacy_morphology(raw: str) -> list[dict]:
    """Legacy `morphology` is '1:P:DET|PREF|LEM:ال | 2:N:ROOT:حمد|...'."""
    segments = []
    for chunk in str(raw or "").split(" | "):
        chunk = chunk.strip()
        if not chunk:
            continue
        parts = chunk.split(":")
        if len(parts) < 2:
            continue
        index, pos = parts[0], parts[1]
        rest = ":".join(parts[2:])
        features = [f for f in rest.split("|") if f]
        segments.append({"index": index, "pos": pos, "features": features})
    return segments


def legacy_head_pos(segments: list[dict]) -> str | None:
    """First non-PREF segment's coarse POS - the QAC head convention."""
    for segment in segments:
        if "PREF" in segment["features"]:
            continue
        return segment["pos"]
    return segments[0]["pos"] if segments else None


def legacy_features(segments: list[dict]) -> dict:
    """Case / gender / number of the head segment, in CAMeL's value alphabet."""
    out = {"cas": None, "gen": None, "num": None}
    head = None
    for segment in segments:
        if "PREF" in segment["features"]:
            continue
        head = segment
        break
    if head is None:
        return out
    for feature in head["features"]:
        if feature in LEGACY_CASE:
            out["cas"] = LEGACY_CASE[feature]
        elif feature in LEGACY_GENDER_NUMBER:
            out["gen"], out["num"] = LEGACY_GENDER_NUMBER[feature]
        elif feature in LEGACY_GENDER and out["gen"] is None:
            out["gen"] = LEGACY_GENDER[feature]
        elif feature in LEGACY_NUMBER and out["num"] is None:
            out["num"] = LEGACY_NUMBER[feature]
    return out


def field_state(new_value, legacy_value) -> str:
    if new_value and legacy_value:
        return "SAME" if new_value == legacy_value else "DIFF"
    if new_value and not legacy_value:
        return "NEW_ONLY"
    if legacy_value and not new_value:
        return "LEGACY_ONLY"
    return "BOTH_NULL"


def pos_state(new_pos, legacy_pos) -> str:
    if not new_pos and not legacy_pos:
        return "BOTH_NULL"
    if not new_pos:
        return "LEGACY_ONLY"
    if not legacy_pos:
        return "NEW_ONLY"
    classes = POS_MAP.get(new_pos)
    if classes is None:
        return "UNMAPPED_CAMEL_TAG"
    if len(classes) > 1:
        return "UNDECIDABLE" if legacy_pos in classes else "DIFF"
    return "SAME" if legacy_pos in classes else "DIFF"


def morphology_state(new_features, legacy_feats) -> tuple[str, dict]:
    """Agreement on the three features both encodings actually carry."""
    if new_features is None:
        return ("NEW_ONLY_ABSENT", {})
    detail = {}
    agree = conflict = 0
    for key in ("cas", "gen", "num"):
        new_value = new_features.get(key)
        legacy_value = legacy_feats.get(key)
        if new_value in (None, "na", "u") or not legacy_value:
            detail[key] = "NOT_COMPARABLE"
            continue
        if new_value == legacy_value:
            detail[key] = "SAME"
            agree += 1
        else:
            detail[key] = "DIFF"
            conflict += 1
    if conflict:
        return ("DIFF", detail)
    if agree:
        return ("SAME", detail)
    return ("NOT_COMPARABLE", detail)


def classify(row: dict) -> str:
    """Single primary class per token, priority ordered."""
    if row["new_has_selection"] is False:
        if row["legacy_has_any"]:
            return "LEGACY_RICHER_NEW_EMPTY"
        return "BOTH_EMPTY"
    if row["lemma_state"] == "DIFF":
        return "LEMMA_DIFF"
    if row["root_state"] == "DIFF":
        return "ROOT_DIFF"
    if row["pos_state"] == "DIFF":
        return "POS_DIFF"
    if row["morphology_state"] == "DIFF":
        return "MORPHOLOGY_DIFF"
    if "LEGACY_ONLY" in (row["root_state"], row["lemma_state"], row["pos_state"]):
        return "LEGACY_RICHER_FIELD"
    if "NEW_ONLY" in (row["root_state"], row["lemma_state"], row["pos_state"]):
        return "NEW_RICHER"
    return "IDENTICAL"


# Legacy lemma values that are a bare proclitic letter rather than the head
# lemma of the word. Legacy takes the FIRST segment as the lemma bearer where
# the new line takes the head, so وَلَوْ gets lemma "و" instead of "لَوْ".
PROCLITIC_LEMMAS = {"و", "ف", "ب", "ل", "ك", "أ", "س", "ال", "ما", "لا"}
_LATIN = re.compile(r"[A-Za-z]")


def corruption_flags(row: dict, legacy: dict) -> list[str]:
    flags = []
    for field in ("arabic", "root", "lemma", "pos", "morphology"):
        if REPLACEMENT in str(legacy.get(field) or ""):
            flags.append(f"LEGACY_UFFFD_IN_{field.upper()}")
    if row["skeleton_match"] is False:
        flags.append("SURFACE_SKELETON_MISMATCH")
    if not str(legacy.get("morphology") or "").strip():
        flags.append("LEGACY_MORPHOLOGY_EMPTY")
    if not str(legacy.get("pos") or "").strip():
        flags.append("LEGACY_POS_EMPTY")
    # Untransliterated Buckwalter leaked into the production lemma column
    # ("<ilaY`", "min", "Ean"). Arabic text never contains Latin letters.
    for field in ("root", "lemma"):
        if _LATIN.search(str(legacy.get(field) or "")):
            flags.append(f"LEGACY_LATIN_IN_{field.upper()}")
    if str(legacy.get("lemma") or "").strip() in PROCLITIC_LEMMAS:
        flags.append("LEGACY_LEMMA_IS_PROCLITIC")
    return flags


# CAMeL POS classes that QAC deliberately leaves rootless. A root the new line
# adds on one of these is an etymological root on a function word, not a gap the
# legacy table failed to fill.
FUNCTION_WORD_POS = {
    "prep", "conj", "conj_sub", "part", "part_neg", "part_interrog",
    "part_restrict", "part_verb", "part_focus", "part_fut", "part_det",
    "part_voc", "interj", "pron", "pron_rel", "pron_dem", "pron_exclam",
}


def new_richer_subclass(row: dict) -> str:
    if row["root_state"] == "NEW_ONLY":
        if row["new_pos"] in FUNCTION_WORD_POS:
            return "NEW_ROOT_ON_FUNCTION_WORD"
        return "NEW_ROOT_ON_CONTENT_WORD"
    if row["lemma_state"] == "NEW_ONLY":
        return "NEW_LEMMA_ONLY"
    return "NEW_POS_ONLY"


def load_final() -> dict[tuple[str, int], dict]:
    records = {}
    with FINAL_JSONL.open(encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            records[(record["verse_key"], record["word_index"])] = record
    return records


def load_legacy() -> dict[tuple[str, int], dict]:
    connection = sqlite3.connect(f"file:{LEGACY_DB.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            "SELECT verse_key, word_index, arabic, root, lemma, pos, morphology,"
            " confidence, source FROM words"
        ).fetchall()
    finally:
        connection.close()
    legacy = {}
    for row in rows:
        key = (row["verse_key"], int(row["word_index"]))
        if key in legacy:
            raise SystemExit(f"legacy key is not unique: {key}")
        legacy[key] = dict(row)
    return legacy


def load_teacher() -> dict[tuple[str, int], dict]:
    """Read ONLY to measure how close the legacy table is to the QAC oracle.

    This is a property of the legacy side. It is not an input to the final
    artifact, which was already written before this script ran.
    """
    teacher = {}
    if not TEACHER_PATH.exists():
        return teacher
    with TEACHER_PATH.open(encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            teacher[(record["verse_key"], int(record["word_index"]))] = record
    return teacher


def align_verses(final: dict, legacy: dict) -> tuple[dict, dict]:
    """Per-verse alignment audit before any field is compared.

    Positional (verse_key, word_index) join is only sound where both sides
    tokenize the verse the same way. Where they do not - the legacy table keeps
    the mushaf's joined spellings (مَالِيَ) that Tanzil splits, carries the
    Fatiha opening basmala that Tanzil excludes, and holds one broken split at
    2:72 - every token from the first divergence onwards is marked
    ALIGNMENT_UNSAFE and kept out of the field comparison instead of being
    silently compared against the wrong word.
    """
    by_verse_final: dict[str, list] = defaultdict(list)
    by_verse_legacy: dict[str, list] = defaultdict(list)
    for (verse_key, word_index) in final:
        by_verse_final[verse_key].append(word_index)
    for (verse_key, word_index) in legacy:
        by_verse_legacy[verse_key].append(word_index)

    unsafe: dict[tuple[str, int], str] = {}
    audit = {"verses_total": 0, "verses_aligned": 0, "verses_misaligned": 0,
             "misaligned_detail": [], "unsafe_tokens": 0,
             "final_only_tokens": 0, "legacy_only_tokens": 0}

    for verse_key in sorted(set(by_verse_final) | set(by_verse_legacy),
                            key=lambda v: (int(v.split(":")[0]), int(v.split(":")[1]))):
        audit["verses_total"] += 1
        new_indices = sorted(by_verse_final.get(verse_key, []))
        old_indices = sorted(by_verse_legacy.get(verse_key, []))
        divergence = None
        for position in range(max(len(new_indices), len(old_indices))):
            if position >= len(new_indices) or position >= len(old_indices):
                divergence = position
                break
            new_row = final[(verse_key, new_indices[position])]
            old_row = legacy[(verse_key, old_indices[position])]
            if skeleton(new_row["canonical_arabic"]) != skeleton(old_row["arabic"]):
                divergence = position
                break
        if divergence is None:
            audit["verses_aligned"] += 1
            continue

        audit["verses_misaligned"] += 1
        new_tail = [final[(verse_key, i)]["canonical_arabic"]
                    for i in new_indices[divergence:]]
        old_tail = [legacy[(verse_key, i)]["arabic"] for i in old_indices[divergence:]]
        audit["misaligned_detail"].append({
            "verse_key": verse_key,
            "first_divergent_position_1based": divergence + 1,
            "final_tokens": len(new_indices),
            "legacy_tokens": len(old_indices),
            "final_tail": new_tail[:6],
            "legacy_tail": old_tail[:6],
        })
        for i in new_indices[divergence:]:
            unsafe[(verse_key, i)] = "ALIGNMENT_UNSAFE"
        audit["unsafe_tokens"] += len(new_indices) - divergence

    audit["final_only_tokens"] = len(set(final) - set(legacy))
    audit["legacy_only_tokens"] = len(set(legacy) - set(final))
    return unsafe, audit


def main() -> int:
    final = load_final()
    legacy = load_legacy()
    teacher = load_teacher()

    if len(final) != EXPECT_TOKENS or len(legacy) != EXPECT_TOKENS:
        raise SystemExit(f"token counts: final={len(final)} legacy={len(legacy)}")

    unsafe, alignment_audit = align_verses(final, legacy)

    out_rows = []
    classes = Counter()
    subclasses = Counter()
    field_states = defaultdict(Counter)
    flags = Counter()
    risk_by_class = defaultdict(Counter)
    legacy_richer_examples = []
    suspicious = []
    teacher_agree = Counter()

    for key in sorted(final, key=lambda k: (int(k[0].split(":")[0]),
                                            int(k[0].split(":")[1]), k[1])):
        new = final[key]
        old = legacy.get(key)

        if old is None or key in unsafe:
            row = {
                "token_id": new["token_id"],
                "verse_key": new["verse_key"],
                "word_index": new["word_index"],
                "canonical_arabic": new["canonical_arabic"],
                "legacy_arabic": None if old is None else old["arabic"],
                "new_risk_class": new["risk_class"],
                "new_verdict": new["verdict"],
                "class": "ALIGNMENT_UNSAFE",
                "corruption_flags": ["LEGACY_TOKENIZATION_DIVERGES"
                                     if old is not None else "NO_LEGACY_ROW"],
            }
            classes["ALIGNMENT_UNSAFE"] += 1
            risk_by_class["ALIGNMENT_UNSAFE"][new["risk_class"]] += 1
            for flag in row["corruption_flags"]:
                flags[flag] += 1
            out_rows.append(row)
            continue

        new_root = new["root_key"]
        new_lemma = new["lemma_key"]
        old_root = normalize_root(old["root"])
        old_lemma = normalize_lemma(old["lemma"])

        segments = parse_legacy_morphology(old["morphology"])
        old_pos = legacy_head_pos(segments)
        old_feats = legacy_features(segments)
        morph_state, morph_detail = morphology_state(new["features"], old_feats)

        row = {
            "token_id": new["token_id"],
            "verse_key": new["verse_key"],
            "word_index": new["word_index"],
            "canonical_arabic": new["canonical_arabic"],
            "legacy_arabic": old["arabic"],
            "skeleton_match": skeleton(new["canonical_arabic"]) == skeleton(old["arabic"]),
            "new_has_selection": new["resolution"] == "RESOLVED",
            "legacy_has_any": bool(old_root or old_lemma or old_pos),
            "new_risk_class": new["risk_class"],
            "new_verdict": new["verdict"],
            "new_root": new["root"], "legacy_root": old["root"],
            "new_lemma": new["lemma"], "legacy_lemma": old["lemma"],
            "new_pos": new["pos"], "legacy_pos_raw": old["pos"],
            "legacy_pos_head": old_pos,
            "root_state": field_state(new_root, old_root),
            "lemma_state": field_state(new_lemma, old_lemma),
            "pos_state": pos_state(new["pos"], old_pos),
            "morphology_state": morph_state,
            "morphology_detail": morph_detail,
        }
        row["class"] = classify(row)
        row["corruption_flags"] = corruption_flags(row, old)
        if row["class"] == "NEW_RICHER":
            row["subclass"] = new_richer_subclass(row)
            subclasses[row["subclass"]] += 1

        classes[row["class"]] += 1
        for field in ("root_state", "lemma_state", "pos_state", "morphology_state"):
            field_states[field][row[field]] += 1
        for flag in row["corruption_flags"]:
            flags[flag] += 1
        risk_by_class[row["class"]][new["risk_class"]] += 1

        if row["class"] in ("LEGACY_RICHER_NEW_EMPTY", "LEGACY_RICHER_FIELD"):
            if len(legacy_richer_examples) < 40:
                legacy_richer_examples.append(
                    {k: row[k] for k in ("token_id", "canonical_arabic", "class",
                                         "legacy_root", "legacy_lemma", "legacy_pos_raw",
                                         "new_risk_class", "root_state", "lemma_state")}
                )

        # Suspicious to promote: the new side would overwrite a filled legacy
        # field with a different value that was never verified against anything.
        if (row["new_has_selection"]
                and new["risk_class"] != "VERIFIED_CORRECT"
                and row["class"] in ("LEMMA_DIFF", "ROOT_DIFF", "POS_DIFF")):
            if len(suspicious) < 60:
                suspicious.append(
                    {k: row[k] for k in ("token_id", "canonical_arabic", "class",
                                         "new_root", "legacy_root", "new_lemma",
                                         "legacy_lemma", "new_pos", "legacy_pos_head",
                                         "new_risk_class", "selection_rule"
                                         if "selection_rule" in row else "new_verdict")}
                )

        if teacher:
            t_row = teacher.get(key)
            if t_row:
                t_root = normalize_root(t_row.get("root"))
                t_lemma = normalize_lemma(t_row.get("lemma"))
                teacher_agree["root_both_present"] += bool(t_root and old_root)
                teacher_agree["root_same"] += bool(t_root and old_root and t_root == old_root)
                teacher_agree["lemma_both_present"] += bool(t_lemma and old_lemma)
                teacher_agree["lemma_same"] += bool(
                    t_lemma and old_lemma and t_lemma == old_lemma)
                teacher_agree["pos_both_present"] += bool(t_row.get("pos") and old_pos)
                teacher_agree["pos_same"] += bool(
                    t_row.get("pos") and old_pos and t_row["pos"] == old_pos)

        out_rows.append(row)

    comparison_path = FINAL_DIR / "legacy-comparison.jsonl"
    with comparison_path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in out_rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    would_change = sum(
        1 for r in out_rows
        if r["class"] in ("LEMMA_DIFF", "ROOT_DIFF", "POS_DIFF", "MORPHOLOGY_DIFF",
                          "NEW_RICHER")
    )
    would_blank = sum(1 for r in out_rows if r["class"] == "LEGACY_RICHER_NEW_EMPTY")

    report = {
        "schema_version": SCHEMA_VERSION,
        "tokens": len(out_rows),
        "join": {
            "key": "(verse_key, word_index)",
            "unique_on_both_sides": True,
            "compared_tokens": len(out_rows) - classes["ALIGNMENT_UNSAFE"],
        },
        "alignment_audit": alignment_audit,
        "class_counts": dict(sorted(classes.items())),
        "new_richer_subclasses": dict(sorted(subclasses.items())),
        "safe_promotion_set": {
            "definition": "VERIFIED_CORRECT tokens that either already agree with "
                          "legacy or add a field legacy left empty, excluding "
                          "etymological roots the QAC ontology deliberately omits "
                          "on function words.",
            "identical_no_op": sum(
                1 for r in out_rows if r["class"] == "IDENTICAL"),
            "new_lemma_only": sum(
                1 for r in out_rows if r.get("subclass") == "NEW_LEMMA_ONLY"
                and r["new_risk_class"] == "VERIFIED_CORRECT"),
            "new_root_on_content_word": sum(
                1 for r in out_rows if r.get("subclass") == "NEW_ROOT_ON_CONTENT_WORD"
                and r["new_risk_class"] == "VERIFIED_CORRECT"),
            "excluded_new_root_on_function_word": sum(
                1 for r in out_rows if r.get("subclass") == "NEW_ROOT_ON_FUNCTION_WORD"),
        },
        "class_by_new_risk_class": {
            cls: dict(sorted(counter.items())) for cls, counter in sorted(risk_by_class.items())
        },
        "field_states": {
            field: dict(sorted(counter.items())) for field, counter in sorted(field_states.items())
        },
        "impact_if_promoted_as_is": {
            "tokens_whose_value_would_change": would_change,
            "tokens_whose_legacy_value_would_be_blanked": would_blank,
            "tokens_untouched": len(out_rows) - would_change - would_blank,
        },
        "legacy_corruption_flags": dict(sorted(flags.items())),
        "legacy_richer_examples": legacy_richer_examples,
        "suspicious_for_promotion_examples": suspicious,
        "legacy_vs_teacher_agreement": dict(sorted(teacher_agree.items())),
        "notes": {
            "pos_undecidable": "CAMeL tags mapping to >1 QAC coarse class are never "
                               "scored as match or conflict.",
            "morphology_scope": "only case/gender/number are comparable across the two "
                                "encodings; everything else is NOT_COMPARABLE by design.",
            "teacher_role": "read here only to characterise the LEGACY table; the final "
                            "artifact was written before this script ran and never sees it.",
        },
    }
    report_path = FINAL_DIR / "legacy-comparison-report.json"
    with report_path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")

    print(json.dumps({k: report[k] for k in
                      ("tokens", "class_counts", "field_states",
                       "impact_if_promoted_as_is", "legacy_corruption_flags",
                       "legacy_vs_teacher_agreement")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
