# Elif-Ba / Harf-i Tarif İngilizce uyarlama notları

## Kapsam
- Elif-Ba dersleri (harf adı, sesi, mahreç, ipucu, quiz) yerel dosyada DEĞİL; `/elifba/dersler`, `/elifba/dersler/:id/harfler`, `/elifba/quiz/:id` API uçlarından gelir (`src/lib/api.ts`). Bu içerik uygulama paketinde olmadığından burada JSON'a taşınamadı; İngilizce uyarlaması sunucu/API tarafında yapılmalıdır (`app/elifba/index.tsx`, `app/elifba/[dersId].tsx` yalnız UI i18n kullanır). Ses referansları (CDN ses dosyaları) dokunulmadan kalmalı.
- Harf-i Tarif: `harf_i_tarif.json` (TR) ve `harf_i_tarif.en.json` (EN, şimdilik TR'nin birebir kopyası/placeholder). Ekran: `src/components/HarfITarifContent.tsx` `useLocalizedData(harfITarifDersi)` ile okur.

## Çevrilmeyecek alanlar (harf_i_tarif.json)
`id`, `tip`, `seviye`, `arapca`, `okunusu` (translit; ayrıca `localizedTranslit` ile işlenir), `harf` (örn. "Sin (س)"), `ornek_esma` içindeki Arapça/translit kısmı. Şekil (anahtarlar, bölüm sırası, sayılar) korunmalı.

## Türkçeye özgü, UYARLANMASI gereken alanlar
Birebir çevirmeyin; İngilizce okuyucuya İngilizce ses benzetmeleri kullanın.
- `bolumler[].icerik`, `ornek.aciklama`: "el-" takısının "İngilizcedeki 'the' gibi" anlatımı (EN'de zaten doğal; "in English" ibaresini kaldırın), "Er-Rahman/Es-Selam" örnekleri translit.
- `bolumler[id=kural].icerik` ve `hafiza_ipucu`: "şems = güneş / kamer = ay" kelime oyunu ve "şemsiye/kameriye" terimleri; İngilizcede "sun letters / moon letters" ve `gorsel_aciklama` içindeki "eş-şin", "el-bau" gibi Türkçe yazım (ş, au) translitleri İngilizce okunuşa göre (ash-shin, al-ba) uyarlanmalı.
- `bolumler[].harfler[].ad` ve `okunusu`: harf adları Türkçe yazımlı (Şin, Ta, Za...); `okunusu` Türkçe imla ("eş-şin", "ed-dal"). `okunusu` `localizedTranslit` ile EN'e çevriliyor; EN dosyada yine de İngilizce imlaya (ash-shin) çevrilebilir. `ad` için İngilizce harf adı (Shin, Dal...).
- `ornek_esma`: Esma-ül Hüsna örnekleri Türkçe yazımlı (Es-Sabur, Er-Rahîm); anlam kısımları Türkçe açıklama içeriyorsa çevrilmeli.
- `ornekler[].isim` (Türkçe yazımlı Allah isimleri), `anlam` (Türkçe karşılık), `aciklama` ("Sin şemsiye harf → es-semi'" gibi): çevrilir, translit İngilizce imlaya uyarlanır.
- `sorular[].soru`: Türkçe soru kalıbı "A mı, B mı?" (mı/mi/mu/mü eki). EN: "A or B?". Bileşen EN'de virgül yoksa " or " ile böler, sondaki "?" i temizler.
- `sorular[].dogru_cevap`: `soru` içindeki iki seçenekten biriyle HARFİ HARFİNE aynı olmalı (eşleşme `===` ile yapılır). `harf` ("Sin (س)", "Fe (ف)") Türkçe harf adı; İngilizce adla değiştirilebilir (Seen, Fa...) ama Arapça harf korunur.
- `bolumler[id=baglam].icerik/not/gorsel_ipucu`: tecvid terimleri ("lam-ı şemsiye / lam-ı kameriye"), Kur'an'dan bağlam örnekleri; "Tecvid'de" gibi Türkçe anlatım uyarlanmalı.
- `ozet.maddeler`: kural özeti; Türkçe terimler ve harf adları uyarlanmalı.
- `baslik`, `sure`, `on_kosul`, `aciklama` (ders düzeyi): düz çeviri; başlıktaki "el-, es-, et-..." translit korunur.
- Ünlü uyumuna özgü Türkçe karşılaştırmalar ("Türkçedeki 'ş' gibi" vb.) varsa İngilizce ses karşılaştırmasıyla ("like 'sh' in 'ship'") değiştirilmeli.

## Not
`scripts/_build-harf-i-tarif.mjs` artık mobil için yalnız `content/harf_i_tarif.json` yazar; `.en.json` dosyasını ASLA ezmez.
