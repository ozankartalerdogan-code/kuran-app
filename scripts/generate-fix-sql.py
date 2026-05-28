"""
kok_anlam_karsilastir.csv dosyasından words tablosunu düzeltecek SQL scripti üretir.
Çıktı: data/fix_meaning_tr.sql

Kurallar:
  1. oran < %30  → öncelikli (CSV'deki tüm satırlar bu kapsamda)
  2. YAZIM/FORMAT FARKI → otomatik düzelt (çoğul/tekil, büyük/küçük)
  3. TAMAMEN FARKLI ANLAM, KISMI ORTUSME, BELİRSİZ/EKSİK → mod_anlam ile değiştir
  4. OLUMSUZLUK FARKI → dikkatli: transaction içinde, manuel onay için ayrı blok
"""

import csv
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

CSV_PATH = Path(__file__).parent.parent / "data" / "kok_anlam_karsilastir.csv"
SQL_PATH = Path(__file__).parent.parent / "data" / "fix_meaning_tr.sql"

# Öncelik sırası — düşük sayı = önce çalışır
NEDEN_ONCELIK = {
    "YAZIM/FORMAT FARKI":   1,
    "BELIRSIZ/EKSIK ANLAM": 2,
    "KISMI ORTUSME":        3,
    "TAMAMEN FARKLI ANLAM": 4,
    "OLUMSUZLUK FARKI":     5,
}


def esc(s: str) -> str:
    """SQLite string için tek tırnak kaç."""
    return s.replace("'", "''")


def neden_tip(fark_nedeni: str) -> str:
    for anahtar in NEDEN_ONCELIK:
        if fark_nedeni.startswith(anahtar):
            return anahtar
    return "DIGER"


def main():
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    # oran filtreleme: %30 altı
    rows = [r for r in rows if float(r["oran"].replace("%", "")) < 30.0]

    # Önceliğe göre sırala
    rows.sort(key=lambda r: (NEDEN_ONCELIK.get(neden_tip(r["fark_nedeni"]), 9),
                             r["root"], r["verse_key"], int(r["word_index"])))

    # Gruplara ayır
    yazim   = [r for r in rows if neden_tip(r["fark_nedeni"]) == "YAZIM/FORMAT FARKI"]
    belirsiz = [r for r in rows if neden_tip(r["fark_nedeni"]) == "BELIRSIZ/EKSIK ANLAM"]
    kismi   = [r for r in rows if neden_tip(r["fark_nedeni"]) == "KISMI ORTUSME"]
    tamamen = [r for r in rows if neden_tip(r["fark_nedeni"]) == "TAMAMEN FARKLI ANLAM"]
    olumsuz = [r for r in rows if neden_tip(r["fark_nedeni"]) == "OLUMSUZLUK FARKI"]

    lines = []

    def w(*args):
        lines.append(" ".join(str(a) for a in args))

    # ── BAŞLIK ────────────────────────────────────────────────────────────────
    w("-- ============================================================")
    w("-- fix_meaning_tr.sql")
    w("-- Kaynak : data/kok_anlam_karsilastir.csv")
    w(f"-- Toplam  : {len(rows)} satır ({len(yazim)} yazım, {len(tamamen)} tamamen farklı,")
    w(f"--           {len(kismi)} kısmi örtüşme, {len(belirsiz)} belirsiz, {len(olumsuz)} olumsuzluk)")
    w("-- UYARI   : Önce yedek al, sonra uygula!")
    w("-- ============================================================")
    w()

    # ── YEDEK ────────────────────────────────────────────────────────────────
    w("-- ── 1. YEDEK ─────────────────────────────────────────────────")
    w("CREATE TABLE IF NOT EXISTS words_backup_meaning AS")
    w("    SELECT id, verse_key, word_index, arabic, root, meaning_tr")
    w("    FROM words;")
    w()
    w("-- Yedekten geri yüklemek için:")
    w("-- UPDATE words SET meaning_tr = b.meaning_tr")
    w("-- FROM words_backup_meaning b")
    w("-- WHERE words.verse_key = b.verse_key AND words.word_index = b.word_index;")
    w()

    # ── KONTROL (önce) ───────────────────────────────────────────────────────
    w("-- ── 2. DÜZELTME ÖNCESİ KONTROL ──────────────────────────────")
    w("SELECT 'ONCESI' AS zaman, verse_key, word_index, arabic, meaning_tr")
    w("FROM words")
    w("WHERE (verse_key, word_index) IN (VALUES")

    # Sadece ilk 20 satırı kontrol sorgusuna ekle (örnek)
    ornek = rows[:20]
    ornek_vals = [f"    ('{esc(r['verse_key'])}', {r['word_index']})" for r in ornek]
    w(",\n".join(ornek_vals))
    w(");")
    w()

    # ── BLOK 1: YAZIM/FORMAT FARKI ───────────────────────────────────────────
    w("-- ── 3a. YAZIM/FORMAT FARKI — otomatik düzelt ─────────────────")
    w(f"-- {len(yazim)} satır (çoğul/tekil, büyük/küçük harf vb.)")
    w("BEGIN TRANSACTION; -- YAZIM")
    w()
    for r in yazim:
        w(f"UPDATE words SET meaning_tr = '{esc(r['mod_anlam'])}'")
        w(f"    WHERE verse_key = '{esc(r['verse_key'])}' AND word_index = {r['word_index']};")
        w(f"    -- {r['arabic']}  |  '{r['meaning_tr']}' -> '{r['mod_anlam']}'  [{r['fark_nedeni']}]")
        w()
    w("COMMIT; -- YAZIM")
    w()

    # ── BLOK 2: BELİRSİZ/EKSİK ──────────────────────────────────────────────
    w("-- ── 3b. BELİRSİZ/EKSİK ANLAM — otomatik düzelt ──────────────")
    w(f"-- {len(belirsiz)} satır")
    w("BEGIN TRANSACTION; -- BELIRSIZ")
    w()
    for r in belirsiz:
        w(f"UPDATE words SET meaning_tr = '{esc(r['mod_anlam'])}'")
        w(f"    WHERE verse_key = '{esc(r['verse_key'])}' AND word_index = {r['word_index']};")
        w(f"    -- {r['arabic']}  |  '{r['meaning_tr']}' -> '{r['mod_anlam']}'")
        w()
    w("COMMIT; -- BELIRSIZ")
    w()

    # ── BLOK 3: KISMİ ÖRTÜŞME ────────────────────────────────────────────────
    w("-- ── 3c. KISMI ORTUSME — mod_anlam ile değiştir ───────────────")
    w(f"-- {len(kismi)} satır  |  manuel kontrol önerilir")
    w("BEGIN TRANSACTION; -- KISMI")
    w()
    for r in kismi:
        w(f"UPDATE words SET meaning_tr = '{esc(r['mod_anlam'])}'")
        w(f"    WHERE verse_key = '{esc(r['verse_key'])}' AND word_index = {r['word_index']};")
        w(f"    -- {r['arabic']}  |  '{r['meaning_tr']}' -> '{r['mod_anlam']}'  (kök: {r['root']})")
        w()
    w("COMMIT; -- KISMI")
    w()

    # ── BLOK 4: TAMAMEN FARKLI ───────────────────────────────────────────────
    w("-- ── 3d. TAMAMEN FARKLI ANLAM ─────────────────────────────────")
    w(f"-- {len(tamamen)} satır  |  mod_anlam tüm kökteki çoğunluk")
    w("-- UYARI: aynı köke sahip ama gerçekten farklı anlam taşıyan")
    w("--        biçimler mevcut olabilir. Kök başına gözden geçir.")
    w("BEGIN TRANSACTION; -- TAMAMEN")
    w()

    mevcut_kok = None
    for r in tamamen:
        if r["root"] != mevcut_kok:
            mevcut_kok = r["root"]
            w(f"-- Kök: {r['root']}  |  mod: '{r['mod_anlam']}'  ({r['mod_sayi']}/{r['toplam']})")
        w(f"UPDATE words SET meaning_tr = '{esc(r['mod_anlam'])}'")
        w(f"    WHERE verse_key = '{esc(r['verse_key'])}' AND word_index = {r['word_index']};")
        w(f"    -- {r['arabic']}  mevcut: '{r['meaning_tr']}'")
        w()

    w("COMMIT; -- TAMAMEN")
    w()

    # ── BLOK 5: OLUMSUZLUK FARKI (dikkatli) ──────────────────────────────────
    if olumsuz:
        w("-- ── 3e. OLUMSUZLUK FARKI — MANUEL ONAY GEREKİR ─────────────")
        w(f"-- {len(olumsuz)} satır  |  anlamın olumsuzluğu değişiyor, elle doğrula!")
        w("-- Aşağıdaki satırları uncomment edip çalıştır:")
        w()
        for r in olumsuz:
            w(f"-- UPDATE words SET meaning_tr = '{esc(r['mod_anlam'])}'")
            w(f"--     WHERE verse_key = '{esc(r['verse_key'])}' AND word_index = {r['word_index']};")
            w(f"--     -- {r['arabic']}  |  '{r['meaning_tr']}' -> '{r['mod_anlam']}'")
            w()

    # ── KONTROL (sonra) ──────────────────────────────────────────────────────
    w("-- ── 4. DÜZELTME SONRASI KONTROL ──────────────────────────────")
    w("SELECT 'SONRASI' AS zaman,")
    w("       w.verse_key, w.word_index, w.arabic,")
    w("       b.meaning_tr AS eski_anlam,")
    w("       w.meaning_tr AS yeni_anlam,")
    w("       CASE WHEN w.meaning_tr = b.meaning_tr THEN 'DEGISMEDI' ELSE 'GUNCELLENDI' END AS durum")
    w("FROM words w")
    w("JOIN words_backup_meaning b")
    w("  ON w.verse_key = b.verse_key AND w.word_index = b.word_index")
    w("WHERE w.meaning_tr != b.meaning_tr")
    w("ORDER BY w.verse_key, w.word_index;")
    w()

    # ── ÖZET SORGU ───────────────────────────────────────────────────────────
    w("-- ── 5. ÖZET: kaç satır değişti? ─────────────────────────────")
    w("SELECT COUNT(*) AS guncellenen_satir")
    w("FROM words w")
    w("JOIN words_backup_meaning b")
    w("  ON w.verse_key = b.verse_key AND w.word_index = b.word_index")
    w("WHERE w.meaning_tr != b.meaning_tr;")
    w()

    # Yaz
    sql_text = "\n".join(lines)
    SQL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SQL_PATH, "w", encoding="utf-8") as f:
        f.write(sql_text)

    print(f"SQL dosyası oluşturuldu: {SQL_PATH}")
    print(f"Toplam satır: {len(rows)}")
    print(f"  YAZIM/FORMAT FARKI  : {len(yazim)}")
    print(f"  BELİRSİZ/EKSİK     : {len(belirsiz)}")
    print(f"  KISMI ÖRTÜŞME      : {len(kismi)}")
    print(f"  TAMAMEN FARKLI     : {len(tamamen)}")
    print(f"  OLUMSUZLUK FARKI   : {len(olumsuz)}")


if __name__ == "__main__":
    main()
