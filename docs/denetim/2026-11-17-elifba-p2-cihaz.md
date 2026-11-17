# Elif-Ba Paket 2 — cihaz testi

17.11.2026 · Samsung A03 / SM-A035F · Android 13 · `R96T80012SY` · `com.kuranapp.mobile` · Metro 8082 · açık tema.

Kanıt dizini: `C:/Users/jalek/AppData/Local/Temp/claude/2851084b8bf36871/f02e84e1-974f-4f4b-994b-0f34414926da/scratchpad/`. Aşağıdaki dosya adları bu dizine göredir; PNG'ler açılarak incelendi, XML'ler uiautomator çıktısıdır. RKStorage kopyaları SQLite olarak okunarak güncel değerler alındı. Git Bash ortam hatası nedeniyle PNG'ler Python subprocess ile ikili olarak kaydedildi.

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| 1. Başlangıç düğmesi ve N | **GEÇTİ** | `c2-before.json`: `q:27`, `q:24`, `q:7` kutu 1; `q:2` kutu 2. Hepsi Ders 1 kataloğunda. `c2-01-home.png/.xml`: yolun üstünde **Yanlışlarımı Tekrar Et (3)**. |
| 2. Rozet ve erişilebilirlik | **GEÇTİ** | Başlangıçta `elifbaQuizScores` anahtarı yoktu; rozet yoktu. UI üzerinden normal testle `{"1":{"score":14,"total":15}}` oluşturuldu. `c2-11-master-n1.png/.xml`: sağ üstte Usta rozeti; `content-desc="HARFLER dersi, aktif, ilerleme yüzde 0 · Rozet: Usta"`. `computeLessonBadge` (`elifbaProgress.ts:192`) ve `resolveLessonBadge` (`elifbaReview.ts:78`) ile uyumlu. |
| 3. Tekrar ekranı / soru seçimi | **GEÇTİ** | Düğmeye basılınca **Yanlışları Tekrar**, `Soru 1/3` açıldı (`c2-02-review.xml`). Sıra: `q:24` Te'nin baştaki şekli → `تـ`; `q:7` ت adı → Te; `q:27` ص sesi → S (kalın). Başlangıç önbelleğindeki soru/seçeneklerle birebir eşleşti (`c2-before.json`, `c2-04-q2.xml`, `c2-06-q3.xml`). N=3, 15 sınırının altında. |
| 4. SRS geçişi ve dönüş | **GEÇTİ** | `c2-after-correct.json`: `q:24` kutu **1→2**, wrong=1. `c2-after-wrong.json`: q:7 için Be seçildi; kutu **1→1**, wrong **1→2** (`c2-05-wrong.png`). q:27 doğru cevaplandı. Sonuç **2/3** (`c2-08-result.png`); **Derslere dön** ana ekranı açtı, N **3→1** (`c2-09-home-n1.xml`, `c2-after-session1.json`). |
| 5. Normal skor korunması | **GEÇTİ** | İlk tekrar öncesi/sonrası skor anahtarı yok. Daha güçlü kontrol: normal test **14/15** bitirilip Derslere dön ile kaydedildi (`c2-normal-trace.json`, `c2-10-normal-result.png`, `c2-before-session2.json`). Sonraki tekrarda q:37 doğru cevaplandı; `c2-after-session2.json` ve `c2-final.json` içinde skor yine **14/15**. JSON eşitliği ayrıca doğrulandı. |
| 6. Yanlışlar bitince düğme / rozet | **GEÇTİ** | İkinci oturumda yalnız kutu-1 q:37 vardı: ح sesi → H (`c2-12-review-one.xml`). Kutu **1→2**, sonuç **1/1** (`c2-13-clear.png`, `c2-14-result-one.png`). `c2-final.json`: kutu-1 sayısı **0**; `c2-15-final-home.png/.xml`: tekrar düğmesi yok, **Rozet: Usta** korunuyor. 14/15 için doğru sonuç. **15/15 taç dalı cihazda ayrıca sınanmadı.** |
| 7. Görsel düzen | **KALDI — küçük görsel kusur** | Usta rozeti dairenin sağ üstüne düzgün oturuyor; tekrar düğmesi, seçenekler ve sonuç düğmesi taşmıyor. Ancak Ders 2 başlığı iki satırda **HARFLERİN / KELİME İÇİNDE...** diye kesiliyor (`c2-11-master-n1.png`, `c2-15-final-home.png`). Dev client'ın yüzen Tools dişlisi bazı öğelerin üstünü örtüyor; bu geliştirme ortamı katmanı. |

Öneri: `apps/mobile/app/elifba/index.tsx:245` içindeki `numberOfLines={2}` ve aynı dosyanın `:605` satırındaki etiket ölçülerini uzun Ders 2 başlığını gösterecek şekilde değerlendirin (ör. üçüncü satır ve buna uygun düğüm yüksekliği). Düzeltme yapılmadı. Test edilen tekrar/SRS/skor/rozet akışında işlevsel hata görülmedi. N>15 kırpma ve 15/15 taç senaryoları bu cihaz koşusunda denenmedi.

Yalnız bu rapor depoya eklendi; kod değiştirilmedi, commit atılmadı. Başlangıçtaki mevcut çalışma ağacı değişiklikleri korundu. Test cihazının son durumu: Ders 1 skoru **14/15**, kutu 1 **0**, Elif-Ba ana ekranı açık.
