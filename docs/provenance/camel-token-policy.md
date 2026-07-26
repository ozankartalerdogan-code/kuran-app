# Camel Morph MSA PoC — bağımsız canonical token politikası

## Kapsam

Bu PoC yalnız değiştirilmeyen Tanzil Uthmani 1.1 metninden açıklanabilir token kimliği üretir. Morfoloji analizi yapmaz ve hiçbir CAMeL Tools/Camel Morph paketi, model veya verisi kullanmaz.

CLI builder girdileri yalnız şunlardır:

- `data/vendor/tanzil/uthmani-1.1/quran-uthmani.txt`
- `data/vendor/tanzil/uthmani-1.1/manifest.json`

Builder ağ, SQLite, subprocess veya glob kullanmaz. QAC, mustafa0x, EQTB, QUL, mevcut morphology TXT dosyaları, `canonical_word_analysis` sürümleri ve uygulama veritabanları token sınırı ya da analysis form üretiminde okunmaz. Legacy veri ancak ileride, bu token map hash'i dondurulduktan sonra ayrı bir benchmark sürecinde değerlendirilebilir.

## Kimlik ve koordinat sistemi

Kaynak satırı `sure|ayet|canonical_text` biçiminde ayrıştırılır. Offset koordinatı yalnız `canonical_text` alanıdır:

- Unicode code point tabanlıdır.
- Başlangıç 0 tabanlıdır.
- Aralık `[codepoint_start, codepoint_end)` biçiminde yarı açıktır.
- UTF-8 byte ve UTF-16 code-unit offseti değildir.
- Canonical alanda `strip`, `replace`, NFC veya NFKC uygulanmaz.

Her `U+0020` dışı parça bir `span_index` alır. `span_index` ayet içinde 1'den başlar. Analiz edilebilir kelimeler ayrıca 1'den başlayan ardışık `word_index` alır. Yapısal işaretlerde ve analiz dışı açılış besmelesinde `word_index` değeri `null` olur.

## Onaylanan sınıflar ve sayılar

| Sınıf | Kural | Sayı |
|---|---|---:|
| `arabic_word` | Morfolojiye gönderilecek lexical span | 77.429 |
| `standalone_quran_sign` | Boşlukla ayrılmış bağımsız Kur'an/waqf işareti | 4.578 |
| `opening_basmala_excluded` | Sure başındaki dört besmele kelimesi | 452 |
| Toplam canonical span | Bütün boşluk dışı parçalar | 82.459 |

Kaynak 6.236 ayet içermelidir ve SHA-256 değeri manifestteki değerle eşleşmeden hiçbir çıktı dizini oluşturulmaz.

## Besmele politikası

- Sure 9 hariç her surenin ilk ayetinin ilk dört parçası, hareke ve tatweelden bağımsız normalize edilmiş `بسم الله الرحمن الرحيم` imzasıyla doğrulanır.
- Fâtiha 1:1'in dört spanı `opening_fatiha` olarak korunur fakat ana morfoloji indeksine girmez.
- Diğer 112 açılış `opening_embedded` olarak sınıflandırılır.
- Sure 95 ve 97'deki farklı harekeli `بِّسْمِ` yazımı aynı imzayla tanınır.
- Tevbe 9:1'de açılış besmelesi beklenmez.
- Neml 27:30 gibi ayet içi besmeleler `in_verse_lexical` sınıflandırmasıyla normal `arabic_word` kayıtları olarak kalır.

## Shadow analysis formları

`analysis_forms` canonical metinden ayrı, profil önceliğine göre sıralı ve metin bakımından tekilleştirilmiş bir dizidir. Aynı metni üreten profiller tek forma bağlanır; her profil yolu `normalization_traces` içinde ayrıca korunur.

Profil sırası:

1. `exact`
2. `quran_marks_conservative`
3. `wasl_standardized`
4. `alif_folded`
5. `undia`
6. `dagger_alif_expanded`

Conservative profil yalnız açık allowlist'teki durak/yapı işaretlerini siler. Küçük waw, küçük yeh ve küçük yüksek yeh harf-benzeri oldukları için körlemesine kaldırılmaz. Hamzat-al-wasl ve alif/hamza katlamaları exact formu değiştirmek yerine ayrı profil üretir.

`undia` hareke ve non-letter birleşen işaretleri kaldırır. Birleşen hamza, tatweel veya dagger alif silinmeden önce açık bir spacing-hamza/hamza-carrier dönüşümüyle korunur. `dagger_alif_expanded`, dagger alifi kontrollü olarak `ا`ya genişleten ayrı alternatiftir. Tatweel ancak bağlı işaretler işlendiğinde kaldırılır. Hiçbir profilde örtük NFC/NFKC kullanılmaz.

Her trace yolu dönüşüm işlemlerini canonical token içindeki code-point aralıklarıyla ve her çıktı code pointinin canonical giriş aralığıyla eşler. Tersine izlenebilirliğin kaynağı canonical span, exact form ve bu output-to-input haritasıdır.

## Güvenli yazım ve çıktılar

Kalıcı candidate çıktıları yalnız şuralarda bulunabilir:

- `data/candidates/morphology/camel-morph-msa-v1.0/token-map.jsonl`
- `data/candidates/morphology/reports/camel-token-policy.json`

CLI kaynak ve manifest yollarını sabit allowlist ile, çıktı yollarını ise çözümlenmiş `data/candidates/morphology/` köküyle karşılaştırır. Path traversal ve production yolu reddedilir. Builder mevcut candidate dosyasını ezmez. Bütün tokenlar ve sayımlar geçici dosyada tamamlanmadan final ada geçilmez; hata halinde önceden mevcut çıktı silinmez veya değiştirilmez.

JSONL UTF-8 ve LF kullanır. JSON anahtarları sıralıdır; kayıt sırası canonical ayet ve span sırasıdır. Politika raporunda zaman damgası veya makineye özgü mutlak yol bulunmaz. Böylece aynı girdiden iki ayrı dizinde byte-identical çıktı elde edilir.

## Doğrulama ve bağımsızlık

Validator source hash, ayet sayısı, bütün span/code-point aralıkları, substring eşitliği, sınıf sayıları, `word_index` ardışıklığı, normalization trace kapsamı ve token-map SHA-256 değerini yeniden doğrular.

Test altyapısı:

- Yalnız iki allowlist girdisi bulunan hermetik bir geçici repo kurar.
- Builder okuma çağrılarını denetleyerek yalnız source ve manifestin okunduğunu kanıtlar.
- Yasak ağ/DB/subprocess/glob importlarını AST üzerinden reddeder.
- Fâtiha, Tevbe, sure 95/97, Neml 27:30, standalone waqf ve kelimeye bitişik `U+06DC` örneklerini sınar.
- Unicode code point ile UTF-16 farkını astral bir fixture üzerinde doğrular.
- İki ayrı geçici dizindeki JSONL ve politika raporlarını byte düzeyinde karşılaştırır.
- Mevcut candidate çıktısının ezilmediğini ve candidate kökü dışındaki yolların reddedildiğini sınar.

Test geçici dosyaları yalnız `data/candidates/morphology/` altında oluşturulur ve test sonunda kaldırılır.
