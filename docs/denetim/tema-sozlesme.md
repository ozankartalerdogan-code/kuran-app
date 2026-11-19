# Tema etiketleri — ortak veri sözleşmesi (paralel işler için)

Plan: `docs/denetim/2026-11-19-tema-etiketleri-plani.md` (cb50ad43, dal fix/android-optional-features; buraya kopyası: aynı klasör). Dal: `feat/tema-etiketleri`, worktree `C:\Projects\kuran_app_tema`.

## Dosyalar ve sahipleri

| Dosya | Kim üretir | Kim okur |
|---|---|---|
| `content/themes/taxonomy.json` | Taksonomi ajanı (agy) → Claude onayı → kullanıcı onayı | scriptler, web, mobil |
| `scripts/themes/*.py` | Script ajanı | Claude çalıştırır |
| `data/app.db` (worktree kopyası, git'te yok) | scriptler (yalnız kopya üzerinde) | — |
| `apps/mobile/src/data/themeTaxonomy.json`, `apps/mobile/src/data/verseThemes.json` | `scripts/themes/build_bundles.py` | mobil |
| `apps/web/src/data/themeTaxonomy.json` | `scripts/themes/build_bundles.py` | web |

Taksonomi onaylanana kadar UI işleri `content/themes/taxonomy.placeholder.json` ile çalışır (mevcut 28 kod, aynı şema). Gerçek dosya gelince yalnız veri değişir, kod değişmez.

## taxonomy.json şeması

```json
{
  "version": 1,
  "groups": [ { "code": "A", "tr": "İnanç Esasları", "en": "Faith" } ],
  "level1": [
    { "code": "A1_ALLAH_ULUHIYET", "group": "A", "tr": "Allah & Uluhiyet", "en": "Allah and Divinity",
      "descTr": "kısa açıklama", "descEn": "short description", "sensitive": true }
  ],
  "level2": [
    { "code": "sabir", "parents": ["C1_BIREYSEL_ERDEMLER"], "tr": "Sabır", "en": "Patience", "sensitive": false }
  ],
  "migration": {
    "level1": { "B1_TAHARET_TEMIZLIK": "B2_SERI_IBADETLER", "C4_ILIM_AKIL_TEFEKKÜR": "C4_ILIM_AKIL_TEFEKKUR" },
    "level2": { "sabır": "sabir", "deneme": "imtihan", "yol": null }
  }
}
```

Kurallar:
- Kodlar yalnız ASCII: level1 `^[A-G][0-9]_[A-Z_]+$`, level2 `^[a-z0-9]+(-[a-z0-9]+)*$` (Türkçe karakter yok; başlıklar `tr` alanında).
- Mevcut kürasyonlu `namaz-*`, `korunma-*`, `ismiazam-*`, `dua-*` kodları aynen korunur (level2'de yer alır).
- `sensitive: true` = Allah'ın isim/sıfatları, peygamberler, melekler/gayb, ibadet, din mensupları; bu sınıflarda şüphede etiket konmaz.
- `migration` değeri `null` = etiketi sil.

## verseThemes.json (mobil paket) şeması

```json
{ "v": 1, "t": { "1:1": ["A1_ALLAH_ULUHIYET", "rahmet", "besmele"], "2:255": [null, "ayetel-kursi"] } }
```
Dizinin ilk öğesi level1 kodu (yoksa `null`), kalanlar level2 kodları. Etiketi olmayan ayet anahtarı yazılmaz.

## Mobil/web arayüz sözleşmesi

- `getThemeTitle(code, lang) -> string` (bulunamazsa okunur yedek: alt çizgileri boşluk yap, ham kod gösterme).
- `getVerseThemes(verseKey) -> { main: string|null, subs: string[] }` (mobilde paketten, çevrimdışı).
- Liste/sayfalı ayet sonuçları: mevcut `/api/tags/filter?tag=` uç noktası (kod parametresi yeni ASCII kodlar; eski kodlar migration ile eşlenir).
- Bayrak: `SHOW_THEME_TAGS` doğrulama eşiği geçilene kadar `false` kalır; geliştirme için `__DEV__` altında açılabilir.
