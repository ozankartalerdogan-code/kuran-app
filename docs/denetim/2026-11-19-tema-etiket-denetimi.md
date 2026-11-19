# Tema etiketleri — yeniden etiketleme ve denetim (2026-11-19)

## Etiketleme
- 1. tur: 243 batch (6236 ayet, ±2 bağlam). Motorlar: agy gemini-3.8-flash-high (çoğunluk), Codex gpt-6.1-terra, opencode mimo-v2.6-flash-free.
- 2. tur (iyileştirme): 1. tur etiketleri taslak olarak verildi; boş ana tema doldurma, pasaj bağlamındaki kişi/kavim/topluluk etiketleri, tabiat ayetlerinden `ibret` kaldırma. Motorlar: Codex (171 batch), agy (72).
- Kürasyonlu kodlar (namaz-/korunma-/ismiazam-/dua-) her iki turda DB'de aynen korundu.
- 2. tur etkisi: boş ana tema 855 → 8; +4174 / −625 etiket; ayet başı ortalama 2,58 → 3,15.
- Elle düzeltme: 2:233 `anne-baba` → `evlilik` (kullanıcı kararı).

## Denetim (kör, katmanlı; Claude alt ajanları puanladı)
| Örnek | n | 1. tur FIT | 2. tur FIT | WRONG |
|---|---|---|---|---|
| Katmanlı örnek (seed 42) | 225 | %79 | %94,7 | 0 |
| Hassas | 70 | %84 | %92,9 | 0 |
| Yeni eklenen hz-muhammed / musrikler | 35 | – | %100 | 0 |

Kabul eşiği (≥%90 FIT, ≤%2 WRONG, hassas WRONG 0) 2. turda sağlandı.
Not: 2. tur denetçilerine bağlam kişi etiketleri ve kürasyonlu dua listeleri için açıklama eklendi (1. tur denetçisi `ismiazam-sekine`'yi yanlış okudu).

Kalan zayıflar (WEAK, düzeltme isteğe bağlı): 70:27 ana tema, 70:3 alt etiket yok, 89:12 helak kavimleri, 75:5 ahiret/ba's eksik, 26:123 ve 26:141 `yalan-iftira` yerine `kafirler`, 49:6 ana tema.
