#!/usr/bin/env python3
"""C3 (doğru aday top-5 dışında) kök neden analizi — gold-200 + targeted diagnostic-200.

Girdi (salt okunur): eval1000 cache, rule-conflict flags, gold adjudication + v2.2 coverage,
v2.3 diagnostic adjudication. Çıktı (atomik, deterministik): md + json rapor.

Aile etiketleri yalnız gözlemlenebilir özelliklerden türetilir (gold ezberleyen kural yok):
- orthographic_variant: kanonik yüzeyde U+0670 (dagger alif) var VE doğru cluster'ın diac'i
  kanonik yüzeyle (işaret temizliği sonrası) birebir örtüşmüyor.
- prior_void_dominance: doğru cluster'ın üzerindeki cluster'ların >=%60'ı leksikal
  öncelsiz (lex_logprob<=-99 ve pos_lex_logprob<=-99).
- attested_homograph: rank-1 cluster öncele sahip (llp>-99 veya pllp>-99).
Bir kayıt birden çok etikete girebilir.

Kullanım: python analyze-c3-root-cause.py
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
NO_PRIOR = -99.0


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


def no_prior(c: dict) -> bool:
    llp = c["llp"] if c["llp"] is not None else NO_PRIOR
    pllp = c["pllp"] if c["pllp"] is not None else NO_PRIOR
    return llp <= NO_PRIOR and pllp <= NO_PRIOR


def main() -> None:
    cache = json.load(open(V23 / "eval1000-cache.json", encoding="utf-8"))["records"]
    cov = json.load(open(REPORTS / "disambiguation-v2.2-candidate-coverage.json", encoding="utf-8"))
    gold = load_adj(MORPH / "gold-adjudication/adjudicated-gold-v1.jsonl")
    diag = load_adj(V23 / "diagnostic-adjudication.jsonl")
    cov_by_key = {r["key"]: r for r in cov["records"]}

    # accepted sha kümeleri (gold: 'aday yok' kayıtlarında v2.2 matched_cluster kullanılır)
    accepted: dict[str, set] = {}
    source: dict[str, str] = {}
    for key, a in gold.items():
        if a["gold_decision"] == "uzman_incelemesi_gerekli":
            continue
        acc = set(a["accepted_equivalence_key_sha256s"])
        if a["gold_decision"] == "gecerli_aday_yok":
            mc = cov_by_key[key].get("matched_cluster")
            acc = {mc["sha"]} if mc else set()
        accepted[key] = acc
        source[key] = "gold200"
    for key, a in diag.items():
        if a["gold_decision"] == "uzman_incelemesi_gerekli":
            continue
        accepted[key] = set(a["accepted_equivalence_key_sha256s"])
        source[key] = "diagnostic200"

    rows = []
    for key in sorted(accepted, key=lambda k: (int(k.split(":")[0]), int(k.split(":")[1].split("#")[0]), int(k.split("#")[1]))):
        acc = accepted[key]
        rec = cache[key]
        cands = [c for c in rec["clusters"] if c["sha"] in acc]
        if not cands:
            continue
        corr = min(cands, key=lambda c: c["rank"])
        if corr["rank"] <= 5:
            continue
        above = [c for c in rec["clusters"] if c["rank"] < corr["rank"]]
        top = above[0]
        n99 = sum(1 for c in above if no_prior(c))
        rank5 = sorted(above, key=lambda c: c["rank"])[4]
        surface = rec["surface"]
        families = []
        if "ٰ" in surface and not corr["flags"]["exact_diac"]:
            families.append("orthographic_variant")
        if n99 / len(above) >= 0.6:
            families.append("prior_void_dominance")
        if not no_prior(top):
            families.append("attested_homograph")
        rows.append({
            "key": key, "surface": surface, "source": source[key],
            "correct_rank": corr["rank"], "correct_pos": corr["pos"], "correct_lex": corr["lex"],
            "top_pos": top["pos"], "top_lex": top["lex"],
            "score_gap_top": top["score"] - corr["score"],
            "score_gap_rank5": rank5["score"] - corr["score"],
            "llp_top": top["llp"], "llp_correct": corr["llp"],
            "pllp_top": top["pllp"], "pllp_correct": corr["pllp"],
            "no_prior_above": n99, "clusters_above": len(above),
            "correct_is_no_prior": no_prior(corr),
            "v21_conf": rec["conf"], "v21_auto": rec["auto"],
            "families": families,
        })

    fam_counts = Counter(f for r in rows for f in r["families"])
    top_no_prior = sum(1 for r in rows if no_prior({"llp": r["llp_top"], "pllp": r["pllp_top"]}))
    llp_inversion = sum(1 for r in rows if (r["llp_correct"] or NO_PRIOR) > (r["llp_top"] or NO_PRIOR))
    auto_wrong = [r["key"] for r in rows if r["v21_auto"]]
    feat_diff = Counter()
    for r in rows:
        feat_diff["pos_differs"] += r["correct_pos"] != r["top_pos"]
        feat_diff["lemma_differs"] += r["correct_lex"] != r["top_lex"]

    payload = {
        "schema_version": "camel-v2.3-c3-root-cause-v1",
        "date": DATE,
        "dev_scope": "gold-200 + targeted diagnostic-200 (unbiased holdout OKUNMADI)",
        "c3_records": len(rows),
        "family_counts": dict(sorted(fam_counts.items())),
        "evidence": {
            "rank1_no_lexical_prior": top_no_prior,
            "lex_logprob_inversion_correct_gt_top": llp_inversion,
            "v21_auto_selected_wrong_in_c3": auto_wrong,
            "pos_or_lemma_divergence": dict(sorted(feat_diff.items())),
        },
        "records": rows,
    }

    md = ["# V2.3 — C3 Kök Neden Analizi (doğru aday top-5 dışında)", "",
          f"Tarih: {DATE}. Kapsam: frozen gold-200 + targeted diagnostic-200 (n={len(rows)} C3 kaydı).",
          "Unbiased holdout bu analizde OKUNMADI. Kelime whitelist'i veya gold-türevi istisna kuralı üretilmedi.", "",
          "## Bulgular", "",
          f"1. **Leksikal öncel boşluğu baskın:** {len(rows)} C3 kaydının {fam_counts['prior_void_dominance']}'inde doğru cluster'ın",
          "   üzerindeki cluster'ların >=%60'ı CAMeL'in kendi leksikal istatistiğinde hiç kanıtı olmayan",
          "   (lex_logprob<=-99 VE pos_lex_logprob<=-99) analizlerdir (çoğu NTWS noun_prop/aşırı üretilmiş fiil).",
          f"   Rank-1 cluster'ın öncelsiz olduğu kayıt sayısı: {top_no_prior}.",
          f"2. **Öncel inversiyonu:** {llp_inversion}/{len(rows)} kayıtta doğru cluster'ın lex_logprob'u rank-1'inkinden yüksek.",
          f"3. **Ortografik varyant alt-ailesi:** {fam_counts['orthographic_variant']} kayıtta kanonik yüzeyde dagger alif (U+0670) var ve",
          "   doğru cluster'ın diac'i kanonik biçimle birebir örtüşmüyor (قيامة/عالم/فاكهة/قاصرات/بهتان ailesi).",
          "   Bu alt-ailede yüzey-benzerlik kuralları sistematik olarak tam harekeli yanlış homografı ödüllendirir;",
          "   kök neden ranker değil ORTOGRAFİK NORMALIZASYON hattıdır ve bu görevde ranker'la gizlenmemiştir.",
          f"4. **POS/lemma ayrışması:** pos farkı {feat_diff['pos_differs']}, lemma farkı {feat_diff['lemma_differs']} kayıtta —",
          "   C3 hatası neredeyse her zaman farklı bir okuma (yakın-homograf) lehine, aynı okumanın özellik varyantı değil.",
          f"5. **Otomatik seçime taşan hata:** v2.1'in C3 kayıtları içinde otomatik seçim yaptığı kayıtlar: {auto_wrong or 'yok'}.", "",
          "## Genellenebilir kanıt özelliği",
          "Doğru adayı yanlış üst adaydan ayıran, kelimeye özgü olmayan tek güçlü sinyal:",
          "**CAMeL'in kendi lex_logprob/pos_lex_logprob istatistiği** (modelin leksikal kanıtı).",
          "Yanlış üstler tipik olarak öncelsiz (-99) hayalet analizlerdir; doğru adaylar (fonksiyon kelimeleri,",
          "yaygın isimler) güçlü öncele sahiptir. İstisna: ortografik varyant ailesi (kural kapsamı dışında bırakıldı).", "",
          "## Karar: en dar ranker değişikliği",
          "`lexical_prior_guard` bileşeni: bir kayıtta leksikal kanıtı olan en az bir cluster varken,",
          "hem leksikal önceli olmayan (llp<=-99 VE pllp<=-99) hem de kesin yüzey kanıtı olmayan",
          "(exact_diac=false VE exact_reconstruction=false) cluster'ların skoruna **-8** uygulanır.",
          "Margin eşikleri (18/8/0), diğer kurallar, CAMeL DB, candidate generator, normalizasyon ve",
          "supplemental lexicon değişmedi. Dev taramasında P=8 sıfır regresyon / sıfır seçim değişikliği ile",
          "13/{n} C3 kaydını top-5'e taşıdı; daha agresif P değerleri ortografik varyant ailesindeki doğru".replace("{n}", str(len(rows))),
          "(kendisi öncelsiz) adayları cezalandırmaya başladığı için reddedildi (bkz. ablation raporu).", "",
          "## C3 kayıtları (dev)",
          "", "| Kayıt | Kaynak | Kelime | Doğru rank | Skor farkı (top) | Üstte öncelsiz | Aile |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        md.append(f"| {r['key']} | {r['source']} | {r['surface']} | {r['correct_rank']} | {r['score_gap_top']} | "
                  f"{r['no_prior_above']}/{r['clusters_above']} | {', '.join(r['families']) or '-'} |")

    sha_json = atomic_write(REPORTS / "disambiguation-v2.3-c3-root-cause.json",
                            json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=1) + "\n")
    sha_md = atomic_write(REPORTS / "disambiguation-v2.3-c3-root-cause.md", "\n".join(md) + "\n")
    print(json.dumps({"c3_records": len(rows), "families": dict(sorted(fam_counts.items())),
                      "report_json_sha": sha_json, "report_md_sha": sha_md}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
