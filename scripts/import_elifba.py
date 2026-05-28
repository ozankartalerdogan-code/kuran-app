#!/usr/bin/env python3
"""
Elif-Ba verilerini app.db'ye import eder.
Tablolar: elifba_harfler, elifba_dersler, elifba_harf_ders
"""
from pathlib import Path
import json
import sqlite3
import re

ROOT     = Path(__file__).resolve().parents[1]
DB_PATH  = ROOT / "data" / "app.db"
DATA_DIR = ROOT / "data"

SEVIYE = {
    1: "başlangıç", 2: "başlangıç",
    3: "temel",     4: "temel",     5: "temel",
    6: "orta",      7: "orta",      8: "orta",  9: "orta",
}

# Her konu sayfasının alıştırma sayfası
ALISTIRMA = {8: None, 9: None, 12: 13, 14: 15, 16: 17, 18: 19, 20: 21, 22: None, 23: 24}

# Konu 2'nin ek tabloları
EK_TABLOLAR = {9: [10, 11]}

# Med harfleri: elif(1), vav(26), ye(28)
MED_HARF_IDS = [1, 26, 28]


def main() -> None:
    harfler  = json.loads((DATA_DIR / "elifba_harfler.json").read_text("utf-8"))
    diyanetveri = json.loads((DATA_DIR / "diyanetelifba.json").read_text("utf-8"))

    sayfa_map: dict = {s["sayfa"]: s for s in diyanetveri["sayfalar"]}
    konular = [
        s for s in diyanetveri["sayfalar"]
        if s.get("baslik") and "KONU" in s["baslik"]
    ]
    assert len(konular) == 9, f"9 konu bekleniyor, {len(konular)} bulundu"

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")

    conn.executescript("""
        DROP TABLE IF EXISTS elifba_harf_ders;
        DROP TABLE IF EXISTS elifba_dersler;
        DROP TABLE IF EXISTS elifba_harfler;

        CREATE TABLE elifba_harfler (
            harf_id     INTEGER PRIMARY KEY,
            harf_adi    TEXT NOT NULL,
            harf_sesi   TEXT,
            tek_basina  TEXT,
            basta       TEXT,
            ortada      TEXT,
            sonda       TEXT,
            mahrec      TEXT,
            unicode_hex TEXT,
            kalin_ince  TEXT,
            grup        TEXT
        );

        CREATE TABLE elifba_dersler (
            id           INTEGER PRIMARY KEY,
            baslik       TEXT NOT NULL,
            konu_sirasi  INTEGER NOT NULL UNIQUE,
            seviye       TEXT NOT NULL,
            icerik_json  TEXT NOT NULL
        );

        CREATE TABLE elifba_harf_ders (
            harf_id  INTEGER NOT NULL REFERENCES elifba_harfler(harf_id),
            ders_id  INTEGER NOT NULL REFERENCES elifba_dersler(id),
            PRIMARY KEY (harf_id, ders_id)
        );
    """)

    # harfleri import et
    conn.executemany(
        "INSERT INTO elifba_harfler VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
            (
                h["harf_id"], h["harf_adi"], h["harf_sesi"], h["tek_basina"],
                h["basta"], h["ortada"], h["sonda"], h["mahrec"],
                h["unicode_hex"], h["kalin_ince"], h["grup"],
            )
            for h in harfler
        ],
    )

    # dersleri import et
    for ders_id, konu in enumerate(konular, 1):
        konu_no_match = re.match(r"^(\d+)\.", konu["baslik"])
        konu_no = int(konu_no_match.group(1)) if konu_no_match else ders_id
        sayfa_no = konu["sayfa"]

        icerik: dict = {
            "aciklama":   konu.get("icerik", ""),
            "alistirma":  None,
            "ek_tablolar": [],
        }

        # Alıştırma sayfası
        alistirma_no = ALISTIRMA.get(sayfa_no)
        if alistirma_no and alistirma_no in sayfa_map:
            icerik["alistirma"] = sayfa_map[alistirma_no].get("icerik", "")

        # Ek tablolar (Konu 2)
        for ek_no in EK_TABLOLAR.get(sayfa_no, []):
            if ek_no in sayfa_map:
                icerik["ek_tablolar"].append({
                    "baslik": sayfa_map[ek_no].get("baslik", ""),
                    "icerik": sayfa_map[ek_no].get("icerik", ""),
                })

        conn.execute(
            "INSERT INTO elifba_dersler VALUES (?,?,?,?,?)",
            (ders_id, konu["baslik"], konu_no, SEVIYE[konu_no],
             json.dumps(icerik, ensure_ascii=False)),
        )

    # junction table: harf ↔ ders
    rows: list[tuple[int, int]] = []
    for ders_id in range(1, 10):
        konu_no = ders_id  # konu_sirasi == ders_id in this data
        if konu_no == 6:   # Med harfleri sadece 3 harf
            for hid in MED_HARF_IDS:
                rows.append((hid, ders_id))
        else:              # Diğer dersler: tüm 28 standart harf (lamelif=29 hariç konu 1'de)
            limit = 28 if konu_no == 1 else 29
            for hid in range(1, limit + 1):
                rows.append((hid, ders_id))

    conn.executemany("INSERT INTO elifba_harf_ders VALUES (?,?)", rows)
    conn.commit()
    conn.close()

    print(f"OK elifba_harfler : {len(harfler)} harf")
    print(f"OK elifba_dersler : 9 ders")
    print(f"OK elifba_harf_ders: {len(rows)} iliski")


if __name__ == "__main__":
    main()
