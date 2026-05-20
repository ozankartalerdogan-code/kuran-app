# Meal Comparison Encoding Audit

Tarih: 2026-05-14

Bu rapor `data/meal-comparison/by-surah` altındaki meal text alanlarında görülen `1/0` encoding kalıntılarını inspect-only olarak inceler. Runtime, UI, default source veya veri dosyaları değiştirilmedi.

## Genel Sayilar

| Metrik | Deger |
|---|---:|
| Sure dosyasi | 114 |
| Toplam ayet | 6236 |
| Toplam meal entry | 229085 |
| Etkilenen ayet | 4865 |
| Etkilenen entry | 26334 |
| Guvenli fix map token hit | 895 |
| Guvensiz/review gereken token hit | 52258 |

## En Sorunlu Source'lar

| Source | Etkilenen entry |
|---|---:|
| `gunes` | 3365 |
| `kesir` | 981 |
| `kulunkoglu` | 930 |
| `bayrakli` | 906 |
| `yildirim-suat` | 884 |
| `piris` | 870 |
| `ates` | 850 |
| `varol` | 828 |
| `edip` | 750 |
| `golpinarli` | 748 |
| `vakfi` | 746 |
| `diyanet` | 719 |
| `yorulmaz` | 703 |
| `sadak` | 690 |
| `bilmen` | 687 |
| `yildirim-harun` | 680 |
| `yazir` | 632 |
| `yildirim-celal` | 627 |
| `onan` | 621 |
| `kutub` | 613 |

## En Sik Bozuk Token'lar

| Token | Adet | Guvenli fix? | Oneri |
|---|---:|---|---|
| `1` | 2316 | hayir | - |
| `onlar1n` | 863 | hayir | - |
| `m1` | 790 | hayir | - |
| `onlar1` | 757 | hayir | - |
| `hay1r` | 624 | hayir | - |
| `0_te` | 595 | hayir | - |
| `art1k` | 564 | hayir | - |
| `kar_1` | 467 | hayir | - |
| `vard1r` | 446 | hayir | - |
| `yard1m` | 413 | evet | yardım |
| `allah1n` | 399 | hayir | - |
| `allah'1n` | 302 | hayir | - |
| `nas1l` | 251 | hayir | - |
| `kitab1` | 197 | hayir | - |
| `yaln1z` | 191 | evet | yalnız |
| `yalanl1yorsunuz` | 186 | hayir | - |
| `aras1nda` | 171 | hayir | - |
| `tanr1` | 158 | hayir | - |
| `1-2` | 156 | hayir | - |
| `0brahim` | 156 | hayir | - |
| `yak1n` | 154 | hayir | - |
| `yak1nda` | 153 | hayir | - |
| `sak1n1n` | 149 | hayir | - |
| `yaln1zca` | 148 | hayir | - |
| `kar_1l1k` | 148 | hayir | - |
| `m1s1n1z` | 142 | hayir | - |
| `hakk1nda` | 138 | hayir | - |
| `ard1ndan` | 137 | hayir | - |
| `d1_1nda` | 134 | hayir | - |
| `s11n1r1m` | 133 | hayir | - |
| `0nsan` | 132 | hayir | - |
| `yaratt1` | 129 | hayir | - |
| `yaratt1k` | 128 | hayir | - |
| `azab1` | 125 | hayir | - |
| `kurtard1k` | 124 | hayir | - |
| `yalanlad1` | 118 | hayir | - |
| `0man` | 114 | hayir | - |
| `17-18` | 110 | hayir | - |
| `dolay1` | 107 | hayir | - |
| `yan1nda` | 107 | hayir | - |
| `15-16` | 105 | hayir | - |
| `13-14` | 104 | hayir | - |
| `r1z1k` | 101 | hayir | - |
| `19-20` | 101 | hayir | - |
| `k1ld1k` | 99 | hayir | - |
| `b1rak1p` | 99 | hayir | - |
| `halk1` | 99 | hayir | - |
| `kar_1l11` | 98 | hayir | - |
| `allah1` | 95 | hayir | - |
| `yalanlad1lar` | 95 | hayir | - |

## Guvenli Fix Map Onerisi

Bu liste sadece cok belirgin ve tekrarli kalintilar icin oneridir. Emin olunmayan tokenlar otomatik duzeltilmemelidir.

| Bozuk | Onerilen | Hit |
|---|---|---:|
| `yard1m` | `yardım` | 413 |
| `yaln1z` | `yalnız` | 191 |
| `a1r` | `ağır` | 90 |
| `tart1lar1` | `tartıları` | 68 |
| `ad1n1` | `adını` | 48 |
| `ad1yla` | `adıyla` | 31 |
| `ad1na` | `adına` | 29 |
| `ad1` | `adı` | 22 |
| `sap1tanlar1n` | `sapıtanların` | 2 |
| `rah0m` | `rahim` | 1 |

## Kullaniciya Gosterilmemesi Gereken Durumlar

- Token icinde `1/0` kalintisi var ve safeFixMap icinde yoksa kullanici-facing phrase olarak gosterilmemeli.
- Bir meal entry'sinde birden fazla bozuk token varsa phrase extraction icin kullanilmamali.
- Ozel isim, ekli kelime veya baglam gerektiren kelimeler otomatik duzeltilmemeli.
- Temiz entry sayisi yeterliyse bozuk entry'ler common/divergent phrase uretiminden haric tutulmali.

## En Guvenli Sonraki Adim

Runtime'a baglamadan once preview katmaninda kullanilacak `cleanMealTextForPreview` benzeri bir helper sadece safeFixMap icindeki tokenlari duzeltmeli, diger bozuk entry'leri phrase uretiminden elemelidir. Bu helper once inspect scriptlerinde denenmeli, sonra Kanitli Analiz phrase kategorilerine opt-in eklenmelidir.
