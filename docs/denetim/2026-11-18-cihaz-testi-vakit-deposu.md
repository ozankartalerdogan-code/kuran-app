# Vakit deposu cihaz testi — 18 Kasım 2026

Cihaz: Samsung A03 (SM-A035F), dev client, Metro 8082. Kod: feat/prayer-day-repo c39afd73
(ana klasörde detached HEAD olarak çalıştırıldı — worktree'den Metro `expo-router/entry`'yi
junction'lı node_modules üzerinden çözemiyor; sol'un ilk denemesindeki "react context" çökmesi
bundan sonraki ikinci açılış hatasıydı, kodla ilgisi yok).

**Genel sonuç: GEÇTİ.**

| Adım | Sonuç | Kanıt |
|---|---|---|
| 0. Başlangıç | — | V1 plan var, V2 yok, depo yok; manuel şehir Büyükçekmece (9537) |
| 1. Açılış | GEÇTİ | Ana sayfa: Büyükçekmece 06:21 07:49 12:56 15:29 17:52 19:16, hicri 9 Cemaziyelahir 1448, geri sayım doğru |
| 2. Diyanet eşitliği | GEÇTİ | /api/v1/vakit?cityId=9537 aynı 6 vakit (18 ve 19 Kasım) |
| 3. Bildirim planı v1→v2 | GEÇTİ | V2 yazıldı, ardından V1 silindi; 49 istek; tetikleyiciler vakit +2 dk; kaynak diyanet; depo 30 kayıt (m9537) |
| 4. Şehir değişimi | GEÇTİ | Ankara seçildi, ekran ~2–3 sn'de kapandı (ölçüme uiautomator gecikmesi dahil); ana sayfa + V2 plan Ankara (m9206) = Diyanet 06:03 07:30 12:39 15:14 17:38 19:00 |
| 5. Çevrimdışı | GEÇTİ | Wi-Fi+veri kapalı, JS yeniden yüklendi: Ankara vakitleri ve hicri tarih önbellekten; alarm satırı 100→100 |
| 6. Geri yükleme | GEÇTİ | Ağ açık, şehir Büyükçekmece (9537), plan Büyükçekmece; depo 3 şehir sınırı içinde |

Not: dumpsys alarm satır sayısı başlangıçta 102, test boyunca 100 (benzersiz alarm sayısı değildir;
sıfıra hiç düşmedi). Hızlı çift seçim cihazda denenmedi (ekran ilk seçimde kapandığı için pratikte
oluşmuyor; birim testi var). Yurt dışı / GPS modu bu turda denenmedi.
