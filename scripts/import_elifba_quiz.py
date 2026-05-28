#!/usr/bin/env python3
"""
elifba_quiz tablosunu olusturur ve ilk 3 ders icin sorulari import eder.
"""
import json
import sqlite3
from pathlib import Path

ROOT    = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "app.db"

SORULAR = [
    # ── DERS 1: HARFLER (5 soru) ─────────────────────────────────────────────
    {
        "lesson_id": 1,
        "soru_tipi": "coktan_secmeli",
        "soru": "Asagidaki harfin Turkce adi nedir?\n\nب",
        "secenekler": ["Be", "Te", "Pe", "Fe"],
        "dogru_cevap": "Be",
        "ipucu": "Bu harf Turkce 'B' sesine karsilik gelir ve iki noktasi vardir.",
        "zorluk": 1,
    },
    {
        "lesson_id": 1,
        "soru_tipi": "coktan_secmeli",
        "soru": "'Sin' harfinin Arapca yazilisi hangisidir?",
        "secenekler": ["س", "ش", "ص", "ذ"],
        "dogru_cevap": "س",
        "ipucu": "Sin harfi uc disli gorunumuyle taninir, ucucu sesin sembolü gibidir.",
        "zorluk": 1,
    },
    {
        "lesson_id": 1,
        "soru_tipi": "coktan_secmeli",
        "soru": "Ra (ر) harfi hangi gruba girer?",
        "secenekler": ["Birlesen", "Birlesmeyen", "Cift noktali", "Uzatma harfi"],
        "dogru_cevap": "Birlesmeyen",
        "ipucu": "Ra harfi, kendinden sonra gelen harfe baglanmaz; tek yonlu baglanti alir.",
        "zorluk": 2,
    },
    {
        "lesson_id": 1,
        "soru_tipi": "coktan_secmeli",
        "soru": "ح harfinin Diyanet Elif-Ba'ya gore sesi nedir?",
        "secenekler": ["Ha (girtlaktan, ince)", "Hi (kalin)", "He (yumusak)", "Hh (surtuculü)"],
        "dogru_cevap": "Ha (girtlaktan, ince)",
        "ipucu": "ح harfi bogaz ortasindan cikar; Hı (خ) ise bogaz basindan, daha kalin.",
        "zorluk": 2,
    },
    {
        "lesson_id": 1,
        "soru_tipi": "coktan_secmeli",
        "soru": "Asagidaki harflerden hangisi 'birlesen' gruba girer?",
        "secenekler": ["Elif (ا)", "Dal (د)", "Be (ب)", "Vav (و)"],
        "dogru_cevap": "Be (ب)",
        "ipucu": "Elif, Dal ve Vav birlesmeyen harflerdir; Be ise her iki yone baglanan birlesen bir harftir.",
        "zorluk": 2,
    },
    # ── DERS 2: HARFLERİN KELİME İÇİNDE YAZILIŞLARI (5 soru) ─────────────────
    {
        "lesson_id": 2,
        "soru_tipi": "coktan_secmeli",
        "soru": "ب harfinin basta (initial) formu hangisidir?",
        "secenekler": ["بـ", "ـبـ", "ـب", "ب"],
        "dogru_cevap": "بـ",
        "ipucu": "Basta formda harf, sol tarafina baglanti seridi (tatvil) ekler; sag tarafinda tatvil olmaz.",
        "zorluk": 1,
    },
    {
        "lesson_id": 2,
        "soru_tipi": "coktan_secmeli",
        "soru": "ـسـ formu hangi pozisyonu gosterir?",
        "secenekler": ["Basta", "Ortada", "Sonda", "Tek basina"],
        "dogru_cevap": "Ortada",
        "ipucu": "Her iki yaninda baglanti cizgisi (tatvil) olan form, ortada pozisyonunu gosterir.",
        "zorluk": 1,
    },
    {
        "lesson_id": 2,
        "soru_tipi": "coktan_secmeli",
        "soru": "Dal (د) harfinin basta formu asagidakilerden hangisidir?",
        "secenekler": ["دـ", "ـدـ", "د (tek basina ile ayni)", "ـد"],
        "dogru_cevap": "د (tek basina ile ayni)",
        "ipucu": "Dal birlesmeyen bir harftir; ondan sonra gelen harfe baglanmaz, basta formu tek basinayla aynidir.",
        "zorluk": 2,
    },
    {
        "lesson_id": 2,
        "soru_tipi": "coktan_secmeli",
        "soru": "ـك formu hangi harfin sondaki bicimidir?",
        "secenekler": ["Kef (ك)", "Kaf (ق)", "Lam (ل)", "Mim (م)"],
        "dogru_cevap": "Kef (ك)",
        "ipucu": "Soldaki tatvil onceki harften gelen baglanti; sag tarafinda tatvil olmamasi 'sonda' konumunu gosterir.",
        "zorluk": 2,
    },
    {
        "lesson_id": 2,
        "soru_tipi": "coktan_secmeli",
        "soru": "ـيـ hangi harfin ortadaki bicimidir?",
        "secenekler": ["Ye (ي)", "He (ه)", "Nun (ن)", "Kef (ك)"],
        "dogru_cevap": "Ye (ي)",
        "ipucu": "Ye birlesen bir harftir; ortada iki noktasi alta konumlanir ve her iki yaninda tatvil bulunur.",
        "zorluk": 2,
    },
    # ── DERS 3: HAREKELER (5 soru) ────────────────────────────────────────────
    {
        "lesson_id": 3,
        "soru_tipi": "coktan_secmeli",
        "soru": "Fetha (ustun) harekesi harfe hangi sesi ekler?",
        "secenekler": ["A/E sesi", "I/i sesi", "U/U sesi", "Ses yok (kapali)"],
        "dogru_cevap": "A/E sesi",
        "ipucu": "Fetha harfin ustune konur ve 'A' veya 'E' sesi verir. Ornek: بَ = 'Be'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 3,
        "soru_tipi": "coktan_secmeli",
        "soru": "Kesra (esre) harekesi hangi sesi verir?",
        "secenekler": ["A sesi", "I/i sesi", "U sesi", "N sesi"],
        "dogru_cevap": "I/i sesi",
        "ipucu": "Kesra harfin altina konur ve 'I' veya 'i' sesi verir. Ornek: بِ = 'Bi'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 3,
        "soru_tipi": "coktan_secmeli",
        "soru": "Damme (otre) harekesi hangi sesi verir?",
        "secenekler": ["A sesi", "I sesi", "U/U sesi", "E sesi"],
        "dogru_cevap": "U/U sesi",
        "ipucu": "Damme harfin ustune konur ve 'U' veya 'U' sesi verir. Ornek: بُ = 'Bu'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 3,
        "soru_tipi": "coktan_secmeli",
        "soru": "بَ nasil okunur?",
        "secenekler": ["Ba", "Bi", "Bu", "Ab"],
        "dogru_cevap": "Ba",
        "ipucu": "ب (Be) + fetha (ustun) = 'Ba' sesi. Harekesi ustun oldugundan A sesi verir.",
        "zorluk": 1,
    },
    {
        "lesson_id": 3,
        "soru_tipi": "coktan_secmeli",
        "soru": "Harekeler hakkinda asagidakilerden hangisi dogrudur?",
        "secenekler": [
            "Harflerin okunmasini saglayan isaretlerdir",
            "Harflerin yazilisini degistirir",
            "Sadece Kuran'da kullanilir",
            "Uc unsuz sesten olusur",
        ],
        "dogru_cevap": "Harflerin okunmasini saglayan isaretlerdir",
        "ipucu": "Diyanet Elif-Ba tanimi: 'Harflerin okunmasini saglayan isaretlere hareke denir.'",
        "zorluk": 2,
    },
]


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")

    conn.execute("DROP TABLE IF EXISTS elifba_quiz")
    conn.execute("""
        CREATE TABLE elifba_quiz (
            quiz_id      INTEGER PRIMARY KEY,
            lesson_id    INTEGER NOT NULL REFERENCES elifba_dersler(id),
            soru_tipi    TEXT    NOT NULL DEFAULT 'coktan_secmeli',
            soru         TEXT    NOT NULL,
            secenekler   TEXT    NOT NULL,
            dogru_cevap  TEXT    NOT NULL,
            ipucu        TEXT,
            zorluk       INTEGER NOT NULL DEFAULT 1
        )
    """)

    rows = [
        (
            i + 1,
            s["lesson_id"],
            s["soru_tipi"],
            s["soru"],
            json.dumps(s["secenekler"], ensure_ascii=False),
            s["dogru_cevap"],
            s.get("ipucu"),
            s.get("zorluk", 1),
        )
        for i, s in enumerate(SORULAR)
    ]

    conn.executemany(
        "INSERT INTO elifba_quiz VALUES (?,?,?,?,?,?,?,?)",
        rows,
    )
    conn.commit()

    # Ozet
    for lesson_id in [1, 2, 3]:
        count = conn.execute(
            "SELECT COUNT(*) FROM elifba_quiz WHERE lesson_id=?", (lesson_id,)
        ).fetchone()[0]
        print(f"OK Ders {lesson_id}: {count} soru")

    conn.close()
    print(f"OK Toplam: {len(rows)} soru eklendi.")


if __name__ == "__main__":
    main()
