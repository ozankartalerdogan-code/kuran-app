# HC1 üretim turu — HC1a ve HC1_PLUS_O4 (selector v1.8)

Bu tur, HC1 daraltma turunun `PROPOSED_FOR_PRODUCTION` verdiği iki kuralı —
`HC1a` ve `HC1_PLUS_O4` — production token map'e ekler, dondurulmuş v1.7 selector
hattını kural veya sıralama değiştirmeden çalıştırır ve sonucu dondurulmuş v1.7
seçimine karşı ölçer. O4X bağımsız diriltilmez: atıl elif edit'i yalnız aynı
site'ın taşıyıcı edit'iyle birlikte, `bound_to_carrier_at` taşıyarak çıkar.

## Kurallar

İkisi de tek codepoint komşuluğunda çalışır: satırda duran bare hamza (U+0621),
öncesinde kısa ünlü taşımayan uzun elif, sonrasında çoğul vav.

```
HC1a          U+0621 -> U+0624,  vav'dan sonra gerçek ek varsa
HC1_PLUS_O4   U+0621 -> U+0624 + vav'dan sonra U+0627,  vav kelime sonundaysa
              (iki edit tek script, elif edit'i taşıyıcıya bağlı)
```

Koşullar tanım gereği birbirini dışlar; hiçbir token ikisini birden almaz
(`rules_disjoint: true` fail-closed doğrulanır).

## Sözleşme

| Kısıt | Nasıl sağlandı |
| --- | --- |
| Teacher kapısı yok | `build-hc1-token-map-v1_8.py` teacher dosyasını hiç açmaz; teacher yalnız değerlendirmede okunur |
| Allowlist / verse-key yok | Kural kümesinde tek bir yüzey, ayet veya token listesi yok |
| Canonical Tanzil yüzeyi değişmez | `canonical_text` aynen kopyalanır, `analysis_forms[0]` dokunulmaz |
| v1.7 formları yerinde kalır | Girdi dondurulmuş v1.7 token map'i (sha pinli); taşıyıcı formları v1.7 formlarının **sonuna** eklenir |
| Frozen hatlar değişmez | v1.8 = `select-camel-candidate-v1_7`'nin runner'ı = `v1_5.main()`, yalnız dump ve çıktı yolu yönlendirilir. `V.TOKEN_MAP_PATH` dondurulmuş haritada. Selector/recall/split/hamza/ortografik/lexicon kuralı düzenlenmedi, sıralama değişmedi |
| Hamza R1-R3 zincirlenmez | Taşıyıcı varyantlarının üzerine dondurulmuş hamza rewrite'ı **uygulanmaz** — production havuzu, daraltma turunun ölçtüğü ile birebir aynı olsun diye |
| Edit script + inverse | Her varyant dağıtılmadan `invert(apply(form)) == form`, taşıyıcı üyelik ve elif bağı assert edilir |
| Production DB'ye yazılmaz | `data/app.db` değiştirilmedi |

## Havuz düzeyi vs seçim düzeyi — iki ayrı iddia

Kuralın kendi iddiası **havuz düzeyindedir**: eklenen taşıyıcı formu, tokenin
havuzuna exact lemma+kök+POS adayı koyar mı? Daraltma turunun ölçtüğü buydu ve
bu turda **beklenen 29 tokenin 29'unda** doğrulandı — havuzda exact aday var.

Ayrı bir soru, dondurulmuş cascade'in o adayı **seçip seçmediğidir**. Cascade
değiştirilmedi; `جَآءُو` + enklitik ailesinde fiil `جَاء` ile sıfat `جَائِي`'nin
**ikisi de** exact-kök olduğu için cascade karar vermeyi reddeder ve token
AMBIGUOUS kalır. Bu, kurulan hiçbir regresyon kapısına takılmaz.

| kalem | HC1a | HC1_PLUS_O4 | toplam |
| --- | --- | --- | --- |
| kapsam içi ateşleme | 20 | 9 | 29 |
| havuzda exact aday | 20 | 9 | **29 / 29** |
| RECALL_GAP → CORRECT (seçilen) | 7 | 9 | **16** |
| seçilen adayda exact lemma+kök+POS | 7 | 9 | **16 / 16** |
| RECALL_GAP → AMBIGUOUS (exact havuzda, cascade kararsız) | 13 | 0 | **13** |

Seçime dönüşen 16'nın tamamı `شاءَ` / `جاءَ` fiiline exact lemma+kök+POS oturur.
AMBIGUOUS kalan 13'ün tamamı `جَآءُوكَ` / `جَآءُوكُم` / `جَآءُوهَا` / `فَجَآءُوهُم`
enklitik ailesidir; adayları havuzda ama cascade fiil/sıfat arasında seçmez.

Korpus genelinde iki tetikleyici-dışı satır dışında hiçbir seçim kıpırdamadı:
`RECALL_GAP→CORRECT: 20` ve `RECALL_GAP→AMBIGUOUS: 13`. 20 dönüşümün 16'sı
beklenen 29'dan, 4'ü kova dışı bonus (`وَبَآءُو` ×2, `فَبَآءُو`, `فَآءُو` — bunlar da
zaten RECALL_GAP idi, HC1_PLUS_O4 tarafından kapandı).

## Kabul kapıları

| kapı | hedef | sonuç |
| --- | --- | --- |
| Havuzdan silinen/değişen/yeniden sıralanan aday | 0 | **0** |
| Kaynağı eklenen forma izlenemeyen aday | 0 | **0** |
| Önceki CORRECT fingerprint değişimi | 0 | **0** |
| CORRECT → INCORRECT/AMBIGUOUS | 0 | **0** |
| Yeni yanlış seçim | 0 | **0** |
| HC1a/HC1_PLUS_O4 dışı tokende seçim değişimi | 0 | **0** |
| Yalnız yanlış lemma seçen hamza tokenı | 0 | **0** |
| Beklenen 29'un havuzunda exact aday | 29 | **29** |
| Her dönüşümün seçtiği aday exact | dönüşüm sayısı | **16 / 16** |

Aday silme/değiştirme = 0, verse-key override / allowlist / lexicon girdisi
eklenmedi.

## HAMZA_CARRIER kovası

42 tokenin 29'u bu turun kapsamına girdi (kurallar bu 29'un havuzunu kapatıyor),
16'sı seçime dönüştü. Kova dışında bırakılan **13 token** çözülmemiş korunur:
reddedilen HC2/HC3/HC4X/HC5X kurallarıyla veya hiçbir taşıyıcı kuralıyla
(`4:1:21 تَسَآءَلُونَ`) ulaşılıyor; hiçbiri için allowlist/lexicon eklenmedi.

## Determinizm — iki bağımsız çalışma

`verify-hc1-determinism-v1_8.py` her aşamayı ayrı process, ayrı çıktı dizini,
önbelleksiz yeniden hesaplar. Türetilmiş token map, 114 dump shard'ı, dump
manifesti (containment/shards-written alanları hariç), `selection.jsonl` ve
kabul karşılaştırması bayt-aynı olmalı. `trigger-report.json`, yalnız yazılan
mutlak yolu tutan `outputs` bloğu çıkarılarak karşılaştırılır.

## Freeze

`freeze-hc1-production-v1_8.py`, `frozen-hamza-carrier-v1-manifest.json`
zincirinden türer, `frozen-orthographic-production-v1_7-manifest.json`'u da
pinler. Her kabul sayısını üretilmiş artefaktlardan **okur**, kapılardan biri
bile false ise veya iki çalışma bayt-aynı değilse yazmayı reddeder. Sonuç:
`frozen-hc1-production-v1_8-manifest.json`, `status: ACCEPTED_PRODUCTION`,
`HC1a` ve `HC1_PLUS_O4` = `ACCEPTED_PRODUCTION`.

Production `data/app.db`'ye bu turda yazılmadı.

## Çalıştırma

```
py -3.12 scripts/morphology/build-hc1-token-map-v1_8.py
py -3.12 scripts/morphology/build-full-analysis-hc1-ext-v1_8.py
py -3.12 scripts/morphology/select-camel-candidate-v1_8.py --force
py -3.12 scripts/morphology/verify-hc1-determinism-v1_8.py
py -3.12 scripts/morphology/freeze-hc1-production-v1_8.py
```
