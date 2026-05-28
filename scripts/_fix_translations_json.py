import json, sys
sys.stdout.reconfigure(encoding="utf-8")

with open("data/normalized/translations.json", encoding="utf-8") as f:
    data = json.load(f)

duzeltmeler = {
    # (surahId, ayahNumber, source): (yeni_text, yeni_status)
    (1, 7, "yazir"): (
        "O kendilerine nimet verdiğin mutlu kimselerin yoluna; o gazaba uğrayanların değil, sapkınların da değil.",
        "available"
    ),
    (112, 1, "ozturk"): (
        "De ki: O, Allah'tır; Ahad'dır, tektir",
        "available"
    ),
    (4, 171, "bulac"): (
        "Ey Kitap ehli, dininizde aşırılığa gitmeyin ve Allah hakkında gerçek olandan başkasını söylemeyin. "
        "Meryem oğlu Mesih İsa, sadece Allah'ın elçisi, Meryem'e ilka ettiği kelimesi ve O'ndan bir ruhtur.",
        "available"
    ),
    (9, 3, "bulac"): (
        "Allah ve Resulü'nden, kendileriyle antlaşma yaptığınız müşriklere kesin bir bildiridir: "
        "Eğer tevbe ederseniz, bu sizin için daha hayırlıdır. Yüz çevirirseniz, bilin ki Allah'ı âciz bırakamazsınız.",
        "available"
    ),
}

guncellenen = 0
for record in data:
    for t in record["translations"]:
        key = (record["surahId"], record["ayahNumber"], t["source"])
        if key in duzeltmeler:
            yeni_text, yeni_status = duzeltmeler[key]
            t["text"]   = yeni_text
            t["status"] = yeni_status
            s, a, src = key
            print(f"  ✓ {s}:{a} {src} → {yeni_status} | {yeni_text[:65]}")
            guncellenen += 1

with open("data/normalized/translations.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

print(f"\nGüncellenen: {guncellenen}")
