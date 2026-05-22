"""
Sorunlu fark analizlerini tam Kelime Analizi verisiyle Gemini'ye gönderir.
Gemini mevcut analizi inceler, gerekirse düzeltir.

Her ayete gönderilen veri:
  - Literal çeviri
  - 5 meal kaynağı (yazir/diyanet/vakfi/ozturk/bulac)
  - words tablosu: arabic, pos, morphology, role, lemma, root, meaning_tr
  - Mevcut fark_analizi

Kullanım:
  python scripts/gemini-fark-kelime-dogrula.py
  python scripts/gemini-fark-kelime-dogrula.py --dry-run
  python scripts/gemini-fark-kelime-dogrula.py --limit 20
  python scripts/gemini-fark-kelime-dogrula.py --sadece CSV_UYUMSUZ
  python scripts/gemini-fark-kelime-dogrula.py --sifirla
"""

import sqlite3, csv, os, sys, json, time, argparse
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

DB_PATH     = Path(__file__).parent.parent / "data" / "app.db"
KONTROL_CSV = Path(__file__).parent.parent / "data" / "kapsamli_fark_kontrol.csv"
CHECKPOINT  = Path(__file__).parent.parent / "data" / "gemini_kelime_dogrula_ckpt.json"
RAPOR_CSV   = Path(__file__).parent.parent / "data" / "gemini_kelime_dogrula_rapor.csv"
MODEL       = "gemini-2.5-flash"
BATCH_SIZE  = 5
ARALIK_SN   = 1.0

KAYNAKLAR   = ["yazir", "diyanet", "vakfi", "ozturk", "bulac"]
KAYNAK_ADI  = {"yazir":"Yazır","diyanet":"Diyanet","vakfi":"Vakfı",
               "ozturk":"Öztürk","bulac":"Bulaç"}

SYSTEM = """\
Sen Kuran-ı Kerim fark analizi denetçisisin.
Sana her ayet için şunlar verilecek:
  - Literal çeviri
  - 5 farklı Türkçe meal kaynağı
  - Kelime bazlı morfolojik analiz (Arapça kelime, tür, çekim, rol, kök, anlam)
  - Mevcut fark analizi metni

Görevin:
1. Mevcut fark analizini kelime analizi ve mealler ışığında denetle.
2. Eğer analiz doğruysa → duzeltme_gerekli=false, yeni_analiz alanına mevcut metni aynen koy.
3. Eğer analiz hatalı, eksik veya yanıltıcıysa → duzeltme_gerekli=true, yeni_analiz alanına düzeltilmiş metni yaz.

Düzeltme yaparken:
- Kelime türlerini (fiil/isim/edat) ve morfolojik özellikleri (ikil/çoğul/tekil) doğru kullan.
- Köklerin (root) semantik alanını yansıt.
- 3-6 cümle, öz ve net.
- Son satır: ℹ️ AI tarafından üretilmiştir. Kesin bilgi için güvenilir tefsirlere başvurunuz.
- Açıklama veya giriş cümlesi ekleme, sadece analiz metnini yaz.\
"""


class AyetDenetim(BaseModel):
    verse_key: str
    duzeltme_gerekli: bool
    yeni_analiz: str


def ckpt_yukle():
    return json.loads(CHECKPOINT.read_text(encoding="utf-8")) if CHECKPOINT.exists() else {}

def ckpt_kaydet(d):
    CHECKPOINT.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")


def kelime_tablosu_formatla(kelimeler: list[dict]) -> str:
    satirlar = ["#  | Kelime       | Tür    | Çekim          | Kök   | Anlam"]
    satirlar.append("-" * 70)
    for k in kelimeler:
        pos  = (k.get("pos") or "?")[:6]
        morph = (k.get("morphology") or "")[:14]
        root  = (k.get("root") or "-")[:6]
        anlam = (k.get("meaning_tr") or "-")[:20]
        ar    = (k.get("arabic") or "-")[:12]
        satirlar.append(f"{k['word_index']:>2} | {ar:<12} | {pos:<6} | {morph:<14} | {root:<5} | {anlam}")
    return "\n".join(satirlar)


def payload_olustur(vk, literal, meals, kelimeler, mevcut_analiz):
    meal_blok = "\n".join(
        f"  {KAYNAK_ADI.get(src, src)}: {meals.get(src,'')[:200]}"
        for src in KAYNAKLAR if meals.get(src)
    )
    kelime_blok = kelime_tablosu_formatla(kelimeler)
    return f"""=== Ayet: {vk} ===

LİTERAL ÇEVİRİ:
{literal}

MEALLER:
{meal_blok}

KELİME ANALİZİ (arabic | tür | çekim | kök | anlam):
{kelime_blok}

MEVCUT FARK ANALİZİ:
{mevcut_analiz}
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",   action="store_true")
    parser.add_argument("--limit",     type=int, default=None)
    parser.add_argument("--sadece",    type=str, default=None,
                        help="Sadece belirli sorun türü (örn: CSV_UYUMSUZ)")
    parser.add_argument("--sifirla",   action="store_true")
    args = parser.parse_args()

    # Sorunlu ayetleri oku
    if not KONTROL_CSV.exists():
        print("HATA: kapsamli_fark_kontrol.csv bulunamadı. Önce kapsamli-fark-kontrol.py çalıştır.")
        sys.exit(1)

    with open(KONTROL_CSV, encoding="utf-8-sig") as f:
        kontrol_rows = [r for r in csv.DictReader(f) if r["kontrol_sonucu"] != "TEMİZ"]

    if args.sadece:
        kontrol_rows = [r for r in kontrol_rows if args.sadece.upper() in r["kontrol_sonucu"].upper()]

    if args.limit:
        kontrol_rows = kontrol_rows[:args.limit]

    sorunlu_vks = [r["verse_key"] for r in kontrol_rows]
    print(f"\n{'='*62}")
    print(f"  GEMİNİ KELIME DOĞRULAMA  |  {'DRY-RUN' if args.dry_run else 'CANLI'}")
    print(f"{'='*62}")
    print(f"  Sorunlu ayet  : {len(sorunlu_vks)}")
    print(f"  Batch boyutu  : {BATCH_SIZE}")

    # DB'den veri yükle
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()

    yer = ",".join("?" * len(sorunlu_vks))

    cur.execute(
        f"SELECT verse_key, literal_ceviri, fark_analizi FROM verses WHERE verse_key IN ({yer})",
        sorunlu_vks
    )
    verses_map = {r["verse_key"]: dict(r) for r in cur.fetchall()}

    cur.execute(
        f"SELECT verse_key, source, text FROM translations WHERE verse_key IN ({yer})",
        sorunlu_vks
    )
    meal_harita: dict[str, dict] = defaultdict(dict)
    for r in cur.fetchall():
        if r["source"] in KAYNAKLAR and r["text"]:
            meal_harita[r["verse_key"]][r["source"]] = r["text"]

    cur.execute(
        f"SELECT verse_key, word_index, arabic, pos, morphology, role, lemma, root, meaning_tr "
        f"FROM words WHERE verse_key IN ({yer}) ORDER BY verse_key, word_index",
        sorunlu_vks
    )
    kelime_harita: dict[str, list] = defaultdict(list)
    for r in cur.fetchall():
        kelime_harita[r["verse_key"]].append(dict(r))
    conn.close()

    # Checkpoint
    if args.sifirla and CHECKPOINT.exists():
        CHECKPOINT.unlink()
        print("  Checkpoint sıfırlandı.")
    ckpt = ckpt_yukle()
    print(f"  Önceki tamamlanan: {len(ckpt)} ayet")

    api_key = os.getenv("GEMINI_API_KEY")
    client  = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        temperature=0.2,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
        response_schema=list[AyetDenetim],
    )

    # DB güncelleme bağlantısı
    conn2 = sqlite3.connect(DB_PATH)
    cur2  = conn2.cursor()

    rapor  = []
    batch_sayac = hata = duzeltilen = 0
    toplam_batch = (len(sorunlu_vks) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(sorunlu_vks), BATCH_SIZE):
        batch_vks = sorunlu_vks[i : i + BATCH_SIZE]
        batch_sayac += 1

        # Tamamlananları atla
        bekleyen = [vk for vk in batch_vks if vk not in ckpt]
        if not bekleyen:
            continue

        # Payload
        paylodlar = []
        for vk in bekleyen:
            v   = verses_map.get(vk, {})
            lit = v.get("literal_ceviri") or ""
            ana = v.get("fark_analizi") or ""
            paylodlar.append(payload_olustur(
                vk, lit, meal_harita.get(vk, {}),
                kelime_harita.get(vk, []), ana
            ))

        prompt = (
            f"Aşağıdaki {len(bekleyen)} ayet için fark analizi denetimi yap.\n"
            "Her ayet için verse_key, duzeltme_gerekli ve yeni_analiz döndür.\n\n"
            + "\n\n".join(paylodlar)
        )

        print(f"\n  Batch {batch_sayac:>3}/{toplam_batch}  "
              f"[{bekleyen[0]} – {bekleyen[-1]}]  ({len(bekleyen)} ayet)")

        try:
            resp    = client.models.generate_content(model=MODEL, contents=prompt, config=config)
            sonuclar = [AyetDenetim(**item) for item in json.loads(resp.text)]
        except Exception as e:
            print(f"    ✗ Hata: {e}")
            hata += 1
            time.sleep(4)
            continue

        for s in sonuclar:
            ckpt[s.verse_key] = {
                "duzeltme": s.duzeltme_gerekli,
                "analiz":   s.yeni_analiz,
            }
            if s.duzeltme_gerekli:
                duzeltilen += 1
                if not args.dry_run:
                    cur2.execute(
                        "UPDATE verses SET fark_analizi=? WHERE verse_key=?",
                        (s.yeni_analiz, s.verse_key)
                    )
                print(f"    ✏ {s.verse_key}: DÜZELTİLDİ — {s.yeni_analiz[:60]}")
            else:
                print(f"    ✓ {s.verse_key}: ONAYLI")

            rapor.append({
                "verse_key":        s.verse_key,
                "duzeltme_gerekli": "EVET" if s.duzeltme_gerekli else "HAYIR",
                "yeni_analiz":      s.yeni_analiz[:200],
                "kontrol_notu":     next(
                    (r["kontrol_sonucu"] for r in kontrol_rows if r["verse_key"] == s.verse_key), ""
                ),
            })

        if not args.dry_run:
            conn2.commit()
        ckpt_kaydet(ckpt)
        time.sleep(ARALIK_SN)

    conn2.close()

    # Rapor CSV
    RAPOR_CSV.parent.mkdir(parents=True, exist_ok=True)
    fn = ["verse_key", "duzeltme_gerekli", "yeni_analiz", "kontrol_notu"]
    with open(RAPOR_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fn); w.writeheader(); w.writerows(rapor)

    print(f"\n{'='*62}")
    print(f"  ÖZET")
    print(f"{'='*62}")
    print(f"  İşlenen ayet   : {len(ckpt)}/{len(sorunlu_vks)}")
    print(f"  Düzeltilen     : {duzeltilen}")
    print(f"  Onaylanan      : {len(ckpt) - duzeltilen}")
    print(f"  API hatası     : {hata}")
    print(f"  Rapor          : {RAPOR_CSV}")
    print()


if __name__ == "__main__":
    main()
