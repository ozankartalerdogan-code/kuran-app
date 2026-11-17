# Elif-Ba Paket 3 — Samsung A03 cihaz testi

2026-11-17 · SM-A035F / Android 13 · adb `R96T80012SY` · `com.kuranapp.mobile` · Metro 8082 (USB reverse).
720×1600 ekranın başlangıç yoğunluğu 300 dpi (384dp) idi; kontroller geçici 320 dpi (360dp) ile yapıldı, sonunda 300 dpi geri yüklendi. Kod değiştirilmedi, commit yapılmadı.

**Sonuç: 2 bulgu; kabul kontrolü 3 ve deep link dönüşü kaldı.**

Kanıt kökü **K**: `C:/Users/jalek/AppData/Local/Temp/claude/2851084b8bf36871/f02e84e1-974f-4f4b-994b-0f34414926da/scratchpad`.
Aşağıdaki dosyalar K içindedir; ekran kanıtlarının aynı adlı `.xml` dosyaları da vardır. PNG'ler ikili kaydedildi; sekmeler, Dinle, sonuç, çevrimdışı, Ders 2 ve Ders 6 görüntüleri açılarak incelendi. Ses değerlendirmesi işitsel dinlemeyle değil Android oynatıcı durumlarıyla yapıldı.

| # | Karar | Gözlem ve kanıt |
|---|---|---|
| 1 | **GEÇTİ** | 360dp'de Kartlar / Test / 🎧 Dinle aynı satırda, kesilme/taşma yok. `c3-tabs360.png`, `c3-listen.png`. |
| 2 | **GEÇTİ** | Otomatik oynatma piid 2583; tekrar oynatma piid 2591/2719 başladı. Soruda yalnız genel yönerge var; dört şıktan hangisinin doğru olduğunu açıklayan metin/content-desc yok. `c3-auto-real-audio.txt`, `c3-fast-active-audio.txt`, `c3-listen.xml`. |
| 3 | **KALDI** | İlk turdaki 15 sorunun her birinde dört benzersiz Arapça şık var (`c3-options-audit.json`). Yanlış Şın → `listen:harf:13`, box=1. Ancak ilk kez doğru cevaplanan **Vav(26), Fe(20), Ze(11), Sad(14), Cim(5)** için box=2 kaydı yok: sonuç 5/15 iken yalnız 10 yanlış kaydı oluştu. Önceden yanlış olan Ğayn doğru cevaplanınca box 1→2 çalıştı. `c3-answer1.json`, `c3-q03-answer.xml`, `c3-q04-answer.xml`, `c3-q05-answer.xml`, `c3-q09-answer.xml`, `c3-q13-answer.xml`, `c3-listen-done.json`, `c3-correct-existing.json`. `elifbaQuizScores` başlangıçtaki 14/15 olarak kaldı; beş mevcut `q:` kaydı tüm alanlarıyla korundu (`c3-invariants.json`, `c3-before.json`, `c3-final.json`). |
| 4 | **GEÇTİ** | Art arda üç Sonraki dokunuşu yalnız soru 2'ye geçti. Aktif eski ses piid 2719, geçişte paused; yeni ses piid 2727 daha sonra başladı, çakışma görülmedi. `c3-rapid-next.xml`, `c3-fast-active-audio.txt`, `c3-fast-switched-audio.txt`, `c3-fast-switched.xml`. |
| 5 | **GEÇTİ** | Geri öncesi piid 2735 started; geri sonrası paused, aktif uygulama sesi yok; ders listesi açıldı. `c3-back-active-audio.txt`, `c3-back-after-audio.txt`, `c3-back-after.png`. |
| 6 | **GEÇTİ** | Wi-Fi ve veri kapalıyken “Bu harf hangisi? / Ğayn” görsel sorusu oluştu. 3,3 sn bekleme + adb/görüntü alma dahil ilk kanıt ~3,97 sn'de. Soru 1/15, 0 doğru; şıklar etkin, otomatik cevap/ilerleme yok; Ğayn SRS kaydı cevap öncesinde değişmedi. `c3-offline-3s.png`, `c3-offline-time.json`, `c3-offline.xml`, `c3-offline-unanswered.json`. Ağ geri açıldı. |
| 7 | **KALDI (deep link)** | 15 soru sonunda 5/15 sonuç ekranı doğru. Deep link ile ana sayfadan açılan derste “Derslere dön” **Ana Sayfa'ya** döndü (`c3-done.png`, `c3-returned.xml`). Ders listesinden normal girişle ikinci tur 2/15 bitti ve düğme ders listesine döndü (`c3-real-done.xml`, `c3-real-returned.png`). Tekrar sayısı artmadı: başlangıçta box=1 `q:` sayısı 0; sonrasında da 0, düğme görünmüyor (`c3-invariants.json`, `c3-review-loaded.xml`, `c3-real-returned.xml`); listen yanlışları eklenmesine rağmen listeye katılmadı. |
| 8 | **GEÇTİ** | Kart çevirme çalıştı; Kartlar sesinde piid 2751 started görüldü. Normal Test sorusu açıldı, H cevabıyla 1 doğru ve Sonraki düğmesi oluştu. `c3-card-flipped.png`, `c3-cards-confirm-audio.txt`, `c3-normal-test.xml`, `c3-normal-answer.xml`. Normal Test turu sonuna kadar tekrarlanmadı. |
| 9 | **GEÇTİ** | Ders 2'de 15 soruluk sesli tur ve dört şık açıldı. Ders 6 (Med Harfleri, üç harf) Dinle'de “Bu ders için soru bulunamadı.” boş durumunu gösterdi; kilitlenme yok. `c3-lesson2-listen.png`, `c3-lesson6-cards.xml`, `c3-lesson6-listen.png`. Eksik sesli belirli bir harf ayrıca zorlanmadı; hata yolu çevrimdışı test edildi. |

## Düzeltme önerileri — uygulanmadı

1. **Yeni doğru dinleme cevabı kayboluyor.** `apps/mobile/app/elifba/[dersId].tsx:395`, `updateElifbaSrs` çağırıyor; `apps/mobile/src/lib/elifbaProgress.ts:103` içindeki `if (!prev) return next` ilk doğruyu atlıyor. Dinleme kayıtlarında ilk doğru için `{ box: 2, wrong: 0, lastTs: nowSec }` oluşturulmalı; mevcut normal Test davranışı korunmalı. Regresyon: yeni doğru→2, yeni yanlış→1, mevcut yanlış ardından doğru→2.
2. **Deep link sonrası dönüş hedefi yanlış.** `apps/mobile/app/elifba/[dersId].tsx:616` içindeki dinleme `onFinish={() => router.back()}` önceki ekranı açıyor. “Derslere dön” eylemi açıkça `/elifba` hedefine yönlendirilmeli; hem normal giriş hem deep link geçmişiyle doğrulanmalı.

Kapanış: Wi-Fi **açık ve bağlı**, mobil veri ayarı **1**, yoğunluk **300 dpi**, 8082 reverse mevcut (`c3-final-device.json`). Testin oluşturduğu listen SRS kayıtları cihazda bırakıldı; uygulama verisi sıfırlanmadı. Son puan 14/15 ve eski `q:` kayıtları değişmedi.
