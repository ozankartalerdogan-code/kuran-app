#!/usr/bin/env python3
"""Kör adjudication taslak kararlarını (selector formatı) frozen adjudication JSONL'e çevirir.

Selector alanları: lex (zorunlu değil ama pratikte hep var), pos, diac (opsiyonel),
feats (alt küme eşleşmesi), cl_excl (klitik değeri bu öneklerden biriyle başlıyorsa cluster reddedilir).
Karar d: ok -> dogru_aday, multi -> birden_fazla_kabul_edilebilir, yok -> gecerli_aday_yok,
uzman -> uzman_incelemesi_gerekli.

Kullanım: python finalize-adjudication.py <package.jsonl> <draft1.json> [draft2.json ...] --out <output.jsonl>
"""
import hashlib
import json
import os
import sys
import unicodedata

DATE = "2026-07-20"


def norm(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def match(cluster: dict, sel: dict) -> bool:
    if "lex" in sel and norm(cluster["lex"]) != norm(sel["lex"]):
        return False
    if "pos" in sel and cluster["pos"] != sel["pos"]:
        return False
    if "diac" in sel and norm(cluster["diac"]) != norm(sel["diac"]):
        return False
    for k, v in sel.get("feats", {}).items():
        if str(cluster["feats"].get(k)) != str(v):
            return False
    for cv in cluster["clitics"].values():
        if any(str(cv).startswith(pref) for pref in sel.get("cl_excl", [])):
            return False
    return True


def main() -> None:
    args = sys.argv[1:]
    out_idx = args.index("--out")
    out_path = args[out_idx + 1]
    package_path, draft_paths = args[0], args[1:out_idx]

    records = {}
    for line in open(package_path, encoding="utf-8"):
        r = json.loads(line)
        records[f'{r["verse_key"]}#{r["word_index"]}'] = r

    decisions: dict[str, dict] = {}
    for dp in draft_paths:
        d = json.load(open(dp, encoding="utf-8"))
        for k, v in d.items():
            assert k not in decisions, f"çift karar: {k}"
            decisions[k] = v
    missing = set(records) - set(decisions)
    extra = set(decisions) - set(records)
    assert not missing and not extra, f"eksik={sorted(missing)[:5]} fazla={sorted(extra)[:5]}"

    label = {"ok": "dogru_aday", "multi": "birden_fazla_kabul_edilebilir",
             "yok": "gecerli_aday_yok", "uzman": "uzman_incelemesi_gerekli"}
    rows = []
    problems = []
    for key in sorted(records, key=lambda k: (int(k.split(":")[0]), int(k.split(":")[1].split("#")[0]), int(k.split("#")[1]))):
        rec, dec = records[key], decisions[key]
        accepted = []
        if dec["d"] in ("ok", "multi"):
            for c in rec["clusters"]:
                if any(match(c, s) for s in dec["sel"]):
                    accepted.append(c["sha"])
            if not accepted:
                problems.append(f"{key}: selector hiç cluster eşlemedi")
        rows.append({
            "verse_key": rec["verse_key"],
            "word_index": rec["word_index"],
            "canonical_text": rec["canonical_text"],
            "gold_decision": label[dec["d"]],
            "accepted_equivalence_key_sha256s": sorted(set(accepted)),
            "rationale": dec["r"],
            "expected_reading": dec.get("exp"),
            "labeled_cluster_scope": rec["labeled_cluster_scope"],
            "adjudication": {
                "adjudicator": "claude-fable-5 (LLM); ilahiyat uzmanı onayı değildir",
                "date": DATE,
                "method": "bağımsız, kör (rank/skor/margin/lex_logprob/v2.1-v2.2 seçimi gizlendi; cluster sırası (nlem,pos,diac,sha))",
            },
        })
    if problems:
        print(json.dumps(problems, ensure_ascii=False, indent=1))
        sys.exit(1)
    text = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n" for r in rows)
    tmp = out_path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, out_path)
    from collections import Counter
    counts = Counter(r["gold_decision"] for r in rows)
    multi_expansion = sum(1 for r in rows if len(r["accepted_equivalence_key_sha256s"]) > 1)
    print(json.dumps({"records": len(rows), "decisions": dict(sorted(counts.items())),
                      "multi_sha_records": multi_expansion,
                      "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
