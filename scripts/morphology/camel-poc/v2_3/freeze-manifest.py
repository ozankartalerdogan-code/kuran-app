#!/usr/bin/env python3
"""V2.3 freeze manifesti: ranker/config ve ilgili tüm kod + girdilerin SHA-256 dondurması.

Bu manifest, unbiased holdout adjudication'ı ÜRETİLMEDEN önce yazılır. Manifest yazıldıktan
sonra listelenen dosyalarda değişiklik yapılmaz; holdout değerlendirmesi ancak bundan sonra çalışır.

Kullanım: python freeze-manifest.py [--verify]
"""
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
V23_DIR = Path(__file__).resolve().parent
DATA = ROOT / "data/candidates/morphology/disambiguation-v2.3"
OUT = DATA / "v2_3-freeze-manifest.json"
DATE = "2026-07-20"

FROZEN_FILES = [
    # v2.3 kod
    "scripts/morphology/camel-poc/v2_3/extract-eval1000.py",
    "scripts/morphology/camel-poc/v2_3/build-eval-packages.py",
    "scripts/morphology/camel-poc/v2_3/print-package-batch.py",
    "scripts/morphology/camel-poc/v2_3/finalize-adjudication.py",
    "scripts/morphology/camel-poc/v2_3/extract-rule-conflict-flags.py",
    "scripts/morphology/camel-poc/v2_3/analyze-c3-root-cause.py",
    "scripts/morphology/camel-poc/v2_3/rank-contextual-candidates-v2_3.py",
    "scripts/morphology/camel-poc/v2_3/ablation-dev.py",
    "scripts/morphology/camel-poc/v2_3/evaluate-holdout.py",
    # v2.3 config + ranker çıktısı
    "data/candidates/morphology/disambiguation-v2.3/v2_3-config.json",
    "data/candidates/morphology/disambiguation-v2.3/ranked-eval-set-v2_3.json",
    # girdiler
    "data/candidates/morphology/disambiguation-v2.3/eval1000-cache.json",
    "data/candidates/morphology/disambiguation-v2.3/rule-conflict-flags.json",
    "data/candidates/morphology/disambiguation-v2.3/eval-packages-manifest.json",
    "data/candidates/morphology/disambiguation-v2.3/holdout-unbiased-200.jsonl",
    "data/candidates/morphology/disambiguation-v2.3/diagnostic-targeted-200.jsonl",
    "data/candidates/morphology/disambiguation-v2.3/diagnostic-adjudication.jsonl",
    "data/candidates/morphology/gold-adjudication/adjudicated-gold-v1.jsonl",
    "data/candidates/morphology/disambiguation-v2.2/function-word-guard-prototype.json",
    "data/candidates/morphology/disambiguation-v2.1/ranked-eval-set.jsonl",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    verify = "--verify" in sys.argv[1:]
    hashes = {rel: sha256_file(ROOT / rel) for rel in FROZEN_FILES}
    if verify:
        manifest = json.load(open(OUT, encoding="utf-8"))
        mismatches = {rel: h for rel, h in hashes.items() if manifest["frozen_sha256"].get(rel) != h}
        if mismatches:
            print(json.dumps({"status": "FROZEN_FILES_CHANGED", "mismatches": mismatches}, ensure_ascii=True, indent=1))
            sys.exit(1)
        print(json.dumps({"status": "freeze_verified", "files": len(hashes)}, ensure_ascii=True))
        return
    assert not (DATA / "holdout-adjudication.jsonl").exists(), \
        "holdout adjudication zaten mevcut — freeze holdout etiketlerinden önce yapılmalıydı"
    manifest = {
        "schema_version": "camel-v2.3-freeze-manifest-v1",
        "date": DATE,
        "statement": "Bu manifest yazıldığı anda holdout-adjudication.jsonl mevcut değildi; unbiased holdout etiketleri okunmadan ranker/config/kod donduruldu.",
        "frozen_sha256": hashes,
    }
    text = json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=1) + "\n"
    tmp = OUT.with_suffix(OUT.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, OUT)
    print(json.dumps({"status": "frozen", "files": len(hashes),
                      "manifest_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()}, ensure_ascii=True, indent=1))


if __name__ == "__main__":
    main()
