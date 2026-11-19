"""DB + taksonomiden mobil/web paketlerini üretir (docs/denetim/tema-sozlesme.md).

  python scripts/themes/build_bundles.py --db data/app.themes.db --out-dir %TEMP%/bundles   (test)
  python scripts/themes/build_bundles.py --db data/app.themes.db                           (gerçek yollar)

Çıktılar (out-dir verilirse aynı göreli yollar onun altında):
  apps/mobile/src/data/themeTaxonomy.json
  apps/mobile/src/data/verseThemes.json   {"v":1,"t":{"1:1":["A1_...","rahmet"], "2:255":[null,"ayetel-kursi"]}}
  apps/web/src/data/themeTaxonomy.json
Taksonomi paketi: version, groups, level1, level2, migration (taxonomy.json alan sırasıyla; '_' ile başlayan
anahtarlar atılır, placeholder ise "_placeholder": true eklenir). verseThemes'e yalnız taksonomide olan
kodlar (ve kürasyonlu kodlar) yazılır; etiketsiz ayet yazılmaz.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

REL = {
    "mobile_tax": Path("apps/mobile/src/data/themeTaxonomy.json"),
    "mobile_verses": Path("apps/mobile/src/data/verseThemes.json"),
    "web_tax": Path("apps/web/src/data/themeTaxonomy.json"),
}
GROUP_KEYS = ["code", "tr", "en"]
L1_KEYS = ["code", "group", "tr", "en", "descTr", "descEn", "sensitive"]
L2_KEYS = ["code", "parents", "tr", "en", "descTr", "descEn", "sensitive"]


def _pick(e: dict, keys: list[str]) -> dict:
    return {k: e[k] for k in keys if k in e}


def taxonomy_bundle(tax: C.Taxonomy) -> dict:
    out = {"version": tax.data.get("version", 0)}
    if tax.is_placeholder:
        out["_placeholder"] = True
    out["groups"] = [_pick(g, GROUP_KEYS) for g in tax.groups]
    out["level1"] = [_pick(e, L1_KEYS) for e in tax.level1]
    out["level2"] = [_pick(e, L2_KEYS) for e in tax.level2]
    out["migration"] = {"level1": dict(tax.mig1), "level2": dict(tax.mig2)}
    return out


def verse_bundle(vt: dict, tax: C.Taxonomy, include_curated: bool = True) -> tuple[dict, dict]:
    t, stats = {}, {"dropped_l1": 0, "dropped_l2": 0}
    for k in sorted(vt, key=_vk):
        main, al = vt[k]
        if main and main not in tax.l1:
            stats["dropped_l1"] += 1
            main = None
        subs = []
        for s in al:
            if s in tax.l2 or (include_curated and C.is_curated(s)):
                if s not in subs:
                    subs.append(s)
            else:
                stats["dropped_l2"] += 1
        if main or subs:
            t[k] = [main] + subs
    return {"v": 1, "t": t}, stats


def _vk(k):
    a, b = k.split(":")
    return int(a), int(b)


def dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def main(argv=None) -> int:
    C.stdout_utf8()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=str(C.DEFAULT_OUT_DB))
    ap.add_argument("--taxonomy", default=None)
    ap.add_argument("--out-dir", default=None, help="test için; verilmezse depo içindeki gerçek yollar")
    ap.add_argument("--no-curated", action="store_true", help="kürasyonlu namaz-/dua-... kodlarını pakete koyma")
    ap.add_argument("--lenient", action="store_true")
    a = ap.parse_args(argv)

    tax = C.load_taxonomy(a.taxonomy)
    C.check_or_exit(tax, None, a.lenient)
    with C.open_ro(a.db) as conn:
        vt, _ = C.load_tag_state(conn)
    vb, stats = verse_bundle(vt, tax, not a.no_curated)
    base = Path(a.out_dir) if a.out_dir else C.REPO
    tb = dump(taxonomy_bundle(tax))
    files = {"mobile_tax": tb, "mobile_verses": dump(vb), "web_tax": tb}
    for name, txt in files.items():
        p = base / REL[name]
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(txt + "\n", encoding="utf-8", newline="\n")
        print(f"  {p}  {len(txt.encode('utf-8')) / 1024:.1f} KB")
    print(f"Ayet: {len(vb['t'])} etiketli / {len(vt)}; atılan (taksonomi dışı) level1={stats['dropped_l1']} "
          f"level2={stats['dropped_l2']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
