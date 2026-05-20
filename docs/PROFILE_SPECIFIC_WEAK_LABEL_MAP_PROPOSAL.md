# Profile-Specific Weak Label Map Proposal

Tarih: 2026-05-14

Bu rapor profile-specific filtered weak grupları için kullanıcı dostu label önerir. Runtime, UI, default source ve mevcut preview logic değiştirilmedi.

## Kısa Sonuç

Profile-specific weak kuralı kullanıcı-facing kalite için uygun görünüyor; ancak mevcut teknik grup adları doğrudan UI'a basılmamalı. En güvenli yaklaşım, grup adlarını daha kısa ve daha az iddialı kullanıcı label'larına çevirmek, generic grubu ise normal kullanıcıdan gizlemektir.

Önerilen ana cümle:

`Bazı kelime-karşılık eşleşmeleri {label} alanında kontrol gerektiriyor.`

Alternatif daha sade cümle:

`{label}: bazı kelime-karşılık eşleşmeleri kontrol gerektiriyor.`

## Label Map

| Eski teknik label | Önerilen kullanıcı-facing label | Risk | Not |
|---|---|---|---|
| yiyecek ve yasakli maddeler | Yiyecek ve yasak kapsamındaki ifadeler | Orta | 5:90 gibi ayetlerde içki/kumar/putlar için "yiyecek" tek başına dar kalıyor; "yasak kapsamı" ifadesi bu riski azaltır. |
| zaruret, istisna ve sorumluluk | Zaruret ve istisna ifadeleri | Düşük | Hüküm/istisna ayetlerinde doğal. Emir/yasak profilinde fazla teknik olmaması için "sorumluluk" çıkarıldı. |
| ahlaki yasak ve davranis uyarilari | Davranış uyarıları | Düşük | Kullanıcı için daha kısa ve daha az hüküm verici. |
| amel, olcu ve ahiret sonucu | Amel, ölçü ve sonuç ifadeleri | Düşük | Ahiret profilinde yeterince anlaşılır; "ahiret sonucu" yerine "sonuç" daha yumuşak. |
| rahmet, tovbe ve umut | Rahmet ve bağışlanma ifadeleri | Düşük | Tövbe/umut içeriğini çok uzatmadan kapsar. |
| kissa sahnesi ve olay unsurlari | Kıssa sahnesiyle ilgili ifadeler | Düşük | Tefsir iddiası üretmeden kişi/olay/sahne düzeyinde kalır. |
| yol, hidayet ve sapma | Yol ve hidayet ifadeleri | Orta | "Sapma" bazı ayetlerde sert görünebilir; gerektiğinde sourceStatus/debug tarafında kalabilir. |
| kulluk, dua ve yardim | Kulluk ve dua ifadeleri | Düşük | Yardım istemeyi de kapsayan daha doğal label. |
| diger kelime eslesme adaylari | Ek kelime eşleşme adayları | Yüksek | Normal kullanıcı-facing alanda gösterilmemeli; sadece debug/sourceStatus adayı sayılmalı. |

## Hedef Ayetlerde Görünüm

38 hedef ayette profile-specific kullanıcı-facing weak görünen 12 ayet var. Aşağıdaki label'lar, önerilen map uygulandığında UI'da görünecek şeklidir.

| Ayet | Profile | Kullanıcı-facing label önerisi |
|---|---|---|
| 49:12 | emir_yasak | Zaruret ve istisna ifadeleri; Davranış uyarıları; Yiyecek ve yasak kapsamındaki ifadeler |
| 5:90 | emir_yasak | Yiyecek ve yasak kapsamındaki ifadeler; Zaruret ve istisna ifadeleri |
| 2:173 | hukum_istisna | Yiyecek ve yasak kapsamındaki ifadeler; Zaruret ve istisna ifadeleri |
| 6:145 | hukum_istisna | Yiyecek ve yasak kapsamındaki ifadeler; Zaruret ve istisna ifadeleri |
| 5:3 | hukum_istisna | Yiyecek ve yasak kapsamındaki ifadeler; Zaruret ve istisna ifadeleri |
| 12:100 | kissa | Kıssa sahnesiyle ilgili ifadeler |
| 2:233 | emir_yasak | Zaruret ve istisna ifadeleri; Davranış uyarıları |
| 4:29 | emir_yasak | Davranış uyarıları |
| 39:53 | rahmet_magfiret | Rahmet ve bağışlanma ifadeleri |
| 99:7 | ahiret | Amel, ölçü ve sonuç ifadeleri |
| 99:8 | ahiret | Amel, ölçü ve sonuç ifadeleri |
| 101:6 | ahiret | Amel, ölçü ve sonuç ifadeleri |

## Generic/Debug Olarak Kalması Gerekenler

Aşağıdaki ayetlerde filtreli aday var ama profile-specific label yok. Bu yüzden normal kullanıcı-facing weak alanında gösterilmemesi daha güvenli:

`2:10`, `2:61`, `2:177`, `2:186`, `2:219`, `2:259`, `2:282`, `4:102`, `5:2`, `5:110`, `6:54`, `6:141`, `7:156`, `12:4`, `17:23`, `40:60`, `112:2`, `112:4`

Bu ayetlerde önerilen debug/sourceStatus metni:

`Ek kelime eşleşme adayları debug kapsamında tutuldu.`

Normal kullanıcıya gösterilmemeli.

## Riskli veya Çok Literal Label'lar

- `yiyecek ve yasakli maddeler`: 5:90 gibi ayetlerde "yiyecek" dar kalıyor. Önerilen label bu yüzden `Yiyecek ve yasak kapsamındaki ifadeler`.
- `zaruret, istisna ve sorumluluk`: "sorumluluk" UI'da fazla genel ve teknik kalabilir. Önerilen label `Zaruret ve istisna ifadeleri`.
- `ahlaki yasak ve davranis uyarilari`: Çok uzun. Önerilen label `Davranış uyarıları`.
- `diger kelime eslesme adaylari`: Kullanıcı-facing label olmamalı. Bu grup sadece debug/sourceStatus için anlamlı.

## Örnek Kullanıcı Metinleri

Kısa kart metni:

`Bazı kelime-karşılık eşleşmeleri Yiyecek ve yasak kapsamındaki ifadeler alanında kontrol gerektiriyor.`

Liste/chip formatı:

- `Yiyecek ve yasak kapsamındaki ifadeler`
- `Zaruret ve istisna ifadeleri`
- `Davranış uyarıları`

Alt açıklama:

`Bu notlar teknik eşleşme verisinden türetilmiştir; yorum/tefsir değildir.`

Generic/debug notu:

`Ek kelime eşleşme adayları debug kapsamında tutuldu.`

## Önerilen En Küçük Entegrasyon Kuralı

1. `diger kelime eslesme adaylari` normal kullanıcı-facing listeden çıkarılsın.
2. Profile-specific grup varsa label map ile kullanıcı-facing kısa label'a çevrilsin.
3. Aynı ayette en fazla 2 label gösterilsin; 3+ label varsa "ve diğer ilgili ifadeler" gibi kısa bir ek kullanılabilir.
4. Ham lemma, raw reason, matching_gap veya teknik grup adı kullanıcıya basılmasın.

