# Kuran Yolu 1.2.1 — UI/UX Raporu (13 Kasım 2026)

**Kaynaklar:**
- Claude'un Samsung A03 (720×1600) üzerinde yaptığı cihaz turu: 78 görüntü (EN açık, TR koyu, yazı ölçeği 1.3).
- Gemini 4 Argon'un görüntü ve kod incelemesi.
- Argon'un iddiaları koda karşı kontrol edildi. "Doğrulama" sütunu bu kontrolün sonucunu gösteriyor.

Görüntüler: `%TEMP%\claude\…\scratchpad\ux\` klasöründe (`m-en.png`, `m-trdk.png`, `m-f13.png` montajları ve tekil `ux-*.png` dosyaları). Argon'un tam çıktısı: `scratchpad\argon-ux.log`.

## 1. Cihazda doğrulananlar (sorun yok)

- **Mevcut kullanıcı:** Karşılama ekranı çıkmıyor. `kuranyolu://onboarding` ana sayfaya yönlendiriyor.
- **Uygulama açıkken derin bağlantı:** Sure ekranına doğru gidiyor.
- **3 adımlı rehber:** Sekme vurgusu ve kart konumu doğru (`shots\a15-guide1..3`).
- **Ders kartı ipucu:** 1.3 yazı ölçeğinde görünüyor (`ux-en-f13-dersler-card`).
- **TR + koyu tema:** Ana sekmelerde ve ayet, sure, kök, namaz ekranlarında okunabilir; büyük bir kontrast sorunu görülmedi.
- **Bildirim sırası (A3):** Yeniden planlama 104 alarm üretti. Açma/kapama anahtarları bozulmadı.

## 2. Cihaz turundaki kendi gözlemlerim

| No | Ekran | Gözlem | Öncelik |
|---|---|---|---|
| G1 | Bildirim altyapısı | `force-stop` (veya bazı üreticilerin pil yöneticisi) alarmları siliyor. Günlük `namazNotifSchedDay` damgası olduğu için aynı gün yeniden kurulmuyor. 1.2.0'dan beri var. | Orta |
| G2 | Kıble | "Konumunuz alınıyor… 10–25 sn" ekranı uzun süre boş kalıyor (`ux-en-dersler`, `ux-trdk-kible`). | Orta (1.3) |
| G3 | Notlar, Favoriler | İlk açılışta iskelet ve boş yükleme durumu uzun görünüyor (`ux-en-elifba`, `ux-en-favoriler`). | Düşük |
| G4 | Bildirimler | Yüklenirken anahtarlar bir an "kapalı" görünüyor; gerçek değer sonra geliyor (`ux-en-bildirimler`). Kullanıcı kapalı sanabilir. | Orta, küçük iş |

## 3. Argon önerileri ve doğrulama

| Kod | Öneri | Doğrulama | Öneri hedefi |
|---|---|---|---|
| Ö1a | Onboarding adım 1'de varsayılan seçim "read" olsun | **Tasarım kararı:** Tercih bilerek isteğe bağlı yapıldı (astra planı). Seçilmezse başlangıç kartı çıkmıyor. Değişmesi gerekmiyor. | — |
| Ö1b | "Kur'an okumak" doğrudan `/mushaf-sayfa` açsın (şu an `/kuran` sekmesi) | Doğru; ürün kararı. Mushaf'ı doğrudan açmak daha az adım demek. | 1.2.1 (S) |
| Ö1c | Başlangıç kartında "Değiştir" başlıkla aynı satıra alınsın | Görsel düzen; düşük risk. | 1.2.1 (S) |
| Ö2a | Rehberde tam ekran karartma var, gerçek boşluk (cutout) yok | **Yanlış:** `TourOverlay.tsx:87-90` zaten 4 parçalı karartma kullanıyor. | — |
| Ö2b | Spot çerçevesinin 4 dp dolgusu `clipTarget(padded, target)` yüzünden kayboluyor | Doğru. Bu bilinçli yapıldı (sekme alt sınırı sorunu). Yalnız alt kenarda kırpma yapılabilir. Daha önce bozulmuş bir alan, risk orta. | İsteğe bağlı |
| Ö3a | Ders kartı 1.3 yazıda metin kesilmesi, ipucunun kenara yapışması | Görüntüde metin kartta kesik görünüyor (`ux-en-f13-dersler-card`); kaydırılabilirlik doğrulanmalı. | 1.2.1 (S) |
| Ö3b | `?` yardım düğmesi kaydırınca devre dışı kalıyor (`helpDisabled`) | Doğru (B7 ile aynı). Argon'un önerisi (kilidi kaldırmak) yanlış hedefe ipucu gösterebilir; doğru çözüm A9'daki "görünür geçerli hedef". | 1.3 (A9) |
| Ö4a | Ana sayfa seri kartındaki Lottie alev ikonu bozuk veya çok küçük | Görüntülerde ikon bazen nokta kadar görünüyor (`shots\restored.png`). Animasyon karesi olabilir; cihazda bakılmalı. | 1.2.1 (S), doğrulanırsa |
| Ö4b | Namaz vakitleri kartı "Ruh hâline göre"nin üstüne taşınsın | Ürün kararı; ana sayfada değerli bilgi yukarıda olur. | 1.2.1 (S) |
| Ö4c | Alttaki hızlı kartlardan sekmelerle tekrar edenler çıkarılsın | Ürün kararı. | Kullanıcıya sor |
| Ö5 | Sure listesinde Arapça metin yok; okunuş ve meal `.slice(0,110/80)` ile kelime ortasından kesiliyor | Doğru (`surah/[id].tsx:104-105`). Kesme `numberOfLines` ile zaten yapılıyor; `slice` gereksiz. Arapça eklemek sayfa uzunluğunu ve A03 performansını etkiler. | slice: 1.2.1 (S); Arapça: 1.3 |
| Ö6 | Ayet detayında üst başlık ve geri düğmesi yok; okunuş ortalı | Doğru (`ux-en-ayah`). Android geri tuşu çalışıyor, ama iOS'ta kaydırma dışında çıkış zor. | 1.2.1 (M) |
| Ö7 | 1.3 yazıda namaz ekranında "Maghrib/Tahajjud" rozetleri bölünüyor; kök ısı haritası hücreleri çok küçük; bazı ikon düğmeleri 44 dp'nin altında | Görüntüde doğru (`ux-en-f13-namaz-s1`: "Maghr-ib", "Tahajj-ud"). | 1.2.1 (S) |
| Ö8 | Koyu temada sabit açık renkler (Elif-Ba açılır penceresi, hadis kutuları, namaz rozetleri) | Kod okumasına dayanıyor; koyu tema turunda belirgin bir bozukluk görmedim. | 1.3 |
| Ö9 | Kıble anında pusula, notlar yüklemesi, splash süresi | G2/G3 ile aynı. | 1.3 |
| Ö10 | Kur'an sekmesine "kaldığın yer" kartı; namaz ekranlarının birleştirilmesi | Büyük ürün değişikliği. | 1.3 |

**Mağaza ve ilk izlenim için Argon'un ilk 5'i:** Ö5, Ö6, Ö4, Ö1, Ö2. Ö2 yanlış çıktı; geri kalan dördü geçerli.
**Yeni native paket:** gerekmiyor.

## 4. Önerilen 1.2.1 görev listesi (uygulayıcıya)

- **U1 — Sure listesi (Ö5, slice):** `slice` kesmelerini kaldır, kesmeyi `numberOfLines` + `ellipsizeMode="tail"` yapsın.
  - Kabul: kelime ortasından kesilme yok.
- **U2 — Ayet detayı (Ö6):** Görünür bir geri düğmesi ve başlık ekle (sure adı · ayet). Okunuş metni sola hizalansın (EN/TR Latin metin).
  - Kabul: iOS ve Android'de tek dokunuşla geri dönülüyor.
  - Kabul: `?` yardımı ve ipucu hedefleri bozulmuyor.
- **U3 — Büyük yazı (Ö7):**
  - Namaz rozetleri tek satırda kalsın (`minWidth` + `adjustsFontSizeToFit`).
  - Kök ısı haritasında hücre okunurluğu artsın.
  - Ayet ve mushaf üst ikonlarına `hitSlop` eklensin.
  - Kabul: 1.3 ölçekte bölünme yok.
- **U4 — Ders kartı (Ö3a):** 1.3 ölçekte kart metni kaydırılabilsin; ipucu kartının yan boşlukları olsun.
  - Kabul: son satıra kadar okunabiliyor.
- **U5 — Bildirimler ekranı (G4):** Değer yüklenene kadar anahtarlar "kapalı" yerine yükleniyor durumunda görünsün.
- **U6 — Ana sayfa (Ö4a/Ö4b):**
  - Alev ikonu sabit bir rozetle değiştirilsin (cihazda doğrulanırsa).
  - Namaz vakitleri kartı yukarı alınsın.
- **U7 — Başlangıç kartı (Ö1b/Ö1c):** "Kur'an okumak" mushafı açsın; "Değiştir" başlık satırına alınsın.
- **U8 — Bildirim yeniden kurma (G1):** Açılışta gün damgası olsa bile planlı bildirim yoksa veya eksikse yeniden kursun. Kontrol `getAllScheduledNotificationsAsync` sayısıyla ya da sistem alarmı kontrolüyle yapılsın.
  - Kabul: `force-stop` sonrası açılışta alarmlar geri geliyor.

**Kullanıcı kararı bekleyenler:** Ö4c (hızlı kartlar), Ö2b (spot dolgusu).
**1.3'e kalanlar:** Ö3b/B7, Ö5 Arapça satırı, Ö8, Ö9 (G2, G3), Ö10, A8–A9 teknik borç.
