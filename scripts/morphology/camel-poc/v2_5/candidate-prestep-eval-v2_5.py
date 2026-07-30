#!/usr/bin/env python3
"""V2.5 izole candidate prototipi: hemze/rasm on-adimi + DEGISMEMIS V2.1 skorlama + V2.3 demotion.

V2.5 = V2.3 ranker mantigi (bire bir ayni skor bilesenleri, esikler, tie-break, secim kapisi)
       + candidate uretimine eklenen hemze/rasm normalizasyon on-adimi.

On-adim yalniz EK analiz formu ve EK aday uretir. Canonical token, frozen dosyalar, ranker
kurallari, margin esikleri, lexicon ve production verisi DEGISTIRILMEZ. Tum frozen girdiler
salt okunur acilir.

Kapsam: yalniz gold-200 + targeted diagnostic-200 (400 kayit). Unbiased holdout OKUNMAZ.

Dogrulama kapisi: ayni kod yolu once V2.3 icin calistirilir ve frozen
ranked-eval-set-v2_3.json secimleriyle birebir eslesmesi ZORUNLU tutulur; eslesmezse
karsilastirma gecersiz sayilir ve script hata verir.

Kullanim (CAMeL venv python'u ile):
  data/candidates/morphology/camel-morph-msa-v1.0/.venv/Scripts/python.exe \
    scripts/morphology/camel-poc/v2_5/candidate-prestep-eval-v2_5.py
"""
import gzip
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
V25 = MORPH / "disambiguation-v2.5"
REPORTS = MORPH / "reports"

NO_PRIOR = -99.0
NO_PRIOR_DEMOTION = -8
HIGH_CONFIDENCE_MIN_MARGIN = 18

for extra in (POC, POC / "v2", POC / "v2_1"):
    sys.path.insert(0, str(extra))


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


common = _load("disambiguation_common", POC / "disambiguation_common.py")
prestep = _load("hamza_rasm_prestep_prototype", POC / "v2_4/hamza-rasm-prestep-prototype.py")
v21_ranker = _load("rank_contextual_candidates_v2_1", POC / "v2_1/rank-contextual-candidates-v2_1.py")
v21_common = sys.modules["v21_common"]


def atomic_write(path: Path, text: str) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def is_demoted(cluster: dict) -> bool:
    """V2.3 lexical_prior_guard — cluster sozlugu uzerinde, kural degismeden."""
    rep = cluster["representative"]
    llp = rep.get("lex_logprob")
    pllp = rep.get("pos_lex_logprob")
    llp = NO_PRIOR if llp is None else llp
    pllp = NO_PRIOR if pllp is None else pllp
    if llp > NO_PRIOR or pllp > NO_PRIOR:
        return False
    flags = cluster["representative_flags"]
    return not (flags["exact_diac"] or flags["exact_reconstruction"])


def select(clusters: list[dict]) -> dict:
    """V2.3 sirasi + siniflandirma + secim kapisi (v2.1 ile birebir)."""
    if not clusters:
        return {"conf": "NO_ANALYSIS", "margin": None, "sel_sha": None, "auto": False, "ranks": {}}
    any_attested = any(not is_demoted(c) for c in clusters)
    scored = [(c, c["total_score"] + (NO_PRIOR_DEMOTION if (any_attested and is_demoted(c)) else 0))
              for c in clusters]
    scored.sort(key=lambda t: (-t[1], t[0]["equivalence_key_sha256"]))
    top, top_score = scored[0]
    second = scored[1][1] if len(scored) > 1 else None
    margin = top_score - second if second is not None else None
    flags = top["representative_flags"]
    if all(c["representative_flags"]["echo"] for c, _ in scored):
        conf = "NO_USABLE_ANALYSIS"
    elif flags["echo"]:
        conf = "ECHO_TOP_UNRESOLVED"
    elif len(scored) == 1:
        conf = "UNIQUE_EQUIVALENCE_CLUSTER"
    elif margin == 0:
        conf = "TOP_TIE"
    elif margin >= HIGH_CONFIDENCE_MIN_MARGIN:
        conf = "HIGH_CONFIDENCE"
    elif margin >= 8:
        conf = "MEDIUM_CONFIDENCE"
    else:
        conf = "LOW_CONFIDENCE"
    auto, sel = False, None
    if conf in ("UNIQUE_EQUIVALENCE_CLUSTER", "HIGH_CONFIDENCE"):
        if not (flags["echo"] or flags["abbrev"]
                or (flags["foreign_ntws"] and len(scored) > 1)
                or (flags["foreign_ntws"] and not (flags["exact_diac"] or flags["exact_reconstruction"]))):
            auto, sel = True, top["equivalence_key_sha256"]
    return {"conf": conf, "margin": margin, "sel_sha": sel, "auto": auto,
            "ranks": {c["equivalence_key_sha256"]: i + 1 for i, (c, _) in enumerate(scored)}}


def expand_target(target: dict, analyzer) -> tuple[dict, int]:
    """Frozen target'a hemze/rasm on-adiminin EK formlarini ve adaylarini ekler."""
    lookup_forms, ops = prestep.hamza_rasm_prestep(target["canonical_text"])
    if not ops:
        return target, 0
    known = {common.candidate_signature(c) for c in target["unique_candidates"]}
    existing_forms = {form["form"] for form in target["analysis_forms"]}
    extra_forms, added = [], []
    for source_text in lookup_forms:
        forms, _traces = prestep.token_map_mod.build_analysis_forms(source_text)
        for form_text in forms:
            if form_text in existing_forms:
                continue
            existing_forms.add(form_text)
            candidates = [dict(c) for c in analyzer.analyze(form_text)]
            new = [c for c in candidates if common.candidate_signature(c) not in known]
            for c in new:
                known.add(common.candidate_signature(c))
            added.extend(new)
            extra_forms.append({
                "form_id": f"hamza_rasm_prestep_{len(extra_forms)}",
                "form": form_text, "profiles": ["hamza_rasm_prestep"],
                "has_analysis": bool(candidates), "candidate_count": len(candidates),
                "candidates": candidates,
            })
    if not added:
        return target, 0
    expanded = dict(target)
    expanded["analysis_forms"] = list(target["analysis_forms"]) + extra_forms
    expanded["unique_candidates"] = list(target["unique_candidates"]) + added
    expanded["candidate_count_unique"] = len(expanded["unique_candidates"])
    return expanded, len(added)


def load_adj(path: Path) -> dict:
    out = {}
    for line in open(path, encoding="utf-8"):
        a = json.loads(line)
        out[f'{a["verse_key"]}#{a["word_index"]}'] = a
    return out


def load_labels() -> dict:
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


def main() -> None:
    labels = load_labels()
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

            base_clusters = (v21_ranker.group_candidates(target, neighbors)
                             if target["candidate_count_unique"] else [])
            base = select(base_clusters)
            expanded, added = expand_target(target, analyzer)
            if added:
                new_clusters = v21_ranker.group_candidates(expanded, neighbors)
                new = select(new_clusters)
            else:
                new_clusters, new = base_clusters, base
            rows.append({
                "key": key,
                "affected": bool(added),
                "new_candidates": added,
                "clusters_v23": len(base_clusters),
                "clusters_v25": len(new_clusters),
                "sel_v23": base["sel_sha"] if base["auto"] else None,
                "sel_v25": new["sel_sha"] if new["auto"] else None,
                "conf_v23": base["conf"], "conf_v25": new["conf"],
                "recomputed_matches_frozen": (base["sel_sha"] if base["auto"] else None) == (
                    frozen_v23[key]["sel_sha"] if frozen_v23[key]["auto"] else None),
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

    j23, j25 = Counter(), Counter()
    selection_changes, lost_correct, new_false_positives, gains = [], [], [], []
    for r in rows:
        lab = labels[r["key"]]
        v23, v25 = verdict(r["sel_v23"], lab), verdict(r["sel_v25"], lab)
        if v23:
            j23[v23] += 1
        if v25:
            j25[v25] += 1
        if r["sel_v23"] != r["sel_v25"]:
            selection_changes.append(r["key"])
            if v23 == "correct" and v25 != "correct":
                lost_correct.append(r["key"])
            if v25 == "wrong" and v23 != "wrong":
                new_false_positives.append(r["key"])
            if v23 != "correct" and v25 == "correct":
                gains.append(r["key"])
    regressions = sorted(set(lost_correct) | set(new_false_positives))

    affected = [r for r in rows if r["affected"]]
    total_c23 = sum(r["clusters_v23"] for r in rows)
    total_c25 = sum(r["clusters_v25"] for r in rows)

    def summarize(j):
        meas = j["correct"] + j["wrong"]
        return {"selections": j["correct"] + j["wrong"] + j["indeterminate"], "correct": j["correct"],
                "wrong": j["wrong"], "indeterminate": j["indeterminate"],
                "precision_measurable": round(j["correct"] / meas, 4) if meas else None}

    explosion = (round(total_c25 / total_c23, 4) if total_c23 else None)
    valid = not regressions and (explosion is None or explosion <= 1.10)

    summary = {
        "schema_version": "camel-v2.5-candidate-prestep-eval-v1",
        "scope": "gold-200 + targeted diagnostic-200 (400 kayit); unbiased holdout OKUNMADI",
        "v23_parity_gate": {"records": len(rows), "mismatches": 0,
                            "note": "ayni kod yolu ile yeniden hesaplanan V2.3 secimleri frozen dosyayla birebir"},
        "tokens_total": len(rows),
        "tokens_affected_by_prestep": len(affected),
        "new_candidates_total": sum(r["new_candidates"] for r in rows),
        "clusters_total_v23": total_c23,
        "clusters_total_v25": total_c25,
        "cluster_growth_ratio": explosion,
        "selection_changes": len(selection_changes),
        "selection_change_keys": selection_changes,
        "gains_wrong_or_none_to_correct": len(gains),
        "regressions_total": len(regressions),
        "regressions_lost_correct": len(lost_correct),
        "regressions_new_false_positives": len(new_false_positives),
        "regression_keys": regressions,
        "v23": summarize(j23), "v25": summarize(j25),
        "decision": "V2_5_CANDIDATE_FIX: VALID" if valid else "V2_5_CANDIDATE_FIX: INVALID",
        "constraints": {"canonical_token_modified": "HAYIR", "frozen_files_modified": "HAYIR",
                        "ranker_rules_modified": "HAYIR", "margin_modified": "HAYIR",
                        "lexicon_modified": "HAYIR", "production_data_modified": "HAYIR",
                        "holdout_read": "HAYIR", "full_77429_run": "HAYIR"},
    }

    jsonl_text = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
                         for r in rows)
    shas = {
        "jsonl": atomic_write(V25 / "candidate-prestep-eval-v2_5.jsonl", jsonl_text),
        "summary": atomic_write(REPORTS / "disambiguation-v2.5-candidate-prestep.json",
                                json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=1) + "\n"),
    }
    if valid:
        freeze = {
            "schema_version": "camel-v2.5-freeze-manifest-v1",
            "status": "frozen_after_dev_validation_before_any_holdout_read",
            "code_sha256": {
                "prestep": sha256_file(POC / "v2_4/hamza-rasm-prestep-prototype.py"),
                "v2_5_eval": sha256_file(Path(__file__)),
                "v2_1_ranker_unchanged": sha256_file(POC / "v2_1/rank-contextual-candidates-v2_1.py"),
                "v2_3_ranker_unchanged": sha256_file(POC / "v2_3/rank-contextual-candidates-v2_3.py"),
            },
            "config": {"no_prior_demotion": NO_PRIOR_DEMOTION,
                       "high_confidence_min_margin": HIGH_CONFIDENCE_MIN_MARGIN,
                       "max_prestep_variants": prestep.MAX_VARIANTS},
            "outputs_sha256": shas,
        }
        shas["freeze"] = atomic_write(V25 / "v2_5-freeze-manifest.json",
                                      json.dumps(freeze, ensure_ascii=False, sort_keys=True, indent=1) + "\n")
    else:
        stale = V25 / "v2_5-freeze-manifest.json"
        if stale.exists():
            stale.unlink()  # gecersiz sonuc dondurulmus gibi gorunmemeli
    print(json.dumps({"summary": summary, "output_sha256": shas}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
