#!/usr/bin/env python3
"""Unbiased holdout-200 değerlendirmesi — 4 varyant: V2.1, V2.1+B-G1, V2.3, V2.3+B-G1.

Bu script freeze manifestinden ÖNCE yazılır ve hash'lenir; holdout adjudication dosyası
ancak freeze sonrasında üretilir ve bu script değiştirilemez.

Dilimler (etiketten bağımsız, deterministik tanımlar):
- c3_suspect: rank>5 bir cluster'ın lex_logprob'u rank-1'inkinden +2'den fazla (v2.1 sıralaması)
- function_word: herhangi bir cluster (lemma_normalized, pos_raw) B-G1 whitelist'inde
- random_control: yukarıdakilerin hiçbiri
Bir kayıt c3_suspect ve function_word'e aynı anda girebilir.

Kullanım: python evaluate-holdout.py
"""
import hashlib
import json
import math
import os
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MORPH = ROOT / "data/candidates/morphology"
V23 = MORPH / "disambiguation-v2.3"
REPORTS = MORPH / "reports"
DATE = "2026-07-20"
MARGIN_CUTS = (18, 21, 24, 30)
LLP_INVERSION_DELTA = 2.0


def atomic_write(path: Path, text: str) -> str:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def wilson(correct: int, total: int, z: float = 1.96):
    if total == 0:
        return None
    p = correct / total
    denom = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / denom
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denom
    return [round(centre - half, 4), round(centre + half, 4)]


def load_adj(path: Path) -> dict:
    out = {}
    for line in open(path, encoding="utf-8"):
        a = json.loads(line)
        out[f'{a["verse_key"]}#{a["word_index"]}'] = a
    return out


def main() -> None:
    cache = json.load(open(V23 / "eval1000-cache.json", encoding="utf-8"))["records"]
    v23 = json.load(open(V23 / "ranked-eval-set-v2_3.json", encoding="utf-8"))["records"]
    manifest = json.load(open(V23 / "eval-packages-manifest.json", encoding="utf-8"))
    holdout_keys = manifest["holdout_keys"]
    adj = load_adj(V23 / "holdout-adjudication.jsonl")
    assert set(adj) == set(holdout_keys), "holdout adjudication anahtar kümesi paketle eşleşmiyor"
    guard_cfg = json.load(open(MORPH / "disambiguation-v2.2/function-word-guard-prototype.json", encoding="utf-8"))
    whitelist = {(w["lemma_normalized"], w["pos_raw"]) for w in guard_cfg["whitelist"]}
    closed_pos = set(guard_cfg["rule"]["closed_pos"])

    labels = {}
    for key, a in adj.items():
        labels[key] = {"acc": set(a["accepted_equivalence_key_sha256s"]),
                       "expert": a["gold_decision"] == "uzman_incelemesi_gerekli"}

    def slices_of(key: str) -> list[str]:
        rec = cache[key]
        cl = rec["clusters"]
        out = []
        if cl and cl[0]["llp"] is not None and any(
                c["rank"] > 5 and c["llp"] is not None and c["llp"] > cl[0]["llp"] + LLP_INVERSION_DELTA for c in cl):
            out.append("c3_suspect")
        if any((c["nlem"], c["pos"]) in whitelist for c in cl):
            out.append("function_word")
        if not out:
            out.append("random_control")
        return out

    def v21_ranking(rec):
        return {"auto": rec["auto"], "margin": rec["margin"], "sel_sha": rec["sel_sha"],
                "conf": rec["conf"],
                "ranks": {c["sha"]: c["rank"] for c in rec["clusters"]}}

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

    variants = {}
    for key in holdout_keys:
        rec = cache[key]
        r21 = v21_ranking(rec)
        r23 = dict(v23[key])
        r23["conf"] = v23[key]["conf"]
        variants.setdefault("v21", {})[key] = (r21, r21["sel_sha"] if r21["auto"] else None, None)
        g21 = guard_selection(rec, r21)
        variants.setdefault("v21_guard", {})[key] = (r21, (r21["sel_sha"] if r21["auto"] else None) or g21, "guard" if (g21 and not r21["auto"]) else None)
        variants.setdefault("v23", {})[key] = (r23, r23["sel_sha"] if r23["auto"] else None, None)
        g23 = guard_selection(rec, r23)
        variants.setdefault("v23_guard", {})[key] = (r23, (r23["sel_sha"] if r23["auto"] else None) or g23, "guard" if (g23 and not r23["auto"]) else None)

    baseline_sel = {k: sel for k, (_, sel, _) in variants["v21"].items()}
    result = {}
    for name, data in variants.items():
        j = Counter()
        by_class = {"HIGH_CONFIDENCE": Counter(), "UNIQUE_EQUIVALENCE_CLUSTER": Counter(), "guard_addition": Counter()}
        margin_rows = []
        slice_stats = {s: Counter() for s in ("c3_suspect", "function_word", "random_control")}
        new_fp, regressed_prev_correct = [], []
        c3_total = c3_top5 = c3_top1 = 0
        rank_regressions = 0
        for key, (ranking, sel, origin) in data.items():
            lab = labels[key]
            slc = slices_of(key)
            r_base = min((c["rank"] for c in cache[key]["clusters"] if c["sha"] in lab["acc"]), default=None)
            r_now = min((ranking["ranks"].get(s) for s in lab["acc"] if s in ranking["ranks"]), default=None)
            if r_base is not None and r_base > 5:
                c3_total += 1
                if r_now is not None and r_now <= 5:
                    c3_top5 += 1
                if r_now == 1:
                    c3_top1 += 1
            if r_base is not None and r_base <= 5 and (r_now is None or r_now > 5):
                rank_regressions += 1
            base = baseline_sel[key]
            if base is not None and base in lab["acc"] and sel != base:
                regressed_prev_correct.append(key)
            if sel is None:
                continue
            verdict = "indeterminate" if lab["expert"] else ("correct" if sel in lab["acc"] else "wrong")
            j[verdict] += 1
            cls = "guard_addition" if origin == "guard" else ranking["conf"]
            if cls in by_class:
                by_class[cls][verdict] += 1
            margin_rows.append((ranking["margin"], verdict))
            for s in slc:
                slice_stats[s][verdict] += 1
            if verdict == "wrong" and (base is None or base in lab["acc"]):
                new_fp.append(key)
        meas = j["correct"] + j["wrong"]
        margin_table = {}
        for m in MARGIN_CUTS:
            sub = [v for (mg, v) in margin_rows if mg is not None and mg >= m]
            c = Counter(sub)
            mm = c["correct"] + c["wrong"]
            margin_table[str(m)] = {"selections": len(sub), "correct": c["correct"], "wrong": c["wrong"],
                                    "indeterminate": c["indeterminate"],
                                    "precision_measurable": round(c["correct"] / mm, 4) if mm else None,
                                    "wilson_95": wilson(c["correct"], mm)}
        slices_out = {}
        for s, c in slice_stats.items():
            mm = c["correct"] + c["wrong"]
            slices_out[s] = {"selections": c["correct"] + c["wrong"] + c["indeterminate"],
                             "correct": c["correct"], "wrong": c["wrong"], "indeterminate": c["indeterminate"],
                             "precision_measurable": round(c["correct"] / mm, 4) if mm else None,
                             "wilson_95": wilson(c["correct"], mm)}
        result[name] = {
            "automatic_selections": j["correct"] + j["wrong"] + j["indeterminate"],
            "correct": j["correct"], "wrong": j["wrong"], "indeterminate": j["indeterminate"],
            "precision_measurable": round(j["correct"] / meas, 4) if meas else None,
            "precision_wilson_95": wilson(j["correct"], meas),
            "coverage_of_200": round((j["correct"] + j["wrong"] + j["indeterminate"]) / 200, 4),
            "high_confidence": dict(by_class["HIGH_CONFIDENCE"]),
            "unique_cluster": dict(by_class["UNIQUE_EQUIVALENCE_CLUSTER"]),
            "guard_additions": dict(by_class["guard_addition"]),
            "margin_table": margin_table,
            "slices": slices_out,
            "c3_slice_by_label": {"total_correct_below_top5_v21": c3_total, "now_top5": c3_top5, "now_top1": c3_top1},
            "rank_regressions_correct_out_of_top5": rank_regressions,
            "new_false_positives_vs_v21": sorted(new_fp),
            "v21_correct_selections_changed_or_lost": sorted(set(regressed_prev_correct)),
        }

    holdout_class_counts = Counter(a["gold_decision"] for a in adj.values())
    payload = {
        "schema_version": "camel-v2.3-holdout-metrics-v1",
        "date": DATE,
        "scope": "frozen unbiased holdout-200; adjudication freeze sonrası, kör",
        "holdout_decision_counts": {k: holdout_class_counts[k] for k in sorted(holdout_class_counts)},
        "variants": result,
    }
    md = ["# V2.3 — Unbiased Holdout (200) Metrik Raporu", "",
          f"Tarih: {DATE}. Ranker/config SHA-256 freeze'i holdout adjudication'dan ÖNCE yapıldı (bkz. freeze manifesti).", "",
          "## Holdout adjudication dağılımı"]
    for k in sorted(holdout_class_counts):
        md.append(f"- {k}: {holdout_class_counts[k]}")
    md += ["", "## Varyant özetleri", "",
           "| Varyant | Seçim | Doğru | Yanlış | Belirsiz | Precision | Wilson %95 | Coverage | Yeni FP | v2.1 doğru seçim kaybı | C3(etiket)→top5 |",
           "|---|---|---|---|---|---|---|---|---|---|---|"]
    label_tr = {"v21": "V2.1 baseline", "v21_guard": "V2.1 + B-G1 guard", "v23": "V2.3 ranker", "v23_guard": "V2.3 + B-G1 guard"}
    for name in ("v21", "v21_guard", "v23", "v23_guard"):
        r = result[name]
        ci = r["precision_wilson_95"]
        c3 = r["c3_slice_by_label"]
        md.append(f"| {label_tr[name]} | {r['automatic_selections']} | {r['correct']} | {r['wrong']} | {r['indeterminate']} | "
                  f"{r['precision_measurable']} | {ci} | {r['coverage_of_200']} | "
                  f"{len(r['new_false_positives_vs_v21'])} | {len(r['v21_correct_selections_changed_or_lost'])} | "
                  f"{c3['now_top5']}/{c3['total_correct_below_top5_v21']} |")
    for name in ("v21", "v21_guard", "v23", "v23_guard"):
        r = result[name]
        md += ["", f"### {label_tr[name]}",
               f"- HIGH_CONFIDENCE: {r['high_confidence']} | UNIQUE: {r['unique_cluster']} | guard eklemeleri: {r['guard_additions']}",
               "- Margin kesitleri:"]
        for m in MARGIN_CUTS:
            t = r["margin_table"][str(m)]
            md.append(f"  - margin>={m}: n={t['selections']} doğru={t['correct']} yanlış={t['wrong']} "
                      f"precision={t['precision_measurable']} Wilson={t['wilson_95']}")
        md.append("- Dilimler (etiketten bağımsız tanımlar):")
        for s in ("c3_suspect", "function_word", "random_control"):
            t = r["slices"][s]
            md.append(f"  - {s}: n={t['selections']} doğru={t['correct']} yanlış={t['wrong']} "
                      f"precision={t['precision_measurable']} Wilson={t['wilson_95']}")
    shas = {
        "json": atomic_write(REPORTS / "disambiguation-v2.3-holdout-metrics.json",
                             json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=1) + "\n"),
        "md": atomic_write(REPORTS / "disambiguation-v2.3-holdout-metrics.md", "\n".join(md) + "\n"),
    }
    print(json.dumps({"variants": {k: {kk: vv for kk, vv in v.items() if kk in (
        'automatic_selections', 'correct', 'wrong', 'indeterminate', 'precision_measurable',
        'precision_wilson_95', 'coverage_of_200', 'new_false_positives_vs_v21',
        'v21_correct_selections_changed_or_lost', 'c3_slice_by_label')} for k, v in result.items()},
        "output_sha256": shas}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
