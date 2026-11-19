"""Kör, katmanlı denetim örneklemi + puanlayıcı (plan 3B kabul eşiği).

  python scripts/themes/audit_sample.py sample --db data/app.themes.db --n 200 --seed 42 --out data/relabel/audit.csv
  (CSV'de judgement sütununa FIT / WEAK / WRONG (veya UYGUN / ZAYIF / YANLIŞ) yazılır, note serbest)
  python scripts/themes/audit_sample.py score data/relabel/audit.csv

Katmanlar: sensitive (hassas level1/level2; fazla örneklenir), small_l2 (az kullanılan level2 içeren),
l1:<kod> (kalan ayetler, ana temaya göre orantılı; NULL dahil).
Kabul: genel ≥%90 FIT, ≤%2 WRONG; hassas satırlarda 0 WRONG.
"""
from __future__ import annotations

import argparse
import csv
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

COLS = ["id", "stratum", "verse_key", "surah", "meal", "main", "main_tr", "subs", "subs_tr", "sensitive",
        "judgement", "note"]
JUDGE = {"FIT": "FIT", "UYGUN": "FIT", "WEAK": "WEAK", "ZAYIF": "WEAK", "WRONG": "WRONG", "YANLIS": "WRONG",
         "YANLIŞ": "WRONG"}
ACCEPT = {"fit_min": 0.90, "wrong_max": 0.02, "sensitive_wrong_max": 0}


def stratify(vt: dict, tax: C.Taxonomy, small_max: int) -> dict[str, list[str]]:
    l2count = Counter(t for _, al in vt.values() for t in set(al))
    st: dict[str, list[str]] = defaultdict(list)
    for k, (main, al) in vt.items():
        if tax.is_sensitive(main) or any(tax.is_sensitive(t) for t in al):
            st["sensitive"].append(k)
        elif any(l2count[t] <= small_max and not C.is_curated(t) for t in al):
            st["small_l2"].append(k)
        else:
            st[f"l1:{main or 'NULL'}"].append(k)
    return st


def allocate(st: dict[str, list[str]], n: int, share_sens: float, share_small: float) -> dict[str, int]:
    total = sum(len(v) for v in st.values())
    n = min(n, total)
    alloc = {"sensitive": min(len(st.get("sensitive", [])), round(n * share_sens)),
             "small_l2": min(len(st.get("small_l2", [])), round(n * share_small))}
    rest = n - sum(alloc.values())
    l1s = {k: len(v) for k, v in st.items() if k.startswith("l1:")}
    tot1 = sum(l1s.values())
    if tot1:
        # en büyük kalan yöntemi
        raw = {k: rest * c / tot1 for k, c in l1s.items()}
        base = {k: min(l1s[k], int(r)) for k, r in raw.items()}
        left = rest - sum(base.values())
        for k in sorted(raw, key=lambda k: raw[k] - int(raw[k]), reverse=True):
            if left <= 0:
                break
            if base[k] < l1s[k]:
                base[k] += 1
                left -= 1
        alloc.update(base)
    # açığı (küçük katmanlar yetmezse) l1 katmanlarından kapat
    short = n - sum(alloc.values())
    for k in sorted(st, key=lambda k: -len(st[k])):
        while short > 0 and alloc.get(k, 0) < len(st[k]):
            alloc[k] = alloc.get(k, 0) + 1
            short -= 1
    return {k: v for k, v in alloc.items() if v > 0}


def sample(conn, tax: C.Taxonomy, n: int, seed: int, share_sens=0.35, share_small=0.15, small_max=10):
    vt, _ = C.load_tag_state(conn)
    vt = {k: v for k, v in vt.items() if v[0] or v[1]}  # tamamen etiketsiz ayetler denetimde yok
    st = stratify(vt, tax, small_max)
    alloc = allocate(st, n, share_sens, share_small)
    rng = random.Random(seed)
    picked = []
    for s in sorted(alloc):
        keys = sorted(st[s], key=_vk)
        picked += [(s, k) for k in rng.sample(keys, alloc[s])]
    rng.shuffle(picked)
    meal = dict(conn.execute("SELECT verse_key, text FROM translations WHERE source='yazir'"))
    sname = dict(conn.execute("SELECT id, adi_turkce FROM sureler"))
    rows = []
    for i, (s, k) in enumerate(picked, 1):
        main, al = vt[k]
        rows.append({"id": i, "stratum": s, "verse_key": k, "surah": sname.get(int(k.split(":")[0]), ""),
                     "meal": " ".join((meal.get(k) or "").split()), "main": main or "",
                     "main_tr": tax.title(main) if main else "", "subs": "|".join(al),
                     "subs_tr": "|".join(tax.title(t) for t in al),
                     "sensitive": "yes" if s == "sensitive" else "no", "judgement": "", "note": ""})
    return rows, alloc


def _vk(k):
    a, b = k.split(":")
    return int(a), int(b)


def score(rows: list[dict]) -> dict:
    def agg(rs):
        c = Counter(JUDGE.get(C.ascii_fold((r.get("judgement") or "").strip()).upper(),
                              JUDGE.get((r.get("judgement") or "").strip().upper(), "")) for r in rs)
        judged = c["FIT"] + c["WEAK"] + c["WRONG"]
        return {"n": len(rs), "judged": judged, "FIT": c["FIT"], "WEAK": c["WEAK"], "WRONG": c["WRONG"],
                "unjudged": len(rs) - judged,
                "fit_pct": c["FIT"] / judged if judged else 0.0, "wrong_pct": c["WRONG"] / judged if judged else 0.0}
    out = {"overall": agg(rows), "strata": {}, "sensitive": agg([r for r in rows if r.get("sensitive") == "yes"])}
    by = defaultdict(list)
    for r in rows:
        by[r.get("stratum", "")].append(r)
    out["strata"] = {k: agg(v) for k, v in sorted(by.items())}
    o, s = out["overall"], out["sensitive"]
    out["checks"] = {
        "fit>=90%": o["judged"] > 0 and o["fit_pct"] >= ACCEPT["fit_min"],
        "wrong<=2%": o["judged"] > 0 and o["wrong_pct"] <= ACCEPT["wrong_max"],
        "sensitive_wrong==0": s["WRONG"] <= ACCEPT["sensitive_wrong_max"],
        "all_judged": o["unjudged"] == 0,
    }
    out["pass"] = all(out["checks"].values())
    return out


def _fmt(name, a):
    return (f"  {name:34s} n={a['n']:4d} değerlendirilen={a['judged']:4d} FIT={a['FIT']:4d} "
            f"WEAK={a['WEAK']:3d} WRONG={a['WRONG']:3d}  FIT%={a['fit_pct'] * 100:5.1f} WRONG%={a['wrong_pct'] * 100:4.1f}")


def main(argv=None) -> int:
    C.stdout_utf8()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sample")
    s.add_argument("--db", default=str(C.DEFAULT_OUT_DB))
    s.add_argument("--taxonomy", default=None)
    s.add_argument("--n", type=int, default=200)
    s.add_argument("--seed", type=int, default=42)
    s.add_argument("--sensitive-share", type=float, default=0.35)
    s.add_argument("--small-share", type=float, default=0.15)
    s.add_argument("--small-max", type=int, default=10, help="'az kullanılan' level2 eşiği (ayet sayısı)")
    s.add_argument("--out", default=str(C.REPO / "data" / "relabel" / "audit.csv"))
    sc = sub.add_parser("score")
    sc.add_argument("csv")
    a = ap.parse_args(argv)

    if a.cmd == "sample":
        tax = C.load_taxonomy(a.taxonomy)
        with C.open_ro(a.db) as conn:
            rows, alloc = sample(conn, tax, a.n, a.seed, a.sensitive_share, a.small_share, a.small_max)
        out = Path(a.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=COLS)
            w.writeheader()
            w.writerows(rows)
        print(f"{len(rows)} satır -> {out}")
        print("Katman dağılımı:", dict(sorted(alloc.items(), key=lambda kv: -kv[1])))
        return 0

    with open(a.csv, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    r = score(rows)
    print(_fmt("GENEL", r["overall"]))
    print(_fmt("HASSAS", r["sensitive"]))
    for k, v in r["strata"].items():
        print(_fmt(k, v))
    for k, v in r["checks"].items():
        print(f"  [{'OK ' if v else 'X  '}] {k}")
    print("SONUÇ:", "GEÇTİ" if r["pass"] else "KALDI")
    return 0 if r["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
