#!/usr/bin/env python3
"""Dev (gold-200 + diagnostic-200) ablation: V2.1, V2.1+B-G1 guard, V2.3, V2.3+B-G1 guard.

Unbiased holdout OKUNMAZ. Çıktı: reports/disambiguation-v2.3-ablation.{json,md} (atomik).
Kullanım: python ablation-dev.py
"""
import hashlib
import json
import os
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MORPH = ROOT / "data/candidates/morphology"
V23 = MORPH / "disambiguation-v2.3"
REPORTS = MORPH / "reports"
DATE = "2026-07-20"


def atomic_write(path: Path, text: str) -> str:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_adj(path: Path) -> dict:
    out = {}
    for line in open(path, encoding="utf-8"):
        a = json.loads(line)
        out[f'{a["verse_key"]}#{a["word_index"]}'] = a
    return out


def load_labels() -> dict:
    """key -> {'acc': set, 'expert': bool}"""
    cov = json.load(open(REPORTS / "disambiguation-v2.2-candidate-coverage.json", encoding="utf-8"))
    cov_by_key = {r["key"]: r for r in cov["records"]}
    labels = {}
    for key, a in load_adj(MORPH / "gold-adjudication/adjudicated-gold-v1.jsonl").items():
        if a["gold_decision"] == "uzman_incelemesi_gerekli":
            labels[key] = {"acc": set(), "expert": True}
            continue
        acc = set(a["accepted_equivalence_key_sha256s"])
        if a["gold_decision"] == "gecerli_aday_yok":
            mc = cov_by_key[key].get("matched_cluster")
            acc = {mc["sha"]} if mc else set()
        labels[key] = {"acc": acc, "expert": False}
    for key, a in load_adj(V23 / "diagnostic-adjudication.jsonl").items():
        labels[key] = {"acc": set(a["accepted_equivalence_key_sha256s"]),
                       "expert": a["gold_decision"] == "uzman_incelemesi_gerekli"}
    return labels


def guard_selection(rec_cache: dict, ranking: dict, whitelist: set, closed_pos: set) -> str | None:
    """B-G1 guard (v2.2 ile aynı koşullar) — verilen sıralamanın rank-1 cluster'ı üzerinde."""
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


def main() -> None:
    cache = json.load(open(V23 / "eval1000-cache.json", encoding="utf-8"))["records"]
    v23 = json.load(open(V23 / "ranked-eval-set-v2_3.json", encoding="utf-8"))["records"]
    guard_cfg = json.load(open(MORPH / "disambiguation-v2.2/function-word-guard-prototype.json", encoding="utf-8"))
    whitelist = {(w["lemma_normalized"], w["pos_raw"]) for w in guard_cfg["whitelist"]}
    closed_pos = set(guard_cfg["rule"]["closed_pos"])
    labels = load_labels()

    def v21_ranking(rec):
        return {"auto": rec["auto"], "margin": rec["margin"], "sel_sha": rec["sel_sha"],
                "ranks": {c["sha"]: c["rank"] for c in rec["clusters"]}}

    variants = {}
    for key in sorted(labels, key=lambda k: (int(k.split(":")[0]), int(k.split(":")[1].split("#")[0]), int(k.split("#")[1]))):
        rec = cache[key]
        r21 = v21_ranking(rec)
        r23 = v23[key]
        g21 = guard_selection(rec, r21, whitelist, closed_pos)
        g23 = guard_selection(rec, r23, whitelist, closed_pos)
        variants.setdefault("v21", {})[key] = (r21, r21["sel_sha"] if r21["auto"] else None)
        variants.setdefault("v21_guard", {})[key] = (r21, (r21["sel_sha"] if r21["auto"] else None) or g21)
        variants.setdefault("v23", {})[key] = (r23, r23["sel_sha"] if r23["auto"] else None)
        variants.setdefault("v23_guard", {})[key] = (r23, (r23["sel_sha"] if r23["auto"] else None) or g23)

    baseline_sel = {k: sel for k, (_, sel) in variants["v21"].items()}
    result = {}
    for name, data in variants.items():
        j = Counter()
        c3_top5 = c3_top1 = c3_total = reg = 0
        new_fp = []
        for key, (ranking, sel) in data.items():
            lab = labels[key]
            r_now = min((ranking["ranks"].get(s) for s in lab["acc"] if s in ranking["ranks"]), default=None)
            r_base = min((c["rank"] for c in cache[key]["clusters"] if c["sha"] in lab["acc"]), default=None)
            if r_base is not None and r_base > 5:
                c3_total += 1
                if r_now is not None and r_now <= 5:
                    c3_top5 += 1
                if r_now == 1:
                    c3_top1 += 1
            if r_base is not None and r_base <= 5 and (r_now is None or r_now > 5):
                reg += 1
            if sel is None:
                continue
            if lab["expert"]:
                j["indeterminate"] += 1
            elif sel in lab["acc"]:
                j["correct"] += 1
            else:
                j["wrong"] += 1
                base = baseline_sel[key]
                if base is None or base in lab["acc"]:
                    new_fp.append(key)
        base_correct_lost = sum(
            1 for key, (ranking, sel) in data.items()
            if baseline_sel[key] is not None and baseline_sel[key] in labels[key]["acc"]
            and sel != baseline_sel[key]
        )
        meas = j["correct"] + j["wrong"]
        result[name] = {
            "selections": j["correct"] + j["wrong"] + j["indeterminate"],
            "correct": j["correct"], "wrong": j["wrong"], "indeterminate": j["indeterminate"],
            "precision_measurable": round(j["correct"] / meas, 4) if meas else None,
            "coverage_of_400": round((j["correct"] + j["wrong"] + j["indeterminate"]) / 400, 4),
            "c3_dev": {"total": c3_total, "now_top5": c3_top5, "now_top1": c3_top1},
            "regressions_correct_out_of_top5": reg,
            "new_false_positives_vs_v21": sorted(new_fp),
            "v21_correct_selections_changed_or_lost": base_correct_lost,
        }

    payload = {"schema_version": "camel-v2.3-ablation-dev-v1", "date": DATE,
               "scope": "gold-200 + targeted diagnostic-200 (400 kayıt); unbiased holdout OKUNMADI",
               "variants": result}
    md = ["# V2.3 Ablation — Dev (gold-200 + diagnostic-200)", "",
          f"Tarih: {DATE}. Unbiased holdout bu raporda kullanılmadı; nihai değerlendirme holdout kapısından sonra ayrıdır.", "",
          "| Varyant | Seçim | Doğru | Yanlış | Belirsiz | Precision | Coverage | C3→top5 | C3→top1 | Reg. | Yeni FP | v2.1 doğru seçim kaybı |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    label_tr = {"v21": "V2.1 baseline", "v21_guard": "V2.1 + B-G1 guard", "v23": "V2.3 ranker", "v23_guard": "V2.3 + B-G1 guard"}
    for name in ("v21", "v21_guard", "v23", "v23_guard"):
        r = result[name]
        md.append(f"| {label_tr[name]} | {r['selections']} | {r['correct']} | {r['wrong']} | {r['indeterminate']} | "
                  f"{r['precision_measurable']} | {r['coverage_of_400']} | {r['c3_dev']['now_top5']}/{r['c3_dev']['total']} | "
                  f"{r['c3_dev']['now_top1']} | {r['regressions_correct_out_of_top5']} | "
                  f"{len(r['new_false_positives_vs_v21'])} | {r['v21_correct_selections_changed_or_lost']} |")
    md += ["", "Notlar:",
           "- 'C3→top5': v2.1'de doğru adayı top-5 dışında olan dev kayıtlarından, varyant sıralamasında top-5'e girenler.",
           "- Guard yalnız otomatik seçim eklemesi yapar, sıralamayı değiştirmez (C3 sütunları ranker'a bağlıdır).",
           "- 'Yeni FP': v2.1 baseline'da yanlış olmayan bir kayıtta varyantın yanlış seçim yapması."]

    shas = {
        "json": atomic_write(REPORTS / "disambiguation-v2.3-ablation.json",
                             json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=1) + "\n"),
        "md": atomic_write(REPORTS / "disambiguation-v2.3-ablation.md", "\n".join(md) + "\n"),
    }
    print(json.dumps({"variants": result, "output_sha256": shas}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
