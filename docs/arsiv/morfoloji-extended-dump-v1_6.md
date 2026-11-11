# v1.6 — Genişletilmiş dump ile dondurulmuş v1.5 hattının çalıştırılması

30 lexeme'lik paradigma extension'ı gerçek etkisini ancak full-analysis dump'ı
genişletilmiş DB ile yeniden üretilince gösterir (seçiciler adayları bu döküm-den
okur). Bu adım dökümü yeniden üretir, dondurulmuş v1.5 hattını **aynen** o döküm
üzerinde çalıştırır ve sonucu dondurulmuş v1.5 seçimiyle karşılaştırır.

## Dokunulmayanlar

* Orijinal CAMeL DB — sha `110e03ba…`, değişmedi.
* Orijinal `full-analysis/` dökümü — değişmedi (yeni döküm ayrı dizinde).
* Production DB (`data/app.db`) — yazılmadı.
* Selector / recall / split / sözlük kuralları — hiçbiri düzenlenmedi.

## Nasıl yapıldı

**Dump üretimi** (`build-full-analysis-extended.py`): dondurulmuş dump
üreticisinin (`camel-poc/build-full-camel-analyses.py`) *aynı* kelime-analizi ve
serileştirme fonksiyonlarını (`analyze_word`, `write_shard`, `iter_surah_records`,
`load_analyzer`) import edip genişletilmiş DB'ye ve **yeni** bir dizine
(`full-analysis-paradigm-ext-v1/`) yöneltir. Böylece her shard, dondurulmuş
üreticinin üreteceği baytların aynısıdır; orijinal dump'tan tek kasıtlı fark, 30
yeni gövde girdisinin eklediği adaylardır. gzip mtime=0 → deterministik.

**v1.6 çalıştırıcı** (`select-camel-candidate-v1_6.py`): dondurulmuş
`select-camel-candidate-v1_5.py`'yi import eder ve `main()`'i **değiştirmeden**
çağırır; yalnız üç yol modül düzeyinde yeniden yönlendirilir — `V.DB_PATH`
(genişletilmiş DB), `V.FULL_ANALYSIS_DIR` (yeni döküm), `OUT_DIR` (`selector-v1_6`).
Aynı donmuş kod yeni havuzlar üzerinde koşar.

## Doğrulama sonuçları

| Soru | Sonuç |
| --- | --- |
| Beklenen 44 token yeni analiz alıyor mu? | **Evet, 44/54 güvenli token kapandı** |
| Yeni analizler yalnız 30 üretilmiş lexeme'den mi? | **Evet** — havuz farkında üretilen 30 lexeme dışında 0 ekleme |
| Önceki havuzlardan aday silindi/değişti mi? | **Hayır** — 63 token aday kazandı, 0 silme/değişme |
| v1.5 CORRECT seçimi değişti mi? | **0** |
| Yeni yanlış seçim? | **0** |
| RECALL_GAP → CORRECT | **59** (hepsi bir üretilen lexeme seçiyor) |
| Net CORRECT | 30 643 → **30 702** |
| İki bağımsız çalışma byte-identical mı? | **Evet** — dump (114 shard) ve seçim (.jsonl) iki çalışmada bayt-aynı |

### Neden 59 > 44?

Güvenli küme 54 token olarak tanımlanmıştı; bunların 44'ü kapandı. Fakat üretilen
lexeme'ler korpusta güvenli kümenin dışındaki tokenlarda da geçiyor (örn. `مُكَذِّب`
toplam 20 token kapatıyor). Ek 15 token da aynı 30 lexeme'den biriyle kapandı;
hepsi teacher çekirdeğiyle doğru. Sıfır yeni yanlış, sıfır değişen doğru.

## Kapanmayan 10 token — kesin nedenler

| Neden | Token | Açıklama |
| --- | --- | --- |
| `LEXEME_DROPPED_IN_SURFACE_VERIFICATION` | 9 | Yüzey doğrulamasında düşen 5 lexeme (`قَانِت`, `جَنَف`, `قَاصِف`, `دُحُور`, `دَاخِر`). Ödünç kategori bu yüzeyleri lisanslamadığı için girdi hiç yazılmadı. |
| `BORROWED_CATEGORY_DOES_NOT_LICENSE_THIS_SURFACE_ENDING` | 1 | `ٱلْمُكَذِّبُونَ`: girdi yazıldı ve `ٱلْمُكَذِّبِينَ` (ين) kapandı, ama artikel+`ون` nominatifi ödünç kategori X00325 tarafından lisanslanmıyor. |

Bunlar açık bırakıldı; kural genişletilmedi, kök tahmin edilmedi.

## Dondurma

`frozen-v1_6-manifest.json`, v1.5 manifestinden `chains_from` ile zincirlenir.
31 artefakt sabittir (v1.5 kümesi + classifier, extension builder, dump generator,
v1.6 çalıştırıcı, OOV sınıflandırma, extension, genişletilmiş DB, v1.6 seçim +
karşılaştırma). Zincir baştan sona **0 drift** ile doğrulanıyor. run-manifest'te 114
shard'ın sha256'ı da kayıtlı.

**`paradigm_extension_status: FREEZABLE`** — 30 lexeme'lik paradigma extension,
tüm koşulları geçtiği için dondurulabilir ilan edildi.

## Çalıştırma

```
.venv/Scripts/python.exe scripts/morphology/build-full-analysis-extended.py
.venv/Scripts/python.exe scripts/morphology/select-camel-candidate-v1_6.py
#   --force  : dondurulmuş v1.5 seçimini determinizm için yeniden üretir
```

Çıktılar: `full-analysis-paradigm-ext-v1/` (döküm), `selector-v1_6/selection.jsonl`,
`selector-v1_6/v1_6-vs-v1_5-comparison.json`.
