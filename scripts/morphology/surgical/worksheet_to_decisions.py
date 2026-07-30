#!/usr/bin/env python3
"""Turn a filled-in worksheet.csv into a decisions.json for cells.py.

Read-only. Rows whose `yeni_meaning_tr` is blank are skipped — the cell stays
NULL, which is a valid answer.

Every proposed value is checked against the healthy corpus and reported as a
NOTE or a WARNING. These never block: the human wrote the value, the corpus only
gets to comment.

  NOTE     the value is already attested for this surface / lemma / gloss_en
  WARNING  it is attested nowhere — fine for a rare word, worth a second look
  WARNING  the surface is dominated by a different value in the corpus

    python scripts/morphology/surgical/worksheet_to_decisions.py <batch>
"""

from __future__ import annotations

import csv
import importlib.util
import json
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DB = REPO / "data" / "app.db"

_spec = importlib.util.spec_from_file_location(
    "plan", REPO / "scripts" / "morphology" / "plan-token-realign-v1_9.py")
plan = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(plan)


def main() -> int:
    batch = sys.argv[1] if len(sys.argv) > 1 else "batch-b-meanings"
    out = REPO / "data" / "candidates" / "morphology" / "surgical-v1_10" / batch
    worksheet = out / "worksheet.csv"
    if not worksheet.exists():
        print(f"missing {worksheet}")
        return 1

    connection = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row

    # attestation lexicons over the whole live corpus, excluding the cells
    # currently empty (they cannot vote for themselves)
    by_surface, by_lemma, by_gloss = (defaultdict(Counter) for _ in range(3))
    for row in connection.execute(
            "SELECT arabic, lemma, gloss_en, meaning_tr FROM words "
            "WHERE meaning_tr IS NOT NULL AND TRIM(meaning_tr) <> ''"):
        key = plan.meaning_key(row["meaning_tr"])
        by_surface[plan.nfc(row["arabic"] or "")][key] += 1
        if row["lemma"]:
            by_lemma[plan.bare(row["lemma"])][key] += 1
        if row["gloss_en"]:
            by_gloss[row["gloss_en"].strip().casefold()][key] += 1

    decisions, notes, skipped = [], [], []
    with worksheet.open(encoding="utf-8-sig", newline="") as handle:
        for entry in csv.DictReader(handle):
            value = (entry.get("yeni_meaning_tr") or "").strip()
            words_id = int(entry["words_id"])
            label = f"{entry['verse_key']}:{entry['word_index']}"
            if not value:
                skipped.append({"words_id": words_id, "verse_key": entry["verse_key"],
                                "word_index": int(entry["word_index"]),
                                "reason": "worksheet left blank — cell stays NULL"})
                continue

            live = connection.execute(
                "SELECT arabic, lemma, gloss_en, meaning_tr FROM words WHERE id = ?",
                (words_id,)).fetchone()
            if live is None:
                print(f"ABORT: words.id {words_id} not found")
                return 1
            if live["meaning_tr"] is not None:
                print(f"ABORT: {label} (id={words_id}) already has a meaning_tr "
                      f"({live['meaning_tr']!r}) — worksheet is stale")
                return 1

            key = plan.meaning_key(value)
            surface_hits = by_surface[plan.nfc(live["arabic"] or "")]
            lemma_hits = by_lemma[plan.bare(live["lemma"] or "")] if live["lemma"] else Counter()
            gloss_hits = (by_gloss[live["gloss_en"].strip().casefold()]
                          if live["gloss_en"] else Counter())

            supports = []
            if surface_hits.get(key):
                supports.append(f"surface {surface_hits[key]}x")
            if lemma_hits.get(key):
                supports.append(f"lemma {lemma_hits[key]}x")
            if gloss_hits.get(key):
                supports.append(f"gloss_en {gloss_hits[key]}x")

            if supports:
                notes.append(f"NOTE     {label}: {value!r} attested ({', '.join(supports)})")
            elif surface_hits:
                dominant, count = surface_hits.most_common(1)[0]
                notes.append(
                    f"WARNING  {label}: {value!r} unattested; corpus favours "
                    f"{dominant!r} ({count}x) for this surface")
            else:
                notes.append(f"WARNING  {label}: {value!r} attested nowhere in the corpus")

            decisions.append({
                "words_id": words_id,
                "verse_key": entry["verse_key"],
                "word_index": int(entry["word_index"]),
                "column": "meaning_tr",
                "after": value,
                "evidence": f"human worksheet decision; corpus check: "
                            f"{', '.join(supports) if supports else 'unattested'}",
            })
    connection.close()

    payload = {"batch": batch,
               "rationale": ["meaning_tr values authored by hand in worksheet.csv; "
                             "blank rows deliberately left NULL"],
               "decisions": decisions}
    (out / "decisions.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "worksheet-review.json").write_text(json.dumps(
        {"filled": len(decisions), "left_null": len(skipped),
         "notes": notes, "skipped": skipped}, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"filled: {len(decisions)} · left NULL: {len(skipped)}")
    for note in notes:
        print("  " + note)
    print(f"\nwrote {out / 'decisions.json'}")
    print("next: python scripts/morphology/surgical/cells.py "
          f"data/candidates/morphology/surgical-v1_10/{batch}/decisions.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
