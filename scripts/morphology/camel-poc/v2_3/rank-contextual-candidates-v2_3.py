#!/usr/bin/env python3
"""V2.3 ranker prototipi: v2.1 sıralaması + lexical_prior_guard (en dar değişiklik).

Tek değişiklik (C3 kök neden analizinde kanıtlanan): bir kayıtta leksikal kanıtı olan en az
bir cluster varken, hem leksikal önceli olmayan (lex_logprob<=-99 VE pos_lex_logprob<=-99)
hem de kesin yüzey kanıtı olmayan (exact_diac=false VE exact_reconstruction=false)
cluster'ların toplam skoruna NO_PRIOR_DEMOTION eklenir. Sonra v2.1 ile birebir aynı
sıralama anahtarı (-skor, sha), aynı sınıflandırma eşikleri (18/8/0), aynı echo/abbrev/
FOREIGN seçim kapısı uygulanır.

Değişmeyenler: margin eşikleri, diğer tüm kural puanları, CAMeL DB, candidate generator,
normalizasyon, supplemental lexicon, RULE_CONFLICT tanımı (frozen v2.1 bileşenlerinden).

Kullanım: python rank-contextual-candidates-v2_3.py [--check]
  --check: çıktıları yeniden üretir ve diskteki SHA-256 ile karşılaştırır (determinizm).
"""
import hashlib
import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
V23 = ROOT / "data/candidates/morphology/disambiguation-v2.3"
CACHE = V23 / "eval1000-cache.json"
RC_FLAGS = V23 / "rule-conflict-flags.json"
OUT_RANKED = V23 / "ranked-eval-set-v2_3.json"
OUT_CONFIG = V23 / "v2_3-config.json"

EXPECTED = {
    "cache": "1bd74cf12db57d4241a3c236ce9ab5b1102a4bcae42c10cd6ade39e3e3318abe",
    "rule_conflict_flags": "8b8be95235b41518d3960c9ba9ea6cff2537216c920383505ae60c6fe50ab078",
}

CONFIG = {
    "schema_version": "camel-v2.3-ranker-config-v1",
    "policy_version": "v2.3-prototype",
    "base": "frozen v2.1 cluster skorları (yeniden hesaplanmaz, ek bileşen uygulanır)",
    "rule": {
        "name": "lexical_prior_guard",
        "no_prior_demotion": -8,
        "applies_when": "kayıtta leksikal kanıtlı (llp>-99 veya pllp>-99) en az bir cluster varken",
        "demote_if": "cluster llp<=-99 VE pllp<=-99 VE exact_diac=false VE exact_reconstruction=false",
        "exemptions": ["exact_diac", "exact_reconstruction", "kayıtta hiç leksikal kanıtlı cluster yoksa"],
        "evidence_basis": "yalnız CAMeL'in kendi lex_logprob/pos_lex_logprob istatistiği; gold-türevi liste yok",
    },
    "unchanged": {
        "confidence_thresholds": {"top_tie_margin": 0, "high_confidence_min_margin": 18, "medium_confidence_min_margin": 8},
        "tie_break": "(-total_score, equivalence_key_sha256)",
        "selection_gate": "v2.1 ile birebir (echo/abbrev asla; FOREIGN/NTWS yalnız unique+exact)",
        "rule_conflict": "frozen v2.1 skor bileşenlerinden türetilen bayraklar (yeni bileşen dahil edilmez)",
        "margin_thresholds_modified": False,
        "camel_db_modified": False,
        "candidate_generator_modified": False,
        "normalization_modified": False,
        "supplemental_lexicon_used": False,
    },
    "development_scope": "gold-200 + targeted diagnostic-200; unbiased holdout etiketleri okunmadı",
}

NO_PRIOR = -99.0


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def is_demoted(c: dict) -> bool:
    llp = c["llp"] if c["llp"] is not None else NO_PRIOR
    pllp = c["pllp"] if c["pllp"] is not None else NO_PRIOR
    if llp > NO_PRIOR or pllp > NO_PRIOR:
        return False
    if c["flags"]["exact_diac"] or c["flags"]["exact_reconstruction"]:
        return False
    return True


def rank_record(rec: dict, conflicted: set) -> dict:
    clusters = rec["clusters"]
    if not clusters:
        return {"conf": "NO_ANALYSIS", "margin": None, "sel_sha": None, "auto": False,
                "blocked": None, "ranks": {}, "adjusted_scores": {}, "demoted": []}
    any_attested = any(not is_demoted(c) for c in clusters)
    scored = []
    demoted_shas = []
    for c in clusters:
        delta = CONFIG["rule"]["no_prior_demotion"] if (any_attested and is_demoted(c)) else 0
        if delta:
            demoted_shas.append(c["sha"])
        scored.append((c, c["score"] + delta))
    scored.sort(key=lambda t: (-t[1], t[0]["sha"]))
    top, top_score = scored[0]
    second = scored[1][1] if len(scored) > 1 else None
    margin = top_score - second if second is not None else None
    if all(c["flags"]["echo"] for c, _ in scored):
        conf = "NO_USABLE_ANALYSIS"
    elif top["flags"]["echo"]:
        conf = "ECHO_TOP_UNRESOLVED"
    elif len(scored) == 1:
        conf = "UNIQUE_EQUIVALENCE_CLUSTER"
    elif margin == 0:
        conf = "TOP_TIE"
    elif top["sha"] in conflicted:
        conf = "RULE_CONFLICT"
    elif margin >= 18:
        conf = "HIGH_CONFIDENCE"
    elif margin >= 8:
        conf = "MEDIUM_CONFIDENCE"
    else:
        conf = "LOW_CONFIDENCE"
    auto, sel, blocked = False, None, None
    if conf in ("UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"):
        f = top["flags"]
        if f["echo"]:
            blocked = "echo_top"
        elif f["abbrev"]:
            blocked = "abbrev_top_not_auto_selectable"
        elif f["foreign_ntws"] and len(scored) > 1:
            blocked = "foreign_ntws_top_with_alternative_clusters"
        elif f["foreign_ntws"] and not (f["exact_diac"] or f["exact_reconstruction"]):
            blocked = "foreign_ntws_unique_without_exact_evidence"
        else:
            auto, sel = True, top["sha"]
    return {
        "conf": conf, "margin": margin, "sel_sha": sel, "auto": auto, "blocked": blocked,
        "ranks": {c["sha"]: i + 1 for i, (c, _) in enumerate(scored)},
        "adjusted_scores": {c["sha"]: s for (c, s) in scored},
        "demoted": sorted(demoted_shas),
    }


def build() -> tuple[dict, dict]:
    for name, path in (("cache", CACHE), ("rule_conflict_flags", RC_FLAGS)):
        actual = sha256_file(path)
        assert actual == EXPECTED[name], f"{name} SHA mismatch: {actual}"
    cache = json.load(open(CACHE, encoding="utf-8"))
    rc = json.load(open(RC_FLAGS, encoding="utf-8"))["conflicted_cluster_shas_by_key"]
    records = {}
    for key in sorted(cache["records"]):
        records[key] = rank_record(cache["records"][key], set(rc.get(key, [])))
    counts = Counter(r["conf"] for r in records.values())
    auto_n = sum(r["auto"] for r in records.values())
    changed = sum(1 for key, r in records.items()
                  if [s for s, rk in sorted(r["ranks"].items(), key=lambda t: t[1])][:1] !=
                  [c["sha"] for c in cache["records"][key]["clusters"] if c["rank"] == 1])
    payload = {
        "schema_version": "camel-v2.3-ranked-eval-set-v1",
        "inputs": dict(EXPECTED),
        "config": CONFIG,
        "summary": {
            "words": len(records),
            "confidence_classes": {k: counts[k] for k in sorted(counts)},
            "automatic_selection_total": auto_n,
            "records_with_rank1_changed_vs_v21": changed,
            "records_with_any_demotion": sum(1 for r in records.values() if r["demoted"]),
        },
        "records": records,
    }
    return payload, dict(counts)


def main() -> None:
    check = "--check" in sys.argv[1:]
    payload, _ = build()
    texts = {
        OUT_RANKED: json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
        OUT_CONFIG: json.dumps(CONFIG, ensure_ascii=False, sort_keys=True, indent=1) + "\n",
    }
    if check:
        for path, text in texts.items():
            assert sha256_file(path) == hashlib.sha256(text.encode("utf-8")).hexdigest(), f"determinizm hatası: {path.name}"
        print("determinism_ok")
        return
    shas = {}
    for path, text in texts.items():
        tmp = path.with_suffix(path.suffix + ".tmp")
        with open(tmp, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        shas[path.name] = hashlib.sha256(text.encode("utf-8")).hexdigest()
    print(json.dumps({"summary": payload["summary"], "output_sha256": shas}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
