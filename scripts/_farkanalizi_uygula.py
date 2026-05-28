import sqlite3, csv, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB       = Path("data/app.db")
FARK_CSV = Path("data/fark_analiz_sonuclari.csv")

# ── Literal düzeltmeleri (10 ayet — 2:234 sadece kök, çeviri değişmez) ───────

LITERAL_DUZELTMELER = {
    "2:27": (
        "Onlar ki Allah'ın ahdini, onu kesinleştirdikten sonra bozarlar, "
        "Allah'ın birleştirilmesini emrettiği şeyi keserler ve yeryüzünde "
        "bozgunculuk yaparlar. İşte onlar hüsrana uğrayanlardır."
    ),
    "2:128": (
        "Rabbimiz! Bizi sana teslim olanlardan kıl ve soyumuzdan da sana "
        "teslim olan bir ümmet kıl."
    ),
    "2:232": (
        "Kadınları boşadığınızda iddetleri dolmuşsa, kendi kocalarıyla "
        "güzellikle anlaştıkları zaman evlenmelerine engel olmayın."
    ),
    "2:256": (
        "Dinde zorlama yoktur, doğruluk sapıklıktan apaçık ayrılmıştır. "
        "Artık kim tağutu inkar edip Allah'a iman ederse, kopmayan sağlam "
        "kulpa yapışmıştır."
    ),
    "2:257": (
        "Allah, iman edenlerin velisidir, onları karanlıklardan nura çıkarır. "
        "Küfredenlerin velileri ise tağuttur, onları nurdan karanlıklara "
        "çıkarırlar."
    ),
    "2:260": (
        "Hani İbrahim demişti ki: 'Rabbim, ölüleri nasıl dirilttiğini bana "
        "göster.' Dedi ki: 'İman etmedin mi?' 'Evet, fakat kalbim mutmain "
        "olsun diye' dedi."
    ),
    "4:97": (
        "Nefislerine zulmedenlerin canlarını melekler aldıklarında onlara "
        "'Ne haldeydiniz?' derler. Onlar da 'Biz yeryüzünde zayıf "
        "bırakılmıştık' derler."
    ),
    "6:95": (
        "Şüphesiz Allah, taneyi ve çekirdeği yarıp çıkarandır; ölüden diriyi "
        "çıkarır ve diriden ölüyü çıkarandır. İşte Allah budur."
    ),
    "6:96": (
        "Tanyerini ağartandır, geceyi bir dinlenme kıldı, güneşi ve ayı bir "
        "hesap kıldı. İşte bu, üstün ve bilenin takdiridir."
    ),
    "6:99": (
        "Ve O, gökten su indirendir. Onunla her bitkinin filizini çıkardık. "
        "Ondan yeşil bitkiler çıkardık, ondan da birbirine binmiş taneler "
        "çıkarırız."
    ),
}

# ── 2:234 kök düzeltmesi ─────────────────────────────────────────────────────

KOK_DUZELTME = {
    "verse_key": "2:234",
    "root":      "وفي",
    "yeni":      "bekleme süresi, tamamlama",
}

# ── Dokunulmayacaklar (ÜSLUP FARKI) ──────────────────────────────────────────

USTUP_VKS = [
    "2:17","2:20","2:24","2:26","2:31","2:36","2:38","2:44","2:54","2:59",
    "2:61","2:62","2:66","2:69","2:70","2:72","2:74","2:235","2:236","2:240",
    "2:241","2:242","4:128","4:129","4:130","6:89","6:90","6:153","6:160",
    "11:51","12:104","13:39","19:77","21:98","32:25","36:21","36:56",
    "43:55","47:7","52:32","52:35",
]

USTUP_MESAJ = (
    "Meal ile literal ceviri arasinda anlam farki yoktur, "
    "sadece uslup farki vardir."
)

# ── DB işlemleri ─────────────────────────────────────────────────────────────

conn = sqlite3.connect(DB)
cur  = conn.cursor()

# 1. Literal düzeltmeleri
n_lit = 0
for vk, yeni in LITERAL_DUZELTMELER.items():
    cur.execute("SELECT literal_ceviri FROM verses WHERE verse_key=?", (vk,))
    r = cur.fetchone()
    eski = r[0] if r else "YOK"
    cur.execute("UPDATE verses SET literal_ceviri=? WHERE verse_key=?", (yeni, vk))
    n_lit += cur.rowcount
    print(f"[LIT] {vk}")
    print(f"  ESK: {eski[:80]}")
    print(f"  YNI: {yeni[:80]}")
    print()

# 2. Kök düzeltmesi (words tablosu)
cur.execute(
    "UPDATE words SET meaning_tr=? WHERE verse_key=? AND root=?",
    (KOK_DUZELTME["yeni"], KOK_DUZELTME["verse_key"], KOK_DUZELTME["root"])
)
n_kok = cur.rowcount
print(f"[KÖK] 2:234 | {KOK_DUZELTME['root']} → {KOK_DUZELTME['yeni']} ({n_kok} kelime güncellendi)")
print()

# 3. ÜSLUP FARKI güncelleme (fark_analizi)
n_ustup = 0
for vk in USTUP_VKS:
    cur.execute("UPDATE verses SET fark_analizi=? WHERE verse_key=?", (USTUP_MESAJ, vk))
    n_ustup += cur.rowcount

conn.commit()
conn.close()

# 4. fark_analiz_sonuclari.csv güncelle
with open(FARK_CSV, encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
fn = list(rows[0].keys())
n_csv = 0
for row in rows:
    if row["verse_key"] in USTUP_VKS:
        row["fark_turu"] = "ÜSLUP FARKI"
        n_csv += 1
with open(FARK_CSV, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=fn)
    w.writeheader()
    w.writerows(rows)

# ── Özet ─────────────────────────────────────────────────────────────────────

print("=" * 55)
print("  ÖZET")
print("=" * 55)
print(f"  Literal düzeltilen       : {n_lit} ayet")
print(f"  Kök düzeltilen (2:234)   : {n_kok} kelime")
print(f"  ÜSLUP FARKI işaretlenen  : {n_ustup} ayet (DB)")
print(f"  ÜSLUP FARKI işaretlenen  : {n_csv} ayet (CSV)")
