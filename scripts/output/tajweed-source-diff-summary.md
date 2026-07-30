# Tecvid Kaynak Farkı Audit Özeti

- Karşılaştırılan ayet: **6236**
- Toplam audit kaydı: **68204**
- Manuel inceleme gereken ayet: **2612**
- Koordinat sistemi: `unicode-code-point-half-open`

| Sınıf | Açıklama | Kayıt | Ayet |
|---:|---|---:|---:|
| 1 | İki tarafta tamamen aynı kural | 62013 | 6152 |
| 2 | Bizde var, eski kaynakta yok | 0 | 0 |
| 3 | Eski kaynakta var, bizde yok | 0 | 0 |
| 4 | Aynı konumda farklı tecvid kuralı | 0 | 0 |
| 5 | Yalnız Unicode/karakter yazımı farklı, canonical hizalama aynı | 2285 | 1377 |
| 6 | Token veya grapheme hizalama problemi | 3074 | 2257 |
| 7 | Belirsiz veya otomatik karar verilemeyen durum | 720 | 625 |
| 8 | Besmele kaynak farkı | 112 | 112 |

Authoritative kaynaklar değiştirilmemiştir. Eski kaynak yalnız `data/app.db / verses.arabic_tajweed` üzerinden read-only açılmış ve mevcut production parser/hizalayıcı ile yeniden hizalanmıştır.
