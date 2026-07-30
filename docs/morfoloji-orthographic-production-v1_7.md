# Ortografik kuralların teacher'sız üretim güvenliği (selector v1.7)

Bu tur, `ORTHOGRAPHIC_ONLY` v1 turunun **teacher kapısını kaldırır**. v1'de bir
dönüşüm yalnız teacher'ın kazanç onayladığı tokende yazılıyordu; burada kural,
Unicode koşulu korpusun neresinde sağlanıyorsa orada ateşlenir. Teacher yalnız
sonucu değerlendirir.

## Dondurulan

* **v1.6 + 30 lexeme paradigma extension**: `frozen-v1_6-manifest.json`, her
  çalıştırmada yeniden doğrulanıyor (31 artefakt + 114 dump shard + v1.5
  zinciri, 0 drift).
* **ORTHOGRAPHIC_ONLY v1**: `frozen-orthographic-only-v1-manifest.json`,
  `status: DIAGNOSTIC_ONLY`. v1'in `analysis-form-extension.jsonl`'i teacher
  kapılı olduğu için **production girdisi değildir** ve manifestte böyle
  işaretlenmiştir.

## Sözleşme

| Kısıt | Nasıl sağlandı |
| --- | --- |
| Token düzeyinde teacher kapısı yok | `build-orthographic-token-map-v1.py` teacher dosyasını hiç açmaz; raporunda `teacher_opened: false` alanı var ve selector bu alanı fail-closed okur |
| Allowlist / verse-key filtresi yok | `allowlist_or_verse_filter: null`; kural kümesinde tek bir yüzey, ayet veya token listesi yok |
| Canonical Tanzil yüzeyi değişmez | `canonical_text` aynen kopyalanır, `analysis_forms[0]` dokunulmaz; her token için fail-closed assert |
| Yalnız analyzer formundan aday | Yeni formlar mevcutların **sonuna** eklenir; dondurulmuş builder'ın `unique_candidates` sözlüğü önceki adayları önceki sırada tutar |
| Mevcut aday silme/değiştirme yok | Dump, dondurulmuş v1.6 dump'ına karşı token-token karşılaştırılır |
| Frozen kurallar değişmez | Selector = dondurulmuş `select-camel-candidate-v1_5.py`'nin `main()`'i; yalnız DB/dump/çıktı yolları yönlendirilir. R1–R5'in okuduğu token map **dondurulmuş** haritada bırakılır |
| Production DB'ye yazılmaz | Orijinal CAMeL DB salt-okunur; v1.6 genişletilmiş DB'si değiştirilmez |

Her kural string değil **edit script** döndürür (`offset`/`delete`/`insert`), ve
`invert()` çıktıdan girdiyi geri kurar. Dağıtılan her varyant kullanılmadan önce
bu koşulla denetlenir.

## Guard'sız ilk ölçüm — reddedildi

O1/O2/O3 koşulsuz uygulandığında **6.175 token** uzadı (%8,0), 3.535'i aday
kazandı. Havuz düzeyi temizdi (0 silme, 0 değişme), ama seçim düzeyi değildi:

| Ölçüt | Hedef | Guard'sız |
| --- | --- | --- |
| RECALL_GAP → CORRECT | — | 12 |
| Önceki CORRECT fingerprint değişimi | 0 | **34** |
| CORRECT → yanlış/AMBIGUOUS | 0 | **22** |
| Yeni yanlış seçim | 0 | **5** |

Kural bazında kayıp: O1 12, O2 5, O3 5. Yeni yanlışların 5'i de O3.

Kanıt `data/candidates/morphology/selector-v1_7-unguarded/` altında saklandı.

## Daraltma — O1a / O2a

Kayıpların **tamamı** tek bir yapıda: 3. tekil enklitik zamir `هُۥ` / `هِۦ`
(`وَلِيُّهُۥ`, `كُلِّهِۦ`, `يَرَهُۥ`, `بِأَنَّهُۥ`, `رَأَيْنَهُۥٓ` …). Kazançların hiçbiri değil
(`يَسْتَوُۥنَ` önü `و`, `لِيَسُـۥٓـُٔوا۟` önü `س`).

Sebep ortografik ve repoda zaten yazılı: `classify-residual-recall-gap.py`,
U+06E5/U+06E6'yı "uzatılmış zamir ünlüsünü yazan küçük waw/yeh (هُۥ, هِۦ)" diye
tanımlar. Gövde harfi üzerinde bu notasyon **satırın atladığı bir ünsüzü**
gösterir; zamir üzerinde ise ünlünün **uzunluğunu**. İkincisinde yazılacak bir
ünsüz yoktur — `وَلِيُّهُۥ` için `وليهو` üretmek uydurmaktır.

Yeni koşul **tek komşu codepoint**: küçük waw/yeh'in önündeki harf (birleşen
işaretler atlanarak) U+0647 olmayacak. Allowlist değil, yapısal koşul.

Etkisi:

| kural | guard'sız token | guard'lı token | ayrık yüzey |
| --- | --- | --- | --- |
| `O1a_SMALL_WAW_TO_WAW_NOT_AFTER_HEH` | 1.257 | **29** | 16 |
| `O2a_SMALL_YEH_TO_YEH_NOT_AFTER_HEH` | 957 | **22** | 12 |
| `O5_SMALL_SEEN_SAD_TO_SEEN` | 2 | **2** | 2 |
| uzatılan token | 6.175 | **53** | — |
| eklenen analyzer formu | 10.619 | **117** | — |

Kuran'daki küçük waw/yeh'lerin %97,7'si enklitik zamirdir; guard bu kütleyi tek
codepoint ile ayırır.

## O3 — production dışı

O3 (`[ا و ي ى]` + U+06DF → ∅) korpus genelinde 5 token RECALL_GAP→CORRECT
taşıdı, ama 5 CORRECT'i kaybetti ve 5 yeni yanlış üretti.

Kazanç ve regresyon **codepoint yapısı olarak ayırt edilemiyor**:

| yüzey | yapı | sonuç |
| --- | --- | --- |
| `نَدْعُوا۟` | ع+damma, و, ا۟ | RECALL_GAP → CORRECT |
| `كَاشِفُوا۟` | ف+damma, و, ا۟ | RECALL_GAP → **INCORRECT** |
| `نَّدْعُوَا۟` | ع+damma, و+fatha, ا۟ | RECALL_GAP → CORRECT |
| `دَعَوُا۟` | ع+fatha, و+damma, ا۟ | AMBIGUOUS → **INCORRECT** |

Fark morfolojik (1. çoğul muzari kökündeki vav ile 3. çoğul mazi eki), yüzeyde
hiçbir Unicode işareti veya komşu yapı bunu göstermiyor. Kullanılabilir tek
yapısal daraltma — "U+0648'den sonra gelen elifi koru" — 5 regresyonun *ve* 5
kazancın tamamını birlikte siler; geriye 0 kazançlı bir kural kalır.

Token allowlist'i konmadı. **Kural production'dan çekildi**; geri alınabilir
olsun diye `orthographic_production_rules.WITHDRAWN_RULES` altında gerekçesiyle
duruyor.

`O4X_PLURAL_WAW_OTIOSE_ALEF` **REJECTED**, `O6X_FINAL_ALEF_TO_MAQSURA` bu turda
**uygulanmadı** (ikisi de v1 freeze manifestinde pinli).

## Üretim sonucu — selector v1.7 vs dondurulmuş v1.6

Dump: 114 shard, 77.429 token, dondurulmuş v1.6 dump'ına karşı **0 aday
silindi, 0 aday değişti/yeniden sıralandı**, 51 token aday kazandı.

| Ölçüt | Hedef | Sonuç |
| --- | --- | --- |
| Havuzdan silinen/değişen aday | 0 | **0** |
| Kaynağı eklenen forma izlenemeyen aday | 0 | **0** |
| Önceki CORRECT fingerprint değişimi | 0 | **0** |
| CORRECT → yanlış/AMBIGUOUS | 0 | **0** |
| Yeni yanlış seçim | 0 | **0** |
| RECALL_GAP → CORRECT | — | **7** |

Verdict geçiş tablosunda **tek satır** var: `RECALL_GAP→CORRECT: 7`. Korpusun
geri kalanında hiçbir seçim kıpırdamadı.

### Aday kazanan 51 token — dönüşenler

| Ayet | Yüzey | Kural |
| --- | --- | --- |
| 2:245:14 | `وَيَبْصُۜطُ` | O5 |
| 9:19:17 | `يَسْتَوُۥنَ` | O1a |
| 16:75:21 | `يَسْتَوُۥنَ` | O1a |
| 17:7:12 | `لِيَسُـۥٓـُٔوا۟` | O1a |
| 18:16:7 | `فَأْوُۥٓا۟` | O1a |
| 32:18:8 | `يَسْتَوُۥنَ` | O1a |
| 43:13:1 | `لِتَسْتَوُۥا۟` | O1a |

### Dönüşmeyen 44 token

Aday kazandılar, verdict'leri değişmedi, hiçbiri bozulmadı. İki dikkate değer
küme:

* `دَاوُۥدَ` ailesi (13 token) `دَاوُودَ` formunu kazandı; hepsi AMBIGUOUS→AMBIGUOUS
  veya CORRECT→CORRECT kaldı — dondurulmuş recall gate'in Dawud allowlist'i
  bozulmadı.
* `يُحْىِۦ` / `يَسْتَحْىِۦ` ailesi (O2a, ~18 token) aday kazandı, hiçbiri dönmedi.
  O2a'nın bu turdaki net kazancı **0**, net zararı **0**; O1a'nın birebir aynası
  olduğu ve aynı guard'ı taşıdığı için kümede bırakıldı, sıfır kazancı burada
  kayda geçirildi.

## Kalan 94 tokenın yeniden sınıflandırması

`classify-orthographic-residual-v1.py`. Sıra sabit: SEGMENTATION → HAMZA_CARRIER
→ PARADIGM_GAP → LEXICON_OOV → UNRESOLVED. Yeni hiçbir segmentasyon veya hamza
kuralı eklenmedi; bu dosya tanısaldır ve hiçbir production artefaktını beslemez.

| Kova | Token | Başlıca yüzeyler |
| --- | --- | --- |
| `PARADIGM_GAP` | **44** | `هُزُوًا` 11, `يَسْتَـْٔخِرُونَ` 5, `بِئْسَمَا` 3 |
| `HAMZA_CARRIER` | **42** | `جَآءُو` ailesi ~25, `يَبْدَؤُا۟` 6, `يَشَآءُونَ`/`تَشَآءُونَ` 7 |
| `LEXICON_OOV` | **6** | `هَاتُوا۟` 4, `يُضَـٰهِـُٔونَ`, `ٱلتَّرَاقِىَ` |
| `SEGMENTATION` | **2** | `دَحَىٰهَآ` (ها), `لَنَسْفَعًۢا` (ا) |
| `UNRESOLVED` | **0** | — |

Her satır tanıklı: taşıyıcı kovasında (offset, U+XXXX→U+XXXX, variant),
segmentasyonda CAMeL DB'sinin kendi affix envanterinden gelen (prefix/suffix,
body).

**v1 turunun düzeltilmesi:** `جَآءُو` ailesini "ecvef paradigma boşluğu" diye
kaydetmiştim. Yanlış. CAMeL lexeme'i **waw taşıyıcılı** tanıyor: `جاءو` → `جاؤو`
(U+0621 → U+0624) `ج.ي.أ` köküne ulaşıyor. Aile `HAMZA_CARRIER`'a ait. O4X'in
reddi yine de geçerli — eksik olan atıl elif değil.

Dürüst not: bazı taşıyıcı tanıkları standart MSA yazımı değil (`تساألون`,
`اأتوا`). Kovanın iddiası "lexeme taşıyıcı değişimiyle erişilebilir"dir, "bu
yazım doğrudur" değil.

Bu sayılar **production kural kümesiyle** üretildi. Guard'sız kümeyle yapılan
ilk sayım farklıydı (HAMZA_CARRIER 45, SEGMENTATION 4): sınıflandırıcı tokenı
"boru hattının şu an yapabildiği her şeye" karşı test ettiği için, O3 çekilince
`وَجِا۟ىٓءَ`'nin segmentasyon tanığı ortadan kalkıyor.

## Determinizm — iki bağımsız çalışma

B çalışması her aşamayı sıfırdan yeniden hesapladı (ayrı çıktı dizinleri, ayrı
process, önbellek yok). Dört üretilen artefaktın dördü de bayt-aynı:

| Artefakt | sha256 |
| --- | --- |
| türetilmiş token map (77.429 kayıt) | `b265151095e587b8e6917dd5c9f3209cab74b040cebbe3a505ed6ccabd55c010` |
| ortografik dump — 114 shard | 114/114 eşleşti; shard hash listesinin rollup'ı `0b395a084ab9ad29ec05c9c022238c9d02d6b2a391111b4b24361525c8bcd614` |
| `selector-v1_7/selection.jsonl` (77.429 satır) | `aeb5c2f8c44e788fedde097d0ed6cded17018a9751fd0c65478f1776a1fe5435` |
| `selector-v1_7/v1_7-vs-v1_6-comparison.json` | `c042cbdbb388ee4bb5366103f9443f8005aeca6d1a41c5f0dcce97cfe5652a0f` |
| `orthographic-residual-v1/classification.jsonl` | `d41c1c7b3b0342bdaa804142d381f0289856d670f33c7b97749e5f81c6e79b07` |

Kontrol: guard'sız çalışmanın `selection.jsonl`'i `5d9cc022…` — farklı. Yani
bayt-aynılık sabit bir çıktının değil, gerçek determinizmin sonucu.

## Çalıştırma

```
py -3.12 scripts/morphology/freeze-orthographic-only-v1.py
py -3.12 scripts/morphology/build-orthographic-token-map-v1.py
py -3.12 scripts/morphology/build-full-analysis-ortho-ext-v1.py
py -3.12 scripts/morphology/classify-orthographic-residual-v1.py
py -3.12 scripts/morphology/select-camel-candidate-v1_7.py --force
```
