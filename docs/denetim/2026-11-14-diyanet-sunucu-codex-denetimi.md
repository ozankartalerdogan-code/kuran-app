# Diyanet sunucu tarafı — Codex (astra) denetimi, 2026-11-14

Canlıdaki kod (master). Claude bulguları henüz tek tek doğrulamadı.

Dosya değiştirmedim, `.env` okumadım, ağ isteği yapmadım. Statik inceleme ve mevcut JSON verileri üzerinden **8 bulgu**:

1. **Yüksek — Diyanet için ortak hız sınırı yok.** [diyanetClient.ts:65](/C:/Projects/kuran_app/apps/web/src/lib/diyanetClient.ts:65). Kuyruk yalnız aynı istemci örneğinde; minimum bekleme ve kuyruk kapasitesi yok. Farklı şehirleri isteyen çok sayıda kullanıcı, birden fazla sunucu örneğinden paralel Diyanet çağrıları oluşturabilir. Middleware’deki 200 istek/dakika/IP sınırı bunu engellemez. **Öneri:** Ortak, kapasitesi sınırlı kuyruk; global hız sınırı ve şehir/ay kilidi.

2. **Yüksek — Eksik ay yanlışlıkla tam sayılabilir.** [vakitService.ts:125](/C:/Projects/kuran_app/apps/web/src/lib/vakitService.ts:125), [164](/C:/Projects/kuran_app/apps/web/src/lib/vakitService.ts:164). Diyanet yanıtında tarih aralığı/tekillik kontrolü yok: 30 kayıt içinde tekrarlı veya başka aya ait gün varsa `complete:true` olabilir. Depoda da normalize edilip elenen kayıtlar tamlık hesabından düşülmüyor. **Öneri:** Beklenen tarih kümesini doğrula; yalnız benzersiz, geçerli günleri say ve sakla.

3. **Orta — Yenileme mevcut günleri yanıttan kaybettirebilir.** [vakitService.ts:169](/C:/Projects/kuran_app/apps/web/src/lib/vakitService.ts:169). Depoda 20 gün varken Diyanet başarılı fakat boş/5 günlük yanıt verirse yalnız yeni yanıt dönüyor. **Öneri:** Geçerli yeni günleri depodakilerle tarih bazında birleştir; tamlığı birleşimden hesapla.

4. **Orta — Tam aylar süresiz eski kalıyor.** [vakitService.ts:164](/C:/Projects/kuran_app/apps/web/src/lib/vakitService.ts:164). `fetchedAt` kullanılmıyor; Diyanet vakit veya saat dilimi düzeltse bile tam ay yeniden alınmıyor. **Öneri:** Güncellik süresi ve kontrollü yenileme uygula.

5. **Yüksek, olası yanlış vakit — Bilinen saat dilimi uyuşmazlıkları yayımlanıyor.** [build-diyanet-coords.mjs:286](/C:/Projects/kuran_app/scripts/build-diyanet-coords.mjs:286). `tzMismatch` dikkate alınmadan `pass` kayıtları doğrulanmış sayılıyor. Mevcut veride OCALA (8729), `America/New_York` ile yayımlanmış; doğrulama kaydında Diyanet offset’i `-6` ve uyuşmazlık mevcut. **Öneri:** Uyuşmazlıkları inceleme tamamlanana kadar otomatik seçimden çıkar; offset’i körlemesine değiştirme.

6. **Orta — Koordinat doğrulaması eski eşleşmeye bağlı kalabilir.** [build-diyanet-coords.mjs:270](/C:/Projects/kuran_app/scripts/build-diyanet-coords.mjs:270), [diyanet-verify-coords.mjs:482](/C:/Projects/kuran_app/scripts/diyanet-verify-coords.mjs:482). Sonuç yalnız şehir ID’sine bağlı; GeoNames eşleşmesi değişince eski `pass` yeni koordinatı onaylar. **Öneri:** Sonuca koordinat, saat dilimi ve kaynak sürümü/hash’i bağla; değişince yeniden doğrula.

7. **Orta — `off` sonucu zamanla değişirken uzun önbellek kullanılıyor.** [sehir/route.ts:15](/C:/Projects/kuran_app/apps/web/src/app/api/vakit/sehir/route.ts:15), [47](/C:/Projects/kuran_app/apps/web/src/app/api/vakit/sehir/route.ts:47). Yaz/kış saati geçişinde aynı koordinat/offset sorgusunun eski şehir veya 404 sonucu bir gün taze, ayrıca yedi gün bayat sunulabilir. **Öneri:** Önbelleği offset geçişinde geçersizleştir veya süreyi kısalt.

8. **Orta, olası bilgi sızıntısı — Ham upstream hata mesajı loglanıyor.** [diyanet-verify-coords.mjs:174](/C:/Projects/kuran_app/scripts/diyanet-verify-coords.mjs:174), [537](/C:/Projects/kuran_app/scripts/diyanet-verify-coords.mjs:537). Diyanet hata mesajında hesap bilgisi yankılarsa terminal/CI loguna taşınır. **Öneri:** Yalnız durum kodu ve izin verilen hata kodlarını logla.

Genel değerlendirme: Temel giriş doğrulaması mevcut; sunucu kodunda doğrudan parola/token veya kullanıcı koordinatı loglaması görmedim. Öncelikler global istek sınırlaması, gün kümesi doğrulaması ve saat dilimi uyuşmazlıklarının çözülmesi. Canlı Diyanet davranışı doğrulanmadı.
