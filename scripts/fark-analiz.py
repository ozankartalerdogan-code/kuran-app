"""
Literal çeviri ile meal arasındaki gerçek anlam farklarını tespit eder.
Tamamen offline — difflib ve sqlite3 kullanır.

3 katmanlı kontrol:
  A) KÖK KONTROLÜ   — meaning_tr tokenlarının meal'de geçme oranı
  B) LİTERAL        — difflib benzerlik oranı (literal_ceviri vs meal)
  C) BİRLEŞİK       — her iki kontrolü birleştirerek fark türünü belirler

Fark türleri:
  GERÇEK FARK    — hem kök sapmasi hem de literal benzerlik düşük
  ÜSLUP FARKI    — literal benzerlik düşük ama kök anlamları tutarlı
  KÖK SAPMASI    — kök anlamları tutarsız ama literal benzerlik yeterli
  TUTARLI        — her iki kontrol de geçiyor

Çıktı:
  data/fark_analiz_sonuclari.csv  — tüm ayetler
  data/gercek_farklar.csv         — sadece GERÇEK FARK olanlar

Kullanım:
  python scripts/fark-analiz.py
  python scripts/fark-analiz.py --esik-literal 0.65   (benzerlik eşiği)
  python scripts/fark-analiz.py --esik-kok 0.35       (kök sapma eşiği)
  python scripts/fark-analiz.py --surah 2
"""

import sqlite3
import csv
import re
import difflib
import argparse
import sys
import unicodedata
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH       = Path(__file__).parent.parent / "data" / "app.db"
OUT_TUMU      = Path(__file__).parent.parent / "data" / "fark_analiz_sonuclari.csv"
OUT_GERCEK    = Path(__file__).parent.parent / "data" / "gercek_farklar.csv"

# Eşikler
ESIK_LITERAL  = 0.70   # altında → literal sapma var
ESIK_KOK      = 0.35   # altında → kök sapması var (anlamların %35'inden azı meal'de)


# ── Metin normalleştirme ──────────────────────────────────────────────────────

_AKSAN = str.maketrans("âîûÂÎÛàèìòùÀÈÌÒÙ", "aiuAIUaeiouAEIOU")

def normalize(text: str) -> str:
    """Karşılaştırma için: küçük harf, noktalama sil, aksanları düzleştir."""
    if not text:
        return ""
    text = text.lower()
    text = text.replace("i̇", "i")
    text = text.translate(_AKSAN)
    text = re.sub(r"[«»\"\'.,;:!?\(\)\[\]…\-–—/\\]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text: str) -> list[str]:
    return [t for t in normalize(text).split() if len(t) >= 3]


def temizle_meaning(meaning: str) -> str:
    """Ham meaning_tr'yi temizle: slash → ilk seçenek, -ile başlayanlar → edat."""
    m = meaning.strip()
    if re.match(r"^-", m):
        return m.lstrip("-").split(",")[0].strip()
    if "/" in m:
        return m.split("/")[0].strip()
    if "," in m:
        parts = [p.strip() for p in m.split(",")]
        if len(parts) == 2 and parts[1].startswith("-"):
            return parts[0]
    return m


# ── Literal benzerlik (B kontrolü) ───────────────────────────────────────────

def literal_benzerlik(literal: str, meal: str) -> float:
    """
    difflib.SequenceMatcher ile normalize edilmiş metinleri karşılaştırır.
    Token bazlı Jaccard da hesaplanır; ikisinin ortalaması döner.
    """
    n_lit  = normalize(literal)
    n_meal = normalize(meal)

    if not n_lit or not n_meal:
        return 0.0

    # Karakter bazlı benzerlik
    char_ratio = difflib.SequenceMatcher(None, n_lit, n_meal).ratio()

    # Token bazlı Jaccard
    tok_lit  = set(tokenize(literal))
    tok_meal = set(tokenize(meal))
    if tok_lit or tok_meal:
        jaccard = len(tok_lit & tok_meal) / len(tok_lit | tok_meal)
    else:
        jaccard = 0.0

    return (char_ratio + jaccard) / 2


# ── Kök uyum kontrolü (A kontrolü) ───────────────────────────────────────────

def token_meal_ici_mi(tok: str, meal_norm: str, meal_words: list[str]) -> bool:
    """Bir anlam tokenının meal'de substring veya 4-char prefix olarak geçip geçmediği."""
    if tok in meal_norm:
        return True
    for mw in meal_words:
        if len(mw) >= 4 and mw in tok:
            return True
        plen = min(len(tok), len(mw), 5)
        if plen >= 4 and tok[:plen] == mw[:plen]:
            return True
    return False


def kok_uyum_orani(
    kelimeler: list[dict],   # [{"root": ..., "meaning_tr": ...}]
    meal: str,
) -> tuple[float, list[str]]:
    """
    Kök anlamı olan kelimelerin meaning_tr tokenlarından
    kaçının meal'de geçtiğini hesaplar.

    Döner: (oran, sapan_anlamlar_listesi)
    """
    meal_norm  = normalize(meal)
    meal_words = meal_norm.split()

    # Sadece kök bulunan kelimeler (edatlar/zamirler hariç)
    kok_kelimeler = [k for k in kelimeler if k["root"]]
    if not kok_kelimeler:
        return 1.0, []

    toplam_tok = 0
    eslesen    = 0
    sapanlar: list[str] = []

    for k in kok_kelimeler:
        temiz   = temizle_meaning(k["meaning_tr"] or "")
        tokenler = [t for t in tokenize(temiz) if len(t) >= 3]
        if not tokenler:
            continue
        toplam_tok += len(tokenler)
        kelime_eslesti = False
        for tok in tokenler:
            if token_meal_ici_mi(tok, meal_norm, meal_words):
                eslesen += 1
                kelime_eslesti = True
            else:
                pass
        if not kelime_eslesti and temiz:
            sapanlar.append(f"{k['meaning_tr']} (kök:{k['root']})")

    if toplam_tok == 0:
        return 1.0, []

    return eslesen / toplam_tok, sapanlar[:5]   # en fazla 5 örnek


# ── Fark türü belirleme (C kontrolü) ─────────────────────────────────────────

def fark_turu(
    kok_orani: float,
    lit_benzerlik: float,
    esik_kok: float,
    esik_lit: float,
) -> str:
    kok_sapma = kok_orani   < esik_kok
    lit_sapma = lit_benzerlik < esik_lit

    if kok_sapma and lit_sapma:
        return "GERÇEK FARK"
    if lit_sapma and not kok_sapma:
        return "ÜSLUP FARKI"
    if kok_sapma and not lit_sapma:
        return "KÖK SAPMASI"
    return "TUTARLI"


# ── Ana akış ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--esik-literal", type=float, default=ESIK_LITERAL)
    parser.add_argument("--esik-kok",     type=float, default=ESIK_KOK)
    parser.add_argument("--surah",        type=int,   default=None)
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()

    # Meal yükle (diyanet)
    q_meal = "SELECT verse_key, text FROM translations WHERE source='diyanet'"
    params_meal: list = []
    if args.surah:
        q_meal += " AND verse_key LIKE ?"
        params_meal.append(f"{args.surah}:%")
    cur.execute(q_meal, params_meal)
    meal_harita = {r["verse_key"]: r["text"] for r in cur.fetchall()}

    # Literal çeviri yükle
    q_lit = "SELECT verse_key, literal_ceviri FROM verses WHERE literal_ceviri IS NOT NULL"
    params_lit: list = []
    if args.surah:
        q_lit += " AND surah_id = ?"
        params_lit.append(args.surah)
    cur.execute(q_lit, params_lit)
    literal_harita = {r["verse_key"]: r["literal_ceviri"] for r in cur.fetchall()}

    # Kelimeler yükle
    q_words = "SELECT verse_key, root, meaning_tr FROM words WHERE meaning_tr IS NOT NULL ORDER BY verse_key, word_index"
    if args.surah:
        q_words = q_words.replace("WHERE", "WHERE verse_key LIKE ? AND")
        cur.execute(q_words, [f"{args.surah}:%"])
    else:
        cur.execute(q_words)

    kelime_harita: dict[str, list[dict]] = defaultdict(list)
    for row in cur.fetchall():
        kelime_harita[row["verse_key"]].append({
            "root": row["root"], "meaning_tr": row["meaning_tr"]
        })

    conn.close()

    # Kesişim: hem literal hem meal olan ayetler
    verse_keys = sorted(
        meal_harita.keys() & literal_harita.keys(),
        key=lambda x: tuple(int(p) for p in x.split(":"))
    )

    print(f"\n{'='*62}")
    print(f"  FARK ANALİZİ")
    print(f"{'='*62}")
    print(f"  Taranan ayet         : {len(verse_keys)}")
    print(f"  Eşik — literal       : {args.esik_literal}")
    print(f"  Eşik — kök uyum      : {args.esik_kok}")

    satirlar: list[dict] = []
    sayaclar = {"GERÇEK FARK": 0, "ÜSLUP FARKI": 0, "KÖK SAPMASI": 0, "TUTARLI": 0}

    for vk in verse_keys:
        literal  = literal_harita[vk]
        meal     = meal_harita[vk]
        kelimeler = kelime_harita.get(vk, [])

        # A: Kök uyum
        kok_orani, sapan_anlamlar = kok_uyum_orani(kelimeler, meal)

        # B: Literal benzerlik
        lit_ben = literal_benzerlik(literal, meal)

        # C: Fark türü
        tur = fark_turu(kok_orani, lit_ben, args.esik_kok, args.esik_literal)
        sayaclar[tur] += 1

        # Açıklama
        aciklama_parcalari = []
        if lit_ben < args.esik_literal:
            aciklama_parcalari.append(f"literal benzerlik %{lit_ben*100:.0f}")
        if kok_orani < args.esik_kok:
            aciklama_parcalari.append(f"kök uyumu %{kok_orani*100:.0f}")
            if sapan_anlamlar:
                aciklama_parcalari.append("sapan: " + " | ".join(sapan_anlamlar))
        aciklama = "; ".join(aciklama_parcalari) or "—"

        satirlar.append({
            "verse_key":         vk,
            "literal_ceviri":    literal[:200],
            "meal":              meal[:200],
            "benzerlik_orani":   round(lit_ben * 100, 1),
            "kok_uyum_orani":    round(kok_orani * 100, 1),
            "kok_sapmasi_var_mi": "EVET" if kok_orani < args.esik_kok else "HAYIR",
            "fark_turu":         tur,
            "aciklama":          aciklama,
        })

    # CSV kaydet
    fieldnames = [
        "verse_key", "literal_ceviri", "meal",
        "benzerlik_orani", "kok_uyum_orani",
        "kok_sapmasi_var_mi", "fark_turu", "aciklama"
    ]

    OUT_TUMU.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_TUMU, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(satirlar)

    gercek = [s for s in satirlar if s["fark_turu"] == "GERÇEK FARK"]
    gercek.sort(key=lambda x: x["benzerlik_orani"])
    with open(OUT_GERCEK, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(gercek)

    # Özet
    toplam = len(satirlar)
    print(f"\n{'─'*62}")
    print(f"  {'FARK TÜRÜ':<20} {'ADET':>6}  {'ORAN':>6}")
    print(f"{'─'*62}")
    for tur in ["GERÇEK FARK", "ÜSLUP FARKI", "KÖK SAPMASI", "TUTARLI"]:
        sayi = sayaclar[tur]
        print(f"  {tur:<20} {sayi:>6}  %{sayi/toplam*100:>5.1f}")
    print(f"{'─'*62}")
    print(f"  {'TOPLAM':<20} {toplam:>6}")
    print(f"\n  CSV (tüm) : {OUT_TUMU}")
    print(f"  CSV (fark): {OUT_GERCEK}")

    # Konsol — en düşük benzerlikli 15 GERÇEK FARK
    if gercek:
        print(f"\n{'─'*62}")
        print(f"  En belirgin GERÇEK FARK (ilk 15):")
        print(f"{'─'*62}")
        print(f"  {'AYET':<8} {'BEN%':>5} {'KÖK%':>5}  LİTERAL")
        print(f"  {'':8} {'':5} {'':5}  MEAL")
        print()
        for s in gercek[:15]:
            print(f"  {s['verse_key']:<8} {s['benzerlik_orani']:>5.1f} {s['kok_uyum_orani']:>5.1f}"
                  f"  {s['literal_ceviri'][:55]}")
            print(f"  {'':8} {'':5} {'':5}  {s['meal'][:55]}")
            print()


if __name__ == "__main__":
    main()
