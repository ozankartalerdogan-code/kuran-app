"""
Kelime anlamlarini (words.meaning_tr) meal metniyle karsilastirir.

AYET MODU (varsayilan):
  Her ayetin tum meaning_tr tokenlarinin meal'de ne kadar gectigi
  hesaplanir. Dusuk overlap = o ayette hatali meaning_tr var.

KELIME MODU (--per-kelime):
  Her kelimenin meaning_tr degeri ayri ayri test edilir.
  Hicbir tokeni meal'de gecmeyen kelimeler "HATALI MUHTEMEL" olarak isaretlenir.
  Sonuc: data/kelime_hatali_adaylar.csv

Kullanim:
  python scripts/meal-literal-karsilastir.py
  python scripts/meal-literal-karsilastir.py --source diyanet
  python scripts/meal-literal-karsilastir.py --surah 2
  python scripts/meal-literal-karsilastir.py --sadece-fark
  python scripts/meal-literal-karsilastir.py --per-kelime
  python scripts/meal-literal-karsilastir.py --per-kelime --surah 2
"""

import sqlite3
import csv
import argparse
import sys
import re
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH      = Path(__file__).parent.parent / "data" / "app.db"
OUTPUT_AYET  = Path(__file__).parent.parent / "data" / "meal_literal_karsilastir.csv"
OUTPUT_KELIM = Path(__file__).parent.parent / "data" / "kelime_hatali_adaylar.csv"

ESIK_FARK   = 0.30
ESIK_INCELE = 0.55


_TR_ACCENT = str.maketrans("âîûÂÎÛàèìòùÀÈÌÒÙ", "aiuAIUaeiouAEIOU")

def normalize(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = text.replace("i̇", "i")          # noktalı büyük I küçültme
    text = text.translate(_TR_ACCENT)       # â→a, î→i, û→u
    text = re.sub(r"[«»\"\'.,;:!?\(\)\[\]…\-–—/\\()]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text: str) -> list[str]:
    if not text:
        return []
    return [t for t in normalize(text).split() if len(t) >= 3]


def token_matches_meal(tok: str, meal_words: list[str], meal_norm: str) -> bool:
    """Tek bir anlam tokeninin meal ile eslesip eslesmedigini kontrol eder.
    Turkce morfoloji icin cift yon + 4-karakter prefix eslesimi."""
    if tok in meal_norm:
        return True
    for mw in meal_words:
        if len(mw) >= 4 and mw in tok:
            return True
        plen = min(len(tok), len(mw), 5)
        if plen >= 4 and tok[:plen] == mw[:plen]:
            return True
    return False


def ayet_overlap(meaning_parts: list[str], meal_words: list[str], meal_norm: str) -> float:
    """Ayetteki tum meaning_tr tokenlarindan meal'de eslesenlerin oranini dondurur."""
    all_tokens: set[str] = set()
    for part in meaning_parts:
        all_tokens.update(tokenize(part))
    if not all_tokens:
        return 1.0
    match = sum(1 for t in all_tokens if token_matches_meal(t, meal_words, meal_norm))
    return match / len(all_tokens)


def durum_ayet(oran: float) -> str:
    if oran < ESIK_FARK:
        return "POTANSIYEL FARK VAR"
    if oran < ESIK_INCELE:
        return "INCELENMELI"
    return "FARK YOK"


# ── AYET MODU ────────────────────────────────────────────────────────────────

def run_ayet_modu(meals, words_by_verse, args):
    satirlar = []
    potansiyel = incele = fark_yok = atlanan = 0

    for verse_key in sorted(meals, key=lambda x: tuple(int(p) for p in x.split(":"))):
        meal_text = meals[verse_key]
        kelimeler = words_by_verse.get(verse_key, [])

        if len(kelimeler) < args.min_words:
            atlanan += 1
            continue

        meal_norm  = normalize(meal_text)
        meal_words = meal_norm.split()
        literal_parts = [m for _, _, m in kelimeler if m]
        literal = " - ".join(literal_parts)
        oran = ayet_overlap(literal_parts, meal_words, meal_norm)
        d = durum_ayet(oran)

        if d == "POTANSIYEL FARK VAR":
            potansiyel += 1
        elif d == "INCELENMELI":
            incele += 1
        else:
            fark_yok += 1

        if args.sadece_fark and d == "FARK YOK":
            continue

        satirlar.append({
            "verse_key":     verse_key,
            "meal":          meal_text,
            "basit_literal": literal,
            "kelime_sayisi": len(kelimeler),
            "overlap_orani": round(oran * 100, 1),
            "durum":         d,
        })

    OUTPUT_AYET.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_AYET, "w", newline="", encoding="utf-8-sig") as f:
        fieldnames = ["verse_key", "meal", "basit_literal", "kelime_sayisi", "overlap_orani", "durum"]
        csv.DictWriter(f, fieldnames=fieldnames).writeheader()
        csv.DictWriter(f, fieldnames=fieldnames).writerows(satirlar)

    toplam = potansiyel + incele + fark_yok
    print(f"\n{'='*60}")
    print(f"AYET OZETI  ({args.source})")
    print(f"{'='*60}")
    print(f"  Toplam ayet          : {toplam}")
    print(f"  POTANSIYEL FARK VAR  : {potansiyel}  ({potansiyel/toplam*100:.1f}%)")
    print(f"  INCELENMELI          : {incele}  ({incele/toplam*100:.1f}%)")
    print(f"  FARK YOK             : {fark_yok}  ({fark_yok/toplam*100:.1f}%)")
    if atlanan:
        print(f"  Atlanan              : {atlanan}")
    print(f"\nCSV: {OUTPUT_AYET}")

    sorunlular = [s for s in satirlar if s["durum"] != "FARK YOK"]
    sorunlular.sort(key=lambda x: x["overlap_orani"])
    if sorunlular:
        print(f"\n--- En dusuk overlap'li ilk 25 ayet ---")
        print(f"{'AYET':<8} {'OVERLAP':>8}  DURUM")
        print("-" * 70)
        for s in sorunlular[:25]:
            print(f"{s['verse_key']:<8} {s['overlap_orani']:>7.1f}%  {s['durum']}")
            print(f"{'':8} M: {s['meal'][:60].replace(chr(10),' ')}")
            print(f"{'':8} L: {s['basit_literal'][:60]}")
            print()


# ── KELIME MODU ───────────────────────────────────────────────────────────────

def run_kelime_modu(meals, words_by_verse, args):
    """Her kelimeyi ayri ayri test eder; hicbir tokeni meal'de gecmeyenler adaydir."""
    satirlar = []
    hatali = soru = temiz = 0

    for verse_key in sorted(meals, key=lambda x: tuple(int(p) for p in x.split(":"))):
        meal_text = meals[verse_key]
        kelimeler = words_by_verse.get(verse_key, [])
        if not kelimeler:
            continue

        meal_norm  = normalize(meal_text)
        meal_words = meal_norm.split()

        for word_idx, arabic, meaning_tr in kelimeler:
            toks = tokenize(meaning_tr)
            if not toks:
                # Anlam bos veya cok kisa — atla
                continue

            eslesen = [t for t in toks if token_matches_meal(t, meal_words, meal_norm)]
            eslesmeyenler = [t for t in toks if t not in eslesen]

            # Eslesen oran
            oran = len(eslesen) / len(toks)

            if oran == 0.0:
                durum = "HATALI MUHTEMEL"
                hatali += 1
            elif oran < 0.5:
                durum = "SORU ISARETI"
                soru += 1
            else:
                durum = "TEMIZ"
                temiz += 1

            if args.sadece_fark and durum == "TEMIZ":
                continue

            satirlar.append({
                "verse_key":      verse_key,
                "word_index":     word_idx,
                "arabic":         arabic,
                "meaning_tr":     meaning_tr,
                "eslesen_tokens": ", ".join(eslesen),
                "eslesmeyenler":  ", ".join(eslesmeyenler),
                "overlap_orani":  round(oran * 100, 1),
                "durum":          durum,
                "meal":           meal_text,
            })

    OUTPUT_KELIM.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "verse_key", "word_index", "arabic", "meaning_tr",
        "eslesen_tokens", "eslesmeyenler", "overlap_orani", "durum", "meal"
    ]
    with open(OUTPUT_KELIM, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(satirlar)

    toplam = hatali + soru + temiz
    print(f"\n{'='*60}")
    print(f"KELIME OZETI  ({args.source})")
    print(f"{'='*60}")
    print(f"  Toplam kelime test edildi : {toplam}")
    print(f"  HATALI MUHTEMEL           : {hatali}  ({hatali/toplam*100:.1f}%)")
    print(f"  SORU ISARETI              : {soru}  ({soru/toplam*100:.1f}%)")
    print(f"  TEMIZ                     : {temiz}  ({temiz/toplam*100:.1f}%)")
    print(f"\nCSV: {OUTPUT_KELIM}")

    # Konsola ilk 30 hatali aday
    adaylar = [s for s in satirlar if s["durum"] == "HATALI MUHTEMEL"]
    if adaylar:
        print(f"\n--- HATALI MUHTEMEL ilk 30 kelime ---")
        print(f"{'AYET':<8} {'IDX':>4}  {'ARABIC':<20} MEANING_TR")
        print("-" * 70)
        for s in adaylar[:30]:
            print(f"{s['verse_key']:<8} {s['word_index']:>4}  {s['arabic']:<20} {s['meaning_tr']}")
            print(f"{'':8} {'':4}  MEAL: {s['meal'][:55].replace(chr(10),' ')}")
            print()


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="yazir",
                        choices=["yazir", "diyanet", "vakfi", "ozturk", "bulac"])
    parser.add_argument("--surah", type=int, default=None,
                        help="Sadece belirli bir sure numarasi")
    parser.add_argument("--min-words", type=int, default=2,
                        help="Minimum kelime sayisi — sadece ayet modunda")
    parser.add_argument("--sadece-fark", action="store_true",
                        help="Temiz/FARK YOK satirlarini CSV'ye yazma")
    parser.add_argument("--per-kelime", action="store_true",
                        help="Kelime bazli analiz modunu etkinlestir")
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    q = "SELECT verse_key, text FROM translations WHERE source=?"
    params: list = [args.source]
    if args.surah:
        q += " AND verse_key LIKE ?"
        params.append(f"{args.surah}:%")
    cur.execute(q, params)
    meals = {r["verse_key"]: r["text"] for r in cur.fetchall()}

    if not meals:
        print(f"HATA: '{args.source}' kaynaginda meal bulunamadi.", file=sys.stderr)
        sys.exit(1)

    wq = "SELECT verse_key, word_index, arabic, meaning_tr FROM words ORDER BY verse_key, word_index"
    cur.execute(wq)
    words_by_verse: dict[str, list] = {}
    for row in cur.fetchall():
        words_by_verse.setdefault(row["verse_key"], []).append(
            (row["word_index"], row["arabic"], row["meaning_tr"] or "")
        )
    conn.close()

    mod = "KELIME" if args.per_kelime else "AYET"
    print(f"Mod: {mod}  |  Kaynak: {args.source}  |  Ayet: {len(meals)}")

    if args.per_kelime:
        run_kelime_modu(meals, words_by_verse, args)
    else:
        run_ayet_modu(meals, words_by_verse, args)


if __name__ == "__main__":
    main()
