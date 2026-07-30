#!/usr/bin/env python3
"""Group the إِن / وَمَا gloss defect into decidable classes.

Read-only. Writes classes.csv + classes.md under
data/candidates/morphology/surgical-v1_10/batch-c-gloss/.

The defect: both surfaces carry ONE Turkish gloss regardless of their syntactic
role. إِن is glossed "şüphesiz, gerçekten" (the إِنَّ reading) even where the
morphology says COND or NEG; وَمَا is glossed "ve olana" (a relative-clause
reading) even where the morphology says NEG, INTG or COND.

Rather than 759 individual decisions, the rows are grouped by (surface,
morphology tag class). One Turkish gloss per class covers every row in it.
Classes whose current gloss already matches their syntax are marked KEEP and are
excluded from the output SQL.

    python scripts/morphology/surgical/build_gloss_classes.py
"""

from __future__ import annotations

import csv
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DB = REPO / "data" / "app.db"
OUT = REPO / "data" / "candidates" / "morphology" / "surgical-v1_10" / "batch-c-gloss"

SURFACES = ["إِن", "وَمَا"]

# The tag that decides the reading. Prefix tags (CONJ/REM/CIRC/RSLT) only say how
# the word attaches to the previous clause; they do not change what مَا or إِن
# themselves mean, so the class key is the LAST semantic tag.
SEMANTIC_TAGS = ("COND", "NEG", "REL", "INTG", "CERT", "ACC", "SUB", "PREV", "EQ")

# Classes whose stored gloss already fits the syntax — never touched.
KEEP = {("إِن", "CERT"), ("وَمَا", "REL")}


def tag_of(morphology: str | None) -> str:
    if not morphology:
        return "NONE"
    found = [t for t in re.findall(r":([A-Z_]+)", morphology) if t in SEMANTIC_TAGS]
    return found[-1] if found else "NONE"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row

    # Cells that are currently NULL belong to batch-b (the hand-authored
    # worksheet), which runs first. Including them here would have two batches
    # writing the same cell.
    classes: dict[tuple[str, str, str | None], list[sqlite3.Row]] = defaultdict(list)
    deferred_to_batch_b = []
    for surface in SURFACES:
        for row in connection.execute(
                "SELECT id, verse_key, word_index, arabic, morphology, meaning_tr "
                "FROM words WHERE arabic = ? ORDER BY id", (surface,)):
            if row["meaning_tr"] is None:
                deferred_to_batch_b.append(
                    f"{row['verse_key']}:{row['word_index']} (id={row['id']}, "
                    f"{surface} {tag_of(row['morphology'])})")
                continue
            classes[(surface, tag_of(row["morphology"]), row["meaning_tr"])].append(row)

    rows_out, blocks = [], []
    for (surface, tag, meaning), members in sorted(
            classes.items(), key=lambda kv: (kv[0][0], -len(kv[1]))):
        keep = (surface, tag) in KEEP
        samples = []
        for member in members[:3]:
            verse = connection.execute(
                "SELECT primary_translation, literal_ceviri FROM verses WHERE verse_key = ?",
                (member["verse_key"],)).fetchone()
            samples.append({
                "ref": f"{member['verse_key']}:{member['word_index']}",
                "morphology": member["morphology"],
                "meal": (verse["primary_translation"] or verse["literal_ceviri"] or "")
                if verse else "",
            })

        rows_out.append({
            "yuzey": surface,
            "etiket": tag,
            "satir_sayisi": len(members),
            "mevcut_anlam": meaning if meaning is not None else "(NULL)",
            "karar": "KEEP" if keep else "",
            "ornek_1": samples[0]["ref"] if samples else "",
            "ornek_2": samples[1]["ref"] if len(samples) > 1 else "",
            "ornek_3": samples[2]["ref"] if len(samples) > 2 else "",
            "ornek_morfoloji": samples[0]["morphology"] if samples else "",
            "yeni_anlam": "",
        })

        heading = f"## `{surface}` · **{tag}** · {len(members)} satır"
        if keep:
            heading += "  — DOKUNULMAZ"
        blocks += [heading, "",
                   f"- mevcut anlam: **{meaning if meaning is not None else '(NULL)'}**",
                   f"- örnek morfoloji: `{samples[0]['morphology'] if samples else '—'}`", ""]
        for sample in samples:
            blocks += [f"  - `{sample['ref']}` — {sample['meal'][:160]}"]
        blocks += [""]
        if not keep:
            blocks += ["  **yeni anlam:** _(classes.csv içinde `yeni_anlam` sütununu doldur)_", ""]

    connection.close()

    with (OUT / "classes.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows_out[0].keys()))
        writer.writeheader()
        writer.writerows(rows_out)

    changeable = [r for r in rows_out if r["karar"] != "KEEP"]
    header = [
        "# batch-c — `إِن` ve `وَمَا` gloss sınıfları",
        "",
        "Aynı yüzeye, morfolojisi ne olursa olsun tek bir Türkçe karşılık yazılmış.",
        "Aşağıdaki her sınıf için **bir** karşılık yaz; o sınıftaki tüm satırlara uygulanır.",
        "",
        f"- toplam sınıf: **{len(rows_out)}**",
        f"- karar bekleyen sınıf: **{len(changeable)}**",
        f"- karar bekleyen satır: **{sum(r['satir_sayisi'] for r in changeable)}**",
        f"- dokunulmayan satır: **{sum(r['satir_sayisi'] for r in rows_out if r['karar'] == 'KEEP')}**",
        f"- batch-b'ye bırakılan NULL hücre: **{len(deferred_to_batch_b)}** "
        f"({', '.join(deferred_to_batch_b) if deferred_to_batch_b else '—'})",
        "",
        "`classes.csv` içindeki **`yeni_anlam`** sütununu doldur. Boş bıraktığın",
        "sınıfa dokunulmaz.",
        "",
    ]
    (OUT / "classes.md").write_text("\n".join(header + blocks), encoding="utf-8")

    print(f"{len(rows_out)} sınıf · karar bekleyen {len(changeable)} sınıf / "
          f"{sum(r['satir_sayisi'] for r in changeable)} satır")
    for row in rows_out:
        flag = "KEEP " if row["karar"] == "KEEP" else "     "
        print(f"  {flag}{row['yuzey']:6s} {row['etiket']:6s} {row['satir_sayisi']:4d}  "
              f"{row['mevcut_anlam']}")
    print(f"\n  {OUT / 'classes.csv'}\n  {OUT / 'classes.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
