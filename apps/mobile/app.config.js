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
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || path.resolve(__dirname, 'google-services.json'),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0a1628',
      },
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.POST_NOTIFICATIONS',
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
      'expo-audio',
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
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