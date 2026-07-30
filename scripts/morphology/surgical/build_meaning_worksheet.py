#!/usr/bin/env python3
"""Build the human worksheet for the 34 meaning_tr cells token-realign-v1_9 emptied.

Read-only. Writes one CSV plus a readable markdown companion under
data/candidates/morphology/surgical-v1_10/batch-b-meanings/.

Every column exists to answer one question a translator would ask:
  - what did this cell say before the migration emptied it?
  - what does the teacher say this token is?
  - what does the English gloss and the root say?
  - what does the verse actually mean, and what do the neighbours say?
  - what did the v1.9 adjudicator reject, and why?

Fill in `yeni_meaning_tr`. Leaving a row blank keeps the cell NULL — that is a
valid answer, not an omission.

    python scripts/morphology/surgical/build_meaning_worksheet.py
"""

from __future__ import annotations

import csv
import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DB = REPO / "data" / "app.db"
V19 = REPO / "data" / "candidates" / "morphology" / "token-realign-v1_9"
OUT = REPO / "data" / "candidates" / "morphology" / "surgical-v1_10" / "batch-b-meanings"
PRE_MIGRATION_BACKUP = REPO / "data" / "app.db.yedek_20260725_010115_pre_token_realign_v1_9"

_spec = importlib.util.spec_from_file_location(
    "plan", REPO / "scripts" / "morphology" / "plan-token-realign-v1_9.py")
plan = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(plan)

FIELDS = [
    "words_id", "verse_key", "word_index", "yuzey",
    "migration_oncesi_deger", "teacher_lemma", "teacher_root", "teacher_pos",
    "gloss_en", "kok_anlami", "onceki_token", "sonraki_token",
    "v19_karari", "v19_gerekcesi", "corpus_yuzey_tanikligi", "corpus_lemma_tanikligi",
    "ayet_meali",
    "yeni_meaning_tr",
]


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row

    empty = connection.execute(
        "SELECT id, verse_key, word_index, arabic, gloss_en, root "
        "FROM words WHERE meaning_tr IS NULL ORDER BY id").fetchall()

    teacher = plan.load_indexed(plan.TEACHER)
    adjudication = {
        (d["verse_key"], d["target_word_index"]): d
        for d in json.loads((V19 / "meaning-adjudication.json").read_text(encoding="utf-8"))["decisions"]
        if d["target_word_index"] is not None
    }

    # what the cell held before token-realign-v1_9 emptied it
    backup = sqlite3.connect(f"file:{PRE_MIGRATION_BACKUP}?mode=ro", uri=True)
    previous = {}
    for verse_key in {row["verse_key"] for row in empty}:
        for wid, wi, arabic, meaning in backup.execute(
                "SELECT id, word_index, arabic, meaning_tr FROM words "
                "WHERE verse_key = ? ORDER BY word_index", (verse_key,)):
            previous[(verse_key, wi)] = {"id": wid, "arabic": arabic, "meaning_tr": meaning}
    backup.close()

    root_meanings = {
        row[0]: row[1] for row in
        connection.execute("SELECT root, MIN(meaning_tr) FROM root_meanings "
                           "WHERE root IS NOT NULL GROUP BY root")
    }

    rows = []
    for record in empty:
        verse_key, index = record["verse_key"], record["word_index"]
        teacher_row = teacher.get(verse_key, {}).get(index) or {}
        decision = adjudication.get((verse_key, index), {})
        verse = connection.execute(
            "SELECT primary_translation, literal_ceviri FROM verses WHERE verse_key = ?",
            (verse_key,)).fetchone()

        def neighbour(offset):
            other = connection.execute(
                "SELECT arabic, meaning_tr FROM words WHERE verse_key=? AND word_index=?",
                (verse_key, index + offset)).fetchone()
            return f"{other['arabic']} = {other['meaning_tr']}" if other else ""

        def attest(key):
            return " · ".join(f"{e['meaning']} ({e['support']}x)"
                              for e in (decision.get(key) or [])) or ""

        rows.append({
            "words_id": record["id"],
            "verse_key": verse_key,
            "word_index": index,
            "yuzey": record["arabic"],
            "migration_oncesi_deger": (previous.get((verse_key, index)) or {}).get("meaning_tr") or "",
            "teacher_lemma": teacher_row.get("lemma") or "",
            "teacher_root": teacher_row.get("root") or "",
            "teacher_pos": teacher_row.get("pos") or "",
            "gloss_en": record["gloss_en"] or "",
            "kok_anlami": root_meanings.get(teacher_row.get("root")) or "",
            "onceki_token": neighbour(-1),
            "sonraki_token": neighbour(+1),
            "v19_karari": decision.get("verdict") or "",
            "v19_gerekcesi": decision.get("evidence") or "",
            "corpus_yuzey_tanikligi": attest("corpus_surface_top"),
            "corpus_lemma_tanikligi": attest("corpus_lemma_top"),
            "ayet_meali": (verse["primary_translation"] or verse["literal_ceviri"] or "")
            if verse else "",
            "yeni_meaning_tr": "",
        })
    connection.close()

    csv_path = OUT / "worksheet.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    # a readable companion, one block per cell
    lines = [
        "# batch-b — 34 boş `meaning_tr` hücresi",
        "",
        "`worksheet.csv` dosyasındaki **`yeni_meaning_tr`** sütununu doldur.",
        "Boş bıraktığın satır NULL kalır — bu geçerli bir cevap, eksik değil.",
        "",
        f"Toplam: **{len(rows)}** hücre.",
        "",
    ]
    for row in rows:
        lines += [
            f"## {row['verse_key']}:{row['word_index']} — `{row['yuzey']}`  (words.id={row['words_id']})",
            "",
            f"- migration öncesi değer: **{row['migration_oncesi_deger'] or '—'}**",
            f"- teacher: lemma `{row['teacher_lemma'] or '—'}` · root `{row['teacher_root'] or '—'}` · pos `{row['teacher_pos'] or '—'}`",
            f"- gloss_en: {row['gloss_en'] or '—'}",
            f"- kök anlamı: {row['kok_anlami'] or '—'}",
            f"- komşular: `{row['onceki_token'] or '—'}` ‹—› `{row['sonraki_token'] or '—'}`",
            f"- corpus bu yüzey için: {row['corpus_yuzey_tanikligi'] or '—'}",
            f"- corpus bu lemma için: {row['corpus_lemma_tanikligi'] or '—'}",
            f"- v1.9 kararı: {row['v19_karari'] or '—'}",
            f"- v1.9 gerekçesi: {row['v19_gerekcesi'] or '—'}",
            f"- ayet: {row['ayet_meali'] or '—'}",
            "",
        ]
    (OUT / "worksheet.md").write_text("\n".join(lines), encoding="utf-8")

    print(f"{len(rows)} satır yazıldı")
    print(f"  {csv_path}")
    print(f"  {OUT / 'worksheet.md'}")
    by_verse = {}
    for row in rows:
        by_verse.setdefault(row["verse_key"], []).append(row["word_index"])
    for verse_key, indexes in by_verse.items():
        print(f"    {verse_key}: {indexes}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
