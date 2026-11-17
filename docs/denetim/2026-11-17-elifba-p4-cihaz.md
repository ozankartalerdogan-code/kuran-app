# Elif-Ba Paket 4 — cihaz denetimi, 2026-11-17

Samsung A03 (SM-A035F), Android 13; adb `R96T80012SY`; `com.kuranapp.mobile`, Metro 8082 / USB reverse. Açık tema, 720×1600, yoğunluk 300. Testi Codex yaptı; kod değiştirilmedi. (Codex'in özgün raporu kodlama hatasıyla bozulduğu için Claude tarafından aynı içerikle yeniden yazıldı.)

Giriş: Elif-Ba → **Harf-i Tarif** sekmesi → "Peki Sen Bilebilir misin?" → Teste Başla (`app/elifba/index.tsx:549`; ayrı rota `app/elifba/harf-i-tarif.tsx:13` aynı bileşeni açar).

| Kontrol | Sonuç | Gözlem |
|---|---|---|
| 1. Tamamlama, son sonuç, diğer skorlar | **GEÇTİ** | 25 soru: 18 doğru, 7 yanlış. Sonuçta ve girişte "Son tamamlanan test: 18/25". RKStorage `"1000":{"score":18,"total":25}`; Ders 1 `14/15` korundu. |
| 2. Çıkıp geri gelme | **GEÇTİ** | Uygulama kapatılıp açıldıktan sonra 18/25 görünüyor. |
| 3. Yarıda bırakma / yeniden tamamlama | **GEÇTİ** | 2 cevap sonrası ayrılınca 18/25 korundu; ikinci turda 24. cevaba kadar eski skor kaldı, 25. cevapla tek DB yazımıyla 20/25 oldu. |
| 4. Ders listesi, rozet, kilit, tekrar düğmesi | **GEÇTİ** | Önce/sonra ekran XML'leri eşit; "1000" listeye/rozete/ilerlemeye karışmadı. Tekrar düğmesinin iç akışı (uygun kayıt yoktu) denenmedi. |
| 5. Dinle sekmesi gizleme (eb773b31) | **GEÇTİ** | Ders 6: yalnız Kartlar/Test, düzgün dağılıyor. Ders 1 ve 2: Kartlar/Test/Dinle var. |
| 6. Görsel düzen | **GEÇTİ** (normal akış) | Taşma/çakışma yok. Kayıt hatası zorlanamadı; hata mesajı ve "Tekrar dene" **denenmedi**. |

Doğrulanan akışlarda hata bulunmadı. Cihazda son Harf-i Tarif skoru 20/25 bırakıldı.

Kanıtlar: scratchpad `c4-*` (png, xml, json, sqlite).
