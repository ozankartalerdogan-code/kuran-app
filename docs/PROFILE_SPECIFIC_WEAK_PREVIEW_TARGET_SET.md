# Profile-Specific Weak Preview Target Set Audit

Tarih: 2026-05-14

Bu rapor 28 ayetlik quality set ve secili UI goz test ayetlerinde mevcut weak preview, filtreli weak preview ve profile-specific filtreli weak preview yaklasimlarini karsilastirir. Runtime, UI, default source ve mevcut preview logic degistirilmedi.

## Ozet

- Hedef ayet: 38
- Quality set ayeti: 28
- UI goz test ayeti: 15
- Mevcut weak preview gosteren ayet: 12
- Filtreli weak adayli ayet: 30
- Profile-specific kullanici-facing weak gosterilebilecek ayet: 12
- Generic-only oldugu icin gizlenecek ayet: 18
- Mevcut weak olup profile-specific kapida gizlenen ayet: 0
- Filtreli aday toplam: 218
- Profile-specific aday toplam: 45
- Generic/debug aday toplam: 152
- Ek profile-specific azalma: %79.4
- Faydalı content kaybı riski: Dusuk: mevcut weak preview profile-specific kapida belirgin content kaybetmiyor.
- UI entegrasyon kararı: Hazir aday: UI entegrasyonu icin generic grubu gizleyen opt-in kural makul gorunuyor.

## Kullanici-facing Weak Gorunur Ayetler

| Ayet | Profile | Gruplar | Preview |
|---|---|---|---|
| 49:12 | emir_yasak | zaruret, istisna ve sorumluluk (2); ahlaki yasak ve davranis uyarilari (1); yiyecek ve yasakli maddeler (1) | zaruret, istisna ve sorumluluk alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.; ahlaki yasak ve davranis uyarilari alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.; yiyecek ve yasakli maddeler alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 5:90 | emir_yasak | yiyecek ve yasakli maddeler (5); zaruret, istisna ve sorumluluk (1) | yiyecek ve yasakli maddeler alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.; zaruret, istisna ve sorumluluk alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 2:173 | hukum_istisna | yiyecek ve yasakli maddeler (3); zaruret, istisna ve sorumluluk (2) | yiyecek ve yasakli maddeler alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.; zaruret, istisna ve sorumluluk alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 6:145 | hukum_istisna | yiyecek ve yasakli maddeler (4); zaruret, istisna ve sorumluluk (1) | yiyecek ve yasakli maddeler alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.; zaruret, istisna ve sorumluluk alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 5:3 | hukum_istisna | yiyecek ve yasakli maddeler (5); zaruret, istisna ve sorumluluk (2) | yiyecek ve yasakli maddeler alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.; zaruret, istisna ve sorumluluk alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 12:100 | kissa | kissa sahnesi ve olay unsurlari (7) | kissa sahnesi ve olay unsurlari alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 2:233 | emir_yasak | zaruret, istisna ve sorumluluk (1); ahlaki yasak ve davranis uyarilari (1) | zaruret, istisna ve sorumluluk alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.; ahlaki yasak ve davranis uyarilari alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 4:29 | emir_yasak | ahlaki yasak ve davranis uyarilari (2) | ahlaki yasak ve davranis uyarilari alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 39:53 | rahmet_magfiret | rahmet, tovbe ve umut (2) | rahmet, tovbe ve umut alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 99:7 | ahiret | amel, olcu ve ahiret sonucu (2) | amel, olcu ve ahiret sonucu alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 99:8 | ahiret | amel, olcu ve ahiret sonucu (2) | amel, olcu ve ahiret sonucu alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |
| 101:6 | ahiret | amel, olcu ve ahiret sonucu (1) | amel, olcu ve ahiret sonucu alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor. |

## Generic/Debug Olarak Gizlenecek Ayetler

| Ayet | Profile | Generic aday | Mevcut weak |
|---|---|---:|---|
| 2:10 | uyari_inkar | 1 | - |
| 2:61 | tevhid_birlik | 15 | - |
| 2:177 | genel_karma | 10 | - |
| 2:186 | dua_kulluk | 2 | - |
| 2:219 | ahiret | 4 | - |
| 2:259 | ahiret | 12 | - |
| 2:282 | genel_karma | 14 | - |
| 4:102 | uyari_inkar | 14 | - |
| 5:2 | yol_hidayet | 8 | - |
| 5:110 | uyari_inkar | 17 | - |
| 6:54 | rahmet_magfiret | 1 | - |
| 6:141 | ahiret | 13 | - |
| 7:156 | rahmet_magfiret | 2 | - |
| 12:4 | kissa | 3 | - |
| 17:23 | emir_yasak | 3 | - |
| 40:60 | dua_kulluk | 1 | - |
| 112:2 | tevhid_birlik | 1 | - |
| 112:4 | tevhid_birlik | 1 | - |

## En Iyi 20 Ornek

| Ayet | Profile | Specific | Generic/debug | Not |
|---|---|---:|---:|---|
| 49:12 | emir_yasak | 4 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |
| 5:90 | emir_yasak | 6 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |
| 2:173 | hukum_istisna | 5 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |
| 6:145 | hukum_istisna | 5 | 3 | profile-specific weak kullanıcı-facing gösterilebilir |
| 5:3 | hukum_istisna | 7 | 13 | profile-specific weak kullanıcı-facing gösterilebilir |
| 12:100 | kissa | 7 | 3 | profile-specific weak kullanıcı-facing gösterilebilir; specific grup içinde aday sayısı yüksek; UI'da kısa metinle sınırlanmalı |
| 2:233 | emir_yasak | 2 | 11 | profile-specific weak kullanıcı-facing gösterilebilir |
| 4:29 | emir_yasak | 2 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |
| 39:53 | rahmet_magfiret | 2 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |
| 99:7 | ahiret | 2 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |
| 99:8 | ahiret | 2 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |
| 101:6 | ahiret | 1 | 0 | profile-specific weak kullanıcı-facing gösterilebilir |

## En Riskli 20 Ornek

| Ayet | Profile | Specific | Generic/debug | Bastirilan | Not |
|---|---|---:|---:|---:|---|
| 2:61 | tevhid_birlik | 0 | 15 | 17 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 2:282 | genel_karma | 0 | 14 | 16 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 5:110 | uyari_inkar | 0 | 17 | 6 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 4:102 | uyari_inkar | 0 | 14 | 14 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 2:259 | ahiret | 0 | 12 | 7 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 6:141 | ahiret | 0 | 13 | 3 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 5:2 | yol_hidayet | 0 | 8 | 10 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 2:177 | genel_karma | 0 | 10 | 3 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 2:233 | emir_yasak | 2 | 11 | 15 | profile-specific weak kullanıcı-facing gösterilebilir |
| 5:3 | hukum_istisna | 7 | 13 | 7 | profile-specific weak kullanıcı-facing gösterilebilir |
| 2:219 | ahiret | 0 | 4 | 7 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 17:23 | emir_yasak | 0 | 3 | 7 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 7:156 | rahmet_magfiret | 0 | 2 | 7 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 12:4 | kissa | 0 | 3 | 2 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 2:186 | dua_kulluk | 0 | 2 | 4 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 40:60 | dua_kulluk | 0 | 1 | 3 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 2:10 | uyari_inkar | 0 | 1 | 2 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 6:54 | rahmet_magfiret | 0 | 1 | 2 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 112:2 | tevhid_birlik | 0 | 1 | 0 | filtreli aday var ama generic/debug olarak gizlenmeli |
| 112:4 | tevhid_birlik | 0 | 1 | 0 | filtreli aday var ama generic/debug olarak gizlenmeli |

## Kullanici-facing Metin Onerisi

- `{profile-specific grup} alanında bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`
- `Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.`
- Generic grup normal kullanıcıya gösterilmemeli; sadece sourceStatus/debug adayı sayılmalı.

## Karar

Profile-specific gate, hedef sette weakCorrespondencesPreview icin UI'a alinabilecek en guvenli varyant olarak gorunuyor. En kucuk entegrasyon paketi, mevcut weak metnini bozmadan generic grubu gizleyen ve yalniz specific grup varsa kullanici-facing metin ureten opt-in helper olabilir.