#!/usr/bin/env python3
"""V2.6: hemze/rasm on-adimi cluster'lari aday havuzunda KALIR, otomatik secime KAPALIDIR.

V2.5 ile fark: V2.5 on-adim cluster'larini ranker'a besliyor ve secim kapisina sokuyordu
(2 yeni false-positive). V2.6'da secim katmani V2.3 cluster kumesi uzerinde birebir
calisir; on-adimdan gelen cluster'lar yalniz havuza `auto_eligible=False` olarak eklenir.

Boylece:
  - mevcut CAMeL adaylari ve secim davranisi degismez (parite kapisi ile kanitlanir),
  - ek cluster'lar insan incelemesi/downstream recall icin havuzda tutulur.

Kapsam: gold-200 + targeted diagnostic-200 (400 kayit). Unbiased holdout OKUNMAZ.
Frozen dosyalar, ranker agirliklari, marginler, lexicon ve production verisi DEGISTIRILMEZ.

Kullanim (CAMeL venv python'u ile):
  data/candidates/morphology/camel-morph-msa-v1.0/.venv/Scripts/python.exe \
    scripts/morphology/camel-poc/v2_6/candidate-enrichment-eval-v2_6.py
"""
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
POC = ROOT / "scripts/morphology/camel-poc"
MORPH = ROOT / "data/candidates/morphology"
V23 = MORPH / "disambiguation-v2.3"
V26 = MORPH / "disambiguation-v2.6"
REPORTS = MORPH / "reports"


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


# V2.5 prototipi yalniz yardimci fonksiyon kaynagi olarak kullanilir (main() calismaz).
v25 = _load("candidate_prestep_eval_v2_5", POC / "v2_5/candidate-prestep-eval-v2_5.py")
common = sys.modules["disambiguation_common"]
prestep = sys.modules["hamza_rasm_prestep_prototype"]
v21_ranker = sys.modules["rank_contextual_candidates_v2_1"]

select = v25.select
expand_target = v25.expand_target
atomic_write = v25.atomic_write
sha256_file = v25.sha256_file


def main() -> None:
    labels = v25.load_labels()
    frozen_v23 = json.load(open(V23 / "ranked-eval-set-v2_3.json", encoding="utf-8"))["records"]
    v21_set = MORPH / "disambiguation-v2.1/ranked-eval-set.jsonl"
    eval_records = {f'{r["verse_key"]}#{r["word_index"]}': r for r in common.read_jsonl(v21_set)}
    dev_keys = sorted(labels, key=lambda k: (int(k.split(":")[0]),
                                             int(k.split(":")[1].split("#")[0]), int(k.split("#")[1])))
    missing = [k for k in dev_keys if k not in eval_records]
    if missing:
        raise ValueError(f"eval-set icinde bulunamayan dev anahtari: {missing[:3]}")

    manifest = json.load(open(common.RUN_MANIFEST, encoding="utf-8"))
    shard_by_surah = {entry["surah"]: entry for entry in manifest["shards"]}
    analyzer = common.load_camel_analyzer()

    by_surah: dict[int, list[str]] = {}
    for key in dev_keys:
        by_surah.setdefault(int(key.split(":", 1)[0]), []).append(key)

    import gzip
    rows = []
    for surah in sorted(by_surah):
        required = set()
        for key in by_surah[surah]:
            record = eval_records[key]
            required.add(common.identity(record))
            required.update(common.identity(i) for i in
                            record["context_before"][-3:] + record["context_after"][:3])
        loaded = {}
        with gzip.open(common.FULL_DIR / shard_by_surah[surah]["filename"], "rt",
                       encoding="utf-8", newline="") as handle:
            for line in handle:
                item = json.loads(line)
                identity = common.identity(item)
                if identity in required:
                    loaded[identity] = item
        for key in by_surah[surah]:
            record = eval_records[key]
            target = loaded[common.identity(record)]
            before = [loaded.get(common.identity(i)) for i in record["context_before"][-3:]]
            after = [loaded.get(common.identity(i)) for i in record["context_after"][:3]]
            neighbors = [None] * (3 - len(before)) + before + after + [None] * (3 - len(after))

            # --- Secim katmani: V2.3 cluster kumesi, hicbir on-adim girdisi olmadan. ---
            base_clusters = (v21_ranker.group_candidates(target, neighbors)
                             if target["candidate_count_unique"] else [])
            decision = select(base_clusters)
            base_shas = {c["equivalence_key_sha256"] for c in base_clusters}

            # --- Havuz katmani: on-adim cluster'lari eklenir, auto_eligible=False. ---
            expanded, added = expand_target(target, analyzer)
            pool_clusters = (v21_ranker.group_candidates(expanded, neighbors)
                             if added else base_clusters)
            enrichment_shas = sorted({c["equivalence_key_sha256"] for c in pool_clusters} - base_shas)
            # On-adim adayi mevcut bir cluster'a katilip skorunu degistirmis olabilir; bu gorunum
            # yalniz havuzda kalir, secim katmanina hic ulasmaz.
            base_by_sha = {c["equivalence_key_sha256"]: c for c in base_clusters}
            merged = sorted(sha for sha, c in
                            ((c["equivalence_key_sha256"], c) for c in pool_clusters)
                            if sha in base_by_sha and c["total_score"] != base_by_sha[sha]["total_score"])

            sel = decision["sel_sha"] if decision["auto"] else None
            frozen = frozen_v23[key]
            rows.append({
                "key": key,
                "affected": bool(added),
                "new_candidates": added,
                "clusters_auto_eligible": len(base_clusters),
                "clusters_pool_total": len(pool_clusters),
                "enrichment_only_clusters": len(enrichment_shas),
                "enrichment_only_shas": enrichment_shas,
                "merged_into_existing_cluster": len(merged),
                "sel_v23": frozen["sel_sha"] if frozen["auto"] else None,
                "sel_v26": sel,
                "conf_v23": frozen.get("conf"),
                "conf_v26": decision["conf"],
                "auto_eligible_only": True,
                "recomputed_matches_frozen": sel == (frozen["sel_sha"] if frozen["auto"] else None),
            })

    parity_failures = [r["key"] for r in rows if not r["recomputed_matches_frozen"]]
    if parity_failures:
        raise SystemExit(f"V2.3 parite kapisi BASARISIZ ({len(parity_failures)} kayit): "
                         f"{parity_failures[:5]} — karsilastirma gecersiz")

    def verdict(sel, lab):
        if sel is None:
            return None
        if lab["expert"]:
            return "indeterminate"
        return "correct" if sel in lab["acc"] else "wrong"

    j23, j26 = Counter(), Counter()
    selection_changes, lost_correct, new_false_positives, gains = [], [], [], []
    # On-adim havuzunun gercek recall degeri: gold'un kabul ettigi sha yalniz
    # enrichment cluster'larinda mi bulunuyor?
    gold_only_in_enrichment = []
    for r in rows:
        lab = labels[r["key"]]
        v23, v26 = verdict(r["sel_v23"], lab), verdict(r["sel_v26"], lab)
        if v23:
            j23[v23] += 1
        if v26:
            j26[v26] += 1
        if r["sel_v23"] != r["sel_v26"]:
            selection_changes.append(r["key"])
            if v23 == "correct" and v26 != "correct":
                lost_correct.append(r["key"])
            if v26 == "wrong" and v23 != "wrong":
                new_false_positives.append(r["key"])
            if v23 != "correct" and v26 == "correct":
                gains.append(r["key"])
        if lab["acc"] & set(r["enrichment_only_shas"]):
            gold_only_in_enrichment.append(r["key"])
    regressions = sorted(set(lost_correct) | set(new_false_positives))

    affected = [r for r in rows if r["affected"]]
    total_auto = sum(r["clusters_auto_eligible"] for r in rows)
    total_pool = sum(r["clusters_pool_total"] for r in rows)

    def summarize(j):
        meas = j["correct"] + j["wrong"]
        return {"selections": j["correct"] + j["wrong"] + j["indeterminate"], "correct": j["correct"],
                "wrong": j["wrong"], "indeterminate": j["indeterminate"],
                "precision_measurable": round(j["correct"] / meas, 4) if meas else None}

    # V2.5'te false-positive ureten iki kayit artik notr olmali.
    v25_fp_keys = ["40:53#2", "53:13#2"]
    v25_fp_neutralized = {k: (next(r for r in rows if r["key"] == k)["sel_v23"]
                              == next(r for r in rows if r["key"] == k)["sel_v26"])
                          for k in v25_fp_keys if any(r["key"] == k for r in rows)}

    valid = (not regressions and not selection_changes
             and all(v25_fp_neutralized.values()))

    summary = {
        "schema_version": "camel-v2.6-candidate-enrichment-eval-v1",
        "scope": "gold-200 + targeted diagnostic-200 (400 kayit); unbiased holdout OKUNMADI",
        "design": "on-adim cluster'lari havuzda tutulur (auto_eligible=False); "
                  "secim katmani V2.3 cluster kumesi uzerinde degismeden calisir",
        "v23_parity_gate": {"records": len(rows), "mismatches": 0,
                            "note": "V2.6 secimleri frozen ranked-eval-set-v2_3.json ile birebir"},
        "tokens_total": len(rows),
        "tokens_affected_by_prestep": len(affected),
        "new_candidates_total": sum(r["new_candidates"] for r in rows),
        "clusters_auto_eligible_total": total_auto,
        "clusters_pool_total": total_pool,
        "enrichment_only_clusters_total": sum(r["enrichment_only_clusters"] for r in rows),
        "merged_into_existing_cluster_total": sum(r["merged_into_existing_cluster"] for r in rows),
        "pool_growth_ratio": round(total_pool / total_auto, 4) if total_auto else None,
        "auto_eligible_growth_ratio": 1.0,
        "selection_changes": len(selection_changes),
        "selection_change_keys": selection_changes,
        "gains_wrong_or_none_to_correct": len(gains),
        "regressions_total": len(regressions),
        "regressions_lost_correct": len(lost_correct),
        "regressions_new_false_positives": len(new_false_positives),
        "regression_keys": regressions,
        "gold_accepted_reachable_only_via_enrichment": len(gold_only_in_enrichment),
        "gold_accepted_reachable_only_via_enrichment_keys": gold_only_in_enrichment,
        "v2_5_false_positive_keys_neutralized": v25_fp_neutralized,
        "v23": summarize(j23), "v26": summarize(j26),
        "decision": "SAFE_CANDIDATE_ENRICHMENT: VALID" if valid else "SAFE_CANDIDATE_ENRICHMENT: INVALID",
        "constraints": {"canonical_token_modified": "HAYIR", "frozen_files_modified": "HAYIR",
                        "ranker_rules_modified": "HAYIR", "margin_modified": "HAYIR",
                        "lexicon_modified": "HAYIR", "production_data_modified": "HAYIR",
                        "holdout_read": "HAYIR", "full_77429_run": "HAYIR"},
    }

    jsonl_text = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
                         for r in rows)
    shas = {
        "jsonl": atomic_write(V26 / "candidate-enrichment-eval-v2_6.jsonl", jsonl_text),
        "summary": atomic_write(REPORTS / "disambiguation-v2.6-candidate-enrichment.json",
                                json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=1) + "\n"),
    }
    print(json.dumps({"summary": summary, "output_sha256": shas}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
