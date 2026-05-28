"""
Literal çeviri anomali dedektörü.

3 anomali türünü tarar:
  1. SLASH    — literal_ceviri içinde "/" işareti (anlam belirsizliği aktarımı)
  2. HAM_ANLAM — meaning_tr'deki virgüllü/eğik çizgili ham değerler literal'e geçmiş
  3. KELIME_CORBASI — Türkçe ek almadan ardı ardına 3+ "çıplak" kelime dizisi

Çıktı: data/kok_literal_anomali_raporu.csv
"""

import sqlite3, csv, re, sys
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(__file__).parent.parent / "data" / "app.db"
OUTPUT  = Path(__file__).parent.parent / "data" / "kok_literal_anomali_raporu.csv"

# ── Türkçe çekim eki sonu kalıpları ──────────────────────────────────────────
# Bir kelimenin sonunda bunlardan biri varsa → çekimli (inflected)
_EKLER = re.compile(
    r"(nda|nde|ndan|nden|nın|nin|nun|nün|na|ne|nı|ni|nu|nü|"     # iyelik+hal
    r"daki|deki|taki|teki|"                                          # -daki
    r"arak|erek|mış|miş|muş|müş|"                                   # zarf-fiil
    r"iyor|ıyor|uyor|üyor|yor|"                                      # şimdiki
    r"dır|dir|dur|dür|tır|tir|tur|tür|"                             # ek-fiil
    r"lar|ler|lık|lik|luk|lük|"                                      # çoğul/türev
    r"yla|yle|la|le|"                                                 # araç hali (uzun önce)
    r"dan|den|tan|ten|"                                               # çıkma hali
    r"da|de|ta|te|"                                                   # bulunma hali
    r"dı|di|du|dü|tı|ti|tu|tü|"                                     # geçmiş
    r"sa|se|"                                                         # koşul
    r"ca|ce|cı|ci|cu|cü|"                                            # eşitlik/zarf
    r"lı|li|lu|lü|sız|siz|suz|süz|"                                  # türev
    r"ın|in|un|ün|"                                                   # tamlayan hali
    r"ya|ye)$",                                                       # yönelme hali (kısa)
    re.IGNORECASE,
)

# 1-3 harfli kelimeler ve yaygın edatlar → çıplak kontrol dışı
_KISA_VEYA_EDAT = re.compile(
    r"^(ve|da|de|ki|ya|ne|bu|o|bir|ile|ile|hem|ama|ya|mi|mı|mu|"
    r"mü|çok|az|en|hiç|her|artık|hep|daha|ise|değil|ancak|"
    r"hayır|evet|şüphesiz|gerçekten|andolsun|işte|lakin)$",
    re.IGNORECASE,
)


def cekimli_mi(kelime: str) -> bool:
    """Kelime Türkçe çekim eki almış mı?"""
    k = kelime.strip(".,;:!?\"'()[]")
    if not k or len(k) <= 3:
        return True   # kısa → muaf
    if _KISA_VEYA_EDAT.match(k):
        return True
    return bool(_EKLER.search(k))


def kelime_corbasi_bul(literal: str, esik: int = 3) -> str | None:
    """
    Arka arkaya `esik` veya daha fazla çıplak (çekimsiz) kelime varsa
    o kelime grubunu döner, yoksa None.
    """
    tokenler = literal.split()
    sayac = 0
    gruplar = []
    for tok in tokenler:
        # Slash veya virgül içeren token → ham anlam, bu kontrolde say
        if "/" in tok or ("," in tok and len(tok) > 4):
            sayac += 1
            gruplar.append(tok)
        elif not cekimli_mi(tok):
            sayac += 1
            gruplar.append(tok)
        else:
            if sayac >= esik:
                return " ".join(gruplar[-sayac:])
            sayac = 0
            gruplar = []
    if sayac >= esik:
        return " ".join(gruplar[-sayac:])
    return None


def slash_var_mi(literal: str) -> bool:
    return "/" in literal


def ham_anlam_var_mi(literal: str, meaning_set: set[str]) -> str | None:
    """
    words tablosundaki virgüllü/eğik çizgili meaning_tr değerlerinden biri
    literal içinde birebir geçiyor mu?
    """
    for m in meaning_set:
        if ("/" in m or ("," in m and m.startswith("-"))) and m in literal:
            return m
    return None


def meaning_tr_setini_olustur(conn: sqlite3.Connection) -> dict[str, set[str]]:
    """verse_key → {meaning_tr, ...} haritası (sorunlu anlamlar dahil)"""
    cur = conn.cursor()
    cur.execute(
        "SELECT verse_key, meaning_tr FROM words "
        "WHERE meaning_tr IS NOT NULL AND meaning_tr != '' "
        "ORDER BY verse_key, word_index"
    )
    sonuc: dict[str, set[str]] = defaultdict(set)
    for vk, mt in cur.fetchall():
        sonuc[vk].add(mt)
    return sonuc


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Tüm ayetleri ve literal çeviriyi çek
    cur.execute("""
        SELECT v.verse_key, v.arabic_text, v.literal_ceviri,
               t.text AS meal
        FROM verses v
        LEFT JOIN translations t
               ON v.verse_key = t.verse_key AND t.source = 'yazir'
        WHERE v.literal_ceviri IS NOT NULL AND TRIM(v.literal_ceviri) != ''
        ORDER BY v.surah_id, v.ayah_number
    """)
    ayetler = cur.fetchall()

    # Kelime anlamlarını yükle
    meaning_haritasi = meaning_tr_setini_olustur(conn)

    # words tablosundan words_meanings için özet (rapor sütunu için)
    cur.execute("""
        SELECT verse_key,
               GROUP_CONCAT(meaning_tr, ' | ') AS meanings
        FROM (
            SELECT verse_key, meaning_tr FROM words
            WHERE meaning_tr IS NOT NULL
            ORDER BY verse_key, word_index
        )
        GROUP BY verse_key
    """)
    words_meanings_harita: dict[str, str] = {r[0]: r[1] for r in cur.fetchall()}
    conn.close()

    # ── Anomali taraması ─────────────────────────────────────────────────────
    satirlar: list[dict] = []

    say_slash    = 0
    say_ham      = 0
    say_corba    = 0
    say_coklu    = 0   # birden fazla anomali aynı ayette

    for ayet in ayetler:
        vk      = ayet["verse_key"]
        literal = ayet["literal_ceviri"] or ""
        meanings = meaning_haritasi.get(vk, set())

        anomaliler: list[str] = []

        # 1. Slash
        if slash_var_mi(literal):
            anomaliler.append("SLASH: kesme islaret (/) literal ceviri icinde")
            say_slash += 1

        # 2. Ham anlam aktarımı
        ham = ham_anlam_var_mi(literal, meanings)
        if ham:
            anomaliler.append(f"HAM_ANLAM: '{ham[:40]}' birebir kopyalanmış")
            say_ham += 1

        # 3. Kelime çorbası
        corba = kelime_corbasi_bul(literal, esik=3)
        if corba:
            anomaliler.append(f"KELIME_CORBASI: '...{corba[:50]}...' çekimsiz dizi")
            say_corba += 1

        if not anomaliler:
            continue

        if len(anomaliler) > 1:
            say_coklu += 1

        satirlar.append({
            "verse_key":     vk,
            "verse_arabic":  (ayet["arabic_text"] or "")[:80],
            "words_meanings": (words_meanings_harita.get(vk, ""))[:200],
            "literal_ceviri": literal[:200],
            "anomali_nedeni": " || ".join(anomaliler),
        })

    # ── CSV kaydet ────────────────────────────────────────────────────────────
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["verse_key", "verse_arabic", "words_meanings",
                  "literal_ceviri", "anomali_nedeni"]
    with open(OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(satirlar)

    toplam = len(satirlar)

    # ── Terminal raporu ───────────────────────────────────────────────────────
    print(f"\n{'='*62}")
    print(f"  LİTERAL ÇEVİRİ ANOMALİ RAPORU")
    print(f"{'='*62}")
    print(f"  Taranan ayet           : {len(ayetler)}")
    print(f"  Anomalili ayet         : {toplam}  (%{toplam/len(ayetler)*100:.1f})")
    print(f"  {'─'*40}")
    print(f"  SLASH (/)              : {say_slash}")
    print(f"  HAM_ANLAM              : {say_ham}")
    print(f"  KELIME_CORBASI         : {say_corba}")
    print(f"  Birden fazla anomali   : {say_coklu}")
    print(f"\n  CSV: {OUTPUT}")

    # En kötü 15 örnek
    print(f"\n{'─'*62}")
    print(f"  İlk 15 anomalili ayet:")
    print(f"{'─'*62}")
    for s in satirlar[:15]:
        print(f"  {s['verse_key']:<8}  {s['anomali_nedeni'][:60]}")
        print(f"  {'':8}  {s['literal_ceviri'][:70]}")
        print()


if __name__ == "__main__":
    main()
