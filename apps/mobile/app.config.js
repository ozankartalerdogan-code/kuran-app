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
      supportsTablet: true,
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
        backgroundColor: '#0a1628',
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
      blockedPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'com.google.android.gms.permission.AD_ID',
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
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#060e1e',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#059669',
          sounds: [],
        },
      ],
      'expo-status-bar',
      // App yalnızca ses ÇALAR (Kur'an tilaveti), kayıt YAPMAZ → RECORD_AUDIO
      // (mikrofon) iznini ekleme. Aksi halde expo-audio varsayılan olarak ekliyor;
      // reklamsız/minimal-izin app için gereksiz + Play Veri Güvenliği'nde mikrofon
      // beyanı gerektirirdi. MODIFY_AUDIO_SETTINGS (normal izin) korunur.
      ['expo-audio', { recordAudioAndroid: false }],
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      // Sentry: org/project burada (commit'li, EAS'e gider); AUTH TOKEN ise EAS
      // secret'ı (SENTRY_AUTH_TOKEN) — source map upload için. Olaylar 'react-native'
      // projesine gidiyor (DSN), source map de oraya yüklenmeli.
      ['@sentry/react-native', { organization: 'ozan-kartal', project: 'react-native', url: 'https://sentry.io/' }],
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