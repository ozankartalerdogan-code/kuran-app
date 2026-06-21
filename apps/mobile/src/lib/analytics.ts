// Native modül yoksa (eski dev build) sessizce atla
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let getAnalytics: (() => any) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getAnalytics = require('@react-native-firebase/analytics').default;
} catch (_e) { /* noop */ }

export async function logScreen(screenName: string) {
  if (!getAnalytics) return;
  try {
    await getAnalytics().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch (_e) { /* noop */ }
}

export async function logFeature(featureName: string, params?: Record<string, string>) {
  if (!getAnalytics) return;
  try {
    await getAnalytics().logEvent(featureName, params);
  } catch (_e) { /* noop */ }
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
