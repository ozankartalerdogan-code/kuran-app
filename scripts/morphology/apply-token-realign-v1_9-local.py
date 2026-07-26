#!/usr/bin/env python3
"""Apply the token-realign-v1_9 forward migration to local data/app.db.

Runs the guarded forward.sql inside its own transaction and then re-checks every
acceptance gate. If any gate fails the script reports it loudly; forward.sql's
guards (id + verse_key + word_index + pre-image surface) mean a re-run is a
no-op rather than a second write.

Requires preflight-token-realign-v1_9.mjs to have passed first.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
import unicodedata as ud
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DB = REPO / "data" / "app.db"
OUT = REPO / "data" / "candidates" / "morphology" / "token-realign-v1_9"

TARGETS = ["2:72", "2:181", "8:6", "13:37", "15:7", "27:20", "36:22", "37:164", "41:47"]
COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
           "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"]

EXPECT_BEFORE = 77_429
EXPECT_AFTER = 77_433
EXPECT_UNTARGETED = 77_315
INSERT_IDS = [77430, 77431, 77432, 77433, 77434]
DELETE_IDS = [1149]

# The pre-migration .backup is the authority for "nothing outside the nine
# verses moved". Comparing live-vs-backup in one process with one code path
# beats carrying a hash constant between two runtimes: the constant only ever
# proves that two serialisers agree, which is not the property we care about.
BACKUP = REPO / "data" / "app.db.yedek_20260725_010115_pre_token_realign_v1_9"


def untargeted_rows(connection):
    placeholders = ",".join("?" for _ in TARGETS)
    return connection.execute(
        f"SELECT id, {', '.join(COLUMNS)} FROM words "
        f"WHERE verse_key NOT IN ({placeholders}) ORDER BY id", TARGETS).fetchall()


def fingerprint(connection) -> tuple[str, int]:
    digest = hashlib.sha256()
    count = 0
    for row in untargeted_rows(connection):
        digest.update(repr(row).encode("utf-8"))
        count += 1
    return digest.hexdigest(), count


def main() -> int:
    sql = (OUT / "forward.sql").read_text(encoding="utf-8")
    connection = sqlite3.connect(DB)
    connection.execute("PRAGMA foreign_keys = ON")

    before = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    if before != EXPECT_BEFORE:
        print(f"ABORT: rows before = {before}, expected {EXPECT_BEFORE}")
        return 1

    if not BACKUP.exists():
        print(f"ABORT: pre-migration backup missing at {BACKUP}")
        return 1
    backup = sqlite3.connect(f"file:{BACKUP}?mode=ro", uri=True)
    fingerprint_backup, untargeted_backup = fingerprint(backup)
    fingerprint_before, untargeted_before = fingerprint(connection)
    if (fingerprint_before, untargeted_before) != (fingerprint_backup, untargeted_backup):
        print("ABORT: live db already diverges from the pre-migration backup")
        backup.close()
        return 1

    connection.executescript(sql)          # forward.sql carries its own BEGIN/COMMIT

    after = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    fingerprint_after, untargeted_after = fingerprint(connection)

    # row-by-row, not just a hash: name the first divergence if there is one
    drifted = [live[0] for live, kept in
               zip(untargeted_rows(connection), untargeted_rows(backup)) if live != kept]
    backup.close()

    results = {
        "rows_before": before,
        "rows_after": after,
        "row_delta": after - before,
        "untargeted_rows_before": untargeted_before,
        "untargeted_rows_after": untargeted_after,
        "untargeted_fingerprint_backup": fingerprint_backup,
        "untargeted_fingerprint_before": fingerprint_before,
        "untargeted_fingerprint_after": fingerprint_after,
        "untargeted_unchanged": fingerprint_after == fingerprint_backup,
        "untargeted_rows_drifted": drifted[:20],
        "integrity_check": connection.execute("PRAGMA integrity_check").fetchone()[0],
        "foreign_key_check": connection.execute("PRAGMA foreign_key_check").fetchall(),
        "ascii_in_root_or_lemma": connection.execute(
            "SELECT COUNT(*) FROM words WHERE root GLOB '*[A-Za-z]*' "
            "OR lemma GLOB '*[A-Za-z]*'").fetchone()[0],
        "inserted_ids_present": [
            connection.execute("SELECT COUNT(*) FROM words WHERE id=?", (i,)).fetchone()[0]
            for i in INSERT_IDS],
        "deleted_ids_absent": [
            connection.execute("SELECT COUNT(*) FROM words WHERE id=?", (i,)).fetchone()[0]
            for i in DELETE_IDS],
        "max_id": connection.execute("SELECT MAX(id) FROM words").fetchone()[0],
    }

    # word_index must be dense 1..N in every verse
    bad_index = []
    for (verse_key,) in connection.execute("SELECT DISTINCT verse_key FROM words"):
        indexes = [r[0] for r in connection.execute(
            "SELECT word_index FROM words WHERE verse_key=? ORDER BY word_index", (verse_key,))]
        if indexes != list(range(1, len(indexes) + 1)):
            bad_index.append(verse_key)
    results["verses_checked"] = connection.execute(
        "SELECT COUNT(DISTINCT verse_key) FROM words").fetchone()[0]
    results["verses_with_bad_word_index"] = bad_index

    # the nine verses must now tokenise exactly like canonical Tanzil
    def skeleton(text):
        drop = {"ـ", "‌", "‍", "۞", "۩", "۝", "ۥ", "ۦ"}
        fold = {"ٱ": "ا", "أ": "ا", "إ": "ا", "آ": "ا",
                "ى": "ي", "ی": "ي", "ئ": "ي", "ؤ": "و",
                "ک": "ك"}
        return "".join(fold.get(ch, ch) for ch in text
                       if ud.category(ch) != "Mn" and ch not in drop and not ch.isspace())

    token_map = {}
    with (REPO / "data/candidates/morphology/hc1-ext-v1_8/"
          "token-map-hc1-ext-v1_8.jsonl").open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            if row["word_index"] is not None:
                token_map.setdefault(row["verse_key"], {})[row["word_index"]] = row["canonical_text"]

    per_verse, mismatched = {}, []
    for verse_key in TARGETS:
        live = [r[0] for r in connection.execute(
            "SELECT arabic FROM words WHERE verse_key=? ORDER BY word_index", (verse_key,))]
        canonical = [token_map[verse_key][i] for i in sorted(token_map[verse_key])]
        per_verse[verse_key] = {"rows": len(live), "canonical_tokens": len(canonical)}
        if len(live) != len(canonical) or \
                [skeleton(x) for x in live] != [skeleton(x) for x in canonical]:
            mismatched.append(verse_key)
    results["target_verses"] = per_verse
    results["verses_diverging_from_canonical"] = mismatched

    connection.commit()
    connection.close()

    (OUT / "local-apply-report.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(results, ensure_ascii=False, indent=2))

    ok = (after == EXPECT_AFTER
          and results["untargeted_unchanged"]
          and not drifted
          and untargeted_after == EXPECT_UNTARGETED
          and results["integrity_check"] == "ok"
          and not results["foreign_key_check"]
          and results["ascii_in_root_or_lemma"] == 0
          and results["inserted_ids_present"] == [1] * len(INSERT_IDS)
          and results["deleted_ids_absent"] == [0] * len(DELETE_IDS)
          and not bad_index
          and not mismatched
          and results["verses_checked"] == 6236)
    print("\nLOCAL GATES:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
