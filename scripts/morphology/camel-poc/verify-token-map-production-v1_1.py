#!/usr/bin/env python3
"""Read-only production alignment and v1.8-v1.10 compatibility audit for token map v1.1."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CANDIDATE_ROOT = REPO_ROOT / "data/candidates/morphology"
DEFAULT_MAP = CANDIDATE_ROOT / "camel-token-map-v1_1-fatiha/token-map.jsonl"
DEFAULT_MANIFEST = CANDIDATE_ROOT / "camel-token-map-v1_1-fatiha/manifest.json"
DEFAULT_REPORT = CANDIDATE_ROOT / "camel-token-map-v1_1-fatiha/validation-report.json"
OLD_MAP = CANDIDATE_ROOT / "camel-morph-msa-v1.0/token-map.jsonl"
DB = REPO_ROOT / "data/app.db"
V19_MANIFEST = CANDIDATE_ROOT / "token-realign-v1_9/field-change-manifest.json"
V110_MEANINGS = CANDIDATE_ROOT / "surgical-v1_10/batch-bc-meaning-tr/field-change-manifest.json"
V110_37130 = CANDIDATE_ROOT / "surgical-v1_10/batch-a-37-130/field-change-manifest.json"
V110_37130_NORM = CANDIDATE_ROOT / "surgical-v1_10/batch-a-37-130-lemma-normalization/field-change-manifest.json"
REALIGNMENT_VERSES = ("2:72", "2:181", "8:6", "13:37", "15:7", "27:20", "36:22", "37:164", "41:47")
DROP_CHARS = frozenset({"\u0640", "\u200c", "\u200d", "\u06de", "\u06e9", "\u06dd", "\u06e5", "\u06e6"})
LETTER_FOLD = {
    "\u0671": "\u0627",
    "\u0623": "\u0627",
    "\u0625": "\u0627",
    "\u0622": "\u0627",
    "\u0649": "\u064a",
    "\u06cc": "\u064a",
    "\u0626": "\u064a",
    "\u0624": "\u0648",
    "\u06a9": "\u0643",
}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _skeleton(text: str) -> str:
    return "".join(
        LETTER_FOLD.get(character, character)
        for character in text
        if not character.isspace()
        and character not in DROP_CHARS
        and unicodedata.category(character) != "Mn"
    )


def _load_map(path: Path) -> tuple[dict[tuple[str, int], dict], set[str]]:
    analysis: dict[tuple[str, int], dict] = {}
    verses: set[str] = set()
    with path.open("r", encoding="utf-8", newline="") as handle:
        for line in handle:
            record = json.loads(line)
            verses.add(record["verse_key"])
            if record["tokenization_rule"] != "arabic_word":
                continue
            key = (record["verse_key"], record["word_index"])
            if key in analysis:
                raise RuntimeError(f"Duplicate map coordinate {key}")
            analysis[key] = record
    return analysis, verses


def _assert_dense(coordinates: dict[tuple[str, int], object], label: str) -> int:
    by_verse: dict[str, list[int]] = defaultdict(list)
    for verse_key, word_index in coordinates:
        by_verse[verse_key].append(word_index)
    bad = [key for key, values in by_verse.items() if sorted(values) != list(range(1, len(values) + 1))]
    if bad:
        raise RuntimeError(f"{label} word_index is not dense in {len(bad)} verses: {bad[:10]}")
    return len(by_verse)


def _load_changes(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def _verify_changes(changes: list[dict], rows_by_id: dict[int, dict], *, skip: frozenset[str] = frozenset()) -> int:
    verified = 0
    for change in changes:
        if change["column"] in skip:
            continue
        row = rows_by_id.get(change["words_id"])
        if row is None or row.get(change["column"]) != change["after"]:
            actual = None if row is None else row.get(change["column"])
            raise RuntimeError(
                f"Manifest mismatch words.id={change['words_id']} column={change['column']}: "
                f"expected {change['after']!r}, got {actual!r}"
            )
        verified += 1
    return verified


def audit(token_map: Path, manifest_path: Path) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    map_hash = _sha256(token_map)
    if map_hash != manifest["current_freeze"]["sha256"]:
        raise RuntimeError("New token map hash does not match its freeze manifest")

    new_map, map_verses = _load_map(token_map)
    old_map, _ = _load_map(OLD_MAP)
    if len(new_map) != 77_433 or len(old_map) != 77_429 or len(map_verses) != 6_236:
        raise RuntimeError("Frozen map token or verse counts are not 77,433 / 77,429 / 6,236")
    _assert_dense(new_map, "new map")
    new_only = set(new_map) - set(old_map)
    if new_only != {("1:1", index) for index in range(1, 5)} or set(old_map) - set(new_map):
        raise RuntimeError("v1.0 to v1.1 coordinate delta is not exactly Fatiha 1:1 words 1..4")
    if any(old_map[key]["canonical_text"] != new_map[key]["canonical_text"] for key in old_map):
        raise RuntimeError("A pre-existing v1.8 canonical token changed")

    db_uri = f"file:{DB.resolve().as_posix()}?mode=ro&immutable=1"
    connection = sqlite3.connect(db_uri, uri=True)
    connection.row_factory = sqlite3.Row
    try:
        columns = (
            "id", "verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
            "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role",
        )
        rows = [dict(row) for row in connection.execute(f"SELECT {', '.join(columns)} FROM words ORDER BY id")]
        verse_rows = connection.execute("SELECT verse_key FROM verses").fetchall()
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        connection.close()

    db_map: dict[tuple[str, int], dict] = {}
    rows_by_id: dict[int, dict] = {}
    for row in rows:
        key = (row["verse_key"], row["word_index"])
        if key in db_map:
            raise RuntimeError(f"Duplicate production coordinate {key}")
        db_map[key] = row
        rows_by_id[row["id"]] = row
    if len(rows) != 77_433 or len(verse_rows) != 6_236 or integrity != "ok":
        raise RuntimeError("Production DB count or integrity gate failed")
    _assert_dense(db_map, "production DB")
    if set(db_map) != set(new_map):
        missing = sorted(set(new_map) - set(db_map))[:10]
        extra = sorted(set(db_map) - set(new_map))[:10]
        raise RuntimeError(f"Coordinate mismatch; missing={missing}, extra={extra}")

    skeleton_mismatches = [
        key for key in new_map
        if _skeleton(new_map[key]["canonical_text"]) != _skeleton(db_map[key]["arabic"])
    ]
    if skeleton_mismatches:
        raise RuntimeError(f"Canonical/production surface alignment mismatches: {skeleton_mismatches[:10]}")

    realignment = {}
    for verse_key in REALIGNMENT_VERSES:
        keys = [key for key in new_map if key[0] == verse_key]
        bad = [key for key in keys if key in skeleton_mismatches]
        if not keys or bad:
            raise RuntimeError(f"Realignment verse failed: {verse_key}")
        realignment[verse_key] = {"status": "PASS", "tokens": len(keys)}

    special = db_map.get(("37:130", 4))
    if special is None or special["lemma"] != "\u0625\u0650\u0644\u0652\u064a\u064e\u0627\u0633" or any(special[field] is not None for field in ("root", "pos", "morphology")):
        raise RuntimeError("37:130:4 lemma/root/pos/morphology contract failed")

    v19_verified = _verify_changes(_load_changes(V19_MANIFEST), rows_by_id, skip=frozenset({"meaning_tr"}))
    v110_meanings = _verify_changes(_load_changes(V110_MEANINGS), rows_by_id)
    v110_37130 = _verify_changes(_load_changes(V110_37130), rows_by_id, skip=frozenset({"lemma"}))
    v110_norm = _verify_changes(_load_changes(V110_37130_NORM), rows_by_id)
    if v110_meanings != 648:
        raise RuntimeError(f"Expected 648 v1.10 meaning decisions, verified {v110_meanings}")

    return {
        "alignment": {
            "coordinate_matches": len(new_map),
            "coordinate_mismatches": 0,
            "dense_word_index_verses": 6_236,
            "surface_skeleton_matches": len(new_map),
            "surface_skeleton_mismatches": 0,
        },
        "database": {
            "integrity_check": integrity,
            "open_mode": "read_only_immutable",
            "path": "data/app.db",
            "sha256": _sha256(DB),
            "verse_count": len(verse_rows),
            "word_count": len(rows),
        },
        "fatiha_1_1": {
            "canonical_tokens": [new_map[("1:1", index)]["canonical_text"] for index in range(1, 5)],
            "word_indexes": [1, 2, 3, 4],
        },
        "map_sha256": map_hash,
        "realignment_verses": realignment,
        "special_37_130_4": {"lemma": special["lemma"], "root_pos_morphology_null": True, "status": "PASS"},
        "status": "PASS",
        "v1_8_v1_10_compatibility": {
            "v1_8_preexisting_tokens_unchanged": len(old_map),
            "v1_9_structural_manifest_cells_verified": v19_verified,
            "v1_10_37_130_cells_verified": v110_37130 + v110_norm,
            "v1_10_meaning_cells_verified": v110_meanings,
        },
    }


def _write_new(path: Path, value: object) -> None:
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite existing report: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(mode="wb", prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, delete=False)
    temp_path = Path(handle.name)
    try:
        with handle:
            handle.write((json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8"))
        os.rename(temp_path, path)
    except BaseException:
        temp_path.unlink(missing_ok=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--token-map", type=Path, default=DEFAULT_MAP)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    result = audit(args.token_map, args.manifest)
    _write_new(args.report, result)
    print(json.dumps({
        "aligned": result["alignment"]["coordinate_matches"],
        "map_sha256": result["map_sha256"],
        "status": result["status"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
