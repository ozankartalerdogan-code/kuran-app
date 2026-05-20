# Meal Comparison Checkpoint

Tarih: 2026-05-14

Bu checkpoint, `data/meal-comparison/by-surah` kaynaginin Kanitli Analiz icin mevcut durumunu ve faz kararini kapatir. Runtime, UI, default source ve meal data dosyalari degistirilmedi.

## Karar

Meal-comparison kaynagi simdilik phrase extraction icin kullanilmayacak.

Kaynak Kanitli Analiz icinde su an yalniz coverage, source diversity ve kategori duzeyi sinyal icin saklanacak. Kullaniciya dogrudan ham phrase veya ortak/farkli phrase olarak basilmamali.

## Neden Durduruldu?

- Kapsam cok guclu: 114 sure, 6236 ayet, 229085 meal entry.
- Ancak encoding kalintilari genis yayilimli.
- Audit sonucunda 4865 ayette ve 26334 meal entry'de `1/0` turu kalinti tespit edildi.
- Guvenli fix map ile ancak 895 token hit net bicimde duzeltilebilir gorundu.
- 52258 token hit ise guvensiz veya review gerektiren grupta kaldi.
- Bu kaliteyle ham phrase extraction, `yard1m`, `tart1lar1`, `0brahim`, `onlar1n`, `m1` gibi bozuk metinleri kullanici-facing alana sizdirabilir.

## Guvenli Kullanim Alanlari

- Ayette kac meal kaynagi mevcut?
- Meal cesitliligi / source diversity sinyali var mi?
- Translation comparison kaynagi mevcut mu?
- Kategori duzeyi not:
  - "Meallerde ifade farkliliklari var."
  - "Bu ayette meal karsilastirmasi icin yeterli kaynak mevcut."
  - "Meal kaynaklari farkli ifade aileleri sunuyor."
- Decision layer icin yalniz cok genel sinyal:
  - meal comparison available / unavailable
  - comparison count
  - source count

## Riskli Kullanim Alanlari

- Ham phrase extraction.
- Ortak phrase / divergent phrase listesini dogrudan kullaniciya gostermek.
- Encoding kalintili tokenlari otomatik duzeltmeden phrase uretmek.
- Safe fix map disindaki `1/0` tokenlarini otomatik Turkceye cevirmek.
- Meal farklarini tefsir veya yorum gibi ozetlemek.
- Tek kaynaktaki bozuk metinden ana analiz ekseni uretmek.

## Mevcut Audit Ciktilari

- `data/analysis-snapshots/meal-comparison-encoding-audit.json`
- `docs/MEAL_COMPARISON_ENCODING_AUDIT.md`

Audit ozeti:

| Metrik | Deger |
|---|---:|
| Sure dosyasi | 114 |
| Ayet | 6236 |
| Meal entry | 229085 |
| Encoding kalintili ayet | 4865 |
| Encoding kalintili entry | 26334 |
| Guvenli fix map token hit | 895 |
| Guvensiz/review token hit | 52258 |

## Sonraki Veri Kaynagi Onerisi

Meal-comparison fazi burada kapatildiktan sonra en mantikli sonraki kaynak `fidelity` ve `word-analysis reports` tarafidir.

Onerilen sebep:

- Kanitli Analiz'in kullaniciya en degerli alani "hangi kelime-karsilik eslesmeleri dikkat istiyor?" sinyalidir.
- Fidelity ve word-analysis coverage raporlari zaten bu amaca daha dogrudan hizmet eder.
- Meal-comparison'daki gibi genis encoding temizligi gerektirmeden, weak/missing correspondence kalitesini artirma potansiyeli vardir.

Onerilen sonraki paket:

- `data/fidelity/by-surah/index.json`
- `data/word-analysis/reports/coverage-by-ayah.json`
- `data/word-analysis/reports/missing-meanings.json`

Bu kaynaklar inspect edilip:

- weak correspondence sinyalleri ne kadar guvenilir?
- hangi ayetlerde fazla gurultu uretiyor?
- hangi root/lemma/word alanlari eksik?
- v4/v2 root/meaning enrichment sonrasi coverage ne kadar iyilesti?

sorulari cevaplanmali.
