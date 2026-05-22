"""
Kuran ayet tema etiketleme — Gemini 2.5 Flash

Düzeltilen sorunlar:
  1. JSON parse hatası  → response_schema ile garantili yapısal çıktı
  2. Yavaş fallback     → retry + batch küçültme, tek-tek yoktur
  3. Checkpoint sorunu  → JSON dosyası yok, doğrudan verse_tags tablosu
  4. Maliyet            → thinking_budget=0, temperature=0

Kullanım:
  python scripts/etiketle_gemini.py
  python scripts/etiketle_gemini.py --dry-run 60
  python scripts/etiketle_gemini.py --reset
  python scripts/etiketle_gemini.py --surah 2
"""

import sqlite3, json, time, os, sys, argparse
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel
from tqdm import tqdm

sys.stdout.reconfigure(encoding="utf-8")

ROOT         = Path(__file__).parent.parent
PROMPT_FILE  = ROOT / "kuran_tema_etiketleme_prompt.txt"
DB_PATH      = ROOT / "data" / "app.db"
MODEL        = "gemini-2.5-flash"
BATCH_SIZE   = 50
ARALIK_SN    = 0.3
MAX_RETRY    = 3


# ── Pydantic şema → garantili JSON, sıfır parse hatası ───────────────────────

class AyetEtiket(BaseModel):
    verse_key: str
    ana_tema:  str
    alt_taglar: list[str]


# ── DB yardımcıları ───────────────────────────────────────────────────────────

def tablo_olustur(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS verse_tags (
            verse_key  TEXT PRIMARY KEY,
            ana_tema   TEXT NOT NULL,
            alt_taglar TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()


def islenmemis_ayetleri_al(
    conn: sqlite3.Connection,
    surah: int | None,
    limit: int | None,
) -> list[tuple[str, str, str]]:
    """(verse_key, literal_ceviri, meal) döner — sadece henüz etiketlenmemişler."""
    q = """
        SELECT v.verse_key,
               COALESCE(v.literal_ceviri, v.primary_translation, '') AS literal,
               COALESCE(t.text, v.primary_translation, '')            AS meal
        FROM   verses v
        LEFT   JOIN translations t
               ON  t.verse_key = v.verse_key AND t.source = 'diyanet'
        WHERE  v.verse_key NOT IN (SELECT verse_key FROM verse_tags)
    """
    params: list = []
    if surah:
        q += " AND v.surah_id = ?"
        params.append(surah)
    q += " ORDER BY v.surah_id, v.ayah_number"
    if limit:
        q += " LIMIT ?"
        params.append(limit)
    return conn.execute(q, params).fetchall()


def db_kaydet(
    conn: sqlite3.Connection,
    etiketler: list[AyetEtiket],
) -> int:
    n = 0
    for e in etiketler:
        conn.execute(
            "INSERT OR REPLACE INTO verse_tags (verse_key, ana_tema, alt_taglar) VALUES (?,?,?)",
            (e.verse_key, e.ana_tema, json.dumps(e.alt_taglar, ensure_ascii=False)),
        )
        n += 1
    conn.commit()
    return n


# ── Gemini çağrısı ────────────────────────────────────────────────────────────

def prompt_olustur(template: str, batch: list[tuple[str, str, str]]) -> str:
    ayetler = [
        {"verse_key": vk, "literal": lit[:300], "meal": meal[:300]}
        for vk, lit, meal in batch
    ]
    return template + "\n\n" + json.dumps(ayetler, ensure_ascii=False, indent=2)


def gemini_gonder(
    client: genai.Client,
    config: types.GenerateContentConfig,
    prompt: str,
    beklenen_keys: set[str],
) -> list[AyetEtiket]:
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    if not resp.text:
        raise ValueError("Boş yanıt")

    sonuclar = [AyetEtiket(**item) for item in json.loads(resp.text)]

    # Eksik verse_key kontrolü
    gelen = {s.verse_key for s in sonuclar}
    eksik = beklenen_keys - gelen
    if eksik:
        raise ValueError(f"Yanıtta eksik verse_key: {eksik}")

    return sonuclar


def batch_isle_retry(
    client: genai.Client,
    config: types.GenerateContentConfig,
    template: str,
    batch: list[tuple[str, str, str]],
    pbar: tqdm,
) -> list[AyetEtiket]:
    """
    Hata durumunda batch'i yarıya bölerek retry yapar (max 3 deneme).
    Tek-tek gönderme yoktur — maliyet düşük kalır.
    """
    if not batch:
        return []

    beklenen = {vk for vk, _, _ in batch}

    for deneme in range(1, MAX_RETRY + 1):
        try:
            sonuclar = gemini_gonder(
                client, config,
                prompt_olustur(template, batch),
                beklenen,
            )
            pbar.set_postfix(batch=f"{len(batch)}ayet", retry=deneme - 1)
            return sonuclar

        except Exception as e:
            pbar.write(f"  ✗ Deneme {deneme}/{MAX_RETRY} hata: {str(e)[:80]}")
            if deneme == MAX_RETRY:
                # Son şans: batch'i ikiye böl
                if len(batch) > 1:
                    pbar.write(f"  ⚡ Batch ikiye bölünüyor ({len(batch)} → {len(batch)//2})")
                    yari = len(batch) // 2
                    sol = batch_isle_retry(client, config, template, batch[:yari], pbar)
                    sag = batch_isle_retry(client, config, template, batch[yari:], pbar)
                    return sol + sag
                pbar.write(f"  ✗ {batch[0][0]} başarısız, atlanıyor")
                return []
            time.sleep(2 ** deneme)

    return []


# ── Ana akış ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", type=int, default=0, metavar="N",
                        help="Sadece N ayet işle (test)")
    parser.add_argument("--reset", action="store_true",
                        help="verse_tags tablosunu temizle ve baştan başla")
    parser.add_argument("--surah", type=int, default=None,
                        help="Sadece belirli bir sureyi işle")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env.local")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("HATA: GEMINI_API_KEY bulunamadı.", file=sys.stderr)
        sys.exit(1)

    if not PROMPT_FILE.exists():
        print(f"HATA: Prompt dosyası bulunamadı: {PROMPT_FILE}", file=sys.stderr)
        sys.exit(1)

    template = PROMPT_FILE.read_text(encoding="utf-8")

    conn = sqlite3.connect(DB_PATH)
    tablo_olustur(conn)

    if args.reset:
        conn.execute("DELETE FROM verse_tags")
        conn.commit()
        print("  verse_tags tablosu temizlendi.")

    limit = args.dry_run if args.dry_run > 0 else None
    bekleyen = islenmemis_ayetleri_al(conn, args.surah, limit)

    print(f"\n{'='*58}")
    print(f"  KURAN TEMA ETİKETLEME  |  {MODEL}")
    print(f"{'='*58}")
    print(f"  Bekleyen ayet   : {len(bekleyen)}")
    print(f"  Batch boyutu    : {BATCH_SIZE}")
    print(f"  Toplam batch    : {(len(bekleyen) + BATCH_SIZE - 1) // BATCH_SIZE}")
    if args.surah:
        print(f"  Sure filtresi   : {args.surah}")
    if args.dry_run:
        print(f"  DRY-RUN modu    : {args.dry_run} ayet")
    print()

    if not bekleyen:
        print("  Tüm ayetler zaten etiketlenmiş.")
        conn.close()
        return

    client = genai.Client(api_key=api_key)
    config = types.GenerateContentConfig(
        temperature=0,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
        response_schema=list[AyetEtiket],
    )

    toplam_kaydedilen = 0
    toplam_batch      = (len(bekleyen) + BATCH_SIZE - 1) // BATCH_SIZE

    with tqdm(total=len(bekleyen), desc="Etiketleniyor", unit="ayet", ncols=80) as pbar:
        for i in range(0, len(bekleyen), BATCH_SIZE):
            batch = bekleyen[i : i + BATCH_SIZE]

            sonuclar = batch_isle_retry(client, config, template, batch, pbar)

            if sonuclar:
                n = db_kaydet(conn, sonuclar)
                toplam_kaydedilen += n
                pbar.update(len(batch))
                pbar.write(
                    f"  ✓ Batch {i//BATCH_SIZE+1}/{toplam_batch} "
                    f"— {n} ayet kaydedildi "
                    f"(örn: {sonuclar[0].verse_key} → {sonuclar[0].ana_tema})"
                )
            else:
                pbar.write(f"  ✗ Batch {i//BATCH_SIZE+1} tamamen başarısız, atlandı")
                pbar.update(len(batch))

            time.sleep(ARALIK_SN)

    conn.close()

    print(f"\n{'='*58}")
    print(f"  ÖZET")
    print(f"{'='*58}")
    print(f"  Kaydedilen ayet  : {toplam_kaydedilen}")
    print(f"  Atlanan          : {len(bekleyen) - toplam_kaydedilen}")
    print()

    # Etiketleme tamamlandıysa verse_tag_items junction tablosunu güncelle.
    # Bu tablo arama performansı için kritik (json_each full scan yerine index lookup).
    if toplam_kaydedilen > 0:
        print("verse_tag_items junction tablosu güncelleniyor...")
        import subprocess, sys
        result = subprocess.run(
            [sys.executable, "scripts/_db_perf_optimize.py"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("  ✓ Junction tablo güncellendi.")
        else:
            print(f"  ⚠ Junction tablo güncellenemedi:\n{result.stderr[:200]}")
    print()


if __name__ == "__main__":
    main()
