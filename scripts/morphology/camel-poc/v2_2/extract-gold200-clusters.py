#!/usr/bin/env python3
"""V2.2 tanı ön-adımı: frozen V2.1 ranked-eval-set'ten (salt okunur) 200 gold kaydının
tam equivalence-cluster uzayını ve 1000 kelimelik global (lemma,pos) kanıt indeksini çıkarır.

Frozen artefaktlara yazmaz; deterministik cache dosyası üretir (sort_keys, atomik yazım).
Kullanım: python extract-gold200-clusters.py <cache-output.json>
"""
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
GOLD = ROOT / "data/candidates/morphology/disambiguation-v2/gold-review-package.jsonl"
GOLD_SHA = "702416e4207799ac705398fd84952cf71a0bf455ae34cb8b7ca06eac716ce627"
V21_SET = ROOT / "data/candidates/morphology/disambiguation-v2.1/ranked-eval-set.jsonl"
V21_SHA = "5c1d01768a61959f11cf610b6725b3328da2b2277e2f37750719a69f6de35b19"

FEAT_KEYS = ("asp", "cas", "gen", "mod", "num", "per", "stt", "vox")
FLAG_KEYS = ("abbrev", "echo", "exact_diac", "exact_reconstruction", "foreign_ntws")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def compact_cluster(c: dict) -> dict:
    ek = c["equivalence_key"]
    rep = c["representative"]
    bf = ek.get("basic_features", {})
    clitics = {
        k: rep[k]
        for k in ("prc0", "prc1", "prc1.5", "prc2", "prc3", "enc0", "enc1", "enc2")
        if rep.get(k) not in ("0", 0, None, "")
    }
    return {
        "rank": c["rank"],
        "sha": c["equivalence_key_sha256"],
        "score": c["total_score"],
        "root": rep.get("root", ""),
        "lex": rep.get("lex", ""),
        "nlem": ek.get("lemma_normalized", ""),
        "pos": ek.get("pos_raw", ""),
        "diac": ek.get("diac", ""),
        "feats": {k: bf.get(k) for k in FEAT_KEYS if bf.get(k) not in (None, "0")},
        "flags": {k: bool(c.get("representative_flags", {}).get(k)) for k in FLAG_KEYS},
        "clitics": clitics,
    }


def main() -> None:
    out_path = Path(sys.argv[1])
    assert sha256_file(GOLD) == GOLD_SHA, "gold package SHA mismatch"
    assert sha256_file(V21_SET) == V21_SHA, "v2.1 ranked set SHA mismatch"

    gold_keys = set()
    for line in open(GOLD, encoding="utf-8"):
        r = json.loads(line)
        gold_keys.add(f'{r["verse_key"]}#{r["word_index"]}')

    records = {}
    evidence: dict[str, list] = {}
    with open(V21_SET, encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            key = f'{rec["verse_key"]}#{rec["word_index"]}'
            for c in rec["equivalence_clusters"]:
                cc = compact_cluster(c)
                # global sibling-evidence index: non-echo analyses observed anywhere in the 1000-word set
                if not cc["flags"]["echo"] and cc["pos"] != "foreign":
                    ev_key = f'{cc["nlem"]}|{cc["pos"]}'
                    bucket = evidence.setdefault(ev_key, [])
                    if len(bucket) < 3 and key not in [b[0] for b in bucket]:
                        bucket.append([key, cc["lex"]])
                if key in gold_keys:
                    records.setdefault(key, {"clusters": []})["clusters"].append(cc)
            if key in gold_keys:
                r = records.setdefault(key, {"clusters": []})
                r.update({
                    "surface": rec["canonical_text"],
                    "conf": rec["confidence_class"],
                    "margin": rec["margin"],
                    "auto": rec["automatic_selection"],
                    "sel_sha": rec["selected_equivalence_key_sha256"],
                    "blocked": rec.get("selection_blocked_reason"),
                    "cluster_count": rec["candidate_count_after_grouping"],
                    "exact_has_analysis": rec["normalization"]["exact_has_analysis"],
                    "normalized_has_analysis": rec["normalization"]["normalized_has_analysis"],
                })

    assert len(records) == 200, f"expected 200 gold records, got {len(records)}"
    for r in records.values():
        r["clusters"].sort(key=lambda c: c["rank"])

    payload = {
        "schema_version": "camel-v2.2-gold200-cluster-cache-v1",
        "source_hashes": {"gold_review_package": GOLD_SHA, "v21_ranked_eval_set": V21_SHA},
        "records": {k: records[k] for k in sorted(records)},
        "evidence_index": {k: evidence[k] for k in sorted(evidence)},
    }
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, out_path)
    print(f"cache written: {out_path} records=200 evidence_keys={len(evidence)}")


if __name__ == "__main__":
    main()
