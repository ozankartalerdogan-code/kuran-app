#!/usr/bin/env python3
"""V2.3 yeniden sınıflandırma için ek girdi: frozen v2.1 ranked setten cluster başına
rule_conflict bayrağı (v2 top_has_rule_conflict tanımıyla birebir; salt okunur türetme).

Kullanım: python extract-rule-conflict-flags.py <output.json>
"""
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
V21_SET = ROOT / "data/candidates/morphology/disambiguation-v2.1/ranked-eval-set.jsonl"
V21_SHA = "5c1d01768a61959f11cf610b6725b3328da2b2277e2f37750719a69f6de35b19"

STRONG_POSITIVE_RULES = ("canonical_diacritic_alignment", "surface_reconstruction", "prefix_stem_suffix_alignment")
STRUCTURAL_NEGATIVE_RULES = STRONG_POSITIVE_RULES + ("foreign_ntws_guard",)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def has_conflict(cluster: dict) -> bool:
    scores = {p["rule"]: p["score"] for p in cluster["score_components"]}
    strong_positive = any(scores.get(r, 0) >= 20 for r in STRONG_POSITIVE_RULES)
    structural_negative = any(scores.get(r, 0) <= -15 for r in STRUCTURAL_NEGATIVE_RULES)
    return strong_positive and structural_negative


def main() -> None:
    out_path = Path(sys.argv[1])
    assert sha256_file(V21_SET) == V21_SHA, "v2.1 ranked set SHA mismatch"
    flags = {}
    with open(V21_SET, encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            key = f'{rec["verse_key"]}#{rec["word_index"]}'
            conflicted = sorted(c["equivalence_key_sha256"] for c in rec["equivalence_clusters"] if has_conflict(c))
            if conflicted:
                flags[key] = conflicted
    payload = {
        "schema_version": "camel-v2.3-rule-conflict-flags-v1",
        "source_hash": V21_SHA,
        "definition": "v2 top_has_rule_conflict: güçlü pozitif (>=20) VE yapısal negatif (<=-15) bileşen aynı cluster'da",
        "conflicted_cluster_shas_by_key": flags,
    }
    text = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, out_path)
    print(f"keys_with_conflicts={len(flags)} sha256={hashlib.sha256(text.encode('utf-8')).hexdigest()}")


if __name__ == "__main__":
    main()
