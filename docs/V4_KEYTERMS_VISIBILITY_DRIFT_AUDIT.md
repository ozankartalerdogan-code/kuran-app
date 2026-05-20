# V4 KeyTerms Visibility Drift Audit

Tarih: 2026-05-13

Bu rapor, ilk 1000 ayet audit sonucunda `json` source'ta `keyTermsPreview` dolu iken `v4` source'ta bos kalan ayetleri inceler. Kod davranisi, default source, UI, decision veya preview logic degistirilmedi.

## Kisa Sonuc

- Ilk 1000 ayette `json` dolu / `v4` bos keyTerms durumu: 38 ayet.
- Bu 38 ayetin tamaminda `selectedProfile` degisiyor.
- Ana sebep dogrudan `meaning_tr` kaybi degil.
- Ana sebep, v4 ile gelen daha genis/temiz veri sinyallerinin profile dagilimini degistirmesi ve yeni profile gore mevcut visible keyTerms filtresinin daha siki davranmasi.
- V4 bazi ayetlerde daha temiz cikti veriyor, cunku `Allah`, `Rab`, `Oldu`, `Dedi`, `sonra`, `icinde`, `-e dogru` gibi dusuk analiz degerli terimleri bastiriyor.
- Ancak bazi ayetlerde filtre fazla siki kaliyor, cunku profil degistiginde yerine profile uygun yeni content term geri kazanilmiyor.
- Bu durum v4 default icin su an kalite blockeridir. Veri guvenligi blocker'i degil, preview gorunurluk/relevance blocker'idir.

## Kullanilan Kaynaklar

- `data/analysis-snapshots/verse-analysis-json-audit-1000.json`
- `data/analysis-snapshots/verse-analysis-v4-audit-1000.json`
- `data2/processed/canonical_word_analysis.json`
- `data2/processed/canonical_word_analysis_v4.json`

Ek olarak, ilk 1000 ayette focused inspect ile ayni ayetler hem `json` hem `v4` source uzerinden tekrar uretilerek detaylar karsilastirildi.

## Global Sayilar

| Metrik | Deger |
|---|---:|
| Karsilastirilan ayet sayisi | 1000 |
| JSON keyTerms dolu, v4 keyTerms bos | 38 |
| Bu 38 icinde selectedProfile degisen | 38 |
| Particle/pronoun/preposition benzeri terim etkisi gorulen | 29 |
| Net meaning_tr kaybi tespit edilen | 0 |
| Aday/import kaynakli low-confidence term yuzunden kayip | 0 |

## 38 Ayetin Tam Listesi

`2:4`, `2:139`, `2:149`, `2:209`, `2:281`, `3:18`, `3:22`, `3:42`, `3:115`, `3:120`, `3:146`, `3:161`, `3:184`, `4:25`, `4:32`, `4:70`, `4:90`, `4:106`, `4:129`, `5:6`, `5:7`, `5:11`, `5:15`, `5:28`, `5:47`, `5:49`, `5:59`, `5:109`, `6:3`, `6:10`, `6:14`, `6:23`, `6:79`, `6:81`, `6:100`, `6:106`, `6:131`, `6:163`

## Ilk 30 Ornek

| Ayet | JSON profile -> V4 profile | JSON keyTerms | Degerlendirme |
|---|---|---|---|
| 2:4 | genel_karma -> tevhid_birlik | `Indirdi`, `Once`, `baska/diger`, `iman`, `Kesin inanir` | V4 profil degistiriyor. `Once` ve `baska/diger` dusuk degerli; `iman` ve `kesin inanma` faydali olabilir. Veri kaybi yok, relevance fazla siki. |
| 2:139 | genel_karma -> dua_kulluk | `hac/delil`, `amel/is`, `Allah`, `Rab`, `Icinde` | `Icinde`, `Allah`, `Rab` genis/dusuk degerli. `amel` ve delil alani faydali olabilir. Profil degisimi ana etken. |
| 2:149 | genel_karma -> dua_kulluk | `Haram`, `Allah`, `Mescid`, `amel/is`, `nerede` | `nerede` ve `Allah` dusuk degerli; `Haram`, `Mescid`, `amel` kaybi fazla siki filtreye isaret ediyor. |
| 2:209 | genel_karma -> yol_hidayet | `apacik delil`, `Allah`, `sonra`, `hikmetli`, `guclu/aziz` | `sonra`, `Allah` dusuk degerli; sifatlar tek basina baskin olmamali. V4 daha temiz ama replacement yok. |
| 2:281 | genel_karma -> dua_kulluk | `Allah`, `-e dogru`, `Dondu`, `sonra`, `kazandi` | Edat ve baglac agirlikli terimler var. V4 bos kalmasi temizlik acisindan anlasilir. |
| 3:18 | genel_karma -> dua_kulluk | `hikmetli`, `guclu/aziz`, `Ilim`, `Allah`, `ilah/tanri` | Tevhid/ilim sinyalleri faydali olabilir. V4 profil degisimi sonrasi visible recovery eksik. |
| 3:22 | genel_karma -> tevhid_birlik | `amel/is`, `Dunya`, `Icinde`, `yardim`, `baska/diger` | `Icinde`, `baska/diger` dusuk degerli. `amel`, `Dunya`, `yardim` faydali olabilir. |
| 3:42 | genel_karma -> dua_kulluk | `alem/evren`, `Allah`, `Melek`, `uzerine`, `Dedi` | `uzerine`, `Dedi`, `Allah` dusuk degerli. V4 burada daha temiz gorunuyor. |
| 3:115 | uyari_inkar -> emir_yasak | `Kufretti` | Tek faydali terim kayboluyor. Profil degisimi sonrasi fazla siki filtre. |
| 3:120 | tevhid_birlik -> emir_yasak | `Allah` | Sadece `Allah` kalmasi analiz degeri dusuk. V4 daha temiz. |
| 3:146 | genel_karma -> dua_kulluk | `isabet`, `Sabir`, `Allah`, `rab/efendi`, `Yol` | `Allah`, `rab/efendi` genis; `Sabir`, `Yol` faydali olabilir. Fazla siki recovery eksigi var. |
| 3:161 | genel_karma -> tevhid_birlik | `Kavim`, `sonra`, `Oldu`, `kazandi`, `Hepsi` | `Kavim` burada kaba/yanlis kokuyor; `Oldu`, `sonra`, `Hepsi` dusuk degerli. V4 daha temiz. |
| 3:184 | genel_karma -> tevhid_birlik | `Nur`, `apacik delil`, `Elci`, `ve/boylece`, `Once` | `ve/boylece`, `Once` dusuk degerli; `apacik delil`, `Elci` faydali. Kismi fazla siki filtre. |
| 4:25 | uyari_inkar -> rahmet_magfiret | `Azap`, `Iman` | Iki terim de faydali olabilir. V4 burada fazla siki gorunuyor. |
| 4:32 | tevhid_birlik -> yol_hidayet | `Allah` | Sadece `Allah` analiz degeri dusuk. V4 daha temiz. |
| 4:70 | genel_karma -> yol_hidayet | `fazilet/lutuf`, `Allah`, `bilen/alim` | Broad sifatlar agirlikta. V4 daha temiz ama `lutuf` faydali olabilir. |
| 4:90 | yol_hidayet -> dua_kulluk | `Yol` | Faydalı tek terim kayboluyor. Profil degisimi ve relevance filtresi fazla siki. |
| 4:106 | genel_karma -> dua_kulluk | `Allah`, `cok bagislayan`, `Oldu`, `Bagisladi` | `Oldu` dusuk degerli; bagislanma terimleri faydali. V4 bos kalmasi fazla siki. |
| 4:129 | genel_karma -> dua_kulluk | `Allah`, `arasinda`, `guc yetirdi`, `islah`, `Adalet` | `Allah`, `arasinda` dusuk; `adalet`, `islah`, `guc yetirme` faydali. Fazla siki. |
| 5:6 | yol_hidayet -> emir_yasak | `nimet` | Faydalı olabilir ama emir/yasak profilinde merkezi degil. V4 temkinli. |
| 5:7 | yol_hidayet -> emir_yasak | `nimet` | 5:6 ile ayni desen. |
| 5:11 | yol_hidayet -> emir_yasak | `nimet` | 5:6 ile ayni desen. |
| 5:15 | tevhid_birlik -> dua_kulluk | `Allah` | Sadece `Allah`; V4 daha temiz. |
| 5:28 | genel_karma -> dua_kulluk | `korktu`, `alem/evren`, `Allah`, `-e dogru`, `Rab` | `-e dogru`, `Allah`, `Rab` dusuk; `korku` faydali olabilir. |
| 5:47 | genel_karma -> dua_kulluk | `Indirdi`, `Fasik`, `Allah`, `degil`, `hukmetti` | `degil`, `Allah` dusuk; `Fasik`, `hukmetti` faydali. Fazla siki. |
| 5:49 | genel_karma -> yol_hidayet | `Indirdi`, `hukmetti`, `Allah`, `Insanlar`, `Bazi` | `Bazi`, `Allah`, `Insanlar` genis; `hukmetti`, `Indirdi` faydali olabilir. |
| 5:59 | genel_karma -> dua_kulluk | `iman`, `cogu`, `Indirdi`, `Kitap`, `Allah` | `cogu`, `Allah` genis; `iman`, `Kitap`, `Indirdi` faydali. Fazla siki. |
| 5:109 | tevhid_birlik -> dua_kulluk | `Allah` | Sadece `Allah`; V4 daha temiz. |
| 6:3 | genel_karma -> dua_kulluk | `Yer`, `Gok`, `Allah`, `kazandi`, `gizlemek` | Kozmik/amel sinyali var, ama `Allah` broad. V4 profil degisimi sonrasi recovery eksik. |
| 6:10 | genel_karma -> tevhid_birlik | `Elci`, `Once`, `Oldu` | `Once`, `Oldu` dusuk; `Elci` faydali. Kismi fazla siki. |

## Drift Sebebi

### Meaning_tr Kaybi mi?

Hayir. Ilk 30 ornekte ve 38 ayetin genel kontrolunde `json` tarafinda gorunen terimlerin v4'te tamamen anlam kaybina ugradigina dair net bir isaret yok. Aksine v4, enrichment sonrasi daha fazla `meaning_tr` ve `gloss_en` kapsamina sahip.

### Confidence veya Source Filtresi mi?

Birincil sebep degil. Bu drift orneklerinde JSON tarafinda gorunen terimlerin buyuk kismi eski `data/word-analysis/word-translations-tr.json` kaynakli. V4 import adaylarindan gelen low-confidence term'lerin visible alana sizmasi bu driftin ana nedeni degil. Zaten v4 1000 audit sonucunda low-confidence visible term sayisi 0.

### Particle/Pronoun Filtresi mi?

Kismen evet. 38 ayetin 29'unda en az bir gorunen JSON term'i edat, zamir, baglac, preposition/pronoun veya dusuk analiz degerli kalip ailesine yakin. Ornekler:

- `فِي` - `Icinde`
- `إِلَى` - `-e dogru`
- `ثُمَّ` - `sonra`
- `قَبۡلِكَ` - `Once`
- `كَانَ` - `Oldu`
- `قَالَتِ` - `Dedi`

Bu tur terimlerin v4'te bastirilmasi dogru yonde bir temizliktir.

### Profile Relevance Farki mi?

Evet, en baskin sebep bu. 38/38 ayette `selectedProfile` degisiyor. Profil degisince keyTermsPreview tarafinda yeni profile uygun gorunur terim secimi daha siki hale geliyor. Eski JSON source'ta `genel_karma`, `tevhid_birlik` veya baska bir profile bagli olarak gorunen terimler v4 profilinde yeterince merkezi sayilmiyor ve visible listeden dusuyor.

### V4 Daha Temiz mi, Fazla Siki mi?

Ikisi birden.

V4 daha temiz:

- Tek basina `Allah`, `Rab` gibi her ayette otomatik sisen genis terimleri daha az one cikariyor.
- `Oldu`, `Dedi`, `sonra`, `Once`, `Icinde`, `-e dogru`, `Bazi`, `Hepsi` gibi dusuk analiz degerli terimleri bastiriyor.
- Low-confidence/candidate kaynakli gurultuyu visible alana sokmuyor.

V4 fazla siki:

- Profil degistiginde yerine profile uygun guvenilir content term geri kazanimi yapamiyor.
- `iman`, `amel`, `yol`, `nimet`, `azap`, `adalet`, `islah`, `hukmetti`, `Fasik`, `Elci`, `Kitap` gibi faydali terimler bazi ayetlerde tamamen kaybolabiliyor.
- Bu nedenle v4 1000 ayette toplam visible keyTerms sayisini az da olsa artirirken, belirli ayetlerde keyTermsPreview'i bos birakabiliyor.

## V4 Default Karari

V4 su an default icin erken.

Sebep, veri kalitesizligi degil. Sebep, source-backed enrichment ile decision/profile katmaninin daha hassas hale gelmesi ve visible keyTerms recovery kuralinin henuz bu profile driftlerine yeterince uyumlu olmamasi.

Bu durum production icin kritik veri blocker'i degil, ama kullaniciya bos analiz karti gostermemek icin kalite blocker'idir.

## En Kucuk Guvenli Sonraki Adim

Default source'u degistirmeden, v4 opt-in icin source-agnostic ve ayet ozel olmayan bir `empty visible keyTerms recovery` kurali eklemek en guvenli adim olur.

Onerilen kural:

- Sadece `keyTermsPreview` bos kaldiginda calissin.
- Sadece medium/high veya guvenilir source-backed content noun/verb/concept terimleri dusunsun.
- Particle, pronoun, preposition/pronoun, formula ve dusuk degerli kaliplar yine bastirilsin.
- Secilen profile uygun terimleri geri kazansin.
- `Allah/Rab/Oldu/Dedi/sonra/Icinde` gibi genel terimleri tek basina geri almasin.
- Recovery sonucu 1-3 terimle sinirli kalsin.
- Once v4 opt-in 1000 audit ve quality set ile dogrulansin.

Bu duzeltme, v4'un temizlik avantajini koruyup bos keyTerms sayisini azaltabilecek en dusuk riskli yoldur.
