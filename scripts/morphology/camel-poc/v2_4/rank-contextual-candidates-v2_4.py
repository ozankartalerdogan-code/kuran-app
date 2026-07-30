#!/usr/bin/env python3
"""V2.4 ranker prototipi: V2.3 + tek dar düzeltme (en dar V2.4 farkı).

Sinyal (legacy silver referans C3 incelemesinden): CAMeL'in `foreign_ntws` fallback
parse'ı (yüzeyi harfi harfine kendi üzerine segmentleyen, leksikal kanıtsız geri dönüş
analizi) her zaman exact_diac/exact_reconstruction'ı triviyal biçimde sağlar. V2.3'ün
`lexical_prior_guard`'ındaki exact_diac/exact_reconstruction muafiyeti bu yüzden
foreign_ntws adaylarını -- kayıtta gerçek leksikal kanıtlı bir alternatif olsa bile --
asla demote edilemez hale getiriyordu.

Tek değişiklik: `is_demoted()` içinde flags.foreign_ntws=True olan cluster'lar,
exact_diac/exact_reconstruction muafiyetinden ÇIKARILIR (kayıtta leksikal kanıtlı en az
bir cluster varken hâlâ -8 demotion alırlar). V2.3'ün geri kalan tüm mantığı
(skor bileşenleri, tie-break, margin eşikleri, seçim kapısı, RULE_CONFLICT) değişmeden
kopyalanır.

Değişmeyenler: margin eşikleri, CAMeL DB, candidate generator, normalizasyon,
supplemental lexicon, no_prior_demotion büyüklüğü (-8).

Kullanım: python rank-contextual-candidates-v2_4.py
Yalnız gold-200 + targeted diagnostic-200 (400 kayıt) üzerinde çalışır; unbiased
holdout okunmaz.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MORPH = ROOT / "data/candidates/morphology"
V23 = MORPH / "disambiguation-v2.3"

NO_PRIOR = -99.0
NO_PRIOR_DEMOTION = -8


def is_demoted_v24(c: dict) -> bool:
    llp = c["llp"] if c["llp"] is not None else NO_PRIOR
    pllp = c["pllp"] if c["pllp"] is not None else NO_PRIOR
    if llp > NO_PRIOR or pllp > NO_PRIOR:
        return False
    if c["flags"]["foreign_ntws"]:
        return True
    if c["flags"]["exact_diac"] or c["flags"]["exact_reconstruction"]:
        return False
    return True


def rank_record_v24(rec: dict) -> dict:
    clusters = rec["clusters"]
    if not clusters:
        return {"conf": "NO_ANALYSIS", "margin": None, "sel_sha": None, "auto": False,
                "blocked": None, "ranks": {}}
    any_attested = any(not is_demoted_v24(c) for c in clusters)
    scored = []
    for c in clusters:
        delta = NO_PRIOR_DEMOTION if (any_attested and is_demoted_v24(c)) else 0
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
    return {"conf": conf, "margin": margin, "sel_sha": sel, "auto": auto, "blocked": blocked,
            "ranks": {c["sha"]: i + 1 for i, (c, _) in enumerate(scored)}}


def load_adj(path: Path) -> dict:
    out = {}
    for line in open(path, encoding="utf-8"):
        a = json.loads(line)
        out[f'{a["verse_key"]}#{a["word_index"]}'] = a
    return out


def load_labels(reports_dir: Path) -> dict:
    cov = json.load(open(reports_dir / "disambiguation-v2.2-candidate-coverage.json", encoding="utf-8"))
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


def main() -> None:
    reports = MORPH / "reports"
    cache = json.load(open(V23 / "eval1000-cache.json", encoding="utf-8"))["records"]
    v23 = json.load(open(V23 / "ranked-eval-set-v2_3.json", encoding="utf-8"))["records"]
    labels = load_labels(reports)

    from collections import Counter
    j23, j24 = Counter(), Counter()
    changed = []
    affected_by_signal = 0
    for key in labels:
        rec = cache[key]
        r23 = v23[key]
        r24 = rank_record_v24(rec)
        sel23 = r23["sel_sha"] if r23["auto"] else None
        sel24 = r24["sel_sha"] if r24["auto"] else None
        if sel23 != sel24:
            changed.append(key)
        lab = labels[key]

        def verdict(sel):
            if sel is None:
                return None
            if lab["expert"]:
                return "indeterminate"
            return "correct" if sel in lab["acc"] else "wrong"

        v23v, v24v = verdict(sel23), verdict(sel24)
        if v23v:
            j23[v23v] += 1
        if v24v:
            j24[v24v] += 1

    def summary(j):
        meas = j["correct"] + j["wrong"]
        return {"selections": j["correct"] + j["wrong"] + j["indeterminate"],
                "correct": j["correct"], "wrong": j["wrong"], "indeterminate": j["indeterminate"],
                "precision_measurable": round(j["correct"] / meas, 4) if meas else None}

    print(json.dumps({
        "scope": "gold-200 + targeted diagnostic-200 (400 kayit); unbiased holdout okunmadi",
        "v23": summary(j23), "v24": summary(j24),
        "selections_changed": sorted(changed), "n_changed": len(changed),
    }, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
