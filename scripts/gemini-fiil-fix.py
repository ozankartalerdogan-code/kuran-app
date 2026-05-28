"""
"Dua etti", "Secde etti" gibi yanlış geçmiş zaman fiil formlarını
Gemini 2.5 Flash ile doğru geniş zaman / mastar formuna düzeltir.

Kullanım:
  python scripts/gemini-fiil-fix.py
  python scripts/gemini-fiil-fix.py --dry-run
  python scripts/gemini-fiil-fix.py --limit 20
  python scripts/gemini-fiil-fix.py --sifirla
"""

import sqlite3, os, sys, json, time, argparse, csv, unicodedata, re
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv
from google import genai
from google.genai import types

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

DB_PATH    = Path(__file__).parent.parent / "data" / "app.db"
RAPOR_CSV  = Path(__file__).parent.parent / "data" / "gemini_fiil_fix_raporu.csv"
CHECKPOINT = Path(__file__).parent.parent / "data" / "gemini_fiil_checkpoint.json"
MODEL      = "gemini-2.5-flash"
ARALIK_SN  = 1.5

YANLIS_FORMLAR = {
    "Dua etti", "Rızık verdi", "Tekbir getirdi", "Hamd etti",
    "İnfak etti", "Secde etti", "Tövbe etti", "Tesbih etti",
    "Cihad etti", "Zekat verdi",
}

SYSTEM_PROMPT = (
    "Sen Kuran-ı Kerim kelime analizi uzmanısın.\n"
    "Sana bir Arapça fiilin kelime formu, kökü, ayetin Arapçası ve Türkçe meali verilecek.\n"
    "Görevin: Bu fiilin doğru kısa Türkçe sözlük anlamını yazmak.\n\n"
    "Kurallar:\n"
    "- Sadece anlamı yaz, açıklama ekleme\n"
    "- 1-4 kelime, öz\n"
    "- Türkçe küçük harfle başla\n"
    "- Fiil formu geniş zaman veya mastar: 'eder', 'etmek', 'etti' değil\n"
    "- Bağlam: özne tekil/çoğul/emir olabilir, buna göre çek\n"
    "  Örnek: يَدۡعُو → 'çağırır'  |  يَدۡعُونَ → 'çağırırlar'  |  اُدۡعُ → 'çağır'\n"
    "- Cevap: yalnızca anlam"
)


def gemini_anlam_al(client, arabic, root, verse_ar, meal, mevcut):
    prompt = (
        f"Fiil (Arapça): {arabic}\n"
        f"Kök: {root}\n"
        f"Ayet (Arapça): {verse_ar[:200]}\n"
        f"Meal (Türkçe): {meal[:150]}\n"
        f"Mevcut (yanlış) anlam: {mevcut}\n\n"
        "Bu fiilin doğru kısa Türkçe anlamı:"
    )
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.1,
        max_output_tokens=30,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )
    resp = client.models.generate_content(model=MODEL, contents=prompt, config=config)
    text = resp.text
    if not text:
        try:
            text = resp.candidates[0].content.parts[0].text
        except Exception:
            return ""
    return text.strip().strip('"').strip("'").split("\n")[0].strip()


def ckpt_yukle():
    return json.loads(CHECKPOINT.read_text(encoding="utf-8")) if CHECKPOINT.exists() else {}


def ckpt_kaydet(data):
    CHECKPOINT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def clean_arabic(ar):
    s = unicodedata.normalize("NFC", ar or "")
    return re.sub(r"[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]", "", s)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",  action="store_true")
    parser.add_argument("--limit",    type=int, default=None)
    parser.add_argument("--sifirla",  action="store_true")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("HATA: GEMINI_API_KEY bulunamadı.", file=sys.stderr); sys.exit(1)
    client = genai.Client(api_key=api_key)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Düzeltilecek kelimeleri çek
    cur.execute("""
        SELECT w.verse_key, w.word_index, w.arabic, w.root, w.meaning_tr,
               COALESCE(t.text, '') as meal,
               COALESCE(v.arabic_text, '') as verse_ar
        FROM words w
        LEFT JOIN translations t ON w.verse_key=t.verse_key AND t.source='yazir'
        LEFT JOIN verses v ON w.verse_key=v.verse_key
        WHERE w.meaning_tr IN ({})
        ORDER BY w.meaning_tr, w.verse_key, CAST(w.word_index AS INTEGER)
    """.format(",".join("?" * len(YANLIS_FORMLAR))), list(YANLIS_FORMLAR))
    satirlar = [dict(r) for r in cur.fetchall()]

    # (clean_arabic, root, mevcut_anlam) gruplama
    gruplar: dict[tuple, list] = defaultdict(list)
    for s in satirlar:
        key = (clean_arabic(s["arabic"]), s["root"] or "", s["meaning_tr"])
        gruplar[key].append(s)

    print(f"\n{'='*62}")
    print(f"  GEMİNİ FİİL FIX  |  {'DRY-RUN' if args.dry_run else 'CANLI'}")
    print(f"{'='*62}")
    print(f"  Düzeltilecek satır : {len(satirlar)}")
    print(f"  Benzersiz API çağrı: {len(gruplar)}")

    if args.sifirla and CHECKPOINT.exists():
        CHECKPOINT.unlink()
        print("  Checkpoint sıfırlandı.")
    ckpt = ckpt_yukle()
    print(f"  Önceki tamamlanan : {len(ckpt)} grup")

    grup_listesi = list(gruplar.items())
    if args.limit:
        grup_listesi = grup_listesi[:args.limit]

    rapor = []
    islenen = api_hata = 0

    for i, ((ac, root, mevcut), grup_satirlar) in enumerate(grup_listesi, 1):
        cp_key = f"{ac}|{root}|{mevcut}"

        if cp_key in ckpt:
            yeni = ckpt[cp_key]
            if not args.dry_run:
                for s in grup_satirlar:
                    cur.execute(
                        "UPDATE words SET meaning_tr=? WHERE verse_key=? AND word_index=?",
                        (yeni, s["verse_key"], int(s["word_index"]))
                    )
                conn.commit()
            islenen += 1
            continue

        ornek = grup_satirlar[0]
        try:
            yeni = gemini_anlam_al(
                client, ornek["arabic"], root,
                ornek["verse_ar"], ornek["meal"], mevcut
            )
        except Exception as e:
            print(f"  ✗ [{i}/{len(grup_listesi)}] {ornek['arabic']}: {e}")
            api_hata += 1
            time.sleep(4)
            continue

        etkilenen = 0
        if not args.dry_run:
            for s in grup_satirlar:
                cur.execute(
                    "UPDATE words SET meaning_tr=? WHERE verse_key=? AND word_index=?",
                    (yeni, s["verse_key"], int(s["word_index"]))
                )
                etkilenen += cur.rowcount
            conn.commit()
        else:
            etkilenen = len(grup_satirlar)

        ckpt[cp_key] = yeni
        ckpt_kaydet(ckpt)
        islenen += 1

        print(f"  [{i:>3}/{len(grup_listesi)}] {ornek['arabic']:<24} [{root:<6}]  "
              f"'{mevcut}' → '{yeni}'  ({etkilenen}×)")

        for s in grup_satirlar:
            rapor.append({
                "verse_key":  s["verse_key"],
                "word_index": s["word_index"],
                "arabic":     s["arabic"],
                "root":       root,
                "eski_anlam": mevcut,
                "yeni_anlam": yeni,
            })

        time.sleep(ARALIK_SN)

    conn.close()

    RAPOR_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(RAPOR_CSV, "w", newline="", encoding="utf-8-sig") as f:
        fn = ["verse_key","word_index","arabic","root","eski_anlam","yeni_anlam"]
        w = csv.DictWriter(f, fieldnames=fn)
        w.writeheader(); w.writerows(rapor)

    guncellenen = sum(
        1 for s in satirlar
        if ckpt.get(f"{clean_arabic(s['arabic'])}|{s['root'] or ''}|{s['meaning_tr']}")
    )

    print(f"\n{'='*62}")
    print(f"  ÖZET")
    print(f"{'='*62}")
    print(f"  İşlenen grup     : {islenen}/{len(grup_listesi)}")
    print(f"  API hatası       : {api_hata}")
    print(f"  Rapor            : {RAPOR_CSV}")
    print()


if __name__ == "__main__":
    main()
