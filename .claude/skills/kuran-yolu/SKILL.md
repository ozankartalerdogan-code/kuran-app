---
name: kuran-yolu
description: Kuran Yolu monoreposunda genel kontrol, son değişiklik incelemesi, yayın öncesi kontrol, morfoloji/veri hattı denetimi ve production Android AAB isteğini yönlendirir. Kullanıcı /kuran-yolu sonrasında doğal dille kontrol, risk analizi, yayın hazırlığı veya AAB istediğinde kullan.
---

# Kuran Yolu Ana Kontrol

Repo kökü: `C:\Projects\kuran_app`

Bu skill proje kararlarını yönetir; kodlama/orkestrasyon için `efficient-coding`, production AAB için `local-production-aab` kurallarını uygular.

## 1. Değişmez sınırlar

- Kullanıcının talebi dışındaki uygulama kodu, veri, lockfile, native kaynak, signing veya release ayarını değiştirme.
- Projede tanımlı scriptleri kullan; eşdeğer yeni test/audit scripti uydurma.
- Aynı testi farklı komutlarla tekrar çalıştırma.
- Somut risk yoksa tam veri taraması, pahalı smoke/audit veya production veri üretimi çalıştırma.
- Emülatör/gerçek cihaz kontrolü yapılmadıysa yapılmış gibi raporlama.
- Secret değerlerini, alias/parola/fingerprint'i yazdırma veya raporlama.
- Genel kontrolde credentials içeriğini okuma. Yalnız `local-production-aab` prosedürü gerekli değerleri geçici bellekte okuyabilir.
- `docs/yayin-oncesi-final-denetim-raporu.md` dosyasına dokunma.
- Full production entegrasyonu, deploy, Play yüklemesi, commit veya push açıkça istenmedikçe yapma.

## 2. İsteği sınıflandır

- **Genel kontrol:** proje sağlığı
- **Diff/risk analizi:** son değişiklik veya belirli dosya/commit
- **Yayın öncesi:** production hazırlığı
- **Production AAB:** Play'e yüklenebilir yerel AAB
- **Veri/morfoloji hattı:** candidate, ranker, adjudication, holdout, determinism veya provenance

Birden fazlası varsa yalnız gerekli en geniş akışı seç. AAB akışı kendi zorunlu ön kontrollerini içerir; aynı testleri önceden tekrar etme.

## 3. En küçük keşif

Önce:

```powershell
Set-Location C:\Projects\kuran_app
git status --short --branch
git diff --stat
git diff --name-only
git diff --cached --stat
git diff --cached --name-only
```

- Kullanıcı kapsam belirttiyse yalnız o kapsamı incele.
- Dirty worktree varsa ilgili unstaged/staged hunk'ları hedefli oku.
- Worktree temizse `git show --stat --oneline HEAD` ve yalnız gerekirse ilgili `git show` hunk'larını incele.
- Tam `git diff` çıktısını körlemesine context'e alma.
- Untracked build/artifact dosyalarını kaynak değişikliğiyle karıştırma.

Script envanterini her çalışmada baştan tarama. Yalnız `package.json`, test config veya workspace yapısı değiştiyse ilgili dosyaların `scripts` alanını yeniden doğrula. Aksi halde mevcut repo scriptlerini kullan.

Bilinen ana scriptler değişmiş olabilir; çalıştırmadan önce yalnız ilgili `package.json` üzerinden varlığını doğrula:

- root: `typecheck`, `test`, `test:mobile`, `test:data`
- web: `typecheck`, `test`, `test:ocr`
- mobile: `typecheck`
- core: `typecheck`, `test`

Tanımlı olmayan `lint` veya başka komut uydurma.

## 4. Test seçimi

Diff kapsamına göre en küçük yeterli seti seç:

- **Mobil:** root `typecheck` + `test:mobile`
- **Web:** root `typecheck` + değişen alanı kapsayan tek web test yolu
- **Core:** root `typecheck` + core test
- **OCR:** genel web testine ek olarak yalnız OCR değiştiyse `test:ocr`
- **Genel/yayın öncesi:** root typecheck, mobil test, web-lib/web Jest ve yalnız etkilenen ek suite'ler
- **Veri:** yalnız değişen üretici/validator ve ilgili determinism/invariant testleri; `test:data` ancak diff gerçekten kapsamını gerektiriyorsa

Root typecheck workspace typecheck'lerini kapsıyorsa ayrıca tekrar çalıştırma.

Uzun komutlarda `efficient-coding` içindeki uzun komut modunu uygula.

## 5. Projeye özel güvenlik

### Secret/signing

Yalnız dosya adları ve Git takibi üzerinden kontrol et:

- `credentials.json`, `.env*`, `local.properties`
- `*.jks`, `*.keystore`, `*.p12`, `*.pem`, private-key adayları

İçerikleri açma. Örnek dosyaları gerçek secret sanmadan önce yalnız bağlamını doğrula. Yeni key/signing kimliği veya production credential değişikliği yayın/AAB için **BLOKER**.

### Android paket/sürüm

İlgili dosyalardan karşılaştır:

- `apps/mobile/app.config.js`
- `apps/mobile/android/app/build.gradle`
- AAB akışında EAS remote versionCode

`applicationId/package` değeri `com.kuranapp.mobile` olmalıdır. Package veya versionName çelişkisi **BLOKER**; açıklanamayan versionCode çelişkisi AAB/yayında **BLOKER**.

### Tecvid/native renderer/font

Yalnız diff bu yüzeye dokunuyorsa incele:

- canonical metin ve tajweed span üretimi
- UTF-16 indeksleme
- Android tek `TextView` + `SpannableStringBuilder` yaklaşımı
- renk span'ları, shaping, seçim/tap/highlight davranışı
- Expo ile native renderer'ın aynı production fontunu kullanması

Font adını skill içinde hard-code etme. Aktif fontu `app.config`, `_layout`, mushaf stilleri, native module ve izlenen assetlerden keşfet; Expo ve native tarafta tutarlı olduğunu doğrula. Eski bir font adına göre geçerli build'i bloklama.

Mobil test sonucu varsa aynı suite'i başka komutla tekrar etme. Cihaz kontrolü yapılmadıysa yalnız değişen davranış için en fazla 1–3 manuel kontrol yaz.

## 6. Veri ve morfoloji hattı

- Mevcut frozen manifest, gold, baseline ve provenance dosyalarını açık izin olmadan değiştirme.
- Freeze edilen geliştirme/diagnostic/holdout ayrımını koru; paketler arası çakışmayı deterministik kontrol et.
- Holdout etiketlerini ranker/config freeze öncesinde geliştirme akışına açma.
- Ranker sorununu normalization, segmentation, candidate generation veya lexicon değişikliğiyle gizleme.
- Tekil kelime/gold kaydı hard-code etme.
- Varyant × margin × slice metriklerini tek scriptte üret.
- Doğru/yanlış/belirsiz paydalarını ve eşleştirilmiş regresyonları aritmetik olarak doğrula.
- Full 77.429 seçim veya production entegrasyonu mevcut karar kapısı açıkça izin vermedikçe çalıştırma.
- İki eşdeğer çalıştırmada deterministik artifact hash'lerini karşılaştır; tüm dosyaları gereksiz yere hashleme.
- Kota kesilmesine karşı pahalı aşamaları checkpointle; tamamlanan adjudication/analizi yeniden üretme.

## 7. Production AAB

AAB istendiğinde bu ana skill içinde build prosedürü yazma veya değiştirme. Önce ilgili Git/release riskini kontrol et, sonra `.claude/skills/local-production-aab/SKILL.md` dosyasını uygula.

- Ana skill, helper'ın çalıştıracağı typecheck ve mobil testi önceden tekrar çalıştırmaz.
- Yeni build/signing yöntemi, yeni key, EAS cloud build veya Play yüklemesi yapma.
- Helper yoksa ya da doğrulanmış yöntem mevcut projeyle uyuşmuyorsa **BLOKER** ver.

## 8. Sonuç sınıflandırması

- **TEMİZ:** gerekli scriptler geçti, gerçek risk yok
- **DİKKAT:** bloklamayan gerçek risk veya hedefli manuel kontrol var
- **BLOKER:** test/typecheck başarısız, secret izleniyor, signing/package/sürüm tutarsız, production asset/renderer eksik veya AAB doğrulanamadı

Rapor:

```text
Sonuç: TEMİZ | DİKKAT | BLOKER
Çalıştırılan kontroller: ...
Bulgular: yalnız gerçek bulgular
Manuel kontrol: ilgiliyse en fazla 1–3 madde, aksi halde Yok
AAB sonucu: yalnız AAB istendiyse
```

Ham log, tam diff, secret veya yapılmayan kontrolü başarı gibi gösterme.
