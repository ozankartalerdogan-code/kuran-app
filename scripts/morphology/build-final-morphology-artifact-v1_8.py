#!/usr/bin/env python3
"""Final standalone morphology artifact from the FROZEN v1.8 line.

This script adds NO rule and generates NO candidate. It is a pure projection:
it reads the frozen v1.8 selection plus the frozen v1.8 token map, joins them on
the Tanzil token key and writes one deterministic record per Tanzil token into a
single JSONL and a single SQLite side artifact.

Inputs (all sha256-pinned against
`scripts/morphology/resources/frozen-hc1-production-v1_8-manifest.json`;
a mismatch is a hard failure before anything is written):

  data/candidates/morphology/selector-v1_8/selection.jsonl
  data/candidates/morphology/hc1-ext-v1_8/token-map-hc1-ext-v1_8.jsonl

Outputs (candidate folder only, never data/app.db):

  data/candidates/morphology/final-v1_8/final-morphology-v1_8.jsonl
  data/candidates/morphology/final-v1_8/final-morphology-v1_8.sqlite
  data/candidates/morphology/final-v1_8/summary.json
  data/candidates/morphology/final-v1_8/checksums.json

Teacher policy: the QAC/teacher export is never opened here. The `verdict`
field carried into the artifact was computed during the frozen selection round
by comparing against the teacher AFTER the selection was made; it is an
evaluation label, and `resolution` is the field that describes what the runtime
actually has. This is asserted, not merely documented: the script refuses to run
if any teacher path is readable through its own inputs.

Determinism: records are emitted in (surah, ayah, word_index) order, JSON keys
are sorted, no timestamp / environment value is written, and the SQLite file is
built with a fixed page/encoding setup so two runs are byte-identical.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
MANIFEST_PATH = (
    REPO_ROOT / "scripts" / "morphology" / "resources"
    / "frozen-hc1-production-v1_8-manifest.json"
)
SELECTION_REL = "data/candidates/morphology/selector-v1_8/selection.jsonl"
TOKEN_MAP_REL = "data/candidates/morphology/hc1-ext-v1_8/token-map-hc1-ext-v1_8.jsonl"
OUT_DIR = CAND_ROOT / "final-v1_8"

SCHEMA_VERSION = "final-morphology-v1_8"
EXPECT_TOKENS = 77429

# Paths this script must never read. Asserted, not assumed.
FORBIDDEN_INPUTS = (
    CAND_ROOT / "qac-tanzil-teacher.jsonl",
    REPO_ROOT / "data" / "word-analysis" / "quran-morphology.txt",
    REPO_ROOT / "data" / "app.db",
)

# CAMeL feature keys copied verbatim into `features`. `diac` is the analyzer's
# vocalized surface for the selected reading, kept separate from the canonical
# Tanzil text.
FEATURE_KEYS = ("asp", "cas", "gen", "mod", "num", "per", "stt", "vox")

# Root placeholders that carry no radical information (frozen list, identical to
# analyze-teacher-camel-coverage.py).
ROOTLESS_MARKERS = {"NTWS", "FOREIGN", "na", "NOAN", "", "_"}

_DIACRITICS = re.compile("[ً-ْٓ-ٰٕۖ-ۭـ]")
_ALIF_FOLD = str.maketrans({"أ": "ا", "إ": "ا",
                            "آ": "ا", "ٱ": "ا"})


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


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


def verse_sort_key(verse_key: str, word_index: int):
    surah, ayah = verse_key.split(":")
    return (int(surah), int(ayah), int(word_index))


def assert_pinned(manifest: dict, rel_path: str) -> Path:
    """Resolve an input and fail closed unless it matches the frozen sha256."""
    entry = manifest["artifacts"].get(rel_path)
    if entry is None:
        # The token map sha is also recorded under hc1_dump; accept that pin.
        if rel_path == TOKEN_MAP_REL:
            expected = manifest["hc1_dump"]["token_map_sha256"]
        else:
            raise SystemExit(f"{rel_path} is not pinned by the freeze manifest")
    else:
        expected = entry["sha256"]

    path = REPO_ROOT / rel_path
    if not path.exists():
        raise SystemExit(f"frozen input missing: {path}")
    actual = sha256_file(path)
    if actual != expected:
        raise SystemExit(
            f"FROZEN INPUT CHANGED: {rel_path}\n  expected {expected}\n  actual   {actual}"
        )
    return path


def assert_no_teacher_input() -> None:
    """Fail closed if this process has any teacher file open."""
    for path in FORBIDDEN_INPUTS:
        if path.resolve() in _OPENED:
            raise SystemExit(f"teacher/production input was read: {path}")


_OPENED: set[Path] = set()
_real_open = open


def guarded_open(file, *args, **kwargs):  # noqa: ANN001
    try:
        resolved = Path(file).resolve()
    except (TypeError, ValueError, OSError):
        resolved = None
    if resolved is not None:
        _OPENED.add(resolved)
        for forbidden in FORBIDDEN_INPUTS:
            if resolved == forbidden.resolve():
                raise SystemExit(
                    f"refusing to open a teacher/production input: {resolved}"
                )
    return _real_open(file, *args, **kwargs)


def load_canonical_text(token_map_path: Path) -> dict[tuple[str, int], str]:
    """Canonical Tanzil surface per analysis token.

    Records with a null `word_index` are the excluded opening-basmala spans and
    carry no analysis; they are skipped exactly as the frozen line skips them.
    """
    canonical: dict[tuple[str, int], str] = {}
    with guarded_open(token_map_path, encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            word_index = record.get("word_index")
            if word_index is None:
                continue
            key = (record["verse_key"], int(word_index))
            if key in canonical:
                raise SystemExit(f"duplicate token map key: {key}")
            canonical[key] = record["canonical_text"]
    return canonical


def resolution_of(selected, verdict: str) -> str:
    """Runtime-meaningful state, independent of the teacher label."""
    if selected is not None:
        return "RESOLVED"
    if verdict == "AMBIGUOUS":
        return "AMBIGUOUS"
    return "UNRESOLVED"


def risk_class_of(verdict: str, selected) -> str:
    """Promotion risk, derived from the frozen verdict semantics.

    The frozen selector assigns RECALL_GAP *before* it looks at the selection:
    it means the teacher reading is absent from the candidate pool entirely. A
    RECALL_GAP token that still carries a selection therefore holds a reading
    that, by construction, is not the teacher reading and was never judged
    against anything. That is a materially different promotion risk from a
    CORRECT row and must not be flattened into "resolved".
    """
    if selected is None:
        return ("NO_SELECTION_AMBIGUOUS" if verdict == "AMBIGUOUS"
                else "NO_SELECTION_RECALL_GAP")
    if verdict == "CORRECT":
        return "VERIFIED_CORRECT"
    if verdict == "INCORRECT":
        return "KNOWN_INCORRECT"
    return "UNJUDGED_SELECTION_RECALL_GAP"


def unresolved_reason_of(record: dict, selected) -> str | None:
    if selected is not None:
        return None
    if record["verdict"] == "AMBIGUOUS":
        # e.g. "POS_AMBIGUOUS::4_survivors"
        return record.get("ambiguous_reason") or "AMBIGUOUS::unspecified"
    if record["verdict"] == "RECALL_GAP":
        return "RECALL_GAP::no_candidate_in_pool"
    return f"{record['verdict']}::no_selection"


def source_of(record: dict) -> str:
    """Which layer produced the selected candidate."""
    if record.get("selected") is None:
        return "none"
    if record.get("proper_name_lexicon_applied"):
        return "proper_name_lexicon"
    if record.get("proper_name_closure_applied"):
        return "proper_name_closure_lexicon"
    if record.get("selected_from_clitic_split"):
        return "clitic_split"
    if record.get("selected_from_rescue"):
        return "hamza_madda_rescue"
    if record.get("selected_from_proper_name_recall"):
        return "proper_name_recall"
    if record.get("recall_candidate_provenance"):
        return "recall_layer"
    return "camel_analyzer_pool"


def build_records(selection_path: Path, canonical: dict) -> list[dict]:
    records: list[dict] = []
    seen: set[tuple[str, int]] = set()
    canonical_mismatches: list[dict] = []

    with guarded_open(selection_path, encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            verse_key = row["verse_key"]
            word_index = int(row["word_index"])
            key = (verse_key, word_index)
            if key in seen:
                raise SystemExit(f"duplicate selection key: {key}")
            seen.add(key)

            canonical_text = canonical.get(key)
            if canonical_text is None:
                raise SystemExit(f"selection token absent from token map: {key}")
            if unicodedata.normalize("NFC", canonical_text) != unicodedata.normalize(
                "NFC", row["arabic"]
            ):
                canonical_mismatches.append(
                    {"token_id": f"{verse_key}:{word_index}",
                     "token_map": canonical_text, "selection": row["arabic"]}
                )

            selected = row.get("selected")
            surah, ayah = verse_key.split(":")

            features = None
            root = lemma = pos = diac = None
            if selected is not None:
                features = {k: selected.get(k) for k in FEATURE_KEYS}
                root = selected.get("root")
                lemma = selected.get("lex")
                pos = selected.get("pos")
                diac = selected.get("diac")

            records.append(
                {
                    "token_id": f"{verse_key}:{word_index}",
                    "surah": int(surah),
                    "ayah": int(ayah),
                    "verse_key": verse_key,
                    "word_index": word_index,
                    "canonical_arabic": canonical_text,
                    "root": root,
                    "root_key": normalize_root(root),
                    "lemma": lemma,
                    "lemma_key": normalize_lemma(lemma),
                    "pos": pos,
                    "features": features,
                    "analyzer_diac": diac,
                    "confidence": row.get("confidence"),
                    "verdict": row["verdict"],
                    "resolution": resolution_of(selected, row["verdict"]),
                    "risk_class": risk_class_of(row["verdict"], selected),
                    "unresolved_reason": unresolved_reason_of(row, selected),
                    "selection_rule": row.get("selection_rule"),
                    "rule_chain": row.get("rule_chain") or [],
                    "source": source_of(row),
                    "selected_fingerprint": row.get("selected_fingerprint"),
                    "candidate_count_after_dedupe": row.get("candidate_count_after_dedupe"),
                }
            )

    if canonical_mismatches:
        raise SystemExit(
            "canonical surface disagreement between token map and selection: "
            + json.dumps(canonical_mismatches[:5], ensure_ascii=False)
        )
    if len(records) != EXPECT_TOKENS:
        raise SystemExit(f"expected {EXPECT_TOKENS} tokens, got {len(records)}")

    records.sort(key=lambda r: (r["surah"], r["ayah"], r["word_index"]))
    return records


def write_jsonl(records: list[dict], path: Path) -> None:
    with guarded_open(path, "w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def write_sqlite(records: list[dict], path: Path) -> None:
    if path.exists():
        path.unlink()
    connection = sqlite3.connect(path)
    try:
        connection.execute("PRAGMA page_size=4096")
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute(
            """
            CREATE TABLE final_morphology (
                token_id TEXT PRIMARY KEY,
                surah INTEGER NOT NULL,
                ayah INTEGER NOT NULL,
                verse_key TEXT NOT NULL,
                word_index INTEGER NOT NULL,
                canonical_arabic TEXT NOT NULL,
                root TEXT,
                root_key TEXT,
                lemma TEXT,
                lemma_key TEXT,
                pos TEXT,
                features_json TEXT,
                analyzer_diac TEXT,
                confidence TEXT,
                verdict TEXT NOT NULL,
                resolution TEXT NOT NULL,
                risk_class TEXT NOT NULL,
                unresolved_reason TEXT,
                selection_rule TEXT,
                rule_chain_json TEXT NOT NULL,
                source TEXT NOT NULL,
                selected_fingerprint TEXT,
                candidate_count_after_dedupe INTEGER
            )
            """
        )
        connection.execute(
            "CREATE INDEX idx_final_morphology_verse ON final_morphology(surah, ayah, word_index)"
        )
        connection.executemany(
            """
            INSERT INTO final_morphology VALUES
            (:token_id,:surah,:ayah,:verse_key,:word_index,:canonical_arabic,:root,
             :root_key,:lemma,:lemma_key,:pos,:features_json,:analyzer_diac,:confidence,
             :verdict,:resolution,:risk_class,:unresolved_reason,:selection_rule,:rule_chain_json,
             :source,:selected_fingerprint,:candidate_count_after_dedupe)
            """,
            [
                {
                    **{k: v for k, v in record.items()
                       if k not in ("features", "rule_chain")},
                    "features_json": (
                        None if record["features"] is None
                        else json.dumps(record["features"], ensure_ascii=False, sort_keys=True)
                    ),
                    "rule_chain_json": json.dumps(record["rule_chain"], ensure_ascii=False),
                }
                for record in records
            ],
        )
        connection.commit()
        connection.execute("VACUUM")
        connection.commit()
    finally:
        connection.close()


def summarize(records: list[dict]) -> dict:
    from collections import Counter

    verdicts = Counter(r["verdict"] for r in records)
    resolutions = Counter(r["resolution"] for r in records)
    risks = Counter(r["risk_class"] for r in records)
    sources = Counter(r["source"] for r in records)
    rules = Counter(r["selection_rule"] for r in records if r["selection_rule"])
    confidences = Counter(r["confidence"] for r in records)
    unresolved = Counter(
        (r["unresolved_reason"] or "").split("::")[0]
        for r in records if r["unresolved_reason"]
    )
    pos_counts = Counter(r["pos"] for r in records if r["pos"])

    total = len(records)
    filled = {
        "root": sum(1 for r in records if r["root_key"]),
        "lemma": sum(1 for r in records if r["lemma_key"]),
        "pos": sum(1 for r in records if r["pos"]),
        "features": sum(1 for r in records if r["features"]),
    }
    resolved = resolutions["RESOLVED"]

    return {
        "schema_version": SCHEMA_VERSION,
        "tokens": total,
        "verdicts": dict(sorted(verdicts.items())),
        "resolution": dict(sorted(resolutions.items())),
        "risk_class": dict(sorted(risks.items())),
        "confidence": {str(k): v for k, v in sorted(confidences.items(), key=lambda kv: str(kv[0]))},
        "fill": {
            field: {
                "count": count,
                "pct_of_corpus": round(100.0 * count / total, 3),
                "pct_of_resolved": round(100.0 * count / resolved, 3) if resolved else None,
            }
            for field, count in sorted(filled.items())
        },
        "fill_by_risk_class": {
            risk: {
                "tokens": sum(1 for r in records if r["risk_class"] == risk),
                "root": sum(1 for r in records if r["risk_class"] == risk and r["root_key"]),
                "lemma": sum(1 for r in records if r["risk_class"] == risk and r["lemma_key"]),
                "pos": sum(1 for r in records if r["risk_class"] == risk and r["pos"]),
            }
            for risk in sorted(risks)
        },
        "selection_rule": dict(sorted(rules.items())),
        "source_layer": dict(sorted(sources.items())),
        "unresolved_reason_class": dict(sorted(unresolved.items())),
        "pos_inventory": dict(sorted(pos_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "teacher_inputs_opened": [],
    }


def main() -> int:
    global open  # noqa: PLW0603
    open = guarded_open  # type: ignore[assignment]

    with _real_open(MANIFEST_PATH, encoding="utf-8") as handle:
        manifest = json.load(handle)
    if manifest.get("status") != "ACCEPTED_PRODUCTION":
        raise SystemExit("freeze manifest is not ACCEPTED_PRODUCTION")

    selection_path = assert_pinned(manifest, SELECTION_REL)
    token_map_path = assert_pinned(manifest, TOKEN_MAP_REL)

    canonical = load_canonical_text(token_map_path)
    records = build_records(selection_path, canonical)
    assert_no_teacher_input()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    jsonl_path = OUT_DIR / "final-morphology-v1_8.jsonl"
    sqlite_path = OUT_DIR / "final-morphology-v1_8.sqlite"
    write_jsonl(records, jsonl_path)
    write_sqlite(records, sqlite_path)

    summary = summarize(records)
    summary["inputs"] = {
        SELECTION_REL: sha256_file(selection_path),
        TOKEN_MAP_REL: sha256_file(token_map_path),
        "freeze_manifest": sha256_file(MANIFEST_PATH),
    }
    with _real_open(OUT_DIR / "summary.json", "w", encoding="utf-8", newline="\n") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")

    checksums = {
        "schema_version": SCHEMA_VERSION,
        "final-morphology-v1_8.jsonl": sha256_file(jsonl_path),
        "final-morphology-v1_8.sqlite": sha256_file(sqlite_path),
        "summary.json": sha256_file(OUT_DIR / "summary.json"),
    }
    with _real_open(OUT_DIR / "checksums.json", "w", encoding="utf-8", newline="\n") as handle:
        json.dump(checksums, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")

    print(json.dumps({"summary": {k: summary[k] for k in
                                  ("tokens", "verdicts", "resolution", "fill")},
                      "checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
