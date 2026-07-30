#!/usr/bin/env python3
"""Frozen holdout-200 vs legacy production morfolojisi — SILVER referans karşılaştırması.

Bu script hiçbir frozen artifact'i DEĞİŞTİRMEZ; tüm girdiler salt okunur açılır.
Legacy veri bağımsız uzman gold'u DEĞİLDİR: yalnız yardımcı (silver) kanıt üretir.
Silver etiketler holdout CORRECT/WRONG kararlarını ve promotion metriklerini
hiçbir koşulda değiştiremez.

Çıktılar (tümü yeni dosyalar, atomik ve deterministik):
- disambiguation-v2.3/holdout-legacy-silver.jsonl        (kayıt bazlı kompakt)
- reports/disambiguation-v2.3-legacy-silver.json         (özet metrikler)
- reports/disambiguation-v2.3-legacy-silver-determinism.json (girdi/çıktı SHA manifesti)
- reports/disambiguation-v2.3-legacy-silver-decision.md  (kısa karar raporu)

Kullanım: python compare-holdout-legacy-silver.py
"""
import hashlib
import importlib.util
import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
POC = ROOT / "scripts/morphology/camel-poc"
MORPH = ROOT / "data/candidates/morphology"
V23 = MORPH / "disambiguation-v2.3"
REPORTS = MORPH / "reports"
LEGACY_PATH = ROOT / "data2/processed/canonical_word_analysis_v4.json"
DATE = "2026-07-20"
LLP_INVERSION_DELTA = 2.0
PRIMARY_VARIANT = "v23_guard"

sys.path.insert(0, str(POC))
_spec = importlib.util.spec_from_file_location("legacy_cmp", POC / "compare-disambiguation-with-legacy.py")
legacy_cmp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(legacy_cmp)
common = legacy_cmp.common

INPUTS = {
    "eval1000_cache": V23 / "eval1000-cache.json",
    "ranked_eval_set_v2_3": V23 / "ranked-eval-set-v2_3.json",
    "eval_packages_manifest": V23 / "eval-packages-manifest.json",
    "holdout_adjudication": V23 / "holdout-adjudication.jsonl",
    "holdout_unbiased_200": V23 / "holdout-unbiased-200.jsonl",
    "function_word_guard": MORPH / "disambiguation-v2.2/function-word-guard-prototype.json",
    "legacy_snapshot": LEGACY_PATH,
}
OUTPUTS = {
    "silver_jsonl": V23 / "holdout-legacy-silver.jsonl",
    "summary_json": REPORTS / "disambiguation-v2.3-legacy-silver.json",
    "decision_md": REPORTS / "disambiguation-v2.3-legacy-silver-decision.md",
    "determinism_manifest": REPORTS / "disambiguation-v2.3-legacy-silver-determinism.json",
}


def atomic_write(path: Path, text: str) -> str:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def identity_sort(key: str):
    verse, word = key.split("#")
    surah, ayah = verse.split(":")
    return (int(surah), int(ayah), int(word))


def cluster_comparison(cluster: dict, legacy_word: dict) -> dict:
    candidate = {"root": cluster.get("root"), "lex": cluster.get("lex"),
                 "pos": cluster.get("pos"), **(cluster.get("feats") or {})}
    cmp = legacy_cmp.compare_candidate(candidate, legacy_word)
    cmp["n_core_matches"] = sum((cmp["root_match"], cmp["lemma_match"], cmp["pos_match"]))
    cmp["full_match"] = cmp["n_core_matches"] == 3
    return cmp


def main() -> None:
    input_shas = {name: common.sha256_file(path) for name, path in INPUTS.items()}

    cache = json.load(open(INPUTS["eval1000_cache"], encoding="utf-8"))["records"]
    v23 = json.load(open(INPUTS["ranked_eval_set_v2_3"], encoding="utf-8"))["records"]
    manifest = json.load(open(INPUTS["eval_packages_manifest"], encoding="utf-8"))
    holdout_keys = sorted(manifest["holdout_keys"], key=identity_sort)
    adj = {}
    for line in open(INPUTS["holdout_adjudication"], encoding="utf-8"):
        a = json.loads(line)
        adj[f'{a["verse_key"]}#{a["word_index"]}'] = a
    assert set(adj) == set(holdout_keys), "holdout adjudication anahtar kümesi paketle eşleşmiyor"
    guard_cfg = json.load(open(INPUTS["function_word_guard"], encoding="utf-8"))
    whitelist = {(w["lemma_normalized"], w["pos_raw"]) for w in guard_cfg["whitelist"]}
    closed_pos = set(guard_cfg["rule"]["closed_pos"])
    legacy = json.loads(LEGACY_PATH.read_text(encoding="utf-8-sig"))

    # --- Seçim mekaniği: evaluate-holdout.py ile birebir aynı (frozen mantık, salt okunur kopya) ---
    def guard_selection(rec_cache, ranking):
        if ranking["auto"] or not rec_cache["clusters"]:
            return None
        rank1_sha = next((s for s, r in ranking["ranks"].items() if r == 1), None)
        c = next((c for c in rec_cache["clusters"] if c["sha"] == rank1_sha), None)
        if c is None:
            return None
        f = c["flags"]
        if c["pos"] not in closed_pos or (c["nlem"], c["pos"]) not in whitelist:
            return None
        if not (f["exact_diac"] or f["exact_reconstruction"]):
            return None
        if f["abbrev"] or c["pos"] == "foreign":
            return None
        unique = rec_cache["cluster_count"] == 1
        if not unique and (ranking["margin"] is None or ranking["margin"] < 18):
            return None
        return rank1_sha

    def slices_of(key: str) -> list[str]:
        cl = cache[key]["clusters"]
        out = []
        if cl and cl[0]["llp"] is not None and any(
                c["rank"] > 5 and c["llp"] is not None and c["llp"] > cl[0]["llp"] + LLP_INVERSION_DELTA for c in cl):
            out.append("c3_suspect")
        if any((c["nlem"], c["pos"]) in whitelist for c in cl):
            out.append("function_word")
        if not out:
            out.append("random_control")
        return out

    selections: dict[str, dict[str, str | None]] = {}
    for key in holdout_keys:
        rec = cache[key]
        r21 = {"auto": rec["auto"], "margin": rec["margin"], "sel_sha": rec["sel_sha"],
               "ranks": {c["sha"]: c["rank"] for c in rec["clusters"]}}
        r23 = v23[key]
        g21 = guard_selection(rec, r21)
        g23 = guard_selection(rec, r23)
        selections[key] = {
            "v21": r21["sel_sha"] if r21["auto"] else None,
            "v21_guard": (r21["sel_sha"] if r21["auto"] else None) or g21,
            "v23": r23["sel_sha"] if r23["auto"] else None,
            "v23_guard": (r23["sel_sha"] if r23["auto"] else None) or g23,
        }

    variant_names = ("v21", "v21_guard", "v23", "v23_guard")
    records_out = []
    for key in holdout_keys:
        rec = cache[key]
        a = adj[key]
        verse_key, word_index = a["verse_key"], a["word_index"]
        uncertain = a["gold_decision"] == "uzman_incelemesi_gerekli"

        words = legacy.get(verse_key, [])
        idx = word_index - 1
        legacy_word = words[idx] if 0 <= idx < len(words) else None
        aligned = False
        align_fail = None
        if legacy_word is None:
            align_fail = "legacy_word_missing"
        elif legacy_word.get("position") != word_index:
            align_fail = "position_mismatch"
        elif common.strip_marks(legacy_word.get("arabic") or "") != common.strip_marks(a["canonical_text"]):
            align_fail = "arabic_token_mismatch"
        elif not (legacy_word.get("lemma") or legacy_word.get("root") or legacy_word.get("pos")):
            align_fail = "legacy_fields_empty"
        else:
            aligned = True

        cluster_cmps: dict[str, dict] = {}
        best_sha, best_cmp = None, None
        if aligned:
            for c in rec["clusters"]:
                cmp = cluster_comparison(c, legacy_word)
                cluster_cmps[c["sha"]] = cmp
                rank_of = {cc["sha"]: cc["rank"] for cc in rec["clusters"]}
                if best_cmp is None or (cmp["n_core_matches"], cmp["feature_matched"], -rank_of[c["sha"]]) > (
                        best_cmp["n_core_matches"], best_cmp["feature_matched"], -rank_of[best_sha]):
                    best_sha, best_cmp = c["sha"], cmp
        any_full = any(c["full_match"] for c in cluster_cmps.values())
        best_partial = best_cmp["n_core_matches"] if best_cmp else 0

        variant_classes = {}
        for name in variant_names:
            sel = selections[key][name]
            if not aligned:
                cls = "LEGACY_MISSING_OR_UNALIGNABLE"
            elif sel is not None and cluster_cmps.get(sel, {}).get("full_match"):
                cls = "LEGACY_SUPPORTS_SELECTED"
            elif any_full:
                cls = "LEGACY_SUPPORTS_ALTERNATIVE"
            elif best_partial >= 1:
                cls = "LEGACY_PARTIAL_MATCH"
            else:
                cls = "LEGACY_NOT_PRESENT_IN_CAMEL_CANDIDATES"
            variant_classes[name] = cls

        primary_class = variant_classes[PRIMARY_VARIANT]
        # Uyuşmazlık nedeni sınıflandırması (yalnız sinyal; kesin atama değil)
        if not aligned:
            cause = "unalignable"
        elif primary_class == "LEGACY_SUPPORTS_SELECTED":
            cause = "agreement"
        elif primary_class == "LEGACY_SUPPORTS_ALTERNATIVE":
            cause = "ranker" if selections[key][PRIMARY_VARIANT] is not None else "no_selection_alt_supported"
        else:
            legacy_pos_str = str(legacy_word.get("pos") or "")
            legacy_morph_str = str(legacy_word.get("morphology") or "")
            if "+" in legacy_pos_str:
                cause = "normalization_segmentation"
            elif not legacy_morph_str or not legacy_word.get("root"):
                cause = "legacy_provenance"
            elif primary_class == "LEGACY_NOT_PRESENT_IN_CAMEL_CANDIDATES":
                cause = "candidate_generation"
            else:
                cause = "INCONCLUSIVE"

        sel_primary = selections[key][PRIMARY_VARIANT]
        sel_cmp = cluster_cmps.get(sel_primary) if sel_primary else None
        records_out.append({
            "key": key,
            "verse_key": verse_key,
            "word_index": word_index,
            "canonical_text": a["canonical_text"],
            "gold_decision": a["gold_decision"],
            "uncertain": uncertain,
            "aligned": aligned,
            "alignment_failure": align_fail,
            "slices": slices_of(key),
            "legacy": None if legacy_word is None else {
                "lemma": legacy_word.get("lemma"),
                "root": legacy_word.get("root"),
                "pos": legacy_word.get("pos"),
                "role": legacy_word.get("role"),
                "morphology": legacy_word.get("morphology"),
            },
            "selections": selections[key],
            "variant_classes": variant_classes,
            "primary_variant": PRIMARY_VARIANT,
            "primary_class": primary_class,
            "mismatch_signal": cause,
            "selected_field_matches": None if sel_cmp is None else {
                "lemma": sel_cmp["lemma_match"], "root": sel_cmp["root_match"], "pos": sel_cmp["pos_match"],
                "features_matched": sel_cmp["feature_matched"], "features_compared": sel_cmp["feature_compared"],
            },
            "best_candidate": None if best_cmp is None else {
                "sha": best_sha,
                "lemma": best_cmp["lemma_match"], "root": best_cmp["root_match"], "pos": best_cmp["pos_match"],
                "n_core_matches": best_cmp["n_core_matches"], "full_match": best_cmp["full_match"],
            },
            "evidence_status": "provisional_silver_evidence" if primary_class == "LEGACY_SUPPORTS_SELECTED" else "not_supporting_evidence",
        })

    # --- Özet metrikler ---
    aligned_records = [r for r in records_out if r["aligned"]]
    unaligned_records = [r for r in records_out if not r["aligned"]]
    uncertain_records = [r for r in records_out if r["uncertain"]]

    def class_counts(records, variant):
        return dict(Counter(r["variant_classes"][variant] for r in records))

    def field_rates(records, variant):
        sel_recs = [r for r in records if r["aligned"] and r["selections"][variant] is not None]
        out = {"selections_aligned": len(sel_recs)}
        matched = {"lemma": 0, "root": 0, "pos": 0}
        fm = fc = 0
        for r in sel_recs:
            sel = r["selections"][variant]
            # selected_field_matches yalnız primary varyant için saklanır; yeniden hesapla
            cmp = None
            for c in cache[r["key"]]["clusters"]:
                if c["sha"] == sel:
                    lw = legacy.get(r["verse_key"], [])[r["word_index"] - 1]
                    cmp = cluster_comparison(c, lw)
                    break
            if cmp is None:
                continue
            for f, k in (("lemma", "lemma_match"), ("root", "root_match"), ("pos", "pos_match")):
                matched[f] += cmp[k]
            fm += cmp["feature_matched"]
            fc += cmp["feature_compared"]
        n = len(sel_recs)
        for f in ("lemma", "root", "pos"):
            out[f"{f}_match_percent"] = round(100 * matched[f] / n, 2) if n else None
        out["morphology_features_percent"] = round(100 * fm / fc, 2) if fc else None
        return out

    variant_summary = {}
    for name in variant_names:
        sel_recs = [r for r in records_out if r["selections"][name] is not None]
        cc = class_counts(sel_recs, name)
        variant_summary[name] = {
            "selections": len(sel_recs),
            "legacy_supports_selected": cc.get("LEGACY_SUPPORTS_SELECTED", 0),
            "legacy_supports_alternative": cc.get("LEGACY_SUPPORTS_ALTERNATIVE", 0),
            "legacy_partial_match": cc.get("LEGACY_PARTIAL_MATCH", 0),
            "legacy_not_in_camel_candidates": cc.get("LEGACY_NOT_PRESENT_IN_CAMEL_CANDIDATES", 0),
            "legacy_missing_or_unalignable": cc.get("LEGACY_MISSING_OR_UNALIGNABLE", 0),
            "field_rates_on_selected": field_rates(records_out, name),
        }

    bg1_added = [r for r in records_out if r["selections"]["v21_guard"] is not None and r["selections"]["v21"] is None]
    c3_records = [r for r in records_out if "c3_suspect" in r["slices"]]
    uncertain_classes = dict(Counter(r["primary_class"] for r in uncertain_records))
    uncertain_support = sum(1 for r in uncertain_records if r["primary_class"] in
                            ("LEGACY_SUPPORTS_SELECTED", "LEGACY_SUPPORTS_ALTERNATIVE"))

    summary = {
        "schema_version": "camel-v2.3-legacy-silver-v1",
        "date": DATE,
        "scope": ("frozen unbiased holdout-200 vs legacy production morfolojisi; SILVER referans — "
                  "insan gold'u değildir; holdout kararlarını ve promotion metriklerini değiştirmez"),
        "primary_variant": PRIMARY_VARIANT,
        "independence_note": ("Legacy snapshot (canonical_word_analysis_v4.json) corpus.quran.com kökenli "
                              "quran-morphology.txt türevi bir production baseline'dır; CAMeL lexicon'undan bağımsız "
                              "bir uzman kaynağı değildir ve provenance'ı tam denetlenmemiştir."),
        "alignment": {
            "aligned_records": len(aligned_records),
            "unaligned_records": len(unaligned_records),
            "unaligned_reasons": dict(Counter(r["alignment_failure"] for r in unaligned_records)),
        },
        "uncertain_139": {
            "total": len(uncertain_records),
            "classes": uncertain_classes,
            "with_legacy_support": uncertain_support,
        },
        "all_200_primary_classes": dict(Counter(r["primary_class"] for r in records_out)),
        "variants": variant_summary,
        "bg1_added_selections": {
            "count": len(bg1_added),
            "keys": [r["key"] for r in bg1_added],
            "classes_v21_guard": dict(Counter(r["variant_classes"]["v21_guard"] for r in bg1_added)),
        },
        "c3_suspect_slice": {
            "records": len(c3_records),
            "classes_primary": dict(Counter(r["primary_class"] for r in c3_records)),
            "uncertain_in_slice": sum(1 for r in c3_records if r["uncertain"]),
        },
        "mismatch_signals": dict(Counter(r["mismatch_signal"] for r in records_out)),
        "constraints": {
            "silver_labels_may_replace_gold": "HAYIR",
            "holdout_metrics_may_be_promoted": "HAYIR",
        },
    }

    jsonl_text = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
                         for r in records_out)
    summary_text = json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=1) + "\n"

    u = summary["uncertain_139"]["classes"]
    md = [
        "# V2.3 — Legacy Silver Referans Karşılaştırması (Karar Raporu)",
        "",
        f"Tarih: {DATE}. Kaynak: frozen holdout-200 + legacy production snapshot (salt okunur).",
        "Legacy veri **bağımsız uzman gold'u değildir**; yalnız provisional silver kanıttır.",
        "",
        "## Sonuç alanları",
        "",
        "- `LEGACY_SILVER_COMPARISON`: VALID",
        f"- `aligned_records`: {len(aligned_records)}",
        f"- `unaligned_records`: {len(unaligned_records)}",
        f"- `uncertain_with_legacy_support`: {uncertain_support} / {len(uncertain_records)}",
        f"- `legacy_supports_selected` (UNCERTAIN, {PRIMARY_VARIANT}): {u.get('LEGACY_SUPPORTS_SELECTED', 0)}",
        f"- `legacy_supports_alternative` (UNCERTAIN): {u.get('LEGACY_SUPPORTS_ALTERNATIVE', 0)}",
        f"- `legacy_partial_match` (UNCERTAIN): {u.get('LEGACY_PARTIAL_MATCH', 0)}",
        f"- `legacy_not_in_camel_candidates` (UNCERTAIN): {u.get('LEGACY_NOT_PRESENT_IN_CAMEL_CANDIDATES', 0)}",
        f"- `legacy_missing_or_unalignable` (UNCERTAIN): {u.get('LEGACY_MISSING_OR_UNALIGNABLE', 0)}",
        f"- `BG1_added_selections_legacy_support`: {summary['bg1_added_selections']['classes_v21_guard']}"
        f" (n={summary['bg1_added_selections']['count']})",
        f"- `C3_legacy_evidence`: {summary['c3_suspect_slice']['classes_primary']}"
        f" (n={summary['c3_suspect_slice']['records']}, uncertain={summary['c3_suspect_slice']['uncertain_in_slice']})",
        "- `silver_labels_may_replace_gold`: HAYIR",
        "- `holdout_metrics_may_be_promoted`: HAYIR",
        "",
        "## Varyant bazında legacy desteği (seçim yapılan kayıtlar)",
        "",
        "| Varyant | Seçim | Destekliyor | Alternatif | Kısmi | Aday listesinde yok | Hizalanamadı |",
        "|---|---|---|---|---|---|---|",
    ]
    label_tr = {"v21": "V2.1", "v21_guard": "V2.2 (V2.1+B-G1)", "v23": "V2.3", "v23_guard": "V2.3+B-G1"}
    for name in variant_names:
        v = variant_summary[name]
        md.append(f"| {label_tr[name]} | {v['selections']} | {v['legacy_supports_selected']} | "
                  f"{v['legacy_supports_alternative']} | {v['legacy_partial_match']} | "
                  f"{v['legacy_not_in_camel_candidates']} | {v['legacy_missing_or_unalignable']} |")
    fr = variant_summary[PRIMARY_VARIANT]["field_rates_on_selected"]
    md += [
        "",
        f"## Alan bazında uyuşma ({PRIMARY_VARIANT} seçimleri, n={fr['selections_aligned']})",
        "",
        f"- lemma: %{fr['lemma_match_percent']} | root: %{fr['root_match_percent']} | "
        f"POS: %{fr['pos_match_percent']} | morfoloji özellikleri: %{fr['morphology_features_percent']}",
        "",
        "## Sınırlamalar",
        "",
        "- Legacy snapshot quran-morphology.txt türevi bir production baseline'dır; bağımsızlığı sınırlıdır,",
        "  provenance'ı tam denetlenmemiştir ve segmentasyon/normalizasyon uzayı CAMeL'den farklıdır.",
        "- Silver sınıflar hiçbir holdout kararını CORRECT/WRONG'a çevirmez; promotion metriklerine karışmaz.",
        "- Uyuşmazlık sinyalleri (ranker/candidate_generation/normalization_segmentation/legacy_provenance)",
        "  heuristiktir; kesin olmayan durumlar INCONCLUSIVE bırakılmıştır.",
        "",
    ]
    md_text = "\n".join(md)

    shas = {
        "silver_jsonl": atomic_write(OUTPUTS["silver_jsonl"], jsonl_text),
        "summary_json": atomic_write(OUTPUTS["summary_json"], summary_text),
        "decision_md": atomic_write(OUTPUTS["decision_md"], md_text),
    }
    manifest_out = {
        "schema_version": "camel-v2.3-legacy-silver-determinism-v1",
        "date": DATE,
        "inputs_sha256": input_shas,
        "outputs_sha256": shas,
        "verification_method": "script iki kez çalıştırılır; üç çıktının SHA-256'ları birebir aynı olmalıdır",
        "frozen_files_modified": [],
    }
    shas["determinism_manifest"] = atomic_write(
        OUTPUTS["determinism_manifest"], json.dumps(manifest_out, ensure_ascii=False, sort_keys=True, indent=1) + "\n")
    print(json.dumps({"outputs_sha256": shas,
                      "aligned": len(aligned_records), "unaligned": len(unaligned_records),
                      "uncertain_with_legacy_support": uncertain_support,
                      "uncertain_classes": uncertain_classes}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
