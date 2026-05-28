"""
Kalan hatalı meaning_tr değerlerini Gemini 2.5 Flash ile düzeltir.

Aşamalar:
  1. Yanlış SQL düzeltmelerini yedekten geri al   (API yok)
  2. Benzersiz (arabic_clean, root) çiftlerini grupla
  3. Her grup için Gemini API çağrısı
  4. Veritabanını güncelle + checkpoint kaydet
  5. Rapor: data/gemini_fix_raporu.csv

Kullanım:
  python scripts/gemini-meaning-fix.py
  python scripts/gemini-meaning-fix.py --dry-run
  python scripts/gemini-meaning-fix.py --sadece-geri
  python scripts/gemini-meaning-fix.py --limit 20
  python scripts/gemini-meaning-fix.py --sifirla    (checkpoint sil)
"""

import sqlite3, csv, os, sys, json, time, re, argparse, unicodedata
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv
from google import genai
from google.genai import types

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

DB_PATH      = Path(__file__).parent.parent / "data" / "app.db"
HATALAR_CSV  = Path(__file__).parent.parent / "data" / "kalan_hatalar.csv"
YANLIS_CSV   = Path(__file__).parent.parent / "data" / "yanlis_duzeltmeler.csv"
RAPOR_CSV    = Path(__file__).parent.parent / "data" / "gemini_fix_raporu.csv"
CHECKPOINT   = Path(__file__).parent.parent / "data" / "gemini_fix_checkpoint.json"
MODEL        = "gemini-2.5-flash"
ARALIK_SN    = 1.5   # rate limit aralığı


def clean_arabic(ar: str) -> str:
    """Hareke ve uzatma işaretlerini kaldır, NFC normalize et."""
    s = unicodedata.normalize("NFC", ar or "")
    return re.sub(r"[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭؐ-ؠﹰ-﻿]", "", s)


# Gökyüzü anlamı taşıyan سمو kelimeleri (cleaned form)
SEMA_TEMIZ = {
    clean_arabic(w) for w in [
        "ٱلسَّمَٰوَٰتِ",  # السماوات
        "ٱلسَّمَٰوَٰتُ",
        "ٱلسَّمَآءِ",
        "ٱلسَّمَآءُ",
        "ٱلسَّمَآءَ",
    ]
}
# Daha güvenli: temizlenmiş forma bakarak karar ver
SEMA_KALIPLAR = {"ٱلسم", "وٱلسم", "سمو", "سمٰو", "سمٰوٰت"}


def sema_kelimesi_mi(arabic_clean: str) -> bool:
    """Gökyüzü anlamı taşıyan kelime mi?"""
    for kalip in SEMA_KALIPLAR:
        if arabic_clean.startswith(kalip):
            return True
    return False


# Gerçek melek (ملائكة) cleaned kalıpları
MELEK_KALIPLAR = {"ملـٰئك", "ملاءك", "ملأك", "ملآئك"}


def melek_kelimesi_mi(arabic_clean: str) -> bool:
    for k in MELEK_KALIPLAR:
        if k in arabic_clean:
            return True
    return False


SYSTEM_PROMPT = (
    "Sen Kuran-ı Kerim kelime analizi uzmanısın.\n"
    "Sana bir Arapça kelimenin formu, kökü, ayetin Arapçası, Türkçe meali "
    "ve mevcut (muhtemelen yanlış) Türkçe anlamı verilecek.\n"
    "Görevin: Bu kelimenin doğru, kısa Türkçe sözlük anlamını yazmak.\n\n"
    "Kurallar:\n"
    "- Yalnızca anlamı yaz, açıklama veya etiket ekleme\n"
    "- 1-5 kelime, kısa ve öz\n"
    "- Fiil: mastar veya geniş zaman (gitmek / gider)\n"
    "- İsim: yalın hal\n"
    "- Türkçe küçük harfle başla (Allah, Musa, İbrahim gibi özel isimler hariç)\n"
    "- Kurani bağlamda en yaygın anlamı seç"
)


def gemini_anlam_al(client, arabic, root, verse_ar, meal, mevcut_anlam):
    prompt = (
        f"Kelime (Arapça): {arabic}\n"
        f"Kök: {root}\n"
        f"Ayet (Arapça): {verse_ar[:200]}\n"
        f"Meal (Türkçe): {meal[:150]}\n"
        f"Mevcut anlam: {mevcut_anlam}\n\n"
        "Doğru kısa Türkçe sözlük anlamı:"
    )
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.1,
        max_output_tokens=200,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    text = resp.text
    if not text:
        # candidates üzerinden dene
        try:
            text = resp.candidates[0].content.parts[0].text
        except Exception:
            return ""
    return text.strip().strip('"').strip("'").split("\n")[0].strip()


def geri_al_yanlis(conn, yanlis_rows, dry_run):
    cur = conn.cursor()
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='words_backup_meaning'"
    )
    if not cur.fetchone():
        print("  ⚠ words_backup_meaning yok, geri alma atlandı.")
        return 0
    n = 0
    for r in yanlis_rows:
        eski = r.get("eski_anlam", "")
        if not eski:
            continue
        if not dry_run:
            cur.execute(
                "UPDATE words SET meaning_tr=? WHERE verse_key=? AND word_index=?",
                (eski, r["verse_key"], int(r["word_index"])),
            )
            n += cur.rowcount
        else:
            n += 1
    if not dry_run:
        conn.commit()
    return n


def verse_context(conn, verse_key):
    cur = conn.cursor()
    cur.execute("SELECT arabic_text FROM verses WHERE verse_key=?", (verse_key,))
    row = cur.fetchone()
    ar = row[0] if row else ""
    cur.execute(
        "SELECT text FROM translations WHERE verse_key=? AND source='yazir'",
        (verse_key,),
    )
    row = cur.fetchone()
    meal = row[0] if row else ""
    return ar, meal


def ckpt_yukle():
    return json.loads(CHECKPOINT.read_text(encoding="utf-8")) if CHECKPOINT.exists() else {}


def ckpt_kaydet(data):
    CHECKPOINT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",     action="store_true")
    parser.add_argument("--sadece-geri", action="store_true")
    parser.add_argument("--limit",       type=int, default=None)
    parser.add_argument("--sifirla",     action="store_true")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key and not args.sadece_geri:
        print("HATA: GEMINI_API_KEY bulunamadı.", file=sys.stderr)
        sys.exit(1)
    client = genai.Client(api_key=api_key) if api_key else None

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    with open(HATALAR_CSV, encoding="utf-8-sig") as f:
        hatalar = list(csv.DictReader(f))
    with open(YANLIS_CSV, encoding="utf-8-sig") as f:
        yanlis_rows = list(csv.DictReader(f))

    print(f"\n{'='*62}")
    print(f"  GEMİNİ MEANING FIX  |  {'DRY-RUN' if args.dry_run else 'CANLI'}")
    print(f"{'='*62}")
    print(f"  Hata adayı        : {len(hatalar)}")
    print(f"  Yanlış düzeltme   : {len(yanlis_rows)}")

    # ── Aşama 1: Yanlış düzeltmeleri geri al ─────────────────────
    print(f"\n── Aşama 1: Yanlış düzeltmeleri geri al")
    geri = geri_al_yanlis(conn, yanlis_rows, args.dry_run)
    print(f"   Geri alınan: {geri} satır")

    if args.sadece_geri:
        conn.close()
        return

    # ── Aşama 2: Filtrele ve grupla ───────────────────────────────
    filtreli = []
    for h in hatalar:
        root   = h.get("root", "") or ""
        arabic = h.get("arabic", "") or ""
        ac     = clean_arabic(arabic)

        if root == "سمو" and sema_kelimesi_mi(ac):
            continue   # gökyüzü — doğru
        if root == "ملك" and melek_kelimesi_mi(ac):
            continue   # gerçek melek kelimesi — doğru

        filtreli.append(h)

    # Benzersiz (clean_arabic, root, mevcut_anlam) → satır listesi
    gruplar: dict[tuple, list] = defaultdict(list)
    for h in filtreli:
        key = (clean_arabic(h["arabic"]), h.get("root", "") or "", h["meaning_tr"])
        gruplar[key].append(h)

    print(f"\n── Aşama 2: Filtreleme & gruplama")
    print(f"   Düzeltilecek satır : {len(filtreli)}")
    print(f"   Benzersiz API çağrı: {len(gruplar)}")

    if args.sifirla and CHECKPOINT.exists():
        CHECKPOINT.unlink()
        print("   Checkpoint sıfırlandı.")
    ckpt = ckpt_yukle()
    print(f"   Daha önce tamamlanan: {len(ckpt)} grup")

    # ── Aşama 3-4: Gemini + güncelle ─────────────────────────────
    print(f"\n── Aşama 3-4: Gemini + DB güncelleme")

    rapor: list[dict] = []
    islenen = api_hata = 0
    cur = conn.cursor()

    grup_listesi = list(gruplar.items())
    if args.limit:
        grup_listesi = grup_listesi[: args.limit]

    for i, ((ac, root, mevcut), satirlar) in enumerate(grup_listesi, 1):
        cp_key = f"{ac}|{root}|{mevcut}"

        # Checkpoint'te varsa DB'yi güncelle, API çağrısı yapma
        if cp_key in ckpt:
            yeni = ckpt[cp_key]
            if not args.dry_run:
                for s in satirlar:
                    cur.execute(
                        "UPDATE words SET meaning_tr=? WHERE verse_key=? AND word_index=?",
                        (yeni, s["verse_key"], int(s["word_index"])),
                    )
                conn.commit()
            islenen += 1
            continue

        ornek = satirlar[0]
        verse_ar, meal = verse_context(conn, ornek["verse_key"])

        try:
            yeni = gemini_anlam_al(
                client, ornek["arabic"], root,
                verse_ar, meal, mevcut
            )
        except Exception as e:
            print(f"   ✗ [{i}/{len(grup_listesi)}] {ornek['arabic']}: {e}")
            api_hata += 1
            time.sleep(4)
            continue

        etkilenen = 0
        if not args.dry_run:
            for s in satirlar:
                cur.execute(
                    "UPDATE words SET meaning_tr=? WHERE verse_key=? AND word_index=?",
                    (yeni, s["verse_key"], int(s["word_index"])),
                )
                etkilenen += cur.rowcount
            conn.commit()
        else:
            etkilenen = len(satirlar)

        ckpt[cp_key] = yeni
        ckpt_kaydet(ckpt)
        islenen += 1

        print(f"   [{i:>3}/{len(grup_listesi)}] {ornek['arabic']:<22} [{root:<6}]  "
              f"'{mevcut}' → '{yeni}'  ({etkilenen}×)")

        for s in satirlar:
            rapor.append({
                "verse_key":  s["verse_key"],
                "word_index": s["word_index"],
                "arabic":     s["arabic"],
                "root":       root,
                "eski_anlam": mevcut,
                "yeni_anlam": yeni,
                "hata_tipi":  s["hata_tipi"],
                "etkilenen":  etkilenen,
            })

        time.sleep(ARALIK_SN)

    conn.close()

    # CSV raporu
    RAPOR_CSV.parent.mkdir(parents=True, exist_ok=True)
    fn = ["verse_key","word_index","arabic","root","eski_anlam","yeni_anlam","hata_tipi","etkilenen"]
    with open(RAPOR_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fn)
        w.writeheader()
        w.writerows(rapor)

    guncellenen = sum(int(r["etkilenen"]) for r in rapor)

    print(f"\n{'='*62}")
    print(f"  ÖZET")
    print(f"{'='*62}")
    print(f"  Geri alınan (yanlış fix) : {geri}")
    print(f"  İşlenen Gemini grubu     : {islenen}/{len(grup_listesi)}")
    print(f"  Güncellenen satır        : {guncellenen}")
    print(f"  API hatası               : {api_hata}")
    print(f"  Rapor                    : {RAPOR_CSV}")
    print()


if __name__ == "__main__":
    main()
