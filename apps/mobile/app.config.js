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
          'Namaz vakitlerini konumunuza göre hesaplamak için kullanılır. Konum veriniz cihazınızdan çıkmaz ve hiçbir sunucuya gönderilmez.',
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
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.POST_NOTIFICATIONS',
      ],
      // expo-location plugin ACCESS_FINE_LOCATION'ı otomatik ekler; Play'in
      // hassas-konum beyanı/incelemesi gerekmesin diye açıkça engelliyoruz.
      // Kıble ve namaz vakti için yaklaşık (COARSE) konum yeterlidir.
      blockedPermissions: ['android.permission.ACCESS_FINE_LOCATION'],
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
      'expo-audio',
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      '@sentry/react-native',
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