const path = require('path');

module.exports = {
  expo: {
    name: 'Kuran Yolu',
    slug: 'kuran-analiz',
    scheme: 'kuranyolu',
    version: '1.1.0',
    sdkVersion: '56.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    description:
      "Kur'an-ı Kerim'i okuyun, anlayın ve yaşayın. Türkçe meal, kelime analizi, kök açıklamaları, dua kategorileri ve günlük okuma takibi.",
    assetBundlePatterns: ['**/*'],
    ios: {
      // Uygulama dikey (portrait) kilitli ve tablet düzeni hiç tasarlanmadı/test
      // edilmedi — supportsTablet:true iPad'i "destekleniyor" gibi listeler ama
      // yatay moda hiç geçilemez, gerçekte tablet deneyimi yok.
      supportsTablet: false,
      bundleIdentifier: 'com.kuranapp.mobile',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Kıble yönü ve namaz vakitlerini konumunuza göre hesaplamak için kullanılır. Kıble yönü cihazda hesaplanır; namaz vakitleri için yaklaşık konumunuz Aladhan.com servisine gönderilir, sunucularımızda saklanmaz.',
      },
    },
    android: {
      package: 'com.kuranapp.mobile',
      // Android Auto Backup (bedava): favori/not/ilerleme (MMKV) kullanıcının
      // Google Drive'ına yedeklenir → kaldır-kur / yeni telefonda kısmi kurtarma.
      // Bizim sunucumuz yok; yedek Google tarafından yönetilir.
      allowBackup: true,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || path.resolve(__dirname, 'google-services.json'),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#00030e',
      },
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.POST_NOTIFICATIONS',
      ],
      // Otomatik eklenen ama İSTEMEDİĞİMİZ izinleri engelle:
      //  • ACCESS_FINE_LOCATION (expo-location ekler) → kıble/namaz için COARSE yeter,
      //    Play hassas-konum beyanı/incelemesi gerekmez.
      //  • AD_ID (Firebase Analytics ekler) → reklamsız app; reklam kimliği toplamayı
      //    kapatır, Play Veri Güvenliği'nde "reklam kimliği" beyanı gerekmez.
      //  • ACTIVITY_RECOGNITION (expo-sensors'ın Pedometer modülü ekler) → app yalnız
      //    Magnetometer/Accelerometer/DeviceMotion kullanıyor (kıble), adım sayar yok.
      //  • READ/WRITE_EXTERNAL_STORAGE (expo-file-system ekler, maxSdk 32) → app
      //    yalnız kendi cache/document dizinlerini kullanıyor, paylaşılan/genel
      //    depolamaya hiç erişmiyor.
      //  • SYSTEM_ALERT_WINDOW (react-native'in debug-only manifest'i ekler) →
      //    yalnız debug build'de dev-overlay için kullanılır, release AAB'a zaten
      //    girmez; burada engellenmesi yalnız debug build'i temiz tutar.
      blockedPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'com.google.android.gms.permission.AD_ID',
        'android.permission.ACCESS_ADSERVICES_AD_ID',
        'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
      // App Links: paylaşılan ayet URL'i (https://.../surah/x/ayah/y) uygulama
      // kuruluysa doğrudan içinde açılsın, tarayıcıya düşmesin. autoVerify için
      // web tarafında /.well-known/assetlinks.json'daki SHA256 imza parmak izinin
      // gerçek imzalama sertifikasıyla doldurulması ve yeni bir build gerekir.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'kuran-app-web-ozan-s-projects8.vercel.app',
              pathPrefix: '/surah',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-location',
      'expo-sensors',
      // R8/ProGuard release build'de açılırsa (bugün kapalı olabilir, ama garanti
      // değil) react-native-android-widget'ın WorkManager Worker sınıfını (arka
      // plan widget güncellemesi) reflection ile bulamayıp sessizce silebiliyor —
      // kütüphane kendi consumer-proguard kuralını içermiyor. Bu kurallar
      // minifyEnabled kapalıyken zararsız durur, açılırsa koruma sağlar.
      [
        'expo-build-properties',
        {
          android: {
            extraProguardRules:
              '-keep class * extends androidx.work.ListenableWorker { public <init>(android.content.Context, androidx.work.WorkerParameters); }\n' +
              '-keep class com.reactnativeandroidwidget.** { *; }',
          },
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#000517',
        },
      ],
      [
        'expo-notifications',
        {
          // Durum çubuğu ikonu: Android yalnız ALFA kanalını kullanır — beyaz/şeffaf
          // monokrom olmalı. Opak icon.png beyaz kare olarak görünüyordu.
          icon: './assets/notification-icon.png',
          color: '#059669',
          sounds: [],
        },
      ],
      'expo-status-bar',
      // Görsel ayet paylaşımı — kart görselini paylaşım sayfasına verir (native;
      // yeni EAS build gerektirir, JS tarafı guard'lı: modül yoksa metin paylaşımı)
      'expo-sharing',
      // Uygulama kapalıyken namaz vakti bildirimlerini tazeleyen arka plan görevi
      // (Android WorkManager / iOS BGTaskScheduler). iOS tarafına UIBackgroundModes
      // "processing" + BGTaskSchedulerPermittedIdentifiers ekler.
      'expo-background-task',
      // App yalnızca ses ÇALAR (Kur'an tilaveti), kayıt YAPMAZ → RECORD_AUDIO
      // (mikrofon) iznini ekleme. Aksi halde expo-audio varsayılan olarak ekliyor;
      // reklamsız/minimal-izin app için gereksiz + Play Veri Güvenliği'nde mikrofon
      // beyanı gerektirirdi. MODIFY_AUDIO_SETTINGS (normal izin) korunur.
      ['expo-audio', { recordAudioAndroid: false }],
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      // Bulut yedek (anonim auth + Firestore tek doküman) — src/lib/cloudBackup.ts.
      // Firestore'un ayrı config plugin'i yok; native kodu paket kurulumuyla gelir.
      '@react-native-firebase/auth',
      // Sentry: org/project burada (commit'li, EAS'e gider); AUTH TOKEN ise EAS
      // secret'ı (SENTRY_AUTH_TOKEN) — source map upload için. Olaylar 'react-native'
      // projesine gidiyor (DSN), source map de oraya yüklenmeli.
      ['@sentry/react-native', { organization: 'ozan-kartal', project: 'react-native', url: 'https://sentry.io/' }],
      // Android ana ekran widget'ı — "Emir Ayetleri" (bkz. src/widgets/). Sadece
      // Android'de native kod ekler, iOS/web build'ini etkilemez.
      // 'name' değeri src/widgets/emirRotation.ts'teki WIDGET_NAME ile AYNI OLMALI.
      [
        'react-native-android-widget',
        {
          widgets: [
            {
              name: 'EmirAyetleri',
              label: 'Emir Ayetleri',
              description: 'Kur\'an\'dan emir kipiyle gelen ayetler, günde 6 kez döner.',
              minWidth: '250dp',
              minHeight: '110dp',
              targetCellWidth: 4,
              targetCellHeight: 2,
              resizeMode: 'horizontal|vertical',
              updatePeriodMillis: 14400000, // 4 saat = günde 6 dilim (Android minimumu 30 dk)
            },
          ],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'c5c721bc-c06e-4e31-a486-bcdfd2e19589',
      },
    },
    owner: 'ozankartal',
  },
};