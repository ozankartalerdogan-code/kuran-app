#!/usr/bin/env python3
"""V2.3 frozen değerlendirme paketleri: unbiased holdout (200) + targeted diagnostic (200).

Kaynak: frozen eval-1000 cache (v2.1 ranked setten türetilmiş, salt okunur).
Gold-200 anahtarları her iki paketten deterministik olarak dışlanır; iki paket ayrıktır.

Örnekleme (tamamı deterministik, etiket/karar okunmaz):
- Holdout: kalan 800 kayıttan v2.1 confidence sınıfına göre tabakalı, largest-remainder
  kota; tabaka içinde sha256("v23-holdout|" + key) sırası. Temsilîlik amaçlıdır;
  confidence sınıfı yalnız tabakalama anahtarı olarak kullanılır, pakete yazılmaz.
- Diagnostic: holdout sonrası kalan 600 kayıttan öncelik sırasıyla kategori kotaları:
  c3_suspect 80 (lexical-prior inversiyonu: rank>5 bir cluster'ın lex_logprob'u
  rank-1'inkinden +2'den fazla), function_word 40 (herhangi bir cluster
  (lemma_normalized, pos_raw) B-G1 whitelist'inde), normalization_suspect 40
  (exact_has_analysis == false), random_control 40 (+ eksik kota devri).
  Kategori içinde sha256("v23-diag|" + kategori + "|" + key) sırası.

Paket kayıtları kördür: rank, skor, margin, lex_logprob, confidence sınıfı, v2.1/v2.2
seçimi ve blocked bilgisi pakete YAZILMAZ. Cluster'lar (nlem, pos, diac, sha) ile
sıralanır (skor türevi değildir). Kategori eşlemesi yalnız manifest'te tutulur.

Kullanım: python build-eval-packages.py [--check]
  --check: mevcut paket dosyalarını yeniden üretip SHA eşitliğini doğrular (determinizm).
"""
import hashlib
import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MORPH = ROOT / "data/candidates/morphology"
V23 = MORPH / "disambiguation-v2.3"
CACHE = V23 / "eval1000-cache.json"
GOLD = MORPH / "gold-adjudication/adjudicated-gold-v1.jsonl"
GUARD = MORPH / "disambiguation-v2.2/function-word-guard-prototype.json"

EXPECTED = {
    "cache": "1bd74cf12db57d4241a3c236ce9ab5b1102a4bcae42c10cd6ade39e3e3318abe",
    "gold": "41f1cc71c3ef1a6f94ae08858c7dfede70a44fec3ea5323b0a4bd9030859a870",
    "guard": "94c7f11c7d979bb6d073e1edd80be40cbddc5b297cd49275f9d256769df228c7",
}

HOLDOUT_N = 200
DIAG_QUOTAS = (("c3_suspect", 80), ("function_word", 40), ("normalization_suspect", 40), ("random_control", 40))
LLP_INVERSION_DELTA = 2.0


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def hkey(salt: str, key: str) -> str:
    return hashlib.sha256(f"{salt}|{key}".encode("utf-8")).hexdigest()


def atomic_write_text(path: Path, text: str) -> str:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def largest_remainder(counts: dict[str, int], total_target: int) -> dict[str, int]:
    total = sum(counts.values())
    exact = {k: counts[k] * total_target / total for k in counts}
    base = {k: int(exact[k]) for k in counts}
    left = total_target - sum(base.values())
    order = sorted(counts, key=lambda k: (-(exact[k] - base[k]), k))
    for k in order[:left]:
        base[k] += 1
    return base


def blind_record(key: str, rec: dict) -> dict:
    verse_key, word_index = key.split("#")
    clusters = sorted(rec["clusters"], key=lambda c: (c["nlem"], c["pos"], c["diac"], c["sha"]))
    return {
        "verse_key": verse_key,
        "word_index": int(word_index),
        "canonical_text": rec["surface"],
        "context_before": rec["ctx_before"],
        "context_after": rec["ctx_after"],
        "exact_has_analysis": rec["exact_has_analysis"],
        "labeled_cluster_scope": "tam equivalence cluster listesi (v2.1 cluster uzayı)",
        "clusters": [{
            "sha": c["sha"], "lex": c["lex"], "nlem": c["nlem"], "root": c["root"],
            "pos": c["pos"], "diac": c["diac"], "feats": c["feats"], "clitics": c["clitics"],
            "abbrev": c["flags"]["abbrev"],
        } for c in clusters],
    }


def build() -> tuple[list[dict], list[dict], dict]:
    for name, path in (("cache", CACHE), ("gold", GOLD), ("guard", GUARD)):
        actual = sha256_file(path)
        assert actual == EXPECTED[name], f"{name} SHA mismatch: {actual}"
    cache = json.load(open(CACHE, encoding="utf-8"))
    records = cache["records"]
    gold_keys = set()
    for line in open(GOLD, encoding="utf-8"):
        a = json.loads(line)
        gold_keys.add(f'{a["verse_key"]}#{a["word_index"]}')
    assert len(gold_keys) == 200
    rest = sorted(k for k in records if k not in gold_keys)
    assert len(rest) == 800

    # --- Holdout: tabakalı temsilî örneklem ---
    strata: dict[str, list[str]] = {}
    for k in rest:
        strata.setdefault(records[k]["conf"], []).append(k)
    quotas = largest_remainder({s: len(v) for s, v in strata.items()}, HOLDOUT_N)
    holdout: list[str] = []
    for s in sorted(strata):
        chosen = sorted(strata[s], key=lambda k: hkey("v23-holdout", k))[: quotas[s]]
        holdout.extend(chosen)
    holdout_set = set(holdout)
    assert len(holdout_set) == HOLDOUT_N

    # --- Diagnostic: kategori kotaları ---
    guard = json.load(open(GUARD, encoding="utf-8"))
    whitelist = {(w["lemma_normalized"], w["pos_raw"]) for w in guard["whitelist"]}
    pool = [k for k in rest if k not in holdout_set]
    assert len(pool) == 600

    def is_c3_suspect(rec: dict) -> bool:
        cl = rec["clusters"]
        if not cl or cl[0]["llp"] is None:
            return False
        top = cl[0]["llp"]
        return any(c["rank"] > 5 and c["llp"] is not None and c["llp"] > top + LLP_INVERSION_DELTA for c in cl)

    def is_function_word(rec: dict) -> bool:
        return any((c["nlem"], c["pos"]) in whitelist for c in rec["clusters"])

    def category_pool(cat: str) -> list[str]:
        if cat == "c3_suspect":
            return [k for k in pool if is_c3_suspect(records[k])]
        if cat == "function_word":
            return [k for k in pool if is_function_word(records[k])]
        if cat == "normalization_suspect":
            return [k for k in pool if not records[k]["exact_has_analysis"]]
        return list(pool)

    diag: list[str] = []
    category_map: dict[str, str] = {}
    taken: set[str] = set()
    carry = 0
    for cat, quota in DIAG_QUOTAS:
        want = quota + carry
        eligible = [k for k in category_pool(cat) if k not in taken]
        chosen = sorted(eligible, key=lambda k: hkey(f"v23-diag|{cat}", k))[:want]
        carry = want - len(chosen)
        for k in chosen:
            category_map[k] = cat
        taken.update(chosen)
        diag.extend(chosen)
    assert carry == 0, f"diagnostic kota doldurulamadı: {carry} eksik"
    assert len(diag) == 200 and not (set(diag) & holdout_set) and not (set(diag) & gold_keys)

    def sort_key(k: str):
        v, w = k.split("#")
        s, a = v.split(":")
        return (int(s), int(a), int(w))

    holdout_rows = [blind_record(k, records[k]) for k in sorted(holdout_set, key=sort_key)]
    diag_rows = [blind_record(k, records[k]) for k in sorted(diag, key=sort_key)]

    manifest = {
        "schema_version": "camel-v2.3-eval-packages-manifest-v1",
        "inputs": {
            "eval1000_cache_sha256": EXPECTED["cache"],
            "adjudicated_gold_v1_sha256": EXPECTED["gold"],
            "function_word_guard_sha256": EXPECTED["guard"],
            "v21_ranked_set_sha256": cache["source_hash"],
        },
        "sampling": {
            "universe": "frozen eval-1000 eksi gold-200 (800 kayıt); paketler ayrık",
            "holdout": {"n": HOLDOUT_N, "method": "v2.1 confidence sınıfına göre tabakalı largest-remainder; tabaka içi sha256('v23-holdout|'+key) sırası", "strata_quotas": {k: quotas[k] for k in sorted(quotas)}},
            "diagnostic": {"n": 200, "priority_quotas": [list(q) for q in DIAG_QUOTAS],
                           "definitions": {
                               "c3_suspect": f"rank>5 cluster lex_logprob > rank-1 lex_logprob + {LLP_INVERSION_DELTA}",
                               "function_word": "herhangi bir cluster (lemma_normalized,pos_raw) B-G1 whitelist'inde",
                               "normalization_suspect": "exact_has_analysis == false",
                               "random_control": "kalan havuzdan hash sırası"},
                           "category_counts": dict(sorted(Counter(category_map.values()).items()))},
            "blindness": "paket kayıtlarında rank/skor/margin/lex_logprob/confidence/v2.1-v2.2 seçimi yok; cluster sırası (nlem,pos,diac,sha)",
            "labels_read_during_sampling": False,
        },
        "diagnostic_category_map": {k: category_map[k] for k in sorted(category_map, key=sort_key)},
        "holdout_keys": [f'{r["verse_key"]}#{r["word_index"]}' for r in holdout_rows],
        "diagnostic_keys": [f'{r["verse_key"]}#{r["word_index"]}' for r in diag_rows],
    }
    return holdout_rows, diag_rows, manifest


def jsonl(rows: list[dict]) -> str:
    return "".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n" for r in rows)


def main() -> None:
    check = "--check" in sys.argv[1:]
    holdout_rows, diag_rows, manifest = build()
    out_holdout = V23 / "holdout-unbiased-200.jsonl"
    out_diag = V23 / "diagnostic-targeted-200.jsonl"
    out_manifest = V23 / "eval-packages-manifest.json"
    texts = {
        out_holdout: jsonl(holdout_rows),
        out_diag: jsonl(diag_rows),
    }
    manifest["package_sha256"] = {
        "holdout-unbiased-200.jsonl": hashlib.sha256(texts[out_holdout].encode("utf-8")).hexdigest(),
        "diagnostic-targeted-200.jsonl": hashlib.sha256(texts[out_diag].encode("utf-8")).hexdigest(),
    }
    texts[out_manifest] = json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=1) + "\n"
    if check:
        for path, text in texts.items():
            actual = sha256_file(path)
            expected = hashlib.sha256(text.encode("utf-8")).hexdigest()
            assert actual == expected, f"determinizm hatası: {path.name}"
        print("determinism_ok " + json.dumps(manifest["package_sha256"]))
        return
    for path, text in texts.items():
        atomic_write_text(path, text)
    print(json.dumps({"holdout": len(holdout_rows), "diagnostic": len(diag_rows),
                      "category_counts": manifest["sampling"]["diagnostic"]["category_counts"],
                      "package_sha256": manifest["package_sha256"]}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
