"""
7 ayet için elle yazılmış fark analizini ipucu olarak vererek
Gemini'den detaylı bir analiz üretmesini ister.
"""

import sqlite3, os, sys, json
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv(".env.local")

DB_PATH = Path(__file__).parent.parent / "data" / "app.db"
MODEL   = "gemini-2.5-flash"

AYETLER = ['2:128','3:114','4:35','4:66','4:97','40:12','42:40']

SYSTEM = """\
Sen Kuran-ı Kerim metin analizi uzmanısın.
Sana bir ayetin literal çevirisi, Diyanet meali, kelime kök bilgileri \
ve bu ayet için tespit edilmiş farkın özeti verilecek.

Görevin: Bu fark özetini temel alarak DETAYLI ve KAPSAMLI bir Türkçe fark analizi yaz.

Kurallar:
- Sadece analiz metnini yaz, başlık veya giriş cümlesi ekleme
- Mümkünse Arapça kökleri (parantez içinde) belirt
- Farkın dilbilgisel veya semantik boyutunu açıkla
- 3-6 cümle arası, öz ama kapsamlı olsun
- Son satıra şunu ekle: ℹ️ AI tarafından üretilmiştir. Kesin bilgi için güvenilir tefsirlere başvurunuz.\
"""

def veri_al(conn, vk):
    cur = conn.cursor()
    cur.execute("SELECT literal_ceviri, fark_analizi FROM verses WHERE verse_key=?", (vk,))
    r = cur.fetchone()
    literal, ipucu = (r[0] or ""), (r[1] or "")

    cur.execute("SELECT text FROM translations WHERE verse_key=? AND source='diyanet'", (vk,))
    r = cur.fetchone()
    meal = r[0] if r else ""

    cur.execute(
        "SELECT arabic, root, meaning_tr FROM words "
        "WHERE verse_key=? AND root IS NOT NULL ORDER BY word_index",
        (vk,)
    )
    kokler = "; ".join(f"{r[0]}({r[1]})={r[2]}" for r in cur.fetchall() if r[2])

    return literal, meal, kokler, ipucu


def gonder(client, vk, literal, meal, kokler, ipucu):
    prompt = f"""Ayet: {vk}

LİTERAL ÇEVİRİ:
{literal}

MEAL (Diyanet):
{meal}

KELIME KÖKLERİ:
{kokler[:400]}

TESPİT EDİLEN FARK (ipucu):
{ipucu}

Bu ipucunu temel alarak detaylı bir fark analizi yaz:"""

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        temperature=0.3,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        max_output_tokens=400,
    )
    resp = client.models.generate_content(
        model=MODEL, contents=prompt, config=config
    )
    return (resp.text or "").strip()


def main():
    api_key = os.getenv("GEMINI_API_KEY")
    client  = genai.Client(api_key=api_key)
    conn    = sqlite3.connect(DB_PATH)
    cur     = conn.cursor()

    print(f"\n{'='*62}")
    print(f"  İPUÇLU FARK ANALİZİ — {len(AYETLER)} ayet")
    print(f"{'='*62}\n")

    for vk in AYETLER:
        literal, meal, kokler, ipucu = veri_al(conn, vk)
        print(f"--- {vk} ---")
        print(f"İPUCU: {ipucu[:100]}...")

        yeni_analiz = gonder(client, vk, literal, meal, kokler, ipucu)

        print(f"YENİ ANALİZ:\n{yeni_analiz}\n")

        cur.execute(
            "UPDATE verses SET fark_analizi=? WHERE verse_key=?",
            (yeni_analiz, vk)
        )

    conn.commit()
    conn.close()
    print("✓ Tüm analizler güncellendi.")


if __name__ == "__main__":
    main()
