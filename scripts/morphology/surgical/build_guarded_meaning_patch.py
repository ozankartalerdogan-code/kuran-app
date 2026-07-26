#!/usr/bin/env python3
"""Build and dry-run the combined Batch B/C meaning_tr-only patch package.

Reads data/app.db via SQLite read-only backup, writes artifacts only, and never
contacts Turso or mutates data/app.db. Every UPDATE is guarded by the exact
meaning_tr pre-image and a changes()=1 CHECK inside the transaction.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
import unicodedata
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
ROOT = REPO / "data" / "candidates" / "morphology" / "surgical-v1_10"
BATCH_B = ROOT / "batch-b-meanings" / "worksheet.csv"
BATCH_C = ROOT / "batch-c-gloss" / "classes.csv"
PACKAGE = "batch-bc-meaning-tr"
OUT = ROOT / PACKAGE
DB = REPO / "data" / "app.db"
TEACHER = REPO / "data" / "candidates" / "morphology" / "qac-tanzil-teacher.jsonl"
SEMANTIC_TAGS = ("COND", "NEG", "REL", "INTG", "CERT", "ACC", "SUB", "PREV", "EQ")
BOUNDARY_TAGS = {"PREF:CONJ", "PREF:REM", "PREF:CIRC", "PREF:RSLT"}
STOP_LEMMAS = {"إِن", "إِنّ", "إِذ", "لَكِن", "لَكِنّ"}
FUSED_BOUNDARIES = ("وما", "فما", "ولا", "فلا", "وإن", "فإن")
ALL_COLUMNS = ["verse_key", "word_index", "segment_index", "arabic", "root", "lemma",
               "pos", "morphology", "meaning_tr", "gloss_en", "confidence", "source", "role"]


def atomic_text(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def atomic_json(path: Path, value) -> None:
    atomic_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def value_predicate(column: str, value) -> str:
    return f"{column} IS NULL" if value is None else f"{column} = {sql_literal(value)}"


def identity_guard(decision: dict, expected) -> str:
    return (
        f"id = {decision['words_id']}"
        f" AND verse_key = {sql_literal(decision['verse_key'])}"
        f" AND word_index = {decision['word_index']}"
        f" AND {value_predicate('meaning_tr', expected)}"
    )


def tag_of(morphology: str | None) -> str:
    found = [tag for tag in re.findall(r":([A-Z_]+)", morphology or "")
             if tag in SEMANTIC_TAGS]
    return found[-1] if found else "NONE"


def load_teacher() -> dict[tuple[str, int], dict]:
    index = {}
    with TEACHER.open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            index[(row["verse_key"], int(row["word_index"]))] = row
    return index


def bare_arabic(value: str | None) -> str:
    return "".join(
        char for char in unicodedata.normalize("NFD", value or "")
        if unicodedata.category(char) != "Mn"
    )


def morphology_set(row: dict) -> set[str]:
    value = row.get("morphology") or []
    return set(value if isinstance(value, list) else value.split())


def clause_scope(row: sqlite3.Row, teacher: dict[tuple[str, int], dict]) -> list[dict]:
    scope = []
    for offset in range(1, 20):
        item = teacher.get((row["verse_key"], row["word_index"] + offset))
        if item is None:
            break
        surface = bare_arabic(item.get("arabic"))
        boundary = (
            bool(morphology_set(item) & BOUNDARY_TAGS)
            or surface.startswith(FUSED_BOUNDARIES)
            or item.get("lemma") in STOP_LEMMAS
        )
        if offset > 1 and boundary:
            break
        scope.append(item)
    if not scope:
        raise SystemExit(
            f"FAIL-CLOSED: ardıl morphology bulunamadı: "
            f"{row['verse_key']}:{row['word_index']} id={row['id']}")
    return scope


def is_minimizer(item: dict) -> bool:
    return item.get("lemma") == "مِن" and "PRON" not in morphology_set(item)


def aspect_person(item: dict) -> tuple[str, str]:
    values = item.get("morphology") or []
    values = values if isinstance(values, list) else values.split()
    morphology = set(values)
    aspect = "PERF" if "PERF" in morphology else "IMPF" if "IMPF" in morphology else None
    verbal_persons = {"1P", "1S", "2MS", "3FS", "3MP", "3MS"}
    person = next((tag for tag in values if tag in verbal_persons), None)
    if not aspect or not person:
        raise SystemExit(
            f"FAIL-CLOSED: fiil aspect/kişi sınıflandırılamadı: "
            f"{item.get('verse_key')}:{item.get('word_index')} {sorted(morphology)}")
    return aspect, person


def has_illa(scope: list[dict]) -> bool:
    return any(item.get("lemma") == "إِلّا" for item in scope)


def classify_in_neg(row: sqlite3.Row, teacher: dict[tuple[str, int], dict]) -> str:
    scope = clause_scope(row, teacher)
    if has_illa(scope):
        return "NEG_ILLA"
    if any(bare_arabic(item.get("arabic")) == "لما" for item in scope):
        return "NEG_LAMMA"
    aspect, person = aspect_person(scope[0])
    if (aspect, person) == ("PERF", "1P"):
        return "NEG_PERF_1P"
    raise SystemExit(
        f"FAIL-CLOSED: إِن·NEG sınıflandırılamadı: "
        f"{row['verse_key']}:{row['word_index']} id={row['id']}")


def classify_wama_neg(row: sqlite3.Row, teacher: dict[tuple[str, int], dict]) -> str:
    if "FAM:" in (row["morphology"] or ""):
        return "NEG_FAM_KANA"
    scope = clause_scope(row, teacher)
    first = scope[0]
    lemma = first.get("lemma")
    if lemma == "كانَ":
        return "NEG_FAM_KANA"
    if lemma == "كادَ":
        return "NEG_KADA"
    if is_minimizer(first):
        return "NEG_MIN_YOKLUK"

    pos = first.get("pos") or ""
    if pos.startswith("V"):
        illa_index = next(
            (index for index, item in enumerate(scope) if item.get("lemma") == "إِلّا"),
            None,
        )
        min_index = next(
            (index for index, item in enumerate(scope) if is_minimizer(item)),
            None,
        )
        if min_index is not None and (illa_index is None or min_index < illa_index):
            return "NEG_FIIL_MIN"
        if illa_index is not None:
            return "NEG_FIIL_ILLA"
        aspect, person = aspect_person(first)
        return f"NEG_FIIL_{aspect}_{person}"

    if has_illa(scope):
        return "NEG_ISIM_ILLA"
    first_morphology = morphology_set(first)
    if pos == "P" or {"P", "PREF:P"} & first_morphology:
        return "NEG_ISIM_EXISTENTIAL"
    if len(scope) > 1 and (scope[1].get("pos") or "").startswith("V"):
        return "NEG_ISIM_FRONTED_VERB_3MS"
    return "NEG_ISIM_COPULAR"


def fingerprint(connection: sqlite3.Connection, columns: list[str], exclude=frozenset()) -> str:
    digest = hashlib.sha256()
    for row in connection.execute(
            f"SELECT id, {', '.join(columns)} FROM words ORDER BY id"):
        if row[0] not in exclude:
            digest.update(repr(row).encode("utf-8"))
    return digest.hexdigest()


def build_decisions(connection: sqlite3.Connection) -> tuple[list[dict], dict]:
    batch_b = []
    with BATCH_B.open(encoding="utf-8-sig", newline="") as handle:
        for entry in csv.DictReader(handle):
            after = (entry["yeni_meaning_tr"] or "").strip()
            if not after:
                raise SystemExit(
                    f"FAIL-CLOSED: Batch B kararı boş: "
                    f"{entry['verse_key']}:{entry['word_index']}")
            before = (None if entry["v19_karari"] == "SET_NULL_FAIL_CLOSED"
                      else (entry["migration_oncesi_deger"] or "").strip() or None)
            live = connection.execute(
                "SELECT id, verse_key, word_index, meaning_tr FROM words WHERE id = ?",
                (int(entry["words_id"]),),
            ).fetchone()
            expected_identity = (entry["verse_key"], int(entry["word_index"]))
            if live is None or (live["verse_key"], live["word_index"]) != expected_identity:
                raise SystemExit(f"FAIL-CLOSED: Batch B kimliği drift etti: id={entry['words_id']}")
            if live["meaning_tr"] != before:
                raise SystemExit(
                    f"FAIL-CLOSED: Batch B {entry['verse_key']}:{entry['word_index']} "
                    f"id={entry['words_id']} beklenen={before!r} mevcut={live['meaning_tr']!r}")
            batch_b.append({
                "words_id": int(entry["words_id"]),
                "verse_key": entry["verse_key"],
                "word_index": int(entry["word_index"]),
                "column": "meaning_tr",
                "before": before,
                "after": after,
                "source_batch": "batch-b-meanings",
                "evidence": "filled Batch B worksheet decision",
            })

    with BATCH_C.open(encoding="utf-8-sig", newline="") as handle:
        class_rows = list(csv.DictReader(handle))
    classes = {(row["yuzey"], row["etiket"]): row for row in class_rows
               if row["karar"] != "KEEP"}
    teacher = load_teacher()
    class_counts = Counter()
    batch_c = []
    for surface in sorted({surface for surface, _ in classes}):
        live_rows = connection.execute(
            "SELECT id, verse_key, word_index, arabic, morphology, meaning_tr "
            "FROM words WHERE arabic = ? AND meaning_tr IS NOT NULL ORDER BY id",
            (surface,),
        ).fetchall()
        for live in live_rows:
            semantic_tag = tag_of(live["morphology"])
            class_key = semantic_tag
            if surface == "إِن" and semantic_tag == "NEG":
                class_key = classify_in_neg(live, teacher)
            elif surface == "وَمَا" and semantic_tag == "NEG":
                class_key = classify_wama_neg(live, teacher)
            class_row = classes.get((surface, class_key))
            if class_row is None:
                continue
            before = class_row["mevcut_anlam"]
            after = class_row["yeni_anlam"]
            if not after:
                raise SystemExit(f"FAIL-CLOSED: Batch C kararı boş: {surface}·{class_key}")
            if live["meaning_tr"] != before:
                raise SystemExit(
                    f"FAIL-CLOSED: Batch C {live['verse_key']}:{live['word_index']} "
                    f"id={live['id']} beklenen={before!r} mevcut={live['meaning_tr']!r}")
            class_counts[(surface, class_key)] += 1
            batch_c.append({
                "words_id": live["id"],
                "verse_key": live["verse_key"],
                "word_index": live["word_index"],
                "column": "meaning_tr",
                "before": before,
                "after": after,
                "source_batch": "batch-c-gloss",
                "source_class": class_key,
                "evidence": f"filled Batch C class {surface}·{class_key}",
            })

    expected_class_counts = {
        key: int(row["satir_sayisi"]) for key, row in classes.items()
    }
    if dict(class_counts) != expected_class_counts:
        expected_display = {f"{key[0]}·{key[1]}": value
                            for key, value in sorted(expected_class_counts.items())}
        actual_display = {f"{key[0]}·{key[1]}": value
                          for key, value in sorted(class_counts.items())}
        raise SystemExit(
            f"FAIL-CLOSED: Batch C sınıf sayıları uyuşmuyor; "
            f"beklenen={expected_display} mevcut={actual_display}")

    ids_b = {decision["words_id"] for decision in batch_b}
    ids_c = {decision["words_id"] for decision in batch_c}
    overlap = sorted(ids_b & ids_c)
    original_null = sum(decision["before"] is None for decision in batch_b)
    if overlap:
        raise SystemExit(f"FAIL-CLOSED: Batch B/C overlap: {overlap}")
    if len(batch_b) != 35 or original_null != 34:
        raise SystemExit(
            f"FAIL-CLOSED: Batch B 35 karar / 34 NULL bekleniyordu; "
            f"{len(batch_b)} / {original_null} bulundu")
    if len(batch_c) != 613:
        raise SystemExit(f"FAIL-CLOSED: Batch C 613 karar bekleniyordu; {len(batch_c)} bulundu")

    decisions = batch_b + batch_c
    audit = {
        "target": "words.meaning_tr",
        "batch_b_decisions": len(batch_b),
        "batch_b_initial_null_cells": original_null,
        "batch_b_linked_nonnull_decisions": len(batch_b) - original_null,
        "batch_b_linked_nonnull_ref": "15:7:1 لَوْ → haydi",
        "batch_b_c_overlap": len(overlap),
        "batch_c_decisions": len(batch_c),
        "decisions_total": len(decisions),
        "exact_change": sum(d["before"] != d["after"] for d in decisions),
        "noop": sum(d["before"] == d["after"] for d in decisions),
        "null_to_nonnull": sum(d["before"] is None and d["after"] is not None
                               for d in decisions),
        "nonnull_to_nonnull": sum(d["before"] is not None and d["after"] is not None
                                  for d in decisions),
        "batch_c_class_counts": {
            f"{key[0]}·{key[1]}": value for key, value in sorted(class_counts.items())
        },
    }
    return decisions, audit


def guarded_sql(decisions: list[dict], reverse: bool, total_rows: int) -> str:
    direction = "reverse" if reverse else "forward"
    ordered = list(reversed(decisions)) if reverse else decisions
    lines = [
        f"-- surgical-v1_10/{PACKAGE} {direction} migration DRAFT - NOT APPLIED",
        "-- Target: words.meaning_tr only.",
        "-- Every UPDATE must affect exactly one expected pre-image cell or CHECK aborts.",
        "BEGIN IMMEDIATE;",
        "CREATE TEMP TABLE _surgical_meaning_guard (matched INTEGER NOT NULL CHECK (matched = 1));",
        "",
    ]
    for decision in ordered:
        before = decision["after"] if reverse else decision["before"]
        after = decision["before"] if reverse else decision["after"]
        lines.append(
            f"UPDATE words SET meaning_tr = {sql_literal(after)} WHERE "
            f"{identity_guard(decision, before)};")
        lines.append("INSERT INTO _surgical_meaning_guard(matched) VALUES (changes());")
    lines += [
        "",
        "DROP TABLE _surgical_meaning_guard;",
        f"-- words row count must remain {total_rows}",
        "COMMIT;",
        "",
    ]
    return "\n".join(lines)


class WorkspaceDryRun:
    def __enter__(self) -> str:
        self.root = REPO / ".dry-run-tmp"
        self.root.mkdir(exist_ok=True)
        for name in ("dry-run.db", "drift.db"):
            target = self.root / name
            if target.exists():
                target.unlink()
        return str(self.root)

    def __exit__(self, exc_type, exc, traceback) -> None:
        for name in ("dry-run.db", "drift.db"):
            target = self.root / name
            if target.exists():
                target.unlink()

def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    current_sql_sha256 = {
        name: file_sha256(OUT / name)
        for name in ("forward.sql", "reverse.sql")
        if (OUT / name).exists()
    }
    invalidation_path = OUT / "sql-invalidation.json"
    previous_sql_sha256 = current_sql_sha256
    if invalidation_path.exists():
        recorded = json.loads(invalidation_path.read_text(encoding="utf-8"))
        previous_sql_sha256 = recorded.get("invalidated_sql_sha256") or current_sql_sha256
    source = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    source.row_factory = sqlite3.Row
    decisions, audit = build_decisions(source)
    total_rows = source.execute("SELECT COUNT(*) FROM words").fetchone()[0]

    preimage = []
    for decision in decisions:
        row = source.execute(
            f"SELECT id, {', '.join(ALL_COLUMNS)} FROM words WHERE id = ?",
            (decision["words_id"],),
        ).fetchone()
        preimage.append(dict(row))
    source.close()

    changes = [decision for decision in decisions if decision["before"] != decision["after"]]
    noops = [decision for decision in decisions if decision["before"] == decision["after"]]
    manifest = [{key: decision[key] for key in
                 ("words_id", "verse_key", "word_index", "column", "before", "after",
                  "source_batch", "evidence")}
                | ({"source_class": decision["source_class"]}
                   if "source_class" in decision else {})
                for decision in changes]
    summary = {
        "batch": PACKAGE,
        **audit,
        "rows_touched": len({d["words_id"] for d in changes}),
        "cells_to_change": len(changes),
        "verses_touched": sorted({d["verse_key"] for d in changes}),
        "cells_by_column": {"meaning_tr": len(changes)},
        "skipped_already_at_target": noops,
        "corpus_rows_before": total_rows,
        "corpus_rows_after": total_rows,
    }
    payload = {
        "batch": PACKAGE,
        "allowed_columns": ["meaning_tr"],
        "rationale": [
            "Batch B and Batch C decisions combined with zero overlap.",
            "35 Batch B decisions are 34 original NULL cells plus linked 15:7:1 لَوْ.",
            "15:7 لَوْ مَا is preserved as haydi + -sene.",
            "Batch C uses context-verified NEG subgroups; obsolete bulk NEG mappings are excluded.",
        ],
        "decisions": decisions,
    }
    atomic_json(OUT / "decisions.json", payload)
    atomic_json(OUT / "source-audit.json", audit)
    atomic_json(OUT / "field-change-manifest.json", manifest)
    atomic_json(OUT / "preimage.json", preimage)
    atomic_json(OUT / "summary.json", summary)
    forward = guarded_sql(changes, reverse=False, total_rows=total_rows)
    reverse = guarded_sql(changes, reverse=True, total_rows=total_rows)
    atomic_text(OUT / "forward.sql", forward)
    atomic_text(OUT / "reverse.sql", reverse)
    new_sql_sha256 = {
        name: file_sha256(OUT / name) for name in ("forward.sql", "reverse.sql")
    }
    invalidation = {
        "previous_package_invalidated": True,
        "reason": (
            "Previous 648-cell SQL used obsolete bulk إِن·NEG and وَمَا·NEG decisions; "
            "it must not be executed. Files were regenerated from the verified context subgroups."
        ),
        "regenerated_from_scratch": True,
        "invalidated_sql_sha256": previous_sql_sha256,
        "replacement_sql_sha256": new_sql_sha256,
    }
    atomic_json(OUT / "sql-invalidation.json", invalidation)
    audit["sql_invalidation"] = invalidation
    summary["sql_invalidation"] = invalidation
    atomic_json(OUT / "source-audit.json", audit)
    atomic_json(OUT / "summary.json", summary)

    target_ids = frozenset(d["words_id"] for d in changes)
    with WorkspaceDryRun() as tmp:
        temp_root = Path(tmp)
        live_source = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
        test = sqlite3.connect(temp_root / "dry-run.db")
        live_source.backup(test)
        live_source.close()
        before_full = fingerprint(test, ALL_COLUMNS)
        before_nonmeaning = fingerprint(test, [c for c in ALL_COLUMNS if c != "meaning_tr"])
        before_untouched = fingerprint(test, ALL_COLUMNS, exclude=target_ids)
        test.executescript(forward)
        reached = sum(test.execute(
            "SELECT meaning_tr FROM words WHERE id = ?", (d["words_id"],)
        ).fetchone()[0] == d["after"] for d in changes)
        after_rows = test.execute("SELECT COUNT(*) FROM words").fetchone()[0]
        nonmeaning_unchanged = fingerprint(
            test, [c for c in ALL_COLUMNS if c != "meaning_tr"]) == before_nonmeaning
        untouched_unchanged = fingerprint(test, ALL_COLUMNS, exclude=target_ids) == before_untouched
        test.executescript(reverse)
        reverse_restored = fingerprint(test, ALL_COLUMNS) == before_full
        integrity = test.execute("PRAGMA integrity_check").fetchone()[0]
        test.close()

        drift_source = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
        drift = sqlite3.connect(temp_root / "drift.db")
        drift_source.backup(drift)
        drift_source.close()
        drift_target = changes[-1]
        drift.execute("UPDATE words SET meaning_tr = ? WHERE id = ?",
                      ("__DRIFT_SENTINEL__", drift_target["words_id"]))
        drift.commit()
        drift_before = fingerprint(drift, ALL_COLUMNS)
        drift_failed_closed = False
        try:
            drift.executescript(forward)
        except sqlite3.IntegrityError:
            drift_failed_closed = True
            drift.rollback()
        drift_rolled_back = fingerprint(drift, ALL_COLUMNS) == drift_before
        drift.close()

    report = {
        "batch": PACKAGE,
        "status": "PASS",
        "local_database_written": False,
        "turso_contacted": False,
        "dry_run_database": "disposable temp copies only",
        "decisions_total": len(decisions),
        "exact_change": len(changes),
        "noop": len(noops),
        "null_to_nonnull": audit["null_to_nonnull"],
        "nonnull_to_nonnull": audit["nonnull_to_nonnull"],
        "batch_b_c_overlap": audit["batch_b_c_overlap"],
        "sql_invalidation": invalidation,
        "target_cells_reached": reached,
        "rows_before": total_rows,
        "rows_after_forward": after_rows,
        "meaning_tr_only": nonmeaning_unchanged,
        "untouched_rows_unchanged": untouched_unchanged,
        "reverse_restored_full_words_table": reverse_restored,
        "drift_guard_failed_closed": drift_failed_closed,
        "drift_guard_rolled_back": drift_rolled_back,
        "integrity_check": integrity,
    }
    ok = all([
        len(decisions) == 648,
        len(changes) == 648,
        len(noops) == 0,
        audit["null_to_nonnull"] == 34,
        audit["nonnull_to_nonnull"] == 614,
        audit["batch_b_c_overlap"] == 0,
        invalidation["previous_package_invalidated"],
        previous_sql_sha256.keys() == new_sql_sha256.keys(),
        all(previous_sql_sha256[name] != new_sql_sha256[name] for name in new_sql_sha256),
        reached == len(changes),
        after_rows == total_rows,
        nonmeaning_unchanged,
        untouched_unchanged,
        reverse_restored,
        drift_failed_closed,
        drift_rolled_back,
        integrity == "ok",
    ])
    report["status"] = "PASS" if ok else "FAIL"
    atomic_json(OUT / "dry-run-report.json", report)
    print(json.dumps({"source_audit": audit, "dry_run": report}, ensure_ascii=True, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())