# Selector v1.5 — clitic split katmanı (114 segmentasyon tokenı)

## Dondurma

`scripts/morphology/resources/frozen-v1_4-manifest.json` şunları sha256 ile sabitler:
v1.4 / v1.3r / v1.3 / v1.2c seçicileri, R1–R5 recall sözleşmesi ve gate'i, coverage
yardımcıları, üç özel isim sözlüğü (selection + recall + closure) ve v1.4'ün çıktı
dosyaları. v1.5 açılışta manifesti doğrular; herhangi biri oynadıysa **fail-closed**
çıkar.

Ayrıca `سُوَاعًا` (71:23 w9) kaydı açıkça denetlenir: `status` hâlâ
`UNRESOLVED_PROPER_NAME`, `verified_root` ve `normalized_root` `null`,
`production_ready` false olmalıdır. Kök tahmin edilmez; adın tek kök adayı kendi
yüzey iskeleti olurdu ve bu hattın reddettiği şey tam olarak budur.

## 114 tokenın hata nedenlerine göre grubu

Residual rapordaki segmentasyon seviyeleri: 82 proklitik (L4) + 32 enklitik (L5).
Girişte 100'ü `CAMEL_OOV` (analizör hiç aday üretmiyor), 14'ü `NO_MATCH`.
Tamamı v1.4 altında `RECALL_GAP`.

## Split kuralı

`scripts/morphology/camel_clitic_split_rules.py`. Bir bölme yalnızca şu koşulların
hepsi sağlanınca kabul edilir:

1. Bölme noktası **yalnız yüzeyden** okunur.
2. Çıkarılan parça, CAMeL'in kendi **prefix / suffix girdisi** olmalıdır — hem
   harf anahtarı hem de seslendirilmiş `diac` yazımı eşleşir. (Tek ortografik
   tolerans: kelime sonu duraklama sükûnu, iki tarafta simetrik düşürülür.)
3. Girdi, **ilan ettiği kliticlerden fazlasını harcamamalıdır**. CAMeL envanteri
   bazı kliticleri çekim harfiyle kaynaştırır: `لَتَ` ve `لَيَ` yalnız `la_emph`
   ilan eder ama muzari özne harfini de yazar; `وَتُؤْ` yalnız `wa_conj` ilan edip
   iki kök harfi yutar. Bu girdiler, her etiketin **tek başına** göründüğü en kısa
   yazımı DB'den türetip (ör. `la_emph→ل`, `Al_det→ال`, `2mp_poss→كم`) girdinin
   iskeletini bu yazımların birleşimiyle karşılaştırarak elenir. 12 509 → 775
   prefix, 14 675 → 864 suffix girdisi kalır.
4. Gövde analizi **tamamen klitiksiz** olmalıdır (tüm `prc*` ve `enc0` = `0`).
5. Klitiği geri ekleyince sonuç yüzeyle **tutarlı** kalmalıdır (`clitics_consistent`).
6. `prc*` / `enc0` alanına yazılan etiket CAMeL'in kendi tablosundaki etikettir.

`diac` içindeki `#` morfem sınırı işareti (ör. `ال#`) notasyondur, harf değildir;
yüzey karşılaştırmasına girmeden ayıklanır.

**CAMeL uyumluluk tabloları (AB/BC/AC) kapı olarak kullanılmaz.** Ölçüldüğünde bu
olgunun tamamını reddediyorlar: MSA veritabanında fiil gövdeleri için enklitik
taşıyan hiçbir suffix kategorisi ve muzari için emphatic-lam prefix'i yok. Bu,
sözlüğün kapsam sınırıdır, yüzeyin yanlış olduğunun delili değil. Her adaya
`camel_table_licensed` alanı olarak yazılır, gizlenmez.

## Kapsam ve garantiler

* Katman **en sonda** çalışır; yalnız v1.4'ün CORRECT bırakmadığı **ve** havuzunda
  kullanılabilir tam-yüzey analizi bulunmayan tokenlara dokunur. v1.4'ün doğru
  bulduğu token `V.select`'e bayt-aynı havuzla girer.
* Aday **silinmez**, yalnız eklenir.
* Verse-key override yok; runtime'da teacher okunmaz (teacher sadece değerlendirme
  oracle'ı); **yeni seçici kuralı yok** — enjekte edilen aday donmuş R1–R9
  şelalesini kendi başına kazanmak zorundadır.
* 114'lük kohort yalnız **raporlama** için okunur; enjeksiyon kapısına girmez.

## Sonuçlar

| Ölçüt | Sonuç |
| --- | --- |
| Kapanan / 114 | **32** (12 proklitik, 20 enklitik) |
| Yeni yanlış seçim | **0** |
| Mevcut doğru → yanlış | **0** |
| Değişen v1.4 doğru seçimi | **0** (30 610 seçimin tamamı aynı) |
| Korpus geneli | `RECALL_GAP→CORRECT` +33, `RECALL_GAP→AMBIGUOUS` 3, başka geçiş yok |
| Doğru toplamı | 30 610 → 30 643 |
| İki çalışma | dört çıktı dosyası da **bayt-aynı** |
| Production DB | yazılmadı |

## Çözülemeyen 82 token — nedenleriyle

`data/candidates/morphology/selector-v1_5/split-rejection-analysis.json` her token
için hangi maddenin reddettiğini sayar.

| Neden | Token |
| --- | --- |
| Gövde analizi kendi klitiğini iddia ediyor (madde 4) | 56 |
| Yüzeyde attested klitik yok | 11 |
| Katman ateşlemedi (havuzda zaten kullanılabilir analiz var) | 9 |
| Bölme kabul edildi ama çekirdek attested olandan farklı | 5 |
| Çekirdeğe ulaşıldı, şelale karar veremedi | 1 |

En büyük grubun tipik örneği `فَٱتَّقُونِ`: `فَ` ayrıldıktan sonra CAMeL gövdeyi
`ٱتَّقُونِ` değil *soru hemzesi أ + تقون* olarak okuyor, yani gövdenin kendisi bir
proklitik iddia ediyor ve üstüne ikincisi eklenemez. Bu tokenlar açık bırakıldı.

Ayrı bir eksen: `بِٱلْحَيَوٰةِ`, `وَٱلزَّكَوٰةِ`, `فَأَجَآءَهَا`, `لَبِسَبِيلٍ` gibi tokenlarda
sorun segmentasyon değil ortografi (hançer elifi, medde, yığılmış proklitik).
Bunlar residual raporun L1–L3 eksenine aittir; kural genişletilmedi.

## Çalıştırma

```
data/candidates/morphology/camel-morph-msa-v1.0/.venv/Scripts/python.exe \
  scripts/morphology/select-camel-candidate-v1_5.py
data/candidates/morphology/camel-morph-msa-v1.0/.venv/Scripts/python.exe \
  scripts/morphology/analyze-clitic-split-residual.py
```

Çıktılar: `data/candidates/morphology/selector-v1_5/` altında `selection.jsonl`,
`report.json`, `segmentation-cohort.jsonl`, `checksums.json`,
`split-rejection-analysis.json`.
