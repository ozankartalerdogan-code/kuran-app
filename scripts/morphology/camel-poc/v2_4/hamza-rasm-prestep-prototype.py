#!/usr/bin/env python3
"""CAMeL lookup ONCESI tersinir hemze/rasm normalizasyon on-adimi (PROTOTIP).

Amac: legacy cevabi CAMeL adaylarinda bulunmayan 18 NORMALIZATION_MISMATCH kaydinda,
Uthmani rasm'a ozgu tasiyicisiz hemze / sessiz-harf yuzeylerini standart imla lookup
bicimine cevirerek CAMeL aday uretiminin iyilesip iyilesmedigini olcmek.

Bu bir PROTOTIP olcumudur. Hicbir frozen dosya, canonical token, ranker, margin,
lexicon, candidate generator veya production verisi DEGISTIRILMEZ. On-adim yalniz
lookup icin ek analiz formu uretir; canonical token oldugu gibi korunur ve her
donusum kaynak span'i ile birlikte kaydedilerek tersinir tutulur.

Donusum kurallari (deterministik, sirali):
  R1 sessiz-harf: U+06E5 (kucuk vav) ve U+06E6 (kucuk ye) silinir.
  R2 yer-tutucu tasiyici: U+0640 (tatweel) + U+0654 ciftinde tatweel bir hemze
     yer-tutucusudur; cift, gercek bir hemze tasiyicisi ile degistirilir
     (sonrasinda elif/hancerli elif geliyorsa "آ", aksi halde "ئ").
  R3 ciplak hemze U+0621: sonrasinda elif/hancerli elif varsa cift "آ" olur;
     aksi halde onceki kisa unluye gore tasiyici secilir (damme -> "ؤ",
     otesi -> "ئ").
  R4 kalan tasiyicisiz U+0654: onceki harfe gercek tasiyici olarak birlestirilir
     (elif->أ, vav->ؤ, ye/elif-maksura->ئ); tasiyici yoksa "ئ".

On-adim ciktisi, DEGISTIRILMEMIS frozen build_analysis_forms() hattina beslenir;
uretilen tum formlar CAMeL'e sorulur.

Kabul kapisi (yuzey rekonstruksiyonu): bir aday yalniz `diac` alani, canonical token
ile ayni indirgeme (reduce) altinda esitse gecerli sayilir. Legacy lemma ortusmesi
AYRI raporlanir ve kabul kapisi olarak KULLANILMAZ.

Kullanim (CAMeL venv python'u ile):
  data/candidates/morphology/camel-morph-msa-v1.0/.venv/Scripts/python.exe \
    scripts/morphology/camel-poc/v2_4/hamza-rasm-prestep-prototype.py
"""
import hashlib
import importlib.util
import json
import os
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
POC = ROOT / "scripts/morphology/camel-poc"
MORPH = ROOT / "data/candidates/morphology"
V23 = MORPH / "disambiguation-v2.3"
REPORTS = MORPH / "reports"

SMALL_WAW = "ۥ"
SMALL_YEH = "ۦ"
TATWEEL = "ـ"
COMBINING_HAMZA = "ٔ"
BARE_HAMZA = "ء"
DAGGER_ALIF = "ٰ"
ALIF_LIKE = {"ا", "آ", "أ", "إ", "ٱ", DAGGER_ALIF}
DAMMA = "ُ"
QURAN_SIGNS = frozenset(chr(cp) for cp in range(0x06D6, 0x06EE))


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module  # dataclass tanimlari modulun kayitli olmasini gerektirir
    spec.loader.exec_module(module)
    return module


common = _load("disambiguation_common", POC / "disambiguation_common.py")
token_map_mod = _load("build_token_map", POC / "build-token-map.py")


def atomic_write(path: Path, text: str) -> str:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def reduce_surface(text: str) -> str:
    """Yuzey karsilastirma indirgemesi: hemze tasiyicisi ve elif varyantlarindan bagimsiz iskelet."""
    out = []
    for ch in text:
        if ch in {TATWEEL, COMBINING_HAMZA} or ch in QURAN_SIGNS:
            continue
        if ch == DAGGER_ALIF:
            out.append("ا")
            continue
        if unicodedata.category(ch).startswith("M"):
            continue
        if ch in {"آ", "أ", "إ", "ٱ"}:
            out.append("ا")
        elif ch in {"ؤ", "ئ"}:
            out.append(BARE_HAMZA)
        elif ch == "ى":
            out.append("ي")
        else:
            out.append(ch)
    result = "".join(out)
    while BARE_HAMZA + "ا" in result:
        result = result.replace(BARE_HAMZA + "ا", "ا")
    return result


def _next_letter(text: str, index: int) -> str | None:
    for ch in text[index + 1:]:
        if unicodedata.category(ch).startswith("M") or ch in QURAN_SIGNS or ch == TATWEEL:
            continue
        return ch
    return None


def _prev_mark(text: str, index: int) -> str | None:
    for ch in reversed(text[:index]):
        if unicodedata.category(ch).startswith("M"):
            return ch
        if ch in QURAN_SIGNS or ch == TATWEEL:
            continue
        return None
    return None


def _absorb_through_alif(text: str, start: int, skip: int) -> int:
    """start+skip'ten itibaren ilk elif-benzeri harfi de kapsayan tuketim uzunlugu."""
    cursor = start + skip
    while cursor < len(text) and text[cursor] not in ALIF_LIKE:
        cursor += 1
    return cursor - start + 1 if cursor < len(text) else skip


MAX_VARIANTS = 8


def hamza_rasm_prestep(text: str) -> tuple[list[str], list[dict]]:
    """Tersinir on-adim. Doner: (lookup_formlari, operations).

    Tasiyicinin dilbilimsel olarak belirsiz oldugu yerlerde (hemze + elif dizisi
    sozcuk govdesinin basinda "آ", govde icinde "ئا" olur) tek bir tahmin yapilmaz;
    her iki varyant da uretilir ve secim CAMeL sozlugu ile yuzey rekonstruksiyon
    kapisina birakilir. Her varyant ayni indirgemeye (reduce_surface) sahiptir.
    """
    variants: list[list[str]] = [[]]
    ops: list[dict] = []
    index = 0

    def extend(choices: list[str]) -> None:
        nonlocal variants
        if len(choices) == 1:
            for v in variants:
                v.append(choices[0])
            return
        expanded = []
        for v in variants:
            for choice in choices:
                expanded.append(v + [choice])
        variants = expanded[:MAX_VARIANTS]

    while index < len(text):
        ch = text[index]
        if ch in {SMALL_WAW, SMALL_YEH}:
            ops.append({"rule": "R1_silent_letter_mark", "source": [index, index + 1],
                        "from": ch, "to": ""})
            index += 1
            continue
        if ch == TATWEEL and index + 1 < len(text) and text[index + 1] == COMBINING_HAMZA:
            following = _next_letter(text, index + 1)
            if following in ALIF_LIKE:
                consumed = _absorb_through_alif(text, index, 2)
                choices = ["آ", "ئ" + following]
            else:
                consumed, choices = 2, ["ئ"]
            ops.append({"rule": "R2_placeholder_carrier", "source": [index, index + consumed],
                        "from": text[index:index + consumed], "to": choices})
            extend(choices)
            index += consumed
            continue
        if ch == BARE_HAMZA:
            following = _next_letter(text, index)
            if following in ALIF_LIKE:
                consumed = _absorb_through_alif(text, index, 1)
                choices = ["آ", "ئ" + following]
                ops.append({"rule": "R3_bare_hamza_before_alif", "source": [index, index + consumed],
                            "from": text[index:index + consumed], "to": choices})
                extend(choices)
                index += consumed
                continue
            choices = ["ؤ"] if _prev_mark(text, index) == DAMMA else ["ئ"]
            ops.append({"rule": "R3_bare_hamza_medial", "source": [index, index + 1],
                        "from": ch, "to": choices})
            extend(choices)
            index += 1
            continue
        if ch == COMBINING_HAMZA:
            carrier_map = {"ا": "أ", "و": "ؤ", "ي": "ئ", "ى": "ئ"}
            previous = variants[0][-1] if variants[0] else None
            if previous in carrier_map:
                replacement = carrier_map[previous]
                for v in variants:
                    v[-1] = replacement
                ops.append({"rule": "R4_combining_hamza_compose", "source": [index, index + 1],
                            "from": previous + ch, "to": [replacement]})
            else:
                extend(["ئ"])
                ops.append({"rule": "R4_combining_hamza_standalone", "source": [index, index + 1],
                            "from": ch, "to": ["ئ"]})
            index += 1
            continue
        extend([ch])
        index += 1

    forms, seen = [], set()
    for v in variants:
        form = "".join(v)
        if form not in seen:
            seen.add(form)
            forms.append(form)
    return forms, ops


def analyze_forms(analyzer, source_texts: list[str]) -> list[dict]:
    candidates: dict[str, dict] = {}
    for source_text in source_texts:
        forms, _traces = token_map_mod.build_analysis_forms(source_text)
        for form in forms:
            for candidate in analyzer.analyze(form):
                candidates.setdefault(common.candidate_signature(dict(candidate)), dict(candidate))
    return list(candidates.values())


def main() -> None:
    classification = [json.loads(line) for line in
                      open(V23 / "legacy-not-in-candidates-classification.jsonl", encoding="utf-8")]
    targets = [r for r in classification if r["classification"] == "NORMALIZATION_MISMATCH"]
    cache = json.load(open(V23 / "eval1000-cache.json", encoding="utf-8"))["records"]
    silver = {json.loads(line)["key"]: json.loads(line)
              for line in open(V23 / "holdout-legacy-silver.jsonl", encoding="utf-8")}

    analyzer = common.load_camel_analyzer()

    records = []
    improved = wrong_transform = legacy_lemma_hit = 0
    for row in sorted(targets, key=lambda r: r["key"]):
        key = row["key"]
        canonical = row["canonical_text"]
        lookup_forms, ops = hamza_rasm_prestep(canonical)
        transformed = bool(ops)
        baseline_valid = sum(1 for c in cache[key]["clusters"] if c["pos"] != "foreign")
        candidates = analyze_forms(analyzer, lookup_forms) if transformed else []
        canonical_reduced = reduce_surface(canonical)
        accepted = [c for c in candidates if reduce_surface(c.get("diac") or "") == canonical_reduced]
        legacy_lemma = common.strip_marks(silver[key]["legacy"]["lemma"] or "")
        lemma_match = any(common.strip_marks(c.get("lex") or "") == legacy_lemma for c in accepted)
        if accepted and baseline_valid == 0:
            improved += 1
        if transformed and candidates and not accepted:
            wrong_transform += 1
        if lemma_match:
            legacy_lemma_hit += 1
        records.append({
            "key": key, "canonical_text": canonical, "lookup_forms": lookup_forms,
            "rules_applied": sorted({o["rule"] for o in ops}), "operations": ops,
            "baseline_valid_candidates": baseline_valid,
            "prestep_candidates": len(candidates),
            "prestep_accepted_candidates": len(accepted),
            "accepted_lexes": sorted({c.get("lex") for c in accepted})[:8],
            "legacy_lemma": silver[key]["legacy"]["lemma"],
            "legacy_lemma_in_accepted": lemma_match,
            "improved": bool(accepted) and baseline_valid == 0,
        })

    # Regresyon kontrolu: on-adim, hedef karakter icermeyen tokenlarda birebir kimlik olmali.
    holdout_keys = json.load(open(V23 / "eval-packages-manifest.json", encoding="utf-8"))["holdout_keys"]
    target_chars = {SMALL_WAW, SMALL_YEH, BARE_HAMZA, COMBINING_HAMZA}
    identity_violations = []
    changed_with_existing_candidates = []
    for key in sorted(holdout_keys):
        canonical = cache[key]["surface"]
        lookup_forms, ops = hamza_rasm_prestep(canonical)
        has_target = bool(target_chars & set(canonical))
        if not has_target and (ops or lookup_forms != [canonical]):
            identity_violations.append(key)
        if ops and sum(1 for c in cache[key]["clusters"] if c["pos"] != "foreign") > 0:
            changed_with_existing_candidates.append(key)

    summary = {
        "schema_version": "camel-hamza-rasm-prestep-prototype-v1",
        "scope": "18 NORMALIZATION_MISMATCH holdout kaydi; on-adim yalniz lookup formu uretir",
        "rules": {
            "R1_silent_letter_mark": "U+06E5 / U+06E6 silinir",
            "R2_placeholder_carrier": ("U+0640+U+0654 -> gercek tasiyici; elif oncesi belirsiz oldugundan "
                                       "hem 'آ' hem 'ئ'+elif varyanti uretilir, aksi halde 'ئ'"),
            "R3_bare_hamza": ("U+0621 + elif -> hem 'آ' hem 'ئ'+elif varyanti; aksi halde onceki unluye "
                              "gore 'ؤ'/'ئ'"),
            "R4_combining_hamza": "kalan U+0654 onceki harfe tasiyici olarak birlestirilir",
        },
        "targets": len(records),
        "records_transformed": sum(1 for r in records if r["rules_applied"]),
        "records_with_accepted_candidates": sum(1 for r in records if r["prestep_accepted_candidates"] > 0),
        "improved_from_zero_valid": improved,
        "wrong_transform_candidates_but_none_accepted": wrong_transform,
        "legacy_lemma_recovered_in_accepted": legacy_lemma_hit,
        "regression": {
            "holdout_tokens_checked": len(holdout_keys),
            "identity_violations_on_untargeted_tokens": len(identity_violations),
            "identity_violation_keys": identity_violations[:20],
            "transformed_tokens_that_already_had_valid_candidates": len(changed_with_existing_candidates),
            "note": ("On-adim yalniz EK lookup formu uretir; mevcut adaylar hicbir kosulda kaybolmaz. "
                     "Kabul kapisi yuzey rekonstruksiyonudur; legacy lemma ortusmesi ayri raporlanir "
                     "ve kapi olarak kullanilmaz."),
        },
        "constraints": {"canonical_token_modified": "HAYIR", "frozen_files_modified": "HAYIR",
                        "ranker_or_margin_modified": "HAYIR", "lexicon_modified": "HAYIR",
                        "production_data_modified": "HAYIR", "holdout_metrics_recomputed": "HAYIR"},
    }

    jsonl_text = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
                         for r in records)
    shas = {
        "jsonl": atomic_write(V23 / "hamza-rasm-prestep-prototype.jsonl", jsonl_text),
        "summary": atomic_write(REPORTS / "hamza-rasm-prestep-prototype-summary.json",
                                json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=1) + "\n"),
    }
    print(json.dumps({"summary": summary, "output_sha256": shas}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
