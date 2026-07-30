#!/usr/bin/env python3
"""Guarded local rollback. Does nothing without --apply."""
from __future__ import annotations
import hashlib, json, sqlite3, sys, time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
if len(sys.argv) < 2 or "--apply" not in sys.argv:
    raise SystemExit("usage: rollback_local_guarded.py <batch> --apply")
batch = sys.argv[1]
out = REPO / "data/candidates/morphology/surgical-v1_10" / batch
db = REPO / "data/app.db"
changes = json.loads((out / "field-change-manifest.json").read_text(encoding="utf-8"))
summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
invalidation = json.loads((out / "sql-invalidation.json").read_text(encoding="utf-8"))
reverse_path = out / "reverse.sql"
reverse_hash = hashlib.sha256(reverse_path.read_bytes()).hexdigest()
if (reverse_hash != invalidation["replacement_sql_sha256"]["reverse.sql"]
        or reverse_hash in invalidation["invalidated_sql_sha256"].values()):
    raise SystemExit(f"ABORT: reverse.sql hash rejected: {reverse_hash}")
if len(changes) != 648 or any(row["column"] != "meaning_tr" for row in changes):
    raise SystemExit("ABORT: rollback package/count gate failed")
connection = sqlite3.connect(db)
connection.row_factory = sqlite3.Row
if connection.execute("SELECT COUNT(*) FROM words").fetchone()[0] != summary["corpus_rows_after"]:
    raise SystemExit("ABORT: words row count drifted")
drift = []
for change in changes:
    value = connection.execute("SELECT meaning_tr FROM words WHERE id=?", (change["words_id"],)).fetchone()[0]
    if value != change["after"]: drift.append(change["words_id"])
if drift: raise SystemExit(f"ABORT: {len(drift)} target cells drifted")
stamp = time.strftime("%Y%m%d_%H%M%S")
backup = REPO / "data" / f"app.db.yedek_{stamp}_pre_rollback_{batch.replace('-', '_')}"
backup_connection = sqlite3.connect(backup)
connection.backup(backup_connection)
backup_connection.close()
connection.executescript(reverse_path.read_text(encoding="utf-8"))
restored = sum(connection.execute("SELECT meaning_tr FROM words WHERE id=?", (row["words_id"],)).fetchone()[0] == row["before"] for row in changes)
rows = connection.execute("SELECT COUNT(*) FROM words").fetchone()[0]
integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
connection.close()
report = {"ranAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "batch": batch,
          "reverseSha256": reverse_hash, "preRollbackBackup": str(backup),
          "cellsRestored": restored, "rowsAfter": rows, "integrityCheck": integrity}
(out / "local-rollback-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(0 if restored == 648 and rows == 77433 and integrity == "ok" else 1)