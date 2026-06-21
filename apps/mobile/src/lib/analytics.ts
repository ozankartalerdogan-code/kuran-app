import analytics from '@react-native-firebase/analytics';

export async function logScreen(screenName: string) {
  await analytics().logScreenView({
    screen_name: screenName,
    screen_class: screenName,
  });
}

export async function logFeature(featureName: string, params?: Record<string, string>) {
  await analytics().logEvent(featureName, params);
}

export const AnalyticsEvents = {
  AYET_OKU:       'ayet_oku',
  DUA_OKU:        'dua_oku',
  HADIS_OKU:      'hadis_oku',
  ELIF_BA_DERS:   'elif_ba_ders',
  NAMAZ_REHBERI:  'namaz_rehberi',
  STREAK_DEVAM:   'streak_devam',
  PAYLASIM:       'paylasim',
  FAVORI_EKLE:    'favori_ekle',
  ARAMA:          'arama',
} as const;
