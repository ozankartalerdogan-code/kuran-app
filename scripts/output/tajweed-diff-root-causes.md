# Tecvid Diff Kök Nedenleri

Beklenen farklar actionable listeye alınmamıştır: aynı kuralı koruyan Unicode yazım farkları (**2285**) ve besmele kaynak farkları (**112**).

| Alt neden | Kayıt | Ayet | Kaynak kuralları | İşlem | Teknik açıklama |
|---|---:|---:|---|---|---|
| unicode-equivalent-only | 1552 | 1263 | a, c, d, f, g, h, i, l, n, o, p, q, s, u, w | script geliştirilebilir | Tokenlar yalnız Unicode normalization/yazım biçimi bakımından farklıdır; canonical sıra aynıdır. |
| unicode-equivalent-only | 349 | 324 | a, c, d, f, g, h, i, l, n, o, p, q, s, u, w | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 232 | 223 | a, f, n, o, q, u, w | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| ambiguous-cluster | 189 | 176 | g, o | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak g ve o kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| unicode-equivalent-only | 175 | 165 | a, c, f, g, h, i, n, o, q, w | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 154 | 148 | — | güvenle renksiz bırak | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 132 | 127 | a, f, g, h, i, n, o, p, q, u, w | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 125 | 125 | — | güvenle renksiz bırak | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 97 | 97 | a, c, f, g, i, n, o, p, q, u | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 77 | 75 | a, f, g, i, n, o, q, u | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| ambiguous-cluster | 76 | 75 | a, u | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve u kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 75 | 71 | f, w | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak f ve w kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 74 | 69 | f, o | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak f ve o kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 62 | 56 | a, w | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve w kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| waqf-annotation-token-difference | 56 | 55 | — | güvenle renksiz bırak | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| ambiguous-cluster | 37 | 36 | c, f | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak c ve f kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 31 | 31 | g, p | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak g ve p kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 30 | 29 | i, w | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak i ve w kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 19 | 19 | u, w | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak u ve w kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 18 | 18 | f, p | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak f ve p kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| unicode-equivalent-only | 18 | 17 | a, f, u | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 15 | 15 | — | güvenle renksiz bırak | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| ambiguous-cluster | 14 | 14 | a, o | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve o kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 13 | 13 | a, g | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve g kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 12 | 12 | o, w | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak o ve w kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 11 | 11 | a, u | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve u kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 11 | 11 | i, o | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak i ve o kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 10 | 10 | a, i | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve i kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 10 | 10 | f, m | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak f ve m kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| waqf-annotation-token-difference | 10 | 10 | a, f, g, h, l, n | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 9 | 9 | i, n | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| ambiguous-cluster | 8 | 8 | a, f | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve f kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 8 | 8 | o, u | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak o ve u kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| unicode-equivalent-only | 6 | 6 | — | güvenle renksiz bırak | Tokenlar yalnız Unicode normalization/yazım biçimi bakımından farklıdır; canonical sıra aynıdır. |
| no-rule-cluster | 4 | 4 | — | güvenle renksiz bırak | Eşleşmeyen eski-kaynak tokenında tanınan tecvid kuralı taşıyan grapheme yoktur. |
| unicode-equivalent-only | 4 | 4 | o, s | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 4 | 3 | a, h, o | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unmapped-rule-cluster | 4 | 4 | a, h | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| unmapped-rule-cluster | 4 | 4 | a, f, h, l, n | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| waqf-annotation-token-difference | 4 | 4 | f, n | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 4 | 4 | i, n | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| ambiguous-cluster | 3 | 3 | a, p | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve p kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| unicode-equivalent-only | 3 | 3 | — | güvenle renksiz bırak | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 3 | 3 | i, o | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 3 | 3 | o | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 3 | 3 | — | güvenle renksiz bırak | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| waqf-annotation-token-difference | 3 | 3 | n | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| ambiguous-cluster | 2 | 2 | a, p | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak a ve p kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 2 | 2 | f, i | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak f ve i kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 2 | 2 | f, u | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak f ve u kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| ambiguous-cluster | 2 | 2 | g, u | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak g ve u kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| waqf-annotation-token-difference | 2 | 2 | f, i, o | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 2 | 2 | n | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| ambiguous-cluster | 1 | 1 | p, u | güvenle renksiz bırak | Aynı grapheme içinde eski kaynak p ve u kurallarını birlikte atamıştır; tek bir final kural otomatik seçilemez. |
| token-count-mismatch | 1 | 1 | g, h, i, n, o, p | script geliştirilebilir | Canonical token sayısı 14, eski kaynak token sayısı 13; token-index eşlemesi güvenli değildir. |
| token-count-mismatch | 1 | 1 | a, c, f, h, n, o, p, q | script geliştirilebilir | Canonical token sayısı 20, eski kaynak token sayısı 19; token-index eşlemesi güvenli değildir. |
| unicode-equivalent-only | 1 | 1 | n | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 1 | 1 | — | güvenle renksiz bırak | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 1 | 1 | a | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 1 | 1 | i | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unicode-equivalent-only | 1 | 1 | n, s | script geliştirilebilir | Tokenın tamamı; tatweel, dagger-alif seat'i, tanvin/kısa-hareke yazımı ve tanvin–elif sırası için tanımlı ortografik anahtarda aynıdır. |
| unmapped-rule-cluster | 1 | 1 | f, u | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| unmapped-rule-cluster | 1 | 1 | n | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| unmapped-rule-cluster | 1 | 1 | h, i | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| unmapped-rule-cluster | 1 | 1 | i | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| unmapped-rule-cluster | 1 | 1 | n | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| unmapped-rule-cluster | 1 | 1 | h, l | incele | Eski-kaynak tokenında gerçek kural vardır; token anahtarı mevcut doğrulanmış Unicode/grapheme eşdeğerlikleriyle canonical tokena bağlanamamıştır. |
| waqf-annotation-token-difference | 1 | 1 | a | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 1 | 1 | g, i | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 1 | 1 | f | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 1 | 1 | f | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 1 | 1 | — | güvenle renksiz bırak | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 1 | 1 | o | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
| waqf-annotation-token-difference | 1 | 1 | a | script geliştirilebilir | Ana harf dizisi aynıdır; fark yalnız U+06D6–U+06ED Quran annotation/vakıf işaretlerinin yazımı veya token konumudur. |
