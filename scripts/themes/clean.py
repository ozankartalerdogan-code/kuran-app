"""Tema etiketleri temizliği: taxonomy.migration'ı DB KOPYASINA uygular.

- level1: migration/normalize ile eşle; taksonomide olmayan -> NULL
- level2: migration (eşle/birleştir/sil) + ASCII normalize ile ikizleri birleştir;
  taksonomide olmayan sıradan etiket silinir; kürasyonlu namaz-/korunma-/ismiazam-/dua-
  etiketleri (eşleme yoksa) aynen korunur.
- verse_tags.alt_taglar ve verse_tag_items aynı kümeye senkronlanır (birleşim);
  isim/aciklama korunur.
- verse_tags.ana_tema NULL serbest olacak şekilde şema yeniden kurulur.

Örnek:
  python scripts/themes/clean.py --dry-run --lenient
  python scripts/themes/clean.py --taxonomy content/themes/taxonomy.json --out data/app.themes.db --force
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402


def plan_clean(vt: dict, items: dict, tax: C.Taxonomy):
    """-> (new_vt {vk: (ana|None, [tags])}, new_items {vk: {tag: (isim, acik)}}, report dict)"""
    rep = {"l1": Counter(), "l2": Counter(), "l1_unknown": Counter(), "l2_unknown": Counter(),
           "l1_map": Counter(), "l2_map": Counter()}
    new_vt, new_items = {}, {}
    for vk in sorted(set(vt) | set(items), key=_vk_sort):
        ana, alts = vt.get(vk, (None, []))
        new_ana, why = tax.map_l1(ana)
        rep["l1"][why] += 1
        if why == "unknown":
            rep["l1_unknown"][ana] += 1
        elif why in ("migrated", "normalized") and new_ana != ana:
            rep["l1_map"][f"{ana} -> {new_ana}"] += 1

        old_items = items.get(vk, {})
        merged: list[str] = []
        meta: dict[str, tuple] = {}
        # sıra: önce alt_taglar, sonra yalnız item'da olanlar
        for tag in C.dedupe(list(alts) + list(old_items)):
            new, why2 = tax.map_l2(tag)
            rep["l2"][why2] += 1
            if why2 == "unknown":
                rep["l2_unknown"][tag] += 1
            elif why2 in ("migrated", "normalized") and new != tag:
                rep["l2_map"][f"{tag} -> {new}"] += 1
            if new is None:
                continue
            if new not in merged:
                merged.append(new)
            isim, acik = old_items.get(tag, (None, None))
            pi, pa = meta.get(new, (None, None))
            meta[new] = (pi or isim, pa or acik)
        new_vt[vk] = (new_ana, merged)
        if merged:
            new_items[vk] = {t: meta.get(t, (None, None)) for t in merged}
    return new_vt, new_items, rep


def _vk_sort(vk: str):
    try:
        a, b = vk.split(":")
        return int(a), int(b)
    except ValueError:
        return 10**9, vk


def write_state(conn: sqlite3.Connection, new_vt: dict, new_items: dict, only_keys=None) -> None:
    """verse_tags + verse_tag_items'ı yeni duruma göre yazar (only_keys=None: tümü)."""
    conn.execute("BEGIN")
    keys = list(new_vt) if only_keys is None else list(only_keys)
    if only_keys is None:
        conn.execute("DELETE FROM verse_tag_items")
    else:
        conn.executemany("DELETE FROM verse_tag_items WHERE verse_key = ?", [(k,) for k in keys])
    conn.executemany(
        """INSERT INTO verse_tags (verse_key, ana_tema, alt_taglar, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(verse_key) DO UPDATE SET ana_tema = excluded.ana_tema,
             alt_taglar = excluded.alt_taglar, updated_at = CURRENT_TIMESTAMP""",
        [(k, new_vt[k][0], json.dumps(new_vt[k][1], ensure_ascii=False)) for k in keys])
    rows = [(k, t, im[0], im[1]) for k in keys for t, im in new_items.get(k, {}).items()]
    conn.executemany("INSERT INTO verse_tag_items (verse_key, tag, isim, aciklama) VALUES (?,?,?,?)", rows)
    conn.execute("COMMIT")


def print_stats(title: str, st: dict) -> None:
    print(f"\n== {title} ==")
    for k, v in st.items():
        print(f"  {k:32s} {v}")


def main(argv=None) -> int:
    C.stdout_utf8()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=str(C.DEFAULT_DB), help="kaynak DB (okunur)")
    ap.add_argument("--out", default=None, help=f"çıktı DB (varsayılan {C.DEFAULT_OUT_DB})")
    ap.add_argument("--taxonomy", default=None, help="taxonomy.json (varsayılan gerçek, yoksa placeholder)")
    ap.add_argument("--in-place", action="store_true", help="kaynağa yaz (dikkat!)")
    ap.add_argument("--force", action="store_true", help="çıktı DB varsa üzerine yaz")
    ap.add_argument("--dry-run", action="store_true", help="yazmadan özet")
    ap.add_argument("--lenient", action="store_true", help="taksonomi hatalarında durma")
    ap.add_argument("--top", type=int, default=15, help="raporda gösterilecek örnek sayısı")
    a = ap.parse_args(argv)

    tax = C.load_taxonomy(a.taxonomy)
    print(f"Taksonomi: {tax.path} (level1={len(tax.l1)}, level2={len(tax.l2)}, "
          f"mig1={len(tax.mig1)}, mig2={len(tax.mig2)}{', PLACEHOLDER' if tax.is_placeholder else ''})")
    src = Path(a.db)
    with C.open_ro(src) as ro:
        vt, items = C.load_tag_state(ro)
    db_tags = {t for _, al in vt.values() for t in al} | {t for d in items.values() for t in d}
    C.check_or_exit(tax, db_tags, a.lenient)

    before = C.drift_stats(vt, items, tax)
    new_vt, new_items, rep = plan_clean(vt, items, tax)
    after = C.drift_stats(new_vt, new_items, tax)
    print_stats("ÖNCE", before)
    print_stats("SONRA (plan)", after)
    print("\nlevel1 kararları:", dict(rep["l1"]))
    print("level2 kararları:", dict(rep["l2"]))
    for name in ("l1_map", "l1_unknown", "l2_map", "l2_unknown"):
        if rep[name]:
            top = ", ".join(f"{k} ({v})" for k, v in rep[name].most_common(a.top))
            print(f"{name} [{len(rep[name])}]: {top}")
    chg = sum(1 for k in new_vt if vt.get(k, (None, []))[0] != new_vt[k][0] or vt.get(k, (None, []))[1] != new_vt[k][1])
    print(f"\nDeğişecek ayet: {chg} / {len(new_vt)}")

    if a.dry_run:
        print("--dry-run: yazılmadı.")
        return 0
    out = C.prepare_output_db(src, Path(a.out) if a.out else None, a.in_place, a.force)
    conn = sqlite3.connect(out, isolation_level=None)
    try:
        if C.ensure_nullable_schema(conn):
            print("verse_tags şeması: ana_tema nullable yapıldı.")
        write_state(conn, new_vt, new_items)
        vt2, it2 = C.load_tag_state(conn)
        final = C.drift_stats(vt2, it2, tax)
    finally:
        conn.close()
    print_stats(f"YAZILDI: {out}", final)
    if final["drift_alt_not_items"] or final["drift_items_not_alt"]:
        print("UYARI: drift sıfır değil!")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
