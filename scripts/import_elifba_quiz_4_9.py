"""
Elifba Quiz - Ders 4-9 sorularını data/app.db'ye ekler.
"""
import sqlite3
import json
import sys

DB_PATH = "data/app.db"

QUESTIONS = [
    # ─── DERS 4: CEZM ───────────────────────────────────────────────────
    {
        "lesson_id": 4,
        "soru_tipi": "coktan_secmeli",
        "soru": "Cezm işareti (ْ) harfe ne yapar?",
        "secenekler": ["Harfi harekesiz (sessiz) yapar", "Harfe 'A' sesi verir", "Harfi iki kez okuttur", "Harfi uzatır"],
        "dogru_cevap": "Harfi harekesiz (sessiz) yapar",
        "ipucu": "Cezm üzerindeki harfin sesini keserek önceki hecenin içine katar. Örn: قُلْ → 'Kul' (L sesi kapalı).",
        "zorluk": 1,
    },
    {
        "lesson_id": 4,
        "soru_tipi": "coktan_secmeli",
        "soru": "لَمْ kelimesinin doğru okunuşu hangisidir?",
        "secenekler": ["Lem", "Leme", "Lemi", "Lemu"],
        "dogru_cevap": "Lem",
        "ipucu": "لَ = 'Le' (fetha), مْ = cezm (M kapalı). Birleşince: 'Lem'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 4,
        "soru_tipi": "coktan_secmeli",
        "soru": "قُلْ kelimesinde cezmli harf hangisidir?",
        "secenekler": ["لْ (lam)", "قُ (kaf)", "İkisi birden", "Hiçbiri"],
        "dogru_cevap": "لْ (lam)",
        "ipucu": "قُ harfi ötre (damme) alıyor; لْ üzerindeki cezm onu harekesiz bırakır.",
        "zorluk": 1,
    },
    {
        "lesson_id": 4,
        "soru_tipi": "coktan_secmeli",
        "soru": "Cezm ile hareke (üstün/esre/ötre) arasındaki temel fark nedir?",
        "secenekler": [
            "Hareke ses ekler, cezm sesi kaldırır",
            "Hareke sesi kaldırır, cezm ses ekler",
            "İkisi de aynı işlevi görür",
            "Cezm uzatma işaretidir",
        ],
        "dogru_cevap": "Hareke ses ekler, cezm sesi kaldırır",
        "ipucu": "Üstün/esre/ötre harfe ses kazandırır; cezm ise harfin sesini söndürür.",
        "zorluk": 2,
    },
    {
        "lesson_id": 4,
        "soru_tipi": "coktan_secmeli",
        "soru": "أَنْزَلَ kelimesinde kaç tane cezm vardır?",
        "secenekler": ["1", "2", "3", "0"],
        "dogru_cevap": "1",
        "ipucu": "نْ harfi cezmli; أَ ve زَ ve لَ hep harekeli. Sadece nun harekesiz.",
        "zorluk": 2,
    },

    # ─── DERS 5: ŞEDDE ──────────────────────────────────────────────────
    {
        "lesson_id": 5,
        "soru_tipi": "coktan_secmeli",
        "soru": "Şedde işareti (ّ) harfe ne yapar?",
        "secenekler": [
            "Harfi iki kez okutturur (kapalı + harekeli)",
            "Harfi uzatır",
            "Harfi harekesiz yapar",
            "Harfe 'N' sesi ekler",
        ],
        "dogru_cevap": "Harfi iki kez okutturur (kapalı + harekeli)",
        "ipucu": "Şedde: önce harf cezmli (kapalı), ardından aynı harf harekesiyle açık okunur. كُلُّ → 'Kul-lu'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 5,
        "soru_tipi": "coktan_secmeli",
        "soru": "كُلُّ kelimesi nasıl okunur?",
        "secenekler": ["Kul-lu", "Ku-lu", "Kul", "Kul-lü"],
        "dogru_cevap": "Kul-lu",
        "ipucu": "كُ = 'Ku', لُّ = şedde → önce 'l' kapalı, sonra ötreli 'lu'. Toplam: Kul-lu.",
        "zorluk": 1,
    },
    {
        "lesson_id": 5,
        "soru_tipi": "coktan_secmeli",
        "soru": "جَنَّةُ kelimesinde şedde hangi harfin üzerindedir?",
        "secenekler": ["نّ (nun)", "جَ (cim)", "تُ (te)", "ةُ (te marbutā)"],
        "dogru_cevap": "نّ (nun)",
        "ipucu": "جَ+نَّ+ةُ → nûn iki kez: önce kapalı, sonra fethalı. 'Can-ne-tü'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 5,
        "soru_tipi": "coktan_secmeli",
        "soru": "Şedde ile cezm arasındaki fark nedir?",
        "secenekler": [
            "Cezm tek harfi kapatır; şedde harfi önce kapatır sonra harekesiyle açar",
            "Şedde harfi kapatır; cezm iki kez okutturur",
            "İkisi de aynı işlevi görür",
            "Şedde uzatma, cezm kısaltmadır",
        ],
        "dogru_cevap": "Cezm tek harfi kapatır; şedde harfi önce kapatır sonra harekesiyle açar",
        "ipucu": "Cezm → 1 kapalı ses. Şedde → 1 kapalı + 1 harekeli ses (toplam iki hece payı).",
        "zorluk": 2,
    },
    {
        "lesson_id": 5,
        "soru_tipi": "coktan_secmeli",
        "soru": "مُحَمَّدُ kelimesinde şedde hangi harftedir?",
        "secenekler": ["مّ (mim)", "حَ (ha)", "دُ (dal)", "مُ (mim başı)"],
        "dogru_cevap": "مّ (mim)",
        "ipucu": "مُ-حَ-مَّ-دُ → ortadaki 'mim' şeddeli: 'Mu-ham-me-du'.",
        "zorluk": 2,
    },

    # ─── DERS 6: MED HARFLERİ ───────────────────────────────────────────
    {
        "lesson_id": 6,
        "soru_tipi": "coktan_secmeli",
        "soru": "Med harfleri hangileridir?",
        "secenekler": ["Elif (ا), Vav (و), Ye (ي)", "Ba (ب), Te (ت), Se (ث)", "Lam (ل), Mim (م), Nun (ن)", "Kaf (ق), Kef (ك), Cim (ج)"],
        "dogru_cevap": "Elif (ا), Vav (و), Ye (ي)",
        "ipucu": "Med harfleri (ا و ي) kendinden önceki harfin sesini uzatır. Ezberde: 'Elif-Vav-Ye'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 6,
        "soru_tipi": "coktan_secmeli",
        "soru": "قَالَ kelimesinde hangi med harfi uzatma yapıyor?",
        "secenekler": ["Elif (ا)", "Vav (و)", "Ye (ي)", "Med harfi yok"],
        "dogru_cevap": "Elif (ا)",
        "ipucu": "قَا → قَ üstünlü, ardından ا gelince 'ka' uzar → 'Kaa'. قَالَ = 'Kaale'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 6,
        "soru_tipi": "coktan_secmeli",
        "soru": "كِتَابٌ kelimesinde med harfi nerede ve hangi sesi uzatıyor?",
        "secenekler": ["ا, 'A' sesini uzatır → 'taab'", "و, 'U' sesini uzatır", "ي, 'İ' sesini uzatır", "Med harfi yok"],
        "dogru_cevap": "ا, 'A' sesini uzatır → 'taab'",
        "ipucu": "كِ-تَا-بٌ → تَ fethalı + ا med harfi = uzun 'aa'. Ki-taab-un.",
        "zorluk": 1,
    },
    {
        "lesson_id": 6,
        "soru_tipi": "coktan_secmeli",
        "soru": "Vav (و) med harfi hangi hareke ile birlikte uzatma yapar?",
        "secenekler": ["Ötre (damme) ile", "Üstün (fetha) ile", "Esre (kesra) ile", "Cezm ile"],
        "dogru_cevap": "Ötre (damme) ile",
        "ipucu": "و med için önündeki harfin ötreli olması gerekir. قَالُوا → الُو = uzun 'uu'.",
        "zorluk": 2,
    },
    {
        "lesson_id": 6,
        "soru_tipi": "coktan_secmeli",
        "soru": "عَظِيمٌ kelimesinde uzatma yapan med harfi hangisidir?",
        "secenekler": ["ي (Ye)", "ا (Elif)", "و (Vav)", "Med harfi yok"],
        "dogru_cevap": "ي (Ye)",
        "ipucu": "ظِ esreli + ي med harfi = uzun 'ii'. عَ-ظِي-مٌ → 'Azîmun'.",
        "zorluk": 2,
    },

    # ─── DERS 7: TENVİN ─────────────────────────────────────────────────
    {
        "lesson_id": 7,
        "soru_tipi": "coktan_secmeli",
        "soru": "Tenvin nedir?",
        "secenekler": [
            "İki üstün, iki esre veya iki ötre; harfe 'N' sesi katar",
            "Harfi uzatan işarettir",
            "Harfi iki kez okutur",
            "Harekesiz bırakan işarettir",
        ],
        "dogru_cevap": "İki üstün, iki esre veya iki ötre; harfe 'N' sesi katar",
        "ipucu": "Tenvin tanımı: 'Bulunduğu harfin harekesine N sesi verir.' رُسُلٌ → 'rusulun'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 7,
        "soru_tipi": "coktan_secmeli",
        "soru": "İki üstün (ً) tenvin nasıl okunur?",
        "secenekler": ["AN sesi verir", "UN sesi verir", "İN sesi verir", "N sesi vermez"],
        "dogru_cevap": "AN sesi verir",
        "ipucu": "İki üstün = tenvinli fetha → 'an'. Örn: حَكِيمًا → 'Hakîmen'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 7,
        "soru_tipi": "coktan_secmeli",
        "soru": "كِتَابٌ kelimesindeki tenvin hangi çeşittir?",
        "secenekler": ["İki ötre (UN)", "İki üstün (AN)", "İki esre (İN)", "Tenvin değil"],
        "dogru_cevap": "İki ötre (UN)",
        "ipucu": "بٌ → iki ötre = 'bun'. كِتَابٌ → 'Kitaabun'.",
        "zorluk": 1,
    },
    {
        "lesson_id": 7,
        "soru_tipi": "coktan_secmeli",
        "soru": "عَادٍ kelimesindeki tenvin hangi sesi verir?",
        "secenekler": ["İN sesi (iki esre)", "AN sesi (iki üstün)", "UN sesi (iki ötre)", "Ses vermez"],
        "dogru_cevap": "İN sesi (iki esre)",
        "ipucu": "دٍ → iki esre = 'din'. عَادٍ → 'Aadin'.",
        "zorluk": 2,
    },
    {
        "lesson_id": 7,
        "soru_tipi": "coktan_secmeli",
        "soru": "Tenvin kaç çeşittir?",
        "secenekler": ["3 (AN, İN, UN)", "2 (AN, UN)", "4", "1"],
        "dogru_cevap": "3 (AN, İN, UN)",
        "ipucu": "İki üstün (AN), iki esre (İN), iki ötre (UN) → toplam 3 tenvin çeşidi.",
        "zorluk": 1,
    },

    # ─── DERS 8: ASAR, MED ve KASR ──────────────────────────────────────
    {
        "lesson_id": 8,
        "soru_tipi": "coktan_secmeli",
        "soru": "Asar (ٰ) işareti ne anlama gelir?",
        "secenekler": [
            "Önünde med harfi olsun ya da olmasın o harfin uzatılacağını gösterir",
            "Harfi kısaltır",
            "Harfi harekesiz bırakır",
            "Harfe N sesi ekler",
        ],
        "dogru_cevap": "Önünde med harfi olsun ya da olmasın o harfin uzatılacağını gösterir",
        "ipucu": "Asar: 'Önünde med harfi olsun veya olmasın uzatılacağını gösterir.' (Diyanet Elif-Ba tanımı)",
        "zorluk": 1,
    },
    {
        "lesson_id": 8,
        "soru_tipi": "coktan_secmeli",
        "soru": "Med (>) işaretinin anlamı nedir?",
        "secenekler": [
            "Yazı kuralı gereği med harfi olmayan yerde bir elif miktarı uzatılır",
            "Harfi kısaltır",
            "Şedde gibi iki kez okutturur",
            "Tenvin ekler",
        ],
        "dogru_cevap": "Yazı kuralı gereği med harfi olmayan yerde bir elif miktarı uzatılır",
        "ipucu": "Med işareti: önünde yazılı med harfi yoktur ama fonetik olarak uzatma vardır.",
        "zorluk": 2,
    },
    {
        "lesson_id": 8,
        "soru_tipi": "coktan_secmeli",
        "soru": "Kasr işaretinin anlamı nedir?",
        "secenekler": [
            "Yazım gereği med harfi var ama uzatılmaz",
            "Harfi iki kez okutturur",
            "Harfe N sesi ekler",
            "Harekesiz bırakır",
        ],
        "dogru_cevap": "Yazım gereği med harfi var ama uzatılmaz",
        "ipucu": "Kasr: 'Uzatılmaz anlamına gelir; yazım kuralı gereği med harfi olduğu hâlde uzatılmaz.' (Elif-Ba tanımı)",
        "zorluk": 2,
    },
    {
        "lesson_id": 8,
        "soru_tipi": "coktan_secmeli",
        "soru": "Asar, Med ve Kasr işaretleri hangi konuyla ilgilidir?",
        "secenekler": ["Uzatma (med) kurallarıyla", "Şedde kurallarıyla", "Tenvin kurallarıyla", "Cezm kurallarıyla"],
        "dogru_cevap": "Uzatma (med) kurallarıyla",
        "ipucu": "Üçü de okurken ne kadar uzatılacağını (veya uzatılmayacağını) gösterir.",
        "zorluk": 1,
    },
    {
        "lesson_id": 8,
        "soru_tipi": "coktan_secmeli",
        "soru": "Hangi işaret 'burada uzatma YOK' bilgisini verir?",
        "secenekler": ["Kasr", "Med", "Asar", "Şedde"],
        "dogru_cevap": "Kasr",
        "ipucu": "Kasr = kısaltma/kısma demektir; med harfi yazılmış ama okunmaz.",
        "zorluk": 2,
    },

    # ─── DERS 9: ZAMİR VE LAFZATULLAH ───────────────────────────────────
    {
        "lesson_id": 9,
        "soru_tipi": "coktan_secmeli",
        "soru": "Zamir nedir ve nerede bulunur?",
        "secenekler": [
            "Kelimelerin sonundaki (ه) harfi; kendinden önceki ve sonraki duruma göre uzatılır",
            "Kelimelerin başındaki (ا) harfi; her zaman uzatılır",
            "Ortada bulunan şedde işareti",
            "İki ötreli tenvin",
        ],
        "dogru_cevap": "Kelimelerin sonundaki (ه) harfi; kendinden önceki ve sonraki duruma göre uzatılır",
        "ipucu": "Elif-Ba tanımı: 'Kelimelerin sonunda bulunan (ه) harfine zamir denir.'",
        "zorluk": 1,
    },
    {
        "lesson_id": 9,
        "soru_tipi": "coktan_secmeli",
        "soru": "Lafzatullah (الله) kelimesi nedir?",
        "secenekler": [
            "Allah kelimesinin özel adı; lam harfi önceki harfin harekesine göre kalın/ince okunur",
            "Her zaman ince okunan bir kelime",
            "Tenvinli bir isim",
            "Med harfi olmayan kelime",
        ],
        "dogru_cevap": "Allah kelimesinin özel adı; lam harfi önceki harfin harekesine göre kalın/ince okunur",
        "ipucu": "Lafzatullah: 'Lamdaki kalınlık/incelik önceki harfin harekesine bağlıdır.' (Elif-Ba)",
        "zorluk": 1,
    },
    {
        "lesson_id": 9,
        "soru_tipi": "coktan_secmeli",
        "soru": "بِاللَّهِ cümlesinde Allah kelimesi nasıl okunur?",
        "secenekler": ["İnce (biliLLahi)", "Kalın (bilALLahi)", "Her ikisi de doğru", "Uzatılarak"],
        "dogru_cevap": "İnce (biliLLahi)",
        "ipucu": "بِ esreli (i sesi) → lam ince okunur. Esre ve üstün → ince; ötre → kalın.",
        "zorluk": 2,
    },
    {
        "lesson_id": 9,
        "soru_tipi": "coktan_secmeli",
        "soru": "قَالَ اللَّهُ cümlesinde Allah kelimesi nasıl okunur?",
        "secenekler": ["Kalın (kaalALLahu)", "İnce (kaaliLLahu)", "Her ikisi de doğru", "Okunmaz"],
        "dogru_cevap": "Kalın (kaalALLahu)",
        "ipucu": "قَالَ → lam üstünlü (fetha, 'a' sesi) → Allah'ın lamı kalın okunur.",
        "zorluk": 2,
    },
    {
        "lesson_id": 9,
        "soru_tipi": "coktan_secmeli",
        "soru": "Zamirin uzatılıp uzatılmayacağı neye göre belirlenir?",
        "secenekler": [
            "Kendinden önceki ve sonraki harfin durumuna göre",
            "Her zaman uzatılır",
            "Hiçbir zaman uzatılmaz",
            "Sadece şeddeli ise uzatılır",
        ],
        "dogru_cevap": "Kendinden önceki ve sonraki harfin durumuna göre",
        "ipucu": "Diyanet Elif-Ba: 'Zamir (ه) önceki ve sonraki harfin durumuna göre uzatılarak veya uzatılmadan okunur.'",
        "zorluk": 2,
    },
]

def insert_questions(db_path, questions):
    db = sqlite3.connect(db_path)
    inserted = 0
    for q in questions:
        db.execute(
            """INSERT INTO elifba_quiz
               (lesson_id, soru_tipi, soru, secenekler, dogru_cevap, ipucu, zorluk)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                q["lesson_id"],
                q["soru_tipi"],
                q["soru"],
                json.dumps(q["secenekler"], ensure_ascii=False),
                q["dogru_cevap"],
                q["ipucu"],
                q["zorluk"],
            ),
        )
        inserted += 1
    db.commit()
    db.close()
    return inserted

if __name__ == "__main__":
    n = insert_questions(DB_PATH, QUESTIONS)
    print(f"Eklendi: {n} soru (Ders 4-9)")

    # Verify
    db = sqlite3.connect(DB_PATH)
    rows = db.execute(
        "SELECT lesson_id, COUNT(*) AS cnt FROM elifba_quiz GROUP BY lesson_id ORDER BY lesson_id"
    ).fetchall()
    for lesson_id, cnt in rows:
        print(f"  Ders {lesson_id}: {cnt} soru")
    db.close()
