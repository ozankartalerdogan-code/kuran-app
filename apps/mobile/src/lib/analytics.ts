type AnalyticsModule = typeof import('@react-native-firebase/analytics');

let analyticsModule: AnalyticsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  analyticsModule = require('@react-native-firebase/analytics');
} catch (_e) { /* noop */ }

export async function logScreen(screenName: string) {
  if (!analyticsModule) return;
  try {
    const { getAnalytics, logEvent } = analyticsModule;
    await logEvent(getAnalytics(), 'screen_view', { screen_name: screenName, screen_class: screenName });
  } catch (_e) { /* noop */ }
}

export async function logFeature(featureName: string, params?: Record<string, string>) {
  if (!analyticsModule) return;
  try {
    const { getAnalytics, logEvent } = analyticsModule;
    await logEvent(getAnalytics(), featureName, params);
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
