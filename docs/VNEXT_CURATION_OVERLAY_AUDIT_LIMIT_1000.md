# vNext Curation Overlay Audit Limit 1000

Bu audit, curated 400 satirlik ayah overlay dosyasini sadece audit-only modda okur. UI, default source, runtime, classifier kararlari ve v4 default davranisi degistirilmedi. `draft_curated` satirlari hard filter yapilmadi; sadece potansiyel etki olarak raporlandi.

## Ozet

- Overlay satiri: 400
- Limit icinde eslesen ayet: 126
- Review status dagilimi: {"draft_curated":126}
- Current needsManualReview conflict: 1218
- Current riskyDrop conflict: 378
- Potential suppression hit: 63
- Potential suppression manual hit: 15
- Required concept missing: 525
- Profile-bound hit: 141
- Riskli cakisma: 7
- Tahmini needsManualReview etkisi: 1218 -> 1203

## Profile Dagilimi

- `dua_kulluk`: 11
- `yol_hidayet`: 12
- `uyari_inkar`: 23
- `kissa`: 5
- `genel_karma`: 17
- `ahiret`: 21
- `rahmet_magfiret`: 12
- `emir_yasak`: 10
- `hukum_istisna`: 5
- `tevhid_birlik`: 10

## En Yuksek Suppression Hit Ornekleri

| Ayet | Profile | Suppression hits | Manual hits | Risky collisions |
|---|---|---:|---:|---:|
| 2:74 | uyari_inkar | 2 | 0 | 0 |
| 2:222 | dua_kulluk | 2 | 0 | 0 |
| 3:120 | tevhid_birlik | 2 | 1 | 1 |
| 3:152 | rahmet_magfiret | 2 | 0 | 0 |
| 4:46 | genel_karma | 2 | 1 | 1 |
| 4:78 | kissa | 2 | 0 | 0 |
| 4:127 | tevhid_birlik | 2 | 2 | 0 |
| 5:42 | uyari_inkar | 2 | 0 | 1 |
| 5:71 | rahmet_magfiret | 2 | 0 | 1 |
| 7:37 | uyari_inkar | 2 | 2 | 0 |
| 2:49 | kissa | 1 | 0 | 0 |
| 2:124 | kissa | 1 | 1 | 0 |
| 2:132 | ahiret | 1 | 1 | 0 |
| 2:167 | ahiret | 1 | 0 | 0 |
| 2:198 | yol_hidayet | 1 | 0 | 0 |
| 2:212 | uyari_inkar | 1 | 1 | 0 |
| 2:231 | yol_hidayet | 1 | 1 | 0 |
| 2:233 | emir_yasak | 1 | 0 | 0 |
| 2:237 | uyari_inkar | 1 | 0 | 0 |
| 2:245 | genel_karma | 1 | 1 | 0 |

## En Yuksek Required Concept Missing Ornekleri

| Ayet | Profile | Missing count | Missing concepts |
|---|---|---:|---|
| 2:177 | genel_karma | 13 | iyiliğin sadece yön çevirmek olmaması; Allah’a iman; ahiret gününe iman; meleklere iman; Kitap’a iman; peygamberlere iman; sevilen maldan infak; yakınlar/yetimler/yoksullar/yolcu/köleler; zekât; ahde vefa; darlık/sıkıntı/savaşta sabır; doğruluk; takva |
| 5:3 | hukum_istisna | 12 | haram kılınan yiyecekler; kan; domuz eti; Allah’tan başkası adına kesilen; boğulmuş/vurulmuş/düşmüş/süsülmüş/yırtıcı yemiş hayvanlar; dikili taşlar; fal okları; dinin tamamlanması; İslam’ın din olarak razı olunması; zaruret istisnası; günaha yönelmeden yeme ruhsatı; bağışlama ve merhamet |
| 2:173 | hukum_istisna | 9 | ölü hayvan/leş yasağı; kan yasağı; domuz eti yasağı; Allah’tan başkası için kesilenin yasağı; zaruret halinde ruhsat; başkasının hakkına saldırmama; zaruret sınırını aşmama; günah olmaması; Allah’ın bağışlayan ve merhametli oluşu |
| 2:255 | tevhid_birlik | 8 | Allah’ın tek ilah oluşu; Hayy ve Kayyum oluşu; uyuklama ve uykudan münezzeh oluşu; gökler ve yerin O’na ait olması; izin olmadan şefaat olmaması; ilminin kuşatıcılığı; Kürsî’nin gökleri ve yeri kaplaması; yücelik ve büyüklük |
| 4:127 | tevhid_birlik | 8 | kadınlar hakkında fetva isteme; Allah’ın fetva vermesi; yetim kadınlara haklarının verilmemesi; onlarla evlenme arzusu; zayıf çocuklar; yetimlere adaletle davranma; Kitap’ta okunan hüküm; yapılan iyiliği Allah’ın bilmesi |
| 5:6 | yol_hidayet | 8 | namaz için temizlik; yüz ve elleri yıkama; başı mesh etme; ayakları yıkama; cünüplükten temizlenme; hastalık/yolculuk/su yokluğunda teyemmüm; Allah’ın zorluk istememesi; arınma ve nimetin tamamlanması |
| 5:89 | uyari_inkar | 8 | kasıtsız yeminlerden sorumlu tutulmama; bilinçli yeminlerden sorumluluk; yemin keffareti; on yoksulu doyurma/giydirme; köle azadı; bulamayan için üç gün oruç; yeminleri koruma; Allah’ın ayetleri açıklaması |
| 3:152 | rahmet_magfiret | 7 | Allah’ın vaadinde sadık olması; izinle düşmana üstün gelme; zafer görülünce gevşeme ve çekişme; emre isyan; dünyayı isteyenler ve ahireti isteyenler; imtihan için geri çevrilme; affedilme |
| 4:171 | tevhid_birlik | 7 | Kitap ehline dinde aşırılığa gitmeme uyarısı; Allah hakkında hak söz söyleme; Allah’a ve elçilere iman; üçtür dememe; Allah’ın tek ilah oluşu; çocuğu olmaktan münezzeh oluşu; gökler ve yerin Allah’a ait olması |
| 2:60 | kissa | 6 | Musa’nın kavmi için su istemesi; asayla taşa vurma emri; on iki pınarın fışkırması; her grubun içeceği yeri bilmesi; Allah’ın rızkından yeme ve içme; yeryüzünde bozgunculuk yapmama |
| 2:196 | yol_hidayet | 6 | hac ve umreyi tamamlama; alıkonma halinde kurban; hastalık/baş rahatsızlığı fidyesi; oruç/sadaka/kurban seçenekleri; hac umre temettü; Allah’tan sakınma |
| 2:231 | yol_hidayet | 6 | boşanan kadınları iddet sonunda iyilikle tutma veya iyilikle bırakma; zarar vermek için tutmama; Allah’ın ayetlerini alaya almama; Allah’ın nimetini ve indirilen Kitap/hikmeti hatırlama; Allah’tan sakınma; Allah’ın her şeyi bilmesi |
| 2:233 | emir_yasak | 6 | annelerin çocuklarını iki tam yıl emzirmesi; babanın yiyecek ve giyecek sorumluluğu; anne ve babanın çocuk sebebiyle zarara sokulmaması; sütten kesmede danışma ve rıza; sütanne ücreti; Allah’tan sakınma |
| 2:235 | rahmet_magfiret | 6 | iddet bekleyen kadınlara üstü kapalı evlilik teklifi; gizli sözleşme yasağı; meşru söz; Allah’ın içtekini bilmesi; sakınma; Allah’ın bağışlayıcı ve halim oluşu |
| 2:237 | uyari_inkar | 6 | mehir belirlenmişken temas olmadan boşama; mehrin yarısı; bağışlama/affetme; takvaya daha yakın davranış; aradaki fazileti unutmama; Allah’ın yapılanları görmesi |
| 2:253 | uyari_inkar | 6 | peygamberlerin birbirinden üstün kılınması; Allah’ın bazılarıyla konuşması; İsa’ya belgeler ve Ruhul Kudüs desteği; belgeler geldikten sonra ihtilaf; iman ve inkâr ayrımı; Allah’ın dilemesi |
| 2:286 | rahmet_magfiret | 6 | Allah’ın kişiye gücünün yettiği kadar yük yüklemesi; kazanılan iyilik ve kötülüğün kişiye ait olması; unutma/yanılma için sorumlu tutulmama duası; ağır yükten korunma duası; af, mağfiret ve rahmet talebi; kâfirlere karşı yardım |
| 3:20 | dua_kulluk | 6 | tartışanlara teslimiyet beyanı; Peygambere uyanlarla birlikte Allah’a yönelme/teslim olma; Kitap verilenlere ve ümmilere İslam olup olmadıklarının sorulması; İslam olurlarsa hidayete ermeleri; yüz çevirirlerse tebliğ sorumluluğu; Allah’ın kulları görmesi |
| 3:154 | uyari_inkar | 6 | Uhud sonrası kederin ardından emniyet/uyku hali; bir grubun Allah hakkında cahiliye zannı taşıması; işin hükmünün Allah’a ait oluşu; ölümün takdir edilmiş olması; kalplerde olanın denenmesi ve arıtılması; Allah’ın gönüllerde olanı bilmesi |
| 4:6 | emir_yasak | 6 | yetimlerin evlilik çağına kadar denenmesi; rüşd/olgunluk görülünce malların teslimi; yetim malını israf ve aceleyle yememe; zenginin iffetli davranması; fakirin örfe uygun yemesi; Allah’ın hesap görücü oluşu |

## Risk Degerlendirmesi

- Riskli cakismalar var; full audit'ten once bu ornekler manuel incelenmeli.
- Overlay satirlari henuz kullanici-facing karara uygulanmadi.
- `draft_curated` satirlar sadece audit sinyali olarak okundu.

## Ciktilar

- Snapshot: `data/analysis-snapshots/vnext-curation-overlay-audit.limit-1000.json`
