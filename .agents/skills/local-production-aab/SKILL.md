---
name: local-production-aab
description: Kuran Yolu için mevcut EAS production upload keystore'unu geçici kullanarak Windows'ta yerel ve Play Console'a yüklenebilir Android AAB üretir. Production AAB istendiğinde kullan; EAS cloud build, Play yüklemesi veya yeni key oluşturma yapmaz.
---

# Kuran Yolu Yerel Production AAB

Yalnız daha önce doğrulanmış Windows + EAS production credentials + Gradle yöntemi uygulanır.

## Sabit yollar

- Repo: `C:\Dev\kuran_app`
- Mobile: `C:\Dev\kuran_app\apps\mobile`
- Android: `C:\Dev\kuran_app\apps\mobile\android`
- Package: `com.kuranapp.mobile`
- AAB: `C:\Dev\kuran_app\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`
- EAS profile: `production`
- Secretsiz resume checkpoint: `$env:TEMP\kuran-yolu-local-aab-checkpoint.json`

## 1. Güvenlik

- `eas build`, `eas submit`, Play yüklemesi veya yeni keystore/key çalıştırma.
- EAS credentials'ı değiştirme, silme, replace veya regenerate etme.
- Parola, alias, fingerprint, private key veya credentials içeriğini terminal özetine/yanıta yazma.
- Credentials/keystore/signing helper'ı Git'e ekleme.
- Kaynak kodu, dependency, lockfile, Expo/RN/Gradle/Kotlin/JDK sürümünü build geçirmek için değiştirme.
- Production signing kimliği doğrulanamazsa yeni yöntem denemeden dur.
- Credentials indirildikten sonraki tüm akış cleanup garantili `try/finally` içinde yürütülmelidir.

## 2. Ön kontrol

```powershell
Set-Location C:\Dev\kuran_app
git status --short --branch
git log -5 --oneline
rg -n "applicationId|versionCode|versionName" apps/mobile/android/app/build.gradle
```

- `applicationId` `com.kuranapp.mobile` değilse dur.
- İstenen düzeltmelerin mevcut HEAD/worktree'de olduğunu hedefli diff ile doğrula.
- Aktif production fontunu hard-code etme. Expo config/layout, mushaf stilleri, native tajweed renderer ve izlenen native assetten keşfet; iki tarafta tutarlı ve dosyanın Git'te izli olduğunu doğrula.
- Secret adayı Git'te izleniyorsa dur.

## 3. Ortam

```powershell
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
$env:ANDROID_HOME = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
$env:NODE_ENV = 'production'
$env:SENTRY_DISABLE_AUTO_UPLOAD = 'true'

& "$env:JAVA_HOME\bin\java.exe" -version
Test-Path "$env:ANDROID_HOME\cmake\3.31.6\bin\cmake.exe"
Test-Path "$env:ANDROID_HOME\cmake\3.31.6\bin\ninja.exe"
```

JDK 17, SDK, CMake 3.31.6 veya Ninja yoksa dur; proje sürümünü değiştirerek telafi etme.

## 4. Tek seferlik test kapısı

```powershell
Set-Location C:\Dev\kuran_app\apps\mobile
npm run typecheck
Set-Location C:\Dev\kuran_app
npm run test:mobile
```

Herhangi biri başarısızsa build'e geçme. `spawn EPERM` yalnız sandbox kaynaklı olduğu kanıtlanırsa aynı komutu gerçek yerel terminal yetkisiyle bir kez tekrar çalıştır.

## 5. versionCode — çift artırmayı önle

`apps/mobile/eas.json` içinde `cli.appVersionSource=remote` olduğunu doğrula.

Önce checkpoint varsa oku. Checkpoint repo HEAD'iyle eşleşiyor ve remote versionCode checkpointteki hedef değere zaten yükselmişse **yeniden artırma**; sync/build aşamasından devam et.

Checkpoint yoksa:

1. Remote değeri al:

```powershell
Set-Location C:\Dev\kuran_app\apps\mobile
npx --no-install eas build:version:get --platform android --profile production --json --non-interactive
```

2. `nextVersionCode = remote + 1` hesapla.
3. Aşağıdaki komutta yalnız bu değeri gir:

```powershell
npx --no-install eas build:version:set --platform android --profile production
```

4. Başarılı set işleminden hemen sonra secretsiz checkpoint'i atomik yaz: repo HEAD, önceki remote, hedef remote, `remote_set=true`, `native_synced=false`, `build_verified=false`.
5. Native sync:

```powershell
npx --no-install eas build:version:sync --platform android --profile production
npx --no-install eas build:version:get --platform android --profile production --json --non-interactive
rg -n "versionCode|versionName" android/app/build.gradle
```

Remote ve native hedef değer aynı değilse dur. `versionName` değiştirilmemelidir. Sync başarılıysa checkpoint'i güncelle.

## 6. Credentials ve cleanup garantisi

Credentials indirmeden önce cleanup fonksiyonunu tanımla:

```powershell
$mobile = 'C:\Dev\kuran_app\apps\mobile'
$android = 'C:\Dev\kuran_app\apps\mobile\android'
$credentialsJson = Join-Path $mobile 'credentials.json'
$keystorePathExpected = Join-Path $mobile 'credentials\android\keystore.jks'
$initGradle = Join-Path $android 'local-eas-production.init.gradle'

function Remove-TemporaryAabSecrets {
  Remove-Item -LiteralPath $credentialsJson -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $keystorePathExpected -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $initGradle -Force -ErrorAction SilentlyContinue
  $androidCredDir = Join-Path $mobile 'credentials\android'
  $credDir = Join-Path $mobile 'credentials'
  if ((Test-Path $androidCredDir) -and -not (Get-ChildItem -LiteralPath $androidCredDir -Force | Select-Object -First 1)) { Remove-Item $androidCredDir -Force }
  if ((Test-Path $credDir) -and -not (Get-ChildItem -LiteralPath $credDir -Force | Select-Object -First 1)) { Remove-Item $credDir -Force }
}
```

Sonraki adımları `try { ... } finally { Remove-TemporaryAabSecrets }` içinde yürüt.

Credentials komutunda yalnız:

1. `production`
2. `credentials.json: Upload/Download...`
3. `Download credentials...`

seç. Keystore manage/upload/create/replace/delete menülerine girme.

```powershell
npx --no-install eas credentials --platform android
```

`credentials.json` değerlerini yalnız process belleğinde oku. `keytool -list -v` ile yerel JKS sertifikasını EAS production ekranındaki SHA-256 ile karşılaştır; değeri loga/rapora yazma. Eşleşmezse dur.

## 7. Geçici signing helper

`apps/mobile/android/local-eas-production.init.gradle` dosyasını geçici oluştur. Secret değerlerini dosyaya gömme; `../credentials.json` içinden runtime'da oku:

```groovy
import groovy.json.JsonSlurper

gradle.afterProject { project, state ->
    if (project.path != ':app' || state.failure != null) return
    def android = project.extensions.findByName('android')
    if (android == null) throw new GradleException('Android application extension was not found')

    def credentialsFile = project.rootProject.file('../credentials.json')
    if (!credentialsFile.isFile()) throw new GradleException('Temporary EAS credentials file was not found')
    def credentials = new JsonSlurper().parse(credentialsFile)
    def keystore = credentials.android.keystore
    def keystoreFile = project.rootProject.file('../' + keystore.keystorePath)
    if (!keystoreFile.isFile()) throw new GradleException('Temporary EAS production keystore was not found')

    def signing = android.signingConfigs.findByName('localEasProduction') ?: android.signingConfigs.create('localEasProduction')
    signing.storeFile = keystoreFile
    signing.storePassword = keystore.keystorePassword
    signing.keyAlias = keystore.keyAlias
    signing.keyPassword = keystore.keyPassword
    android.buildTypes.getByName('release').signingConfig = signing
    android.externalNativeBuild.cmake.version = '3.31.6'
}
```

Kalıcı Gradle/signing dosyasına secret yazma.

## 8. Build

Uzun komutları tek sefer çalıştır, tam logu geçici dosyada tut ve yalnız son küçük bölüm/ilk gerçek hatayı context'e al:

```powershell
Set-Location C:\Dev\kuran_app\apps\mobile\android
.\gradlew.bat --stop
.\gradlew.bat -I .\local-eas-production.init.gradle clean
.\gradlew.bat -I .\local-eas-production.init.gradle app:bundleRelease
```

Doğrula:

- ilgili native modüllerin release görevleri çalıştı;
- Sentry upload kapalı kaldı;
- `validateSigningRelease` ve `signReleaseBundle` geçti;
- `BUILD SUCCESSFUL`;
- beklenen AAB yolunda dosya oluştu.

Kök neden değişmeden retry yapma.

## 9. Artifact doğrulaması

- AAB var ve sıfırdan büyük.
- Native `versionCode/versionName`, remote hedef ve varsa output metadata tutarlı.
- `jarsigner -verify -verbose -certs` exit code `0` ve `jar verified.` içeriyor.
- `keytool -printcert -jarfile` ile AAB signer SHA-256, doğrulanan EAS production sertifikasıyla eşleşiyor; değeri raporlama.
- ZIP içinde `base/manifest/AndroidManifest.xml` ve keşfedilen aktif production font asset'i bulunuyor.

Başarılıysa checkpoint'i `build_verified=true` olarak güncelle; cleanup sonrasında checkpoint'i sil.

## 10. Finally sonrası kontrol

Her sonuçta:

```powershell
Test-Path 'C:\Dev\kuran_app\apps\mobile\credentials.json'
Test-Path 'C:\Dev\kuran_app\apps\mobile\credentials\android\keystore.jks'
Test-Path 'C:\Dev\kuran_app\apps\mobile\android\local-eas-production.init.gradle'
git -C C:\Dev\kuran_app status --short
```

Üç geçici yol da yok olmalıdır. İlgisiz untracked dosyalara dokunma.

## 11. Kısa rapor

Yalnız:

- başarılı/başarısız;
- `versionName` ve `versionCode`;
- signing doğrulaması ve EAS production sertifikasıyla eşleşme;
- AAB tam yolu ve boyutu;
- geçici credentials/keystore/helper cleanup sonucu;
- yapılmayan önemli kontrol veya blocker.

Fingerprint, alias, parola, credentials içeriği, tam log veya gereksiz hash gösterme.
