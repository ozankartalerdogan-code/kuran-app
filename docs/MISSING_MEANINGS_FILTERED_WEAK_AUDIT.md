# Missing Meanings Filtered Weak Audit

Tarih: 2026-05-14

Bu rapor missing-meanings kayitlarini filtreleyerek kullanici-facing weak correspondence icin ne kadar uygun olduklarini inceler. Runtime, UI, default source ve veri dosyalari degistirilmedi.

## Genel Sonuc

- Ham missing kayit: 24338
- Filtre sonrasi visible candidate: 12685
- Bastirilan kayit: 11653
- Ham etkilenen ayet: 5747
- Filtre sonrasi etkilenen ayet: 4921
- Gurultu azalmasi: %47.9

## Limit Ozetleri

| Limit | Ham missing | Filtreli visible | Bastirilan | Ham ayet | Filtreli ayet | Azalma |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 575 | 233 | 342 | 92 | 71 | %59.5 |
| 500 | 2908 | 1404 | 1504 | 476 | 411 | %51.7 |
| 1000 | 5971 | 2887 | 3084 | 964 | 848 | %51.6 |

## Bastirma Sebepleri

| Sebep | Adet |
|---|---:|
| no_lemma_root | 11300 |
| short_label | 256 |
| weak_formula_lemma | 97 |

## Kontrol Ayetleri

| Ayet | Profile | Ham | Filtreli | Bastirilan | Mevcut weak preview |
|---|---|---:|---:|---:|---|
| 2:173 | hukum_istisna | 5 | 5 | 0 | yiyecek adlari; zaruret/istisna ifadesi |
| 4:29 | emir_yasak | 5 | 2 | 3 | emir, yasak ve davranis uyarilari |
| 5:90 | emir_yasak | 8 | 6 | 2 | emir, yasak ve davranis uyarilari |
| 49:12 | emir_yasak | 9 | 4 | 5 | emir, yasak ve davranis uyarilari |
| 99:7 | ahiret | 2 | 2 | 0 | amel, karsilik ve sonuc ifadeleri |
| 101:6 | ahiret | 2 | 1 | 1 | amel, karsilik ve sonuc ifadeleri |

## Karar

Kaynak degerli ama ham hali kullanici-facing degil. Filtreli candidate listesi weak correspondence icin daha guvenli bir temel sagliyor. Sonraki adim, preview tarafinda ham missing kayitlari yerine bu filtre mantigini opt-in audit ile denemek olmali.