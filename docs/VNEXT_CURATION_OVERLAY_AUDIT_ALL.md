# vNext Curation Overlay Audit All

Bu audit, curated 400 satirlik ayah overlay dosyasini sadece audit-only modda okur. UI, default source, runtime, classifier kararlari ve v4 default davranisi degistirilmedi. `draft_curated` satirlari hard filter yapilmadi; sadece potansiyel etki olarak raporlandi.

## Ozet

- Overlay satiri: 400
- Limit icinde eslesen ayet: 400
- Review status dagilimi: {"draft_curated":400}
- Current needsManualReview conflict: 6010
- Current riskyDrop conflict: 1270
- Potential suppression hit: 241
- Potential suppression manual hit: 62
- Required concept missing: 1521
- Profile-bound hit: 430
- Riskli cakisma: 45
- Tahmini needsManualReview etkisi: 6010 -> 5948

## Profile Dagilimi

- `dua_kulluk`: 27
- `yol_hidayet`: 27
- `uyari_inkar`: 85
- `kissa`: 40
- `genel_karma`: 100
- `ahiret`: 49
- `rahmet_magfiret`: 20
- `emir_yasak`: 20
- `hukum_istisna`: 8
- `tevhid_birlik`: 24

## En Yuksek Suppression Hit Ornekleri

| Ayet | Profile | Suppression hits | Manual hits | Risky collisions |
|---|---|---:|---:|---:|
| 9:98 | uyari_inkar | 3 | 3 | 0 |
| 17:35 | ahiret | 3 | 2 | 1 |
| 58:11 | genel_karma | 3 | 0 | 1 |
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
| 7:129 | kissa | 2 | 0 | 1 |
| 8:19 | tevhid_birlik | 2 | 1 | 1 |
| 9:118 | rahmet_magfiret | 2 | 1 | 1 |
| 10:24 | tevhid_birlik | 2 | 1 | 1 |
| 11:7 | ahiret | 2 | 2 | 2 |
| 11:72 | genel_karma | 2 | 1 | 0 |
| 12:21 | kissa | 2 | 0 | 0 |

## En Yuksek Required Concept Missing Ornekleri

| Ayet | Profile | Missing count | Missing concepts |
|---|---|---:|---|
| 2:177 | genel_karma | 13 | iyiliğin sadece yön çevirmek olmaması; Allah’a iman; ahiret gününe iman; meleklere iman; Kitap’a iman; peygamberlere iman; sevilen maldan infak; yakınlar/yetimler/yoksullar/yolcu/köleler; zekât; ahde vefa; darlık/sıkıntı/savaşta sabır; doğruluk; takva |
| 5:3 | hukum_istisna | 12 | haram kılınan yiyecekler; kan; domuz eti; Allah’tan başkası adına kesilen; boğulmuş/vurulmuş/düşmüş/süsülmüş/yırtıcı yemiş hayvanlar; dikili taşlar; fal okları; dinin tamamlanması; İslam’ın din olarak razı olunması; zaruret istisnası; günaha yönelmeden yeme ruhsatı; bağışlama ve merhamet |
| 7:156 | rahmet_magfiret | 10 | dünya ve ahirette iyilik duası; Allah’a yönelme; azap ve rahmet dengesi; takva; zekât; ayetlere iman; ümmi peygambere uyma; iyiliği emretme; kötülükten men etme; kurtuluş |
| 9:60 | uyari_inkar | 10 | zekât/sadakaların sekiz sınıfa tahsisi; fakirler; miskinler; zekât görevlileri; kalpleri ısındırılacaklar; köleler; Allah yolu; yolda kalanlar; Allah’tan farz oluşu; Allah’ın bilen ve hikmetli oluşu |
| 2:173 | hukum_istisna | 9 | ölü hayvan/leş yasağı; kan yasağı; domuz eti yasağı; Allah’tan başkası için kesilenin yasağı; zaruret halinde ruhsat; başkasının hakkına saldırmama; zaruret sınırını aşmama; günah olmaması; Allah’ın bağışlayan ve merhametli oluşu |
| 60:12 | tevhid_birlik | 9 | mümin kadınların biati; Allah’a ortak koşmama; hırsızlık yapmama; zina etmeme; çocukları öldürmeme; iftira/isnat etmeme; uygun işte peygambere karşı gelmeme; bağışlanma dileme; Allah’ın bağışlayıcılığı ve merhameti |
| 2:255 | tevhid_birlik | 8 | Allah’ın tek ilah oluşu; Hayy ve Kayyum oluşu; uyuklama ve uykudan münezzeh oluşu; gökler ve yerin O’na ait olması; izin olmadan şefaat olmaması; ilminin kuşatıcılığı; Kürsî’nin gökleri ve yeri kaplaması; yücelik ve büyüklük |
| 4:127 | tevhid_birlik | 8 | kadınlar hakkında fetva isteme; Allah’ın fetva vermesi; yetim kadınlara haklarının verilmemesi; onlarla evlenme arzusu; zayıf çocuklar; yetimlere adaletle davranma; Kitap’ta okunan hüküm; yapılan iyiliği Allah’ın bilmesi |
| 5:6 | yol_hidayet | 8 | namaz için temizlik; yüz ve elleri yıkama; başı mesh etme; ayakları yıkama; cünüplükten temizlenme; hastalık/yolculuk/su yokluğunda teyemmüm; Allah’ın zorluk istememesi; arınma ve nimetin tamamlanması |
| 5:89 | uyari_inkar | 8 | kasıtsız yeminlerden sorumlu tutulmama; bilinçli yeminlerden sorumluluk; yemin keffareti; on yoksulu doyurma/giydirme; köle azadı; bulamayan için üç gün oruç; yeminleri koruma; Allah’ın ayetleri açıklaması |
| 9:112 | dua_kulluk | 8 | tövbe edenler; ibadet edenler; hamd edenler; Allah yolunda hareket edenler; rükû ve secde edenler; iyiliği emredip kötülükten sakındıranlar; Allah’ın sınırlarını koruyanlar; müminlere müjde |
| 12:80 | kissa | 8 | Yusuf’un kardeşlerinin ümitsizliğe düşüp kenara çekilmesi; Yusuf konusunda önceki kusur; Allah hükmedinceye veya babanın izin vermesine kadar ayrılmama; babaya dönüp oğlunun hırsızlık yaptığını söyleme; şahitlik sınırı; gaybı bilmemek; şehir ve kervandan soruşturma; doğru söylediklerini beyan |
| 24:31 | kissa | 8 | iffeti/namusu koruma; ziyneti açmama; görünen kısım istisnası; başörtüsünü yakaya örtme; mahremiyet kapsamı; gizli ziyneti belli etmek için ayak vurmama; topluca Allah’a tövbe; felah hedefi |
| 33:53 | uyari_inkar | 8 | peygamberin evlerine izinsiz girmeme; davet ve yemek adabı; yemekten sonra dağılma; peygamberi incitmeme; perde arkasından isteme; kalplerin temizliği; peygamber eşleriyle nikah yasağı; Allah katında büyük günah |
| 48:29 | uyari_inkar | 8 | Muhammed’in Allah’ın elçisi oluşu; beraberindekilerin inkârcılara karşı sertliği; rükû ve secde; Allah’tan lütuf ve rıza arama; yüzlerde secde izi; Tevrat ve İncil’deki temsil; filizlenip güçlenen ekin benzetmesi; iman ve salih amel sahiplerine bağışlama ve büyük ecir vaadi |
| 57:27 | rahmet_magfiret | 8 | peygamberlerin ardı ardına gönderilmesi; İsa’ya İncil verilmesi; ona uyanların kalplerine şefkat ve merhamet konması; ruhbanlığın sonradan ortaya çıkarılması; Allah rızası iddiası; gereğini yerine getirmeme; iman edenlere ecir; çoğunun fasıklığı |
| 3:152 | rahmet_magfiret | 7 | Allah’ın vaadinde sadık olması; izinle düşmana üstün gelme; zafer görülünce gevşeme ve çekişme; emre isyan; dünyayı isteyenler ve ahireti isteyenler; imtihan için geri çevrilme; affedilme |
| 4:171 | tevhid_birlik | 7 | Kitap ehline dinde aşırılığa gitmeme uyarısı; Allah hakkında hak söz söyleme; Allah’a ve elçilere iman; üçtür dememe; Allah’ın tek ilah oluşu; çocuğu olmaktan münezzeh oluşu; gökler ve yerin Allah’a ait olması |
| 7:150 | kissa | 7 | Musa’nın kavmine öfkeli ve üzgün dönmesi; kavmin arkasından kötü davranması; Rabbin emrini acele isteme; levhaları bırakması; kardeşinin başından tutması; Harun’un zayıf bırakılması ve öldürülme korkusu; zalim kavimle bir tutulmama talebi |
| 7:160 | kissa | 7 | İsrailoğullarının on iki topluluğa ayrılması; Musa’nın su istemesi; asayla taşa vurma; on iki pınar; bulutla gölgelendirme; temiz rızık; nimete karşı zulüm |

## Risk Degerlendirmesi

- Riskli cakismalar var; full audit'ten once bu ornekler manuel incelenmeli.
- Overlay satirlari henuz kullanici-facing karara uygulanmadi.
- `draft_curated` satirlar sadece audit sinyali olarak okundu.

## Ciktilar

- Snapshot: `data/analysis-snapshots/vnext-curation-overlay-audit.all.json`
