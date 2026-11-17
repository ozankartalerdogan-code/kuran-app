# Elif-Ba Paket 7 — cihaz testi

17.11.2026 · Samsung A03 `R96T80012SY` · `com.kuranapp.mobile` · Metro 8082, USB reverse. Kod değiştirilmedi, commit yapılmadı. Kilitli derslere `kuranyolu://elifba/<id>` ile girildi.

Kanıt dizini: `C:/Users/jalek/AppData/Local/Temp/claude/2851084b8bf36871/f02e84e1-974f-4f4b-994b-0f34414926da/scratchpad/`. Aşağıdaki dosyalar bu dizindedir; ekranların PNG ve UIAutomator XML karşılıkları saklandı.

| Kontrol | Sonuç | Kanıt / gözlem |
|---|---|---|
| 1. Sekmeler | **GEÇTİ** | D1'de Alıştırma yok (`c7-d1.png/xml`); D2, D4, D6, D8, D9'da var. Dört sekme tek satırda; kesilme/taşma görülmedi. D6'da Dinle yok, üç sekme düzgün. `c7-d2-tabs`, `c7-d6-tabs`, `c7-visual-a.jpg`, `c7-visual-b.jpg`. Sıra: Kartlar/Test/Alıştırma/Dinle. |
| 2. Sorular ve Arapça | **GEÇTİ** | D2, D3, D4, D8, D9'un toplam 10 sorusu çözüldü. Soru, şık sırası ve Arapça metin JSON ile birebir eşleşti: `c7-validation.json`, `c7-match-d{3,4,8,9}-tr.json`. D2 bağlantılı biçimler ve Arapça şıklar okunaklı; D3/D4/D9 harekeleri büyük ve görünür. D8'in iki sorusu yalnız metin. Görsel inceleme: `c7-d2-q1.png`, `c7-visual-a.jpg`, `c7-visual-b.jpg`. |
| 3. SRS ve puan izolasyonu | **GEÇTİ** | D2 ilk cevap doğru, ikinci cevap yanlış: sonuç 1/2 (`c7-d2-done`). Yanlış `exercise:100002` → `box:1, wrong:1` (`c7-after-wrong.json`). Aynı soruya sonraki doğru cevap → kutu 2, son tekrar → kutu 3. Başlangıçtaki 5 `q:` ve 22 `listen:harf:` kaydı alan alan korundu; `elifbaQuizScores` değişmedi: ders 1 = 14/15, 1000 = 20/25 (`c7-before.json`, `c7-final.json`, `c7-validation.json`). İlk kez doğru yanıtlanan soruda kayıt oluşmaması mevcut `elifbaProgress.ts:103` davranışı. |
| 4. Bitirme, dönüş ve yanlış sayısı | **KALDI — dönüş kenar durumu** | Ana liste → D2 → bitir → Derslere dön akışı listeye döndü (`c7-return-home-normal`). Ancak D1 → deep link D2 → bitir → Derslere dön, D1'e döndü (`c7-return.png/xml`); liste garantilenmiyor. Yanlışlarımı Tekrar Et sayısı **GEÇTİ**: başlangıçta ve alıştırma yanlışı kutu 1'deyken düğme yok, sayı 0 → 0 (`c7-home-before`, `c7-home-after`). Pozitif başlangıç sayısı senaryosu denenmedi. |
| 5. EN → TR | **GEÇTİ** | Daha Fazla → Dil → English; D2'nin iki sorusu, sekmeler ve ilerleme İngilizce. JSON'un EN alanları birebir eşleşti (`c7-d2-en-q1/q2`, `c7-validation.json`). Sonra aynı ayardan Türkçe seçildi (`c7-settings-tr.png/xml`); son depolama `uiLanguage=tr`. Ayar yolu: `apps/mobile/app/(tabs)/daha-fazla.tsx:133–147`. |
| 6. Mevcut sekmeler | **GEÇTİ — kısa duman testi** | Kart çevrildi, Elif → Be ve 1/29 → 2/29 geçişi çalıştı (`c7-smoke-card-flip`, `c7-smoke-card-next-ok`). Test 1/15 sorusu ve şıkları açıldı (`c7-smoke-quiz`). Dinle 1/15 ve seçenekler açıldı, ses düğmesine basıldı; uygulama UID 10273 için oynatıcı başlatma kaydı var (`c7-smoke-listen-play`, `c7-audio.txt`). Ses işitsel olarak değerlendirilmedi; Test/Dinle oturumları tamamlanmadı. |

Hata önerisi: `apps/mobile/app/elifba/[dersId].tsx:791` içindeki Alıştırma `onFinish={() => router.back()}` geçmişteki ekrana dönüyor. “Derslere dön” hedefini sabitlemek için `router.replace("/elifba")` değerlendirilmeli. Düzeltme uygulanmadı.

Son durum: dil **TR**; uçak modu kapalı, Wi-Fi bağlı ve mobil veri açık (`c7-network.txt`). Test nedeniyle D2 kart ilerlemesi %3 oldu; alıştırma SRS kaydı cihazda kaldı. Başlangıçtaki kod değişikliklerine dokunulmadı.

Kodlama doğrulaması: UTF-8, BOM yok; yeniden okuma ile Türkçe karakterler doğrulandı: **ğ, ı, ş, ç, ö, ü, İ**.
