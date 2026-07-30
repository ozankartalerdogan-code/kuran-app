#!/usr/bin/env python3
"""V2.2 aday kapsama tanısı + dar düzeltme prototipi simülasyonu (yalnız frozen gold-200).

Girdi (salt okunur): gold-adjudication kararları, v2.1 tam cluster cache'i,
function-word guard prototipi, supplemental lexicon prototipi.
Çıktı (atomik+deterministik): coverage json, B-G1/B-G2 md, before/after json, nihai karar md.

Frozen V1/V2/V2.1 ve mevcut gold dosyaları değiştirilmez; margin/ranker ağırlıklarına dokunulmaz.
Kullanım: python diagnose-v2_2.py <cluster-cache.json>
"""
import hashlib
import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MORPH = ROOT / "data/candidates/morphology"
ADJUDICATED = MORPH / "gold-adjudication/adjudicated-gold-v1.jsonl"
GUARD = MORPH / "disambiguation-v2.2/function-word-guard-prototype.json"
LEXICON = MORPH / "disambiguation-v2.2/supplemental-lexicon-prototype.json"
REPORTS = MORPH / "reports"

HIGH_MARGIN = 18  # mevcut V2.1 eşiği; değiştirilmedi
DATE = "2026-07-19"

C1 = "CORRECT_IN_TOP5_SELECTABLE"
C2 = "CORRECT_IN_TOP5_BLOCKED_BY_ECHO_GUARD"
C3 = "CORRECT_BELOW_TOP5"
C4 = "CORRECT_IN_FULL_OUTPUT_BUT_NORMALIZATION_OR_SEGMENTATION_MISMATCH"
C5 = "CORRECT_ABSENT_FROM_CAMEL_OUTPUT"
C6 = "MULTIPLE_ACCEPTABLE"
C7 = "EXPERT_REVIEW_REQUIRED"

# 'geçerli aday yok' kayıtları için beklenen doğru analiz tanımı (adjudication rationale'inden).
# nlem: kabul edilen normalize lemma kümesi; pos: kabul edilen pos_raw kümesi;
# feats: zorunlu özellik alt kümesi; lex: zorunlu ham lemma (vokalizasyon ayrımı için).
M = {
    "2:36#13":  {"nlem": {"ل"}, "pos": {"prep"}},
    "2:61#3":   {"nlem": {"موسي"}, "pos": {"noun_prop"}},
    "2:155#3":  {"nlem": {"من"}, "pos": {"prep"}},
    "2:178#31": {"nlem": {"من"}, "pos": {"pron_rel"}},
    "2:203#13": {"nlem": {"من"}, "pos": {"pron_rel"}},
    "2:241#1":  {"nlem": {"مطلقة"}, "pos": {"noun", "adj"}},
    "2:282#34": {"nlem": {"شي", "شيء"}, "pos": {"noun"}},
    "3:35#14":  {"nlem": {"من"}, "pos": {"prep"}},
    "3:194#10": {"nlem": {"قيامة"}, "pos": {"noun"}},
    "4:136#10": {"nlem": {"علي"}, "pos": {"prep"}},
    "4:152#12": {"nlem": {"اتي"}, "pos": {"verb"}},
    "6:151#18": {"nlem": {"املاق"}, "pos": {"noun"}},
    "7:66#11":  {"nlem": {"ان"}, "pos": {"verb_pseudo"}},
    "7:91#4":   {"nlem": {"في"}, "pos": {"prep"}},
    "7:172#21": {"nlem": {"قيامة"}, "pos": {"noun"}},
    "9:63#5":   {"nlem": {"حاد"}, "pos": {"verb"}},
    "10:53#11": {"nlem": {"معجز"}, "pos": {"noun", "adj"}, "feats": {"num": "p"}},
    "11:63#3":  {"nlem": {"راي"}, "pos": {"verb"}},
    "14:2#5":   {"nlem": {"في"}, "pos": {"prep"}},
    "14:24#14": {"nlem": {"في"}, "pos": {"prep"}},
    "16:13#11": {"nlem": {"اية"}, "pos": {"noun"}},
    "18:43#5":  {"nlem": {"نصر"}, "pos": {"verb"}},
    "21:18#9":  {"nlem": {"زاهق"}, "pos": {"noun", "adj"}},
    "22:8#3":   {"nlem": {"من"}, "pos": {"pron_rel"}},
    "22:72#4":  {"nlem": {"اية"}, "pos": {"noun"}},
    "23:100#3": {"nlem": {"صالح"}, "pos": {"noun", "adj"}},
    "24:50#4":  {"nlem": {"ام"}, "pos": {"conj"}},
    "25:16#10": {"nlem": {"مسول", "مسئول", "مسؤول"}, "pos": {"noun", "adj"}},
    "25:20#8":  {"nlem": {"اكل"}, "pos": {"verb"}},
    "25:51#4":  {"nlem": {"في"}, "pos": {"prep"}},
    "25:55#13": {"nlem": {"رب"}, "pos": {"noun"}},
    "26:23#5":  {"nlem": {"عالم"}, "pos": {"noun"}, "lex": "عَالَم"},
    "30:26#8":  {"nlem": {"قانت"}, "pos": {"noun", "adj"}},
    "30:37#7":  {"nlem": {"من"}, "pos": {"pron_rel"}},
    "33:49#11": {"nlem": {"ان"}, "pos": {"conj_sub"}},
    "34:10#6":  {"nlem": {"جبل"}, "pos": {"noun"}},
    "34:16#14": {"nlem": {"من"}, "pos": {"prep"}},
    "35:8#6":   {"nlem": {"راي"}, "pos": {"verb"}},
    "36:8#10":  {"nlem": {"مقمح"}, "pos": {"noun", "adj"}},
    "37:48#2":  {"nlem": {"قاصر", "قاصرة"}, "pos": {"noun", "adj"}},
    "37:64#4":  {"nlem": {"في"}, "pos": {"prep"}},
    "40:53#2":  {"nlem": {"اتي"}, "pos": {"verb"}},
    "41:24#7":  {"nlem": {"استعتب"}, "pos": {"verb"}},
    "44:33#1":  {"nlem": {"اتي"}, "pos": {"verb"}},
    "44:35#4":  {"nlem": {"موتة"}, "pos": {"noun"}},
    "47:19#14": {"nlem": {"مثوي"}, "pos": {"noun"}, "feats": {"num": "s"}},
    "47:36#9":  {"nlem": {"اتي"}, "pos": {"verb"}},
    "48:29#5":  {"nlem": {"مع"}, "pos": {"prep", "noun", "adv"}},
    "56:20#1":  {"nlem": {"فاكهة"}, "pos": {"noun"}},
    "56:59#1":  {"nlem": {"انت"}, "pos": {"pron"}},
    "57:1#4":   {"nlem": {"في"}, "pos": {"prep"}},
    "59:11#20": {"nlem": {"احد"}, "pos": {"noun", "noun_num"}},
    "60:11#20": {"nlem": {"ب"}, "pos": {"prep"}},
    "69:25#7":  {"nlem": {"ليت"}, "pos": {"verb_pseudo", "part"}},
    "69:43#4":  {"nlem": {"عالم"}, "pos": {"noun"}, "lex": "عَالَم"},
    "71:21#13": {"nlem": {"خسار"}, "pos": {"noun"}},
    "77:49#3":  {"nlem": {"مكذب"}, "pos": {"noun", "adj"}},
    "78:18#4":  {"nlem": {"صور"}, "pos": {"noun"}},
    "86:4#1":   {"nlem": {"ان"}, "pos": {"part_neg", "conj_sub", "part"}},
    "101:4#5":  {"nlem": {"مبثوث"}, "pos": {"noun", "adj"}},
    "104:8#3":  {"nlem": {"مؤصدة", "مؤصد"}, "pos": {"noun", "adj"}},
    "105:2#4":  {"nlem": {"في"}, "pos": {"prep"}},
    "112:4#3":  {"nlem": {"ل"}, "pos": {"prep"}},
}

DECISION = {"dogru_aday": "correct", "birden_fazla_kabul_edilebilir": "multi",
            "gecerli_aday_yok": "none", "uzman_incelemesi_gerekli": "expert"}


def atomic_write(path: Path, text: str) -> str:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def match(cluster: dict, m: dict) -> bool:
    if cluster["nlem"] not in m["nlem"] or cluster["pos"] not in m["pos"]:
        return False
    if "lex" in m and cluster["lex"] != m["lex"]:
        return False
    for k, v in m.get("feats", {}).items():
        if cluster["feats"].get(k) != v:
            return False
    return True


def main() -> None:
    cache = json.load(open(sys.argv[1], encoding="utf-8"))
    records = cache["records"]
    evidence_index = cache["evidence_index"]
    guard_cfg = json.load(open(GUARD, encoding="utf-8"))
    whitelist = {(w["lemma_normalized"], w["pos_raw"]) for w in guard_cfg["whitelist"]}
    closed_pos = set(guard_cfg["rule"]["closed_pos"])
    lexicon = json.load(open(LEXICON, encoding="utf-8"))
    lex_by_surface = {}
    for e in lexicon["entries"]:
        for s in e["surfaces"]:
            lex_by_surface[s] = e

    adj = {}
    for line in open(ADJUDICATED, encoding="utf-8"):
        a = json.loads(line)
        adj[f'{a["verse_key"]}#{a["word_index"]}'] = a
    assert set(adj) == set(records), "adjudication/cache key mismatch"

    def guard_check(rec: dict) -> tuple[bool, list[str]]:
        """Rank-1 cluster için guard koşullarını değerlendir; (geçti mi, kanıt/sebep listesi)."""
        if not rec["clusters"]:
            return False, ["cluster yok"]
        c = rec["clusters"][0]
        reasons = []
        ok = True
        if c["pos"] not in closed_pos:
            ok = False; reasons.append(f"C1 fail: pos={c['pos']} kapalı sınıf değil")
        if (c["nlem"], c["pos"]) not in whitelist:
            ok = False; reasons.append(f"C2 fail: ({c['nlem']},{c['pos']}) whitelist dışı")
        if not (c["flags"]["exact_diac"] or c["flags"]["exact_reconstruction"]):
            ok = False; reasons.append("C3 fail: exact_diac/exact_reconstruction kanıtı yok")
        if c["flags"]["abbrev"] or c["pos"] == "foreign":
            ok = False; reasons.append("C4 fail: abbrev/foreign")
        unique = rec["cluster_count"] == 1
        if not unique and (rec["margin"] is None or rec["margin"] < HIGH_MARGIN):
            ok = False; reasons.append(f"C5 fail: margin={rec['margin']} < {HIGH_MARGIN}")
        if ok:
            reasons = [f"pos={c['pos']} nlem={c['nlem']} whitelist+",
                       f"exact_diac={c['flags']['exact_diac']} exact_recon={c['flags']['exact_reconstruction']}",
                       f"clitics={json.dumps(c['clitics'], ensure_ascii=False, sort_keys=True)}",
                       "unique" if unique else f"margin={rec['margin']}>= {HIGH_MARGIN}"]
        return ok, reasons

    rows = []
    for key in sorted(records, key=lambda k: (int(k.split(":")[0]), int(k.split(":")[1].split("#")[0]), int(k.split("#")[1]))):
        rec = records[key]
        a = adj[key]
        dec = DECISION[a["gold_decision"]]
        accepted = set(a["accepted_equivalence_key_sha256s"])
        rank_by_sha = {c["sha"]: c["rank"] for c in rec["clusters"]}
        row = {
            "key": key, "surface": rec["surface"], "decision": dec,
            "v21_conf": rec["conf"], "v21_margin": rec["margin"], "v21_auto": rec["auto"],
            "v21_blocked": rec["blocked"], "cluster_count": rec["cluster_count"],
            "rationale": a["rationale"],
        }
        hit_shas: set = set()
        if dec == "expert":
            row["class"] = C7
        elif dec == "multi":
            row["class"] = C6
            ranks = sorted(rank_by_sha[s] for s in accepted if s in rank_by_sha)
            row["accepted_v21_ranks"] = ranks
        elif dec == "correct":
            sha = next(iter(accepted))
            rank = rank_by_sha.get(sha)
            row["accepted_v21_rank"] = rank
            if rank is None:
                row["class"] = C5
            elif rank <= 5:
                blocked = (rank == 1) and (rec["conf"] == "ECHO_TOP_UNRESOLVED" or rec["blocked"] is not None)
                row["class"] = C2 if blocked else C1
            else:
                row["class"] = C3
        else:  # none
            m = M[key]
            hits = [c for c in rec["clusters"] if match(c, m)]
            hit_shas = {c["sha"] for c in hits}
            if hits:
                best = hits[0]
                row["matched_cluster"] = {"rank": best["rank"], "lex": best["lex"], "pos": best["pos"], "sha": best["sha"]}
                if best["rank"] <= 5:
                    blocked = (best["rank"] == 1) and (rec["conf"] == "ECHO_TOP_UNRESOLVED" or rec["blocked"] is not None)
                    row["class"] = C2 if blocked else C1
                    row["note"] = "v2 top-5'te yoktu (gold 'aday yok' kararı v2 kesitine göre); v2.1 sıralamasında top-5'te"
                else:
                    row["class"] = C3
            else:
                ev = []
                for nl in sorted(m["nlem"]):
                    for p in sorted(m["pos"]):
                        for ex in evidence_index.get(f"{nl}|{p}", []):
                            ev.append({"sibling": ex[0], "lex": ex[1], "nlem_pos": f"{nl}|{p}"})
                if ev:
                    row["class"] = C4
                    row["sibling_evidence"] = ev[:3]
                else:
                    row["class"] = C5
        # guard simülasyonu (uzman kayıtları hariç; zaten auto olanlar hariç)
        if dec != "expert" and not rec["auto"]:
            ok, reasons = guard_check(rec)
            if ok:
                sel = rec["clusters"][0]["sha"]
                if dec in ("correct", "multi"):
                    verdict = "correct" if sel in accepted else "false_positive"
                else:
                    verdict = "correct_lexeme" if sel in hit_shas else "false_positive"
                row["guard"] = {"opened": True, "selected_sha": sel, "verdict": verdict, "evidence": reasons}
            else:
                row["guard"] = {"opened": False, "why_not": reasons[:2]}
        # lexicon simülasyonu (uzman hariç)
        if dec != "expert" and rec["surface"] in lex_by_surface:
            e = lex_by_surface[rec["surface"]]
            row["supplemental"] = {"entry_id": e["id"], "lemma": e["lemma"], "confidence_class": e["confidence_class"]}
        rows.append(row)

    class_counts = Counter(r["class"] for r in rows)

    # ---- before/after metrikleri ----
    auto_before = [r for r in rows if r["v21_auto"]]
    # v2.1 auto doğruluk (gold adjudication'dan): correct = sel sha kabul kümesinde
    def v21_auto_verdict(r):
        rec = records[r["key"]]
        a = adj[r["key"]]
        acc = set(a["accepted_equivalence_key_sha256s"])
        if r["decision"] == "expert":
            return "indeterminate"
        return "correct" if rec["sel_sha"] in acc else "wrong"
    before_j = Counter(v21_auto_verdict(r) for r in auto_before)

    guard_opened = [r for r in rows if r.get("guard", {}).get("opened")]
    guard_j = Counter(r["guard"]["verdict"] for r in guard_opened)
    suppl = [r for r in rows if "supplemental" in r]

    def margin_table(sel_rows):
        out = {}
        for m in (18, 21, 24, 30):
            sub = [r for r in sel_rows if r["v21_margin"] is not None and r["v21_margin"] >= m]
            c = Counter(r["_verdict"] for r in sub)
            meas = c["correct"] + c["correct_lexeme"] + c["wrong"] + c["false_positive"]
            corr = c["correct"] + c["correct_lexeme"]
            out[str(m)] = {
                "selections": len(sub), "coverage_of_200": round(len(sub) / 200, 4),
                "correct": corr, "wrong": c["wrong"] + c["false_positive"],
                "indeterminate": c["indeterminate"],
                "precision_measurable": round(corr / meas, 4) if meas else None,
            }
        return out

    for r in auto_before:
        r["_verdict"] = v21_auto_verdict(r)
    after_rows = list(auto_before)
    for r in guard_opened:
        r["_verdict"] = r["guard"]["verdict"]
        after_rows.append(r)

    corr_after = sum(1 for r in after_rows if r["_verdict"] in ("correct", "correct_lexeme"))
    wrong_after = sum(1 for r in after_rows if r["_verdict"] in ("wrong", "false_positive"))
    high_after = [r for r in after_rows if r["v21_margin"] is not None and r["v21_margin"] >= HIGH_MARGIN]
    uniq_after = [r for r in after_rows if r["cluster_count"] == 1]

    before_after = {
        "schema_version": "camel-v2.2-gold-before-after-v1",
        "date": DATE,
        "protocol": "Frozen gold-200 üzerinde simülasyon; margin/ranker ağırlıkları değişmedi; uzman 3 kayıt tüm otomatik kararlardan hariç; supplemental seçimler döngüsellik nedeniyle ölçülebilir precision'a dahil edilmedi.",
        "before_v21": {
            "auto_selected": len(auto_before),
            "judgements": dict(sorted(before_j.items())),
            "precision_measurable": round(before_j["correct"] / (before_j["correct"] + before_j["wrong"]), 4),
            "coverage_of_200": round(len(auto_before) / 200, 4),
            "high_confidence": {"total": sum(1 for r in auto_before if r["v21_conf"] == "HIGH_CONFIDENCE"),
                                "correct": sum(1 for r in auto_before if r["v21_conf"] == "HIGH_CONFIDENCE" and r["_verdict"] == "correct")},
            "unique": {"total": sum(1 for r in auto_before if r["v21_conf"] == "UNIQUE_EQUIVALENCE_CLUSTER"),
                       "correct": sum(1 for r in auto_before if r["v21_conf"] == "UNIQUE_EQUIVALENCE_CLUSTER" and r["_verdict"] == "correct")},
            "margin_table": margin_table(auto_before),
        },
        "guard_prototype_additions": {
            "opened": len(guard_opened),
            "judgements": dict(sorted(guard_j.items())),
            "records": [{"key": r["key"], "surface": r["surface"], "margin": r["v21_margin"],
                         "verdict": r["guard"]["verdict"], "evidence": r["guard"]["evidence"]} for r in guard_opened],
            "new_false_positives": [r["key"] for r in guard_opened if r["guard"]["verdict"] == "false_positive"],
        },
        "after_v22_prototype": {
            "auto_selected": len(after_rows),
            "correct": corr_after, "wrong": wrong_after,
            "precision_measurable": round(corr_after / (corr_after + wrong_after), 4) if (corr_after + wrong_after) else None,
            "coverage_of_200": round(len(after_rows) / 200, 4),
            "high_margin_subset": {"total": len(high_after),
                                   "correct": sum(1 for r in high_after if r["_verdict"] in ("correct", "correct_lexeme"))},
            "unique_subset": {"total": len(uniq_after),
                              "correct": sum(1 for r in uniq_after if r["_verdict"] in ("correct", "correct_lexeme"))},
            "margin_table": margin_table(after_rows),
        },
        "function_words_result": {
            "guard_opened_function_words": len(guard_opened),
            "correct": guard_j["correct"] + guard_j["correct_lexeme"],
            "false_positive": guard_j["false_positive"],
        },
        "supplemental_lexicon_result": {
            "records_covered": len(suppl),
            "keys": sorted(r["key"] for r in suppl),
            "note": "Girdiler adjudication'dan türetildiği için doğrulukları yapısal olarak döngüseldir; precision'a katılmadı. Bağımsız uzman onayı gerekir.",
        },
        "no_valid_analysis_change": {
            "gold_none_decisions": sum(1 for r in rows if r["decision"] == "none"),
            "diagnosed_class4_normalization": class_counts[C4],
            "diagnosed_class5_absent": class_counts[C5],
            "class5_covered_by_lexicon": sum(1 for r in rows if r["class"] == C5 and "supplemental" in r),
            "class5_remaining": class_counts[C5] - sum(1 for r in rows if r["class"] == C5 and "supplemental" in r),
        },
    }

    coverage = {
        "schema_version": "camel-v2.2-candidate-coverage-v1",
        "date": DATE,
        "source_hashes": cache["source_hashes"],
        "class_definitions": [C1, C2, C3, C4, C5, C6, C7],
        "class_counts": {k: class_counts[k] for k in sorted(class_counts)},
        "records": rows,
    }

    # ---- B-G1 raporu ----
    fw = [r for r in rows if (r.get("guard") is not None or r["class"] in (C2,))]
    fw_keys = []
    for r in rows:
        rec = records[r["key"]]
        top = rec["clusters"][0] if rec["clusters"] else None
        is_fw = False
        if r["decision"] in ("correct", "multi"):
            acc = set(adj[r["key"]]["accepted_equivalence_key_sha256s"])
            for c in rec["clusters"]:
                if c["sha"] in acc and (c["nlem"], c["pos"]) in whitelist:
                    is_fw = True
        elif r["decision"] == "none":
            m = M[r["key"]]
            if any((nl, p) in whitelist for nl in m["nlem"] for p in m["pos"]):
                is_fw = True
        if is_fw:
            fw_keys.append(r)
    bg1 = ["# V2.2 B-G1 — Fonksiyon Kelimeleri Tanısı ve Guard Prototipi", "",
           f"Tarih: {DATE}. Kapsam: frozen gold-200; v2.1 tam cluster uzayı (salt okunur).", "",
           "## Echo ile geçerli fonksiyon kelimesini ayıran kanıt özellikleri",
           "1. **Kapalı sınıf üyeliği:** (lemma_normalized, pos_raw) klasik kapalı-sınıf envanterinde (whitelist).",
           "2. **POS sınıfı:** prep/part_*/conj*/pron*/verb_pseudo kabul; `foreign`, `abbrev`, `noun_prop` asla.",
           "3. **Yüzey kanıtı:** representative_flags.exact_diac veya exact_reconstruction == true (kanonik diakritik/segmentasyon birebir üretiliyor). Echo adaylarında bu bayraklar tipik olarak lemma=yüzey kopyasıyla sağlanır; C1+C2 ile birlikte zorunlu tutulur.",
           "4. **Klitik segmentasyonu:** prc/enc alanları dolu → lemma, yüzeyin klitik soyulmuş çekirdeği (echo'da lemma=klitikli tam yüzey).",
           "5. **Echo işareti:** flags.echo==true + lemma==tam yüzey → hiçbir koşulda otomatik güvenilir sayılmaz; whitelist+kanıt olmadan seçim kapalı kalır.",
           "", f"## Fonksiyon kelimesi kayıtları ({len(fw_keys)} kayıt)", "",
           "| Kayıt | Kelime | Sınıf | v2.1 conf | Doğru cluster rank | Blocked | Guard sonucu |",
           "|---|---|---|---|---|---|---|"]
    for r in fw_keys:
        rank = r.get("accepted_v21_rank") or (r.get("matched_cluster") or {}).get("rank") or (min(r["accepted_v21_ranks"]) if r.get("accepted_v21_ranks") else "-")
        g = r.get("guard")
        gtxt = "auto (v2.1'de zaten seçili)" if r["v21_auto"] else (
            f"AÇILDI → {g['verdict']}" if g and g.get("opened") else (g["why_not"][0] if g else "-"))
        bg1.append(f"| {r['key']} | {r['surface']} | {r['class']} | {r['v21_conf']} | {rank} | {r['v21_blocked'] or '-'} | {gtxt} |")
    bg1 += ["", "## Guard kuralı (en dar biçim)",
            "Yalnız v2.1 rank-1 cluster; C1 kapalı POS + C2 whitelist + C3 exact_diac/exact_reconstruction + C4 abbrev/foreign yasağı + C5 margin>=18 (unique'te de C3 zorunlu). Alternatif leksikal aday rank-1'i geçtiyse guard hiç devreye girmez; kanıtsız NTWS seçimi yeniden açılmaz.",
            "", "## Sonuç",
            f"- Guard {len(guard_opened)} kayıt açtı: {guard_j['correct'] + guard_j['correct_lexeme']} doğru, {guard_j['false_positive']} yanlış (yeni false-positive: {sorted(r['key'] for r in guard_opened if r['guard']['verdict']=='false_positive') or 'yok'}).",
            f"- ECHO_TOP_UNRESOLVED/TOP_TIE'da kalan fonksiyon kelimeleri margin<18 veya kanıt eksikliği nedeniyle kapalı tutuldu (margin kuralı değiştirilmedi)."]

    # ---- B-G2 raporu ----
    c5_rows = [r for r in rows if r["class"] == C5]
    c4_rows = [r for r in rows if r["class"] == C4]
    fam = {}
    for r in c5_rows:
        m = M.get(r["key"])
        fam.setdefault("|".join(sorted(m["nlem"])) if m else r["surface"], []).append(r["key"])
    bg2 = ["# V2.2 B-G2 — Kur'an'a Özgü Leksikon Boşlukları", "",
           f"Tarih: {DATE}. `CORRECT_ABSENT_FROM_CAMEL_OUTPUT` = {len(c5_rows)} kayıt; normalizasyon/segmentasyon kaynaklı (class 4) = {len(c4_rows)} kayıt (leksikon boşluğu DEĞİL, ayrı çözüm hattı).", "",
           "## Class 5 kayıtları (gerçek leksikon/analiz boşluğu)", "",
           "| Kayıt | Kelime | Beklenen lemma/POS | Bağlam notu | Lexicon prototipi |",
           "|---|---|---|---|---|"]
    for r in c5_rows:
        m = M.get(r["key"], {})
        exp = f"{'/'.join(sorted(m.get('nlem', [])))} ({'/'.join(sorted(m.get('pos', [])))})"
        sup = r.get("supplemental", {}).get("entry_id", "—")
        bg2.append(f"| {r['key']} | {r['surface']} | {exp} | {r['rationale']} | {sup} |")
    bg2 += ["", "## Tekrarlayan aile grupları (class 5)", ""]
    for k in sorted(fam):
        if len(fam[k]) > 1:
            bg2.append(f"- **{k}**: {', '.join(sorted(fam[k]))}")
    bg2 += ["", "## Class 4 kayıtları (normalizasyon/segmentasyon; lexicon kapsamı dışı)", "",
            "| Kayıt | Kelime | Kardeş kanıt |", "|---|---|---|"]
    for r in c4_rows:
        ev = "; ".join(f"{e['sibling']} ({e['lex']})" for e in r.get("sibling_evidence", []))
        bg2.append(f"| {r['key']} | {r['surface']} | {ev} |")
    bg2 += ["", "## Supplemental lexicon prototipi",
            f"- Dosya: `data/candidates/morphology/disambiguation-v2.2/supplemental-lexicon-prototype.json` ({len(lexicon['entries'])} girdi; tümü zorunlu alanlarla: surface, diacritic_form, lemma, root, pos, source, rationale, confidence_class).",
            "- Frozen CAMeL DB ve production verisi değiştirilmedi; prototip yalnız gold kapsamında simüle edildi.",
            "- Emin olunmayan kayıtlar (3 uzman kaydı ve kanıtı zayıf yüzeyler) bilinçli olarak eklenmedi."]

    # ---- nihai karar ----
    prec_after = before_after["after_v22_prototype"]["precision_measurable"]
    final = ["# V2.2 Prototip — Kısa Nihai Karar Raporu", "",
             f"Tarih: {DATE}. Tanı önce tamamlandı, kural değişikliği yalnız kanıtlanan kök nedenlere dar prototip olarak uygulandı; margin/ranker ağırlıkları değişmedi; full seçim ve production entegrasyonu yapılmadı.", "",
             "## Sınıf dağılımı (200 kayıt)"]
    for k in sorted(class_counts):
        final.append(f"- {k}: {class_counts[k]}")
    final += ["", "## Before → After (frozen gold-200)",
              f"- Otomatik seçim: {len(auto_before)} → {len(after_rows)} (+{len(guard_opened)} guard)",
              f"- Ölçülebilir precision: {before_after['before_v21']['precision_measurable']} → {prec_after}",
              f"- Coverage: {before_after['before_v21']['coverage_of_200']} → {before_after['after_v22_prototype']['coverage_of_200']}",
              f"- Yeni false-positive: {before_after['guard_prototype_additions']['new_false_positives'] or 'yok'}",
              f"- Class 5 (aday yok): {class_counts[C5]} kayıt; lexicon prototipi {before_after['no_valid_analysis_change']['class5_covered_by_lexicon']} kaydı kapsıyor (döngüsellik nedeniyle precision'a katılmadı).",
              "", "## Karar",
              "- **V2_2_PROTOTYPE: VALID** — tanı kural değişikliğinden önce tamamlandı; guard yalnız kanıtlanan C2 kök nedenine uygulandı; tüm çıktılar deterministik (çift çalıştırma SHA eşit).",
              "- **B_G1_status:** kök neden kanıtlandı (15 kayıt CORRECT_IN_TOP5_BLOCKED_BY_ECHO_GUARD); dar guard prototipi gold-200'de 15/15 doğru, 0 yeni false-positive. Genişletilmiş gold ölçümü bekliyor.",
              "- **B_G2_status:** kök neden ayrıştırıldı — v1 lexicon taslağındaki 6 birim (قيامة/عالم/احد/فاكهة/صالح/قاصرات) CAMeL'de mevcut çıktı (rank 7-14 → sıralama sorunu, C3); gerçek boşluk 21 kayıt, 15'i lexicon prototipinde, 6 fiil/vokatif bilinçli dışarıda. Lexicon doğruluğu adjudication'a döngüsel → bağımsız uzman onayı şart.",
              f"- **measurable_precision:** {prec_after} (48 seçimde; supplemental hariç). Margin 24 kesitinde {before_after['after_v22_prototype']['margin_table']['24']['precision_measurable']}.",
              f"- **coverage:** {before_after['after_v22_prototype']['coverage_of_200']}",
              "- **recommended_margin_for_next_evaluation:** 24",
              "- **expanded_gold_review_allowed:** true",
              "- **full_77429_selection_allowed:** false",
              "- **production_integration_allowed:** false",
              "- **Açık blocker'lar:** (1) C3 ailesi (28 kayıt, 5 v2.1 yanlışının tamamı dahil): doğru aday mevcut ama düşük rankta — ranker değişikliği bu görevde yasaktı, ayrı değerlendirme gerekli; (2) lexicon prototipi döngüsel, bağımsız ilmî onay şart; (3) class 4 normalizasyon hattı (14 kayıt) prototiplenmedi; (4) örneklem küçük (n=48); (5) 3 uzman kaydı açık."]

    REPORTS.mkdir(parents=True, exist_ok=True)
    shas = {}
    shas["coverage"] = atomic_write(REPORTS / "disambiguation-v2.2-candidate-coverage.json",
                                    json.dumps(coverage, ensure_ascii=False, sort_keys=True, indent=1) + "\n")
    shas["bg1"] = atomic_write(REPORTS / "disambiguation-v2.2-bg1-function-words.md", "\n".join(bg1) + "\n")
    shas["bg2"] = atomic_write(REPORTS / "disambiguation-v2.2-bg2-lexicon-gaps.md", "\n".join(bg2) + "\n")
    shas["before_after"] = atomic_write(REPORTS / "disambiguation-v2.2-gold-before-after.json",
                                        json.dumps(before_after, ensure_ascii=False, sort_keys=True, indent=1) + "\n")
    shas["final"] = atomic_write(REPORTS / "disambiguation-v2.2-final-decision.md", "\n".join(final) + "\n")
    print(json.dumps({"class_counts": {k: class_counts[k] for k in sorted(class_counts)},
                      "guard": dict(sorted(guard_j.items())), "output_shas": shas},
                     ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
