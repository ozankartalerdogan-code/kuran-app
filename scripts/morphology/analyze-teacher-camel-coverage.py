#!/usr/bin/env python3
"""Teacher <-> CAMeL candidate-pool coverage analysis (measurement only).

Answers one question per teacher token: is the teacher reading present anywhere
in the CAMeL candidate pool for that token?

Hard constraints honoured by this script:
  * CAMeL is never re-run; only the frozen full-analysis dump is read.
  * No V2 / V2.1 / V2.3 ranker or selection output is read.
  * The production `words` table is never opened.
  * No candidate is selected, scored or ranked. No new grammar rule is written.
  * Root-less particle / pronoun teacher rows are never counted as errors.
  * QAC <-> CAMeL differences are bridged only by the explicit normalization and
    tag maps below. Anything not covered by those maps is reported as such, not
    guessed.

Inputs (read-only):
  data/candidates/morphology/qac-tanzil-teacher.jsonl
  data/candidates/morphology/camel-morph-msa-v1.0/full-analysis/surah-*.jsonl.gz
  data/candidates/morphology/camel-morph-msa-v1.0/token-map.jsonl

Outputs (gitignored candidate folder only):
  data/candidates/morphology/teacher-camel-coverage/token-classification.jsonl
  data/candidates/morphology/teacher-camel-coverage/report.json
  data/candidates/morphology/teacher-camel-coverage/checksums.json
"""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
TEACHER_PATH = CAND_ROOT / "qac-tanzil-teacher.jsonl"
CAMEL_ROOT = CAND_ROOT / "camel-morph-msa-v1.0"
FULL_ANALYSIS_DIR = CAMEL_ROOT / "full-analysis"
TOKEN_MAP_PATH = CAMEL_ROOT / "token-map.jsonl"
OUT_DIR = CAND_ROOT / "teacher-camel-coverage"

SCHEMA_VERSION = "teacher-camel-coverage-v1"

# --------------------------------------------------------------------------
# Explicit normalization layer (no guessing beyond what is listed here)
# --------------------------------------------------------------------------

# Arabic combining marks removed before lexical comparison.
#   064B-0652 tanwin/harakat/shadda/sukun, 0653-0655 maddah/hamza above+below,
#   0670 dagger alif, 06D6-06ED Quranic annotation marks, 0640 tatweel.
_DIACRITICS = re.compile(
    "[ً-ٰٕۖ-ۭـ‌‍‎‏]"
)
# Alif variants folded to bare alif. This is the only letter-level folding
# applied; ta-marbuta/ya-maqsura are deliberately NOT folded.
_ALIF_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا"})

# CAMeL root placeholders that carry no radical information.
CAMEL_ROOTLESS_MARKERS = {"NTWS", "FOREIGN", "na", "NOAN", "", "_"}


def normalize_lemma(value):
    """Diacritic-insensitive, alif-folded lemma key."""
    if value is None:
        return None
    text = _DIACRITICS.sub("", str(value)).translate(_ALIF_FOLD).strip()
    return text or None


def normalize_root(value):
    """Root key. CAMeL roots are dot separated ('أ.ل.ه'); QAC roots are not."""
    if value is None:
        return None
    text = str(value).strip()
    if text in CAMEL_ROOTLESS_MARKERS:
        return None
    text = text.replace(".", "").replace("-", "")
    text = _DIACRITICS.sub("", text).translate(_ALIF_FOLD)
    return text or None


# --------------------------------------------------------------------------
# Explicit POS map: CAMeL fine POS -> set of teacher coarse POS (N / V / P)
# --------------------------------------------------------------------------
# The teacher carries only the QAC coarse class (N, V, P). Where the CAMeL tag
# does not determine the QAC coarse class on its own, the tag is mapped to the
# set of classes it can legitimately correspond to and is additionally counted
# as "ambiguous" so the ambiguity stays visible instead of being decided here.
POS_MAP = {
    "verb": {"V"},
    "noun": {"N"},
    "noun_prop": {"N"},
    "noun_num": {"N"},
    "noun_quant": {"N"},
    "adj": {"N"},
    "adj_comp": {"N"},
    "adj_num": {"N"},
    "pron": {"N"},
    "pron_rel": {"N"},
    "pron_dem": {"N"},
    "pron_exclam": {"N"},
    "prep": {"P"},
    "conj": {"P"},
    "conj_sub": {"P"},
    "interj": {"P"},
    "part": {"P"},
    "part_neg": {"P"},
    "part_interrog": {"P"},
    "part_restrict": {"P"},
    "part_verb": {"P"},
    "part_focus": {"P"},
    "part_fut": {"P"},
    "part_det": {"P"},
    "part_voc": {"P"},
    # Ambiguous against the QAC coarse inventory -> mapped to a set, not a guess.
    "adv": {"N", "P"},
    "adv_rel": {"N", "P"},
    "abbrev": {"N", "P"},
    "foreign": {"N", "P"},
    "verb_pseudo": {"V", "P"},
}
POS_AMBIGUOUS = {tag for tag, classes in POS_MAP.items() if len(classes) > 1}

CLASSES = [
    "EXACT_CORE",
    "ROOT_LEMMA_MATCH",
    "ROOT_POS_MATCH",
    "LEMMA_POS_MATCH",
    "PARTIAL_MATCH",
    "NO_MATCH",
    "TEACHER_NATURAL_NULL",
    "CAMEL_OOV",
]

REPAIR_PROVENANCE = "SOURCE_CORRUPTION"
SPLIT_PROVENANCE = "QAC_1_TO_TANZIL_2"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_teacher():
    rows = {}
    for line in TEACHER_PATH.open(encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        key = (obj["verse_key"], obj["word_index"])
        if key in rows:
            raise SystemExit(f"duplicate teacher key: {key}")
        rows[key] = obj
    return rows


def iter_camel_records():
    for path in sorted(FULL_ANALYSIS_DIR.glob("surah-*.jsonl.gz")):
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    yield json.loads(line)


def summarize_candidates(record):
    """Reduce a CAMeL record to the comparable (root, lemma, pos) triples."""
    triples = []
    for cand in record.get("unique_candidates") or []:
        triples.append(
            (
                normalize_root(cand.get("root")),
                normalize_lemma(cand.get("lex")),
                cand.get("pos"),
            )
        )
    return triples


def classify(teacher_row, triples):
    t_root = normalize_root(teacher_row.get("root"))
    t_lemma = normalize_lemma(teacher_row.get("lemma"))
    t_pos = teacher_row.get("pos")

    has_root = t_root is not None
    has_lemma = t_lemma is not None

    root_hits = 0
    lemma_hits = 0
    pos_hits = 0
    pair_rl = pair_rp = pair_lp = False
    qualifying = 0
    pool_has_root = False
    pool_pos_tags = set()
    pool_ambiguous_pos = False

    for cand_root, cand_lemma, cand_pos in triples:
        if cand_root is not None:
            pool_has_root = True
        pool_pos_tags.add(cand_pos)
        pos_classes = POS_MAP.get(cand_pos)
        if cand_pos in POS_AMBIGUOUS:
            pool_ambiguous_pos = True

        root_ok = has_root and cand_root == t_root
        lemma_ok = has_lemma and cand_lemma == t_lemma
        pos_ok = pos_classes is not None and t_pos in pos_classes

        root_hits += root_ok
        lemma_hits += lemma_ok
        pos_hits += pos_ok

        pair_rl = pair_rl or (root_ok and lemma_ok)
        pair_rp = pair_rp or (root_ok and pos_ok)
        pair_lp = pair_lp or (lemma_ok and pos_ok)

        if pos_ok and (root_ok or not has_root) and (lemma_ok or not has_lemma):
            qualifying += 1

    detail = {
        "root_applicable": has_root,
        "lemma_applicable": has_lemma,
        "root_covered": root_hits > 0,
        "lemma_covered": lemma_hits > 0,
        "pos_covered": pos_hits > 0,
        "qualifying_candidates": qualifying,
        "pool_size": len(triples),
        "pool_has_root": pool_has_root,
        "pool_unmapped_pos": sorted(t for t in pool_pos_tags if t not in POS_MAP),
        "pool_ambiguous_pos": pool_ambiguous_pos,
    }

    if not triples:
        return "CAMEL_OOV", detail, "empty_candidate_pool"

    if not has_root and not has_lemma:
        # Root-less AND lemma-less teacher row (particles / disconnected letters):
        # there is no lexical claim to verify, so this is never an error.
        return "TEACHER_NATURAL_NULL", detail, None

    if qualifying:
        return "EXACT_CORE", detail, None
    if pair_rl:
        return "ROOT_LEMMA_MATCH", detail, None
    if pair_rp:
        return "ROOT_POS_MATCH", detail, None
    if pair_lp:
        return "LEMMA_POS_MATCH", detail, None
    if root_hits or lemma_hits or pos_hits:
        return "PARTIAL_MATCH", detail, None

    # NO_MATCH -> derive a factual reason from what the pool contains.
    if detail["pool_unmapped_pos"]:
        reason = "camel_pos_tag_outside_map"
    elif has_root and not pool_has_root:
        reason = "pool_rootless_only"
    elif has_root and has_lemma:
        reason = "root_and_lemma_absent_from_pool"
    elif has_lemma:
        reason = "lemma_absent_from_pool"
    else:
        reason = "root_absent_from_pool"
    return "NO_MATCH", detail, reason


def main() -> int:
    for path in (TEACHER_PATH, TOKEN_MAP_PATH, FULL_ANALYSIS_DIR):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    teacher = load_teacher()

    camel_triples = {}
    camel_records_seen = 0
    camel_no_analysis = 0
    for record in iter_camel_records():
        word_index = record.get("word_index")
        if word_index is None:
            continue
        key = (record["verse_key"], word_index)
        camel_records_seen += 1
        if record.get("no_analysis"):
            camel_no_analysis += 1
        if key in teacher:
            camel_triples[key] = summarize_candidates(record)

    # token-map is read only to report span-level provenance alignment; it is
    # never used to alter a classification.
    token_map_spans = 0
    token_map_indexed = 0
    with TOKEN_MAP_PATH.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            token_map_spans += 1
            if obj.get("word_index") is not None:
                token_map_indexed += 1

    class_counts = Counter()
    reason_counts = Counter()
    reason_examples = defaultdict(list)
    qualifying_hist = Counter()
    field_cov = {
        "root": {"applicable": 0, "covered": 0},
        "lemma": {"applicable": 0, "covered": 0},
        "pos": {"applicable": 0, "covered": 0},
    }
    by_alignment = defaultdict(Counter)
    by_teacher_pos = defaultdict(Counter)
    split_rows = []
    repair_rows = []
    selection_only = 0
    unresolvable_keys = []

    out_tokens = OUT_DIR / "token-classification.jsonl"
    with out_tokens.open("w", encoding="utf-8", newline="\n") as sink:
        for key in sorted(teacher, key=lambda k: (int(k[0].split(":")[0]), int(k[0].split(":")[1]), k[1])):
            row = teacher[key]
            triples = camel_triples.get(key)
            if triples is None:
                triples = []
            label, detail, reason = classify(row, triples)
            class_counts[label] += 1
            alignment = row.get("alignment_class")
            by_alignment[alignment][label] += 1
            by_teacher_pos[row["pos"]][label] += 1

            if detail["root_applicable"]:
                field_cov["root"]["applicable"] += 1
                field_cov["root"]["covered"] += detail["root_covered"]
            if detail["lemma_applicable"]:
                field_cov["lemma"]["applicable"] += 1
                field_cov["lemma"]["covered"] += detail["lemma_covered"]
            field_cov["pos"]["applicable"] += 1
            field_cov["pos"]["covered"] += detail["pos_covered"]

            q = detail["qualifying_candidates"]
            if label in ("EXACT_CORE", "TEACHER_NATURAL_NULL"):
                qualifying_hist["zero" if q == 0 else ("one" if q == 1 else "many")] += 1
            if label == "EXACT_CORE" and detail["pool_size"] > 1:
                selection_only += 1
            if label in ("NO_MATCH", "CAMEL_OOV"):
                unresolvable_keys.append(key)

            if reason and label == "NO_MATCH":
                reason_counts[reason] += 1
                if len(reason_examples[reason]) < 5:
                    reason_examples[reason].append(
                        {
                            "verse_key": key[0],
                            "word_index": key[1],
                            "arabic": row["arabic"],
                            "teacher_root": row["root"],
                            "teacher_lemma": row["lemma"],
                            "teacher_pos": row["pos"],
                            "pool_size": detail["pool_size"],
                            "pool_unmapped_pos": detail["pool_unmapped_pos"],
                        }
                    )

            record_out = {
                "verse_key": key[0],
                "word_index": key[1],
                "alignment_class": alignment,
                "classification": label,
                "no_match_reason": reason,
                **detail,
            }
            if alignment == SPLIT_PROVENANCE:
                split_rows.append(record_out)
            if alignment == REPAIR_PROVENANCE:
                repair_rows.append(record_out)
            sink.write(json.dumps(record_out, ensure_ascii=False, sort_keys=True) + "\n")

    total = sum(class_counts.values())
    split_groups = defaultdict(list)
    for item in split_rows:
        split_groups[item["verse_key"]].append(item)

    report = {
        "schema_version": SCHEMA_VERSION,
        "inputs": {
            "teacher": {
                "path": str(TEACHER_PATH.relative_to(REPO_ROOT)).replace("\\", "/"),
                "sha256": sha256_file(TEACHER_PATH),
                "rows": len(teacher),
            },
            "token_map": {
                "path": str(TOKEN_MAP_PATH.relative_to(REPO_ROOT)).replace("\\", "/"),
                "spans": token_map_spans,
                "spans_with_word_index": token_map_indexed,
            },
            "full_analysis": {
                "path": str(FULL_ANALYSIS_DIR.relative_to(REPO_ROOT)).replace("\\", "/"),
                "records_with_word_index": camel_records_seen,
                "records_no_analysis": camel_no_analysis,
                "records_matched_to_teacher": len(camel_triples),
            },
        },
        "normalization": {
            "lemma": "strip 064B-0655/0670/06D6-06ED/tatweel/bidi, fold 0623/0625/0622/0671 -> 0627",
            "root": "same as lemma plus dot/dash removal; CAMeL NTWS|FOREIGN|na|NOAN treated as root-less",
            "pos_map": {tag: sorted(v) for tag, v in sorted(POS_MAP.items())},
            "pos_ambiguous_tags": sorted(POS_AMBIGUOUS),
        },
        "totals": {
            "teacher_tokens": total,
            "classification": {c: class_counts.get(c, 0) for c in CLASSES},
        },
        "candidate_availability": {
            "tokens_with_exactly_one_qualifying_candidate": qualifying_hist.get("one", 0),
            "tokens_with_multiple_qualifying_candidates": qualifying_hist.get("many", 0),
            "tokens_with_no_qualifying_candidate": total - qualifying_hist.get("one", 0) - qualifying_hist.get("many", 0),
            "selection_only_tokens": selection_only,
            "selection_only_definition": "EXACT_CORE tokens whose CAMeL pool holds more than one unique candidate",
        },
        "field_coverage": {
            field: {
                "applicable_tokens": stats["applicable"],
                "covered_tokens": stats["covered"],
                "coverage_pct": round(100.0 * stats["covered"] / stats["applicable"], 4) if stats["applicable"] else None,
            }
            for field, stats in sorted(field_cov.items())
        },
        "by_alignment_class": {k: dict(sorted(v.items())) for k, v in sorted(by_alignment.items())},
        "by_teacher_pos": {k: dict(sorted(v.items())) for k, v in sorted(by_teacher_pos.items())},
        "split_contract": {
            "groups": len(split_groups),
            "rows": len(split_rows),
            "per_group": {
                vk: [
                    {"word_index": r["word_index"], "classification": r["classification"], "pool_size": r["pool_size"]}
                    for r in sorted(rows, key=lambda r: r["word_index"])
                ]
                for vk, rows in sorted(split_groups.items())
            },
        },
        "repair_provenance": {
            "rows": len(repair_rows),
            "classification": dict(sorted(Counter(r["classification"] for r in repair_rows).items())),
            "rows_detail": sorted(
                (
                    {
                        "verse_key": r["verse_key"],
                        "word_index": r["word_index"],
                        "classification": r["classification"],
                        "pool_size": r["pool_size"],
                    }
                    for r in repair_rows
                ),
                key=lambda r: (int(r["verse_key"].split(":")[0]), int(r["verse_key"].split(":")[1]), r["word_index"]),
            ),
        },
        "no_match_reasons": {
            "counts": dict(sorted(reason_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
            "examples": {k: reason_examples[k] for k in sorted(reason_examples)},
        },
        "residual": {
            "tokens_camel_cannot_supply": len(unresolvable_keys),
            "breakdown": {
                "NO_MATCH": class_counts.get("NO_MATCH", 0),
                "CAMEL_OOV": class_counts.get("CAMEL_OOV", 0),
            },
            "sample": [
                {"verse_key": vk, "word_index": wi}
                for vk, wi in unresolvable_keys[:25]
            ],
        },
    }

    out_report = OUT_DIR / "report.json"
    out_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    checksums = {
        "schema_version": SCHEMA_VERSION,
        "report.json": sha256_file(out_report),
        "token-classification.jsonl": sha256_file(out_tokens),
    }
    (OUT_DIR / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(json.dumps({"totals": report["totals"], "checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
