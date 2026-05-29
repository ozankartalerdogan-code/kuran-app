#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DB veri düzeltme scripti — 4 sorun grubu:
  1. Bozuk meal metinleri  : 1→ı, _→ş, 0→İ (PDF/OCR kaynaklı)
  2. ASCII çift taglar     : rizik/rızık, tevekkul/tevekkül, kiyamet/kıyamet
  3. dua-* ASCII taglar    : dua-sabir, dua-tovbe, dua-bagislanma, dua-sifa, dua-sukur, dua-rizik
  4. Şapkalı karakter taglar: günahkâr, kâfir, ihlâs, ilahî_* vb.

Kullanım:
  python3 fix_db_data.py           # canlı çalıştır
  python3 fix_db_data.py --dry-run # sadece raporla, değiştirme
"""
import sqlite3, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

ROOT    = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "app.db"
DRY_RUN = "--dry-run" in sys.argv

# ─── Encoding yardımcıları ────────────────────────────────────────────────────

_TR_LETTERS = frozenset(
    "abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ"
)
_APOSTROPHES = frozenset("'''")


def _is_tr(c: str) -> bool:
    return c in _TR_LETTERS


def fix_meal(text: str) -> str:
    """
    Bozuk OCR/PDF meal metnini düzelt.

    Bilinen korupsyon kalıpları:
      ı  (U+0131) → 1   (rakam bir)
      ş  (U+015F) → _   (alt çizgi)
      İ  (U+0130) → 0   (rakam sıfır, kelime başında)

    Ğ silinmesi otomatik düzeltilemez; o nedenle atlanır.
    """
    if not text:
        return text

    chars = list(text)
    n     = len(chars)

    for i, ch in enumerate(chars):
        prev = chars[i - 1] if i > 0 else ""
        nxt  = chars[i + 1] if i < n - 1 else ""

        # ── 1 → ı ────────────────────────────────────────────────────────────
        if ch == "1":
            # Solunda rakam varsa bırak (örn. "2:1", "12.", "10.")
            if prev.isdigit():
                continue
            # En az bir tarafı Türkçe harf veya kesme işareti ise → ı
            # Not: nxt bir digit olsa bile (örn. "t11n") değiştir;
            #      bir sonraki iterasyonda o da düzelir (prev=ı → letter)
            left_ok  = _is_tr(prev) or prev in _APOSTROPHES
            right_ok = _is_tr(nxt)  or nxt  in _APOSTROPHES or nxt == "1"
            if left_ok or right_ok:
                chars[i] = "ı"

        # ── _ → ş ────────────────────────────────────────────────────────────
        elif ch == "_":
            # Sol ya da sağ tarafı Türkçe harf ise → ş
            if _is_tr(prev) or _is_tr(nxt):
                chars[i] = "ş"

        # ── 0 → İ ────────────────────────────────────────────────────────────
        elif ch == "0":
            # Kelime başında (öncesi boşluk/satırbaşı/tırnak/yok) + sonrası harf → İ
            word_start = not prev or prev in ' \n\t"\'('
            if word_start and _is_tr(nxt):
                chars[i] = "İ"

    return "".join(chars)


# ─── Tag düzeltme haritaları ──────────────────────────────────────────────────

# 2. ASCII çift taglar → doğru Türkçe karşılıkları
ASCII_TAG_MAP = {
    "rizik":    "rızık",
    "tevekkul": "tevekkül",
    "kiyamet":  "kıyamet",
}

# 3. dua-* ASCII → Türkçe
DUA_TAG_MAP = {
    "dua-sabir":      "dua-sabır",
    "dua-tovbe":      "dua-tövbe",
    "dua-bagislanma": "dua-bağışlanma",
    "dua-sifa":       "dua-şifa",
    "dua-sukur":      "dua-şükür",
    "dua-rizik":      "dua-rızık",
}

# 4. Şapkalı → düz Türkçe
SAPKALI_TAG_MAP = {
    "günahkâr":        "günahkar",
    "hatemün_enbiyâ":  "hatemün_enbiya",
    "ihlâs":           "ihlas",
    "ilahî takdir":    "ilahi_takdir",
    "ilahî_güç":       "ilahi_guc",
    "ilahî_irade":     "ilahi_irade",
    "ilahî_yardım":    "ilahi_yardim",
    "kâfir":           "kafir",
    "yakîn":           "yakin",
}

ALL_TAG_MAPS = {**ASCII_TAG_MAP, **DUA_TAG_MAP, **SAPKALI_TAG_MAP}


# ─── Ana düzeltme fonksiyonu ──────────────────────────────────────────────────

def run() -> None:
    mode = "DRY-RUN" if DRY_RUN else "CANLI"
    print(f"=== fix_db_data.py [{mode}] ===\n")

    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode=WAL")
    db.row_factory = sqlite3.Row

    # ──────────────────────────────────────────────────────────────────────────
    # BÖLÜM 1: Bozuk meal düzeltme
    # ──────────────────────────────────────────────────────────────────────────
    print("── BÖLÜM 1: Bozuk meal metinleri ──")

    rows = db.execute(
        "SELECT verse_key, primary_translation FROM verses ORDER BY verse_key"
    ).fetchall()

    meal_fixes: list[tuple[str, str, str]] = []   # (verse_key, eski, yeni)

    for row in rows:
        old = row["primary_translation"] or ""
        new = fix_meal(old)
        if new != old:
            meal_fixes.append((row["verse_key"], old, new))

    print(f"  Düzeltilecek ayet: {len(meal_fixes)}")

    if meal_fixes:
        # İlk 5 örnek göster
        for vk, old, new in meal_fixes[:5]:
            old_snip = old[:80].replace("\n", " ")
            new_snip = new[:80].replace("\n", " ")
            print(f"  {vk}")
            print(f"    ESKİ: {old_snip}")
            print(f"    YENİ: {new_snip}")
        if len(meal_fixes) > 5:
            print(f"  ... ve {len(meal_fixes)-5} ayet daha")

    if not DRY_RUN and meal_fixes:
        for vk, _, new in meal_fixes:
            db.execute(
                "UPDATE verses SET primary_translation=? WHERE verse_key=?",
                (new, vk)
            )
        print(f"  ✓ {len(meal_fixes)} ayet güncellendi")

        # FTS tablosunu güncelle
        print("  FTS ayet_fts güncelleniyor...")
        db.execute("DELETE FROM ayet_fts")
        db.execute("""
            INSERT INTO ayet_fts (verse_key, surah_id, ayah_number, meal, literal, tags)
            SELECT
                v.verse_key,
                v.surah_id,
                v.ayah_number,
                v.primary_translation,
                v.literal_ceviri,
                COALESCE(
                    (SELECT GROUP_CONCAT(tag, ' ')
                     FROM verse_tag_items vi
                     WHERE vi.verse_key = v.verse_key),
                    ''
                )
            FROM verses v
        """)
        print(f"  ✓ FTS yeniden dolduruldu")

    # ──────────────────────────────────────────────────────────────────────────
    # BÖLÜM 2-4: Tag düzeltmeleri
    # ──────────────────────────────────────────────────────────────────────────
    print()
    print("── BÖLÜM 2-4: Tag düzeltmeleri ──")

    tag_stats: dict[str, int] = {}

    for old_tag, new_tag in ALL_TAG_MAPS.items():
        count = db.execute(
            "SELECT COUNT(*) FROM verse_tag_items WHERE tag=?", (old_tag,)
        ).fetchone()[0]

        if count == 0:
            continue

        tag_stats[old_tag] = count

        # Hedef tag zaten bazı ayetlerde var mı?
        existing_keys = {
            r["verse_key"] for r in db.execute(
                "SELECT verse_key FROM verse_tag_items WHERE tag=?", (new_tag,)
            )
        }
        source_keys = {
            r["verse_key"] for r in db.execute(
                "SELECT verse_key FROM verse_tag_items WHERE tag=?", (old_tag,)
            )
        }

        to_insert  = source_keys - existing_keys   # yeni eklenecek
        to_delete  = source_keys                    # kaynaktan silinecek

        group = ("ASCII çift" if old_tag in ASCII_TAG_MAP
                 else "dua-* ASCII" if old_tag in DUA_TAG_MAP
                 else "şapkalı")

        print(f"  [{group}] '{old_tag}' → '{new_tag}' "
              f"({count} kayıt; ekle={len(to_insert)}, sil={len(to_delete)})")

        if not DRY_RUN:
            # Önce çakışmayanları yeni tag ile ekle
            if to_insert:
                db.executemany(
                    "INSERT OR IGNORE INTO verse_tag_items(verse_key,tag) VALUES(?,?)",
                    [(vk, new_tag) for vk in to_insert]
                )
            # Eski tag satırlarını sil
            db.execute("DELETE FROM verse_tag_items WHERE tag=?", (old_tag,))

    if not DRY_RUN:
        db.commit()
        print(f"\n  ✓ Tag düzeltmeleri kaydedildi")
    else:
        print("\n  (dry-run: hiçbir şey yazılmadı)")

    # ──────────────────────────────────────────────────────────────────────────
    # ÖZET
    # ──────────────────────────────────────────────────────────────────────────
    print()
    print("=== ÖZET ===")
    print(f"  Bozuk meal   : {len(meal_fixes)} ayet {'düzeltildi ✓' if not DRY_RUN else '(dry-run)'}")
    print(f"  Tag düzeltme : {len(tag_stats)} farklı tag {'güncellendi ✓' if not DRY_RUN else '(dry-run)'}")
    for t, c in tag_stats.items():
        print(f"    {t} ({c}) → {ALL_TAG_MAPS[t]}")

    db.close()


if __name__ == "__main__":
    run()
