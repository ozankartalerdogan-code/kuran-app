#!/usr/bin/env python3
"""Legacy cevabi CAMeL adaylarinda olmayan 21 holdout kaydini kok nedene gore siniflar.

Girdi: holdout-legacy-silver.jsonl (salt okunur, degistirilmez) + eval1000-cache.json.
Hicbir frozen/ranker/candidate-generator/production dosyasi degismez; yalniz mevcut
token yuzeyi, CAMeL'in ürettigi tam cluster listesi ve legacy alanlari karsilastirilir.

Siniflar (tek alan, kesin kanit yoksa LEGACY_UNCERTAIN):
- LEXICON_MISSING: legacy kok bos + pos=N (ozel isim benzeri) VE token'da Uthmani'ye
  ozgu hemze/sessiz-harf isareti yok -> CAMeL'in sozlugunde muhtemelen hic yok.
- NORMALIZATION_MISMATCH: token yuzeyinde tasiyicisiz hemze (U+0621 cikilcik hemze veya
  U+0654 tasiyicisiz birlesik hemze-ustu) ya da Uthmani sessiz-harf isareti (U+06E5 kucuk
  vav, U+06E6 kucuk ye) var -> CAMeL sozlugu/normalizer'i standart imla formunu bekliyor.
- SEGMENTATION_DIFFERENCE: yukaridaki hemze/sessiz-harf kanitlari yok AMA legacy
  morfolojisi 2+ yigilmis zamir eki (SUFF) gosteriyor -> CAMeL segmenter'i cok-ekli
  zincirleri uretemiyor olabilir.
- LEGACY_UNCERTAIN: yukaridaki hicbir kanit yok (varsayilan, kesin kanit gerektirir).

Kullanim: python classify-legacy-not-in-candidates.py
"""
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
V23 = ROOT / "data/candidates/morphology/disambiguation-v2.3"
REPORTS = ROOT / "data/candidates/morphology/reports"
SILVER = V23 / "holdout-legacy-silver.jsonl"
CACHE = V23 / "eval1000-cache.json"

BARE_HAMZA = 0x0621
CARRIERLESS_COMBINING_HAMZA = 0x0654
SILENT_LETTER_MARKS = {0x06E5, 0x06E6}  # small high waw / small high yeh


def atomic_write(path: Path, text: str) -> str:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def classify(text: str, legacy: dict) -> tuple[str, str]:
    codepoints = {ord(ch) for ch in text}
    if BARE_HAMZA in codepoints or CARRIERLESS_COMBINING_HAMZA in codepoints:
        return "NORMALIZATION_MISMATCH", "tasiyicisiz hemze (U+0621/U+0654) rasm farki"
    if codepoints & SILENT_LETTER_MARKS:
        return "NORMALIZATION_MISMATCH", "Uthmani sessiz-harf isareti (kucuk vav/ye) rasm farki"
    root = (legacy.get("root") or "").strip()
    pos = legacy.get("pos") or ""
    if not root and pos == "N":
        return "LEXICON_MISSING", "kok bos + N (ozel isim benzeri); hemze/sessiz-harf kaniti yok"
    suff_count = (legacy.get("morphology") or "").count("SUFF")
    if suff_count >= 2:
        return "SEGMENTATION_DIFFERENCE", f"{suff_count} yigilmis zamir eki (SUFF); hemze/rasm kaniti yok"
    return "LEGACY_UNCERTAIN", "ayirt edici kanit yok (varsayilan)"


def main() -> None:
    rows = [json.loads(line) for line in open(SILVER, encoding="utf-8")]
    targets = [r for r in rows if r["primary_class"] == "LEGACY_NOT_PRESENT_IN_CAMEL_CANDIDATES"]
    cache = json.load(open(CACHE, encoding="utf-8"))["records"]

    out_records = []
    for r in sorted(targets, key=lambda r: r["key"]):
        key = r["key"]
        cluster_count = len(cache[key]["clusters"])
        pos_set = sorted({c["pos"] for c in cache[key]["clusters"]})
        cls, reason = classify(r["canonical_text"], r["legacy"])
        out_records.append({
            "key": key, "verse_key": r["verse_key"], "word_index": r["word_index"],
            "canonical_text": r["canonical_text"], "uncertain": r["uncertain"],
            "legacy_lemma": r["legacy"]["lemma"], "legacy_root": r["legacy"]["root"],
            "legacy_pos": r["legacy"]["pos"], "camel_cluster_count": cluster_count,
            "camel_pos_set": pos_set, "classification": cls, "reason": reason,
        })

    from collections import Counter
    counts = dict(Counter(r["classification"] for r in out_records))
    all_foreign_or_empty = sum(1 for r in out_records if set(r["camel_pos_set"]) <= {"foreign"})

    jsonl_text = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
                         for r in out_records)
    summary = {
        "schema_version": "camel-v2.3-legacy-not-in-candidates-v1",
        "scope": "legacy silver referansinda LEGACY_NOT_PRESENT_IN_CAMEL_CANDIDATES olan 21 holdout kaydi",
        "total_records": len(out_records),
        "classification_counts": counts,
        "records_with_zero_or_foreign_only_candidates": all_foreign_or_empty,
        "root_cause": ("21 kaydin " + str(counts.get('NORMALIZATION_MISMATCH', 0)) +
                      "'i CAMeL'e tasiyicisiz hemze (bare U+0621 / carrierless U+0654) ya da " +
                      "Uthmani sessiz-harf isaretiyle (kucuk vav/ye) besleniyor; CAMeL sozlugu/" +
                      "normalizer'i standart imla (asli hemze tasiyicili) formunu bekliyor, bu yuzden " +
                      "candidate generator 0 cluster ya da yalnizca 'foreign' fallback uretiyor."),
        "next_step_recommendation": ("Candidate generator/ranker'i DEGISTIRMEDEN: CAMeL lookup'indan ONCE "
                                     "calisan, tersinir bir hemze-rasm normalizasyon on-adimi (bare ء ve "
                                     "tasiyicisiz U+0654'u standart hemze-tasiyicili imlaya cevirme) ayri "
                                     "bir deney olarak izole gelistirme/diagnostic verisinde denenmeli; "
                                     "holdout okunmadan once dondurulmus config/hash disiplinine tabi olmali."),
        "constraints": {"holdout_metrics_may_be_promoted": "HAYIR", "production_data_modified": "HAYIR"},
    }
    summary_text = json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=1) + "\n"

    shas = {
        "jsonl": atomic_write(V23 / "legacy-not-in-candidates-classification.jsonl", jsonl_text),
        "summary": atomic_write(REPORTS / "disambiguation-v2.3-legacy-not-in-candidates-summary.json", summary_text),
    }
    print(json.dumps({"counts": counts, "total": len(out_records), "output_sha256": shas}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
