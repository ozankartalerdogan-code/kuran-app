#!/usr/bin/env python3
"""V2.3 ön-adımı: frozen V2.1 ranked-eval-set'in (salt okunur) 1000 kaydının tamamını
kompakt, deterministik cache'e çıkarır (lex_logprob dahil — C3 kök neden analizi için).

Kullanım: python extract-eval1000.py <cache-output.json>
"""
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
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


def main() -> None:
    out_path = Path(sys.argv[1])
    assert sha256_file(V21_SET) == V21_SHA, "v2.1 ranked set SHA mismatch"
    records = {}
    with open(V21_SET, encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            key = f'{rec["verse_key"]}#{rec["word_index"]}'
            clusters = []
            for c in rec["equivalence_clusters"]:
                ek = c["equivalence_key"]
                rep = c["representative"]
                bf = ek.get("basic_features", {})
                clusters.append({
                    "rank": c["rank"],
                    "sha": c["equivalence_key_sha256"],
                    "score": c["total_score"],
                    "root": rep.get("root", ""),
                    "lex": rep.get("lex", ""),
                    "nlem": ek.get("lemma_normalized", ""),
                    "pos": ek.get("pos_raw", ""),
                    "diac": ek.get("diac", ""),
                    "llp": rep.get("lex_logprob"),
                    "pllp": rep.get("pos_lex_logprob"),
                    "feats": {k: bf.get(k) for k in FEAT_KEYS if bf.get(k) not in (None, "0")},
                    "flags": {k: bool(c.get("representative_flags", {}).get(k)) for k in FLAG_KEYS},
                    "clitics": {k: rep[k] for k in ("prc0", "prc1", "prc1.5", "prc2", "prc3", "enc0", "enc1", "enc2")
                                if rep.get(k) not in ("0", 0, None, "")},
                })
            clusters.sort(key=lambda c: c["rank"])
            records[key] = {
                "surface": rec["canonical_text"],
                "ctx_before": " ".join(w["canonical_text"] for w in rec["context_before"]),
                "ctx_after": " ".join(w["canonical_text"] for w in rec["context_after"]),
                "conf": rec["confidence_class"],
                "margin": rec["margin"],
                "auto": rec["automatic_selection"],
                "sel_sha": rec["selected_equivalence_key_sha256"],
                "blocked": rec.get("selection_blocked_reason"),
                "cluster_count": rec["candidate_count_after_grouping"],
                "exact_has_analysis": rec["normalization"]["exact_has_analysis"],
                "clusters": clusters,
            }
    assert len(records) == 1000, f"expected 1000 records, got {len(records)}"
    payload = {
        "schema_version": "camel-v2.3-eval1000-cache-v1",
        "source_hash": V21_SHA,
        "records": {k: records[k] for k in sorted(records)},
    }
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, out_path)
    print(f"cache written: {out_path} records=1000")


if __name__ == "__main__":
    main()
