"""
data/fix_meaning_tr.sql dosyasını güvenli şekilde uygular ve raporlar.

Kullanım:
  python scripts/apply-fix-sql.py
  python scripts/apply-fix-sql.py --dry-run   (değişiklik yapmadan sadece say)
  python scripts/apply-fix-sql.py --db data/app.db --sql data/fix_meaning_tr.sql
"""

import sqlite3
import shutil
import re
import sys
import argparse
from datetime import datetime
from pathlib import Path

DB_PATH  = Path(__file__).parent.parent / "data" / "app.db"
SQL_PATH = Path(__file__).parent.parent / "data" / "fix_meaning_tr.sql"

# SQL dosyasındaki blok başlık desenleri → raporlama etiketleri
BLOK_DESENLERI = [
    (r"3a\. YAZIM",        "3a. YAZIM/FORMAT FARKI"),
    (r"3b\. BELİRSİZ",     "3b. BELİRSİZ/EKSİK ANLAM"),
    (r"3c\. KISMI",        "3c. KISMI ÖRTÜŞME"),
    (r"3d\. TAMAMEN",      "3d. TAMAMEN FARKLI ANLAM"),
    (r"3e\. OLUMSUZLUK",   "3e. OLUMSUZLUK FARKI (manuel)"),
]


def yedek_al(db_path: Path, dry_run: bool) -> Path:
    zaman = datetime.now().strftime("%Y%m%d_%H%M%S")
    yedek = db_path.parent / f"{db_path.name}.yedek_{zaman}"
    if not dry_run:
        shutil.copy2(db_path, yedek)
    return yedek


def bloklara_bol(sql_text: str) -> dict[str, list[str]]:
    """SQL metnini blok etiketlerine göre böler.
    Her bloğun UPDATE ifadelerini ayrı liste olarak döner."""
    satirlar = sql_text.splitlines()
    bloklar: dict[str, list[str]] = {etiket: [] for _, etiket in BLOK_DESENLERI}
    aktif_blok: str | None = None

    for satir in satirlar:
        # Blok başlığı mı?
        for desen, etiket in BLOK_DESENLERI:
            if re.search(desen, satir):
                aktif_blok = etiket
                break

        if aktif_blok and satir.strip().startswith("UPDATE"):
            bloklar[aktif_blok].append(satir.strip())

    return bloklar


def update_ifadelerini_cek(sql_text: str) -> list[str]:
    """Yorum satırı olmayan tüm UPDATE ifadelerini (çok satırlı) çeker."""
    ifadeler = []
    tampon: list[str] = []
    icinde = False

    for satir in sql_text.splitlines():
        stripped = satir.strip()
        if stripped.startswith("--"):
            continue
        if stripped.upper().startswith("UPDATE"):
            icinde = True
            tampon = [stripped]
        elif icinde:
            if stripped.endswith(";"):
                tampon.append(stripped)
                ifadeler.append(" ".join(tampon))
                tampon = []
                icinde = False
            elif stripped:
                tampon.append(stripped)

    return ifadeler


def blok_update_sayisi(bloklar: dict[str, list[str]]) -> dict[str, int]:
    return {etiket: len(satirlar) for etiket, satirlar in bloklar.items()}


def raporla(baslik: str, genislik: int = 62):
    print(f"\n{'='*genislik}")
    print(f"  {baslik}")
    print(f"{'='*genislik}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db",      default=str(DB_PATH))
    parser.add_argument("--sql",     default=str(SQL_PATH))
    parser.add_argument("--dry-run", action="store_true",
                        help="Veritabanına dokunmadan sadece sayımı göster")
    args = parser.parse_args()

    db_path  = Path(args.db)
    sql_path = Path(args.sql)

    # ── Ön kontroller ────────────────────────────────────────────
    if not db_path.exists():
        print(f"HATA: Veritabanı bulunamadı → {db_path}", file=sys.stderr)
        sys.exit(1)
    if not sql_path.exists():
        print(f"HATA: SQL dosyası bulunamadı → {sql_path}", file=sys.stderr)
        sys.exit(1)

    sql_text = sql_path.read_text(encoding="utf-8")
    update_listesi = update_ifadelerini_cek(sql_text)
    bloklar = bloklara_bol(sql_text)

    raporla("APPLY-FIX-SQL RAPORU")
    print(f"  Veritabanı : {db_path}")
    print(f"  SQL dosyası: {sql_path}")
    print(f"  Mod        : {'DRY-RUN (değişiklik yapılmayacak)' if args.dry_run else 'CANLI'}")
    print(f"  Toplam UPDATE ifadesi: {len(update_listesi)}")

    # ── Yedek ────────────────────────────────────────────────────
    yedek_yolu = yedek_al(db_path, args.dry_run)
    if args.dry_run:
        print(f"\n  Yedek: (dry-run, alınmadı)")
    else:
        print(f"\n  Yedek: {yedek_yolu}")

    if args.dry_run:
        raporla("DRY-RUN: Blok başına UPDATE sayımı")
        for etiket, satirlar in bloklar.items():
            print(f"  {etiket:<35} {len(satirlar):>5} UPDATE")
        print(f"\n  Toplam: {sum(len(s) for s in bloklar.values())} UPDATE (uygulanmadı)")
        return

    # ── Veritabanı bağlantısı ────────────────────────────────────
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    # Yedek tablo (SQL dosyasındaki CREATE TABLE IF NOT EXISTS çalıştır)
    yedek_sql = re.search(
        r"(CREATE TABLE IF NOT EXISTS words_backup_meaning.*?;)",
        sql_text, re.DOTALL
    )
    if yedek_sql:
        try:
            cur.execute(yedek_sql.group(1))
            conn.commit()
            print("  words_backup_meaning tablosu hazır.")
        except sqlite3.Error as e:
            print(f"  Yedek tablo uyarısı: {e}")

    # ── Blok başına uygulama ─────────────────────────────────────
    raporla("BLOK BAZLI UYGULAMA")

    toplam_update  = 0
    toplam_etkilenen = 0
    hata_listesi: list[str] = []

    for etiket, _ in BLOK_DESENLERI:
        # Bu bloğun UPDATE ifadelerini sql_text'ten sırayla çek
        # (bloklar dict'i sadece satır sayımı için, gerçek execution için
        #  tam ifadeyi update_listesi'nden filtreleyeceğiz)
        pass

    # Blok sınırlarını satır numarasıyla belirle
    satirlar_idx: list[tuple[int, str]] = []
    for i, satir in enumerate(sql_text.splitlines()):
        for desen, etiket in BLOK_DESENLERI:
            if re.search(desen, satir):
                satirlar_idx.append((i, etiket))

    # Her blok için UPDATE'leri çalıştır
    sql_satirlar = sql_text.splitlines()
    n = len(sql_satirlar)

    for idx_b, (satir_no, etiket) in enumerate(satirlar_idx):
        # Bir sonraki bloğun başına kadar olan satırları al
        bitis = satirlar_idx[idx_b + 1][0] if idx_b + 1 < len(satirlar_idx) else n
        blok_satirlar = sql_satirlar[satir_no:bitis]

        # Bu blok içindeki UPDATE ifadelerini çek
        blok_updates: list[str] = []
        tampon2: list[str] = []
        icinde2 = False

        for satir in blok_satirlar:
            s = satir.strip()
            if s.startswith("--") or not s:
                continue
            if s.upper().startswith("UPDATE"):
                icinde2 = True
                tampon2 = [s]
            elif icinde2:
                if s.endswith(";"):
                    tampon2.append(s)
                    blok_updates.append(" ".join(tampon2))
                    tampon2 = []
                    icinde2 = False
                else:
                    tampon2.append(s)

        if not blok_updates:
            print(f"\n  [{etiket}]")
            print(f"    UPDATE sayısı : 0  (comment'li, atlandı)")
            continue

        # Transaction içinde çalıştır
        blok_etkilenen = 0
        blok_hata = 0
        try:
            conn.execute("BEGIN")
            for sql_ifade in blok_updates:
                try:
                    cur.execute(sql_ifade)
                    blok_etkilenen += cur.rowcount
                except sqlite3.Error as e:
                    hata_listesi.append(f"{etiket}: {e} | {sql_ifade[:80]}")
                    blok_hata += 1
            conn.execute("COMMIT")
        except sqlite3.Error as e:
            conn.execute("ROLLBACK")
            hata_listesi.append(f"{etiket}: Transaction hatası: {e}")

        toplam_update   += len(blok_updates)
        toplam_etkilenen += blok_etkilenen

        print(f"\n  [{etiket}]")
        print(f"    UPDATE sayısı : {len(blok_updates)}")
        print(f"    Etkilenen satır: {blok_etkilenen}")
        if blok_hata:
            print(f"    HATA sayısı   : {blok_hata}")

    conn.close()

    # ── Genel rapor ──────────────────────────────────────────────
    raporla("GENEL SONUÇ")
    print(f"  Toplam UPDATE çalıştırıldı : {toplam_update}")
    print(f"  Toplam etkilenen satır     : {toplam_etkilenen}")
    print(f"  Toplam hata                : {len(hata_listesi)}")
    print(f"  Yedek dosyası              : {yedek_yolu}")

    if hata_listesi:
        print(f"\n  --- Hata detayları ---")
        for h in hata_listesi[:20]:
            print(f"  ✗ {h}")
        if len(hata_listesi) > 20:
            print(f"  ... ve {len(hata_listesi)-20} hata daha")

    print()


if __name__ == "__main__":
    main()
