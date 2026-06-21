import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_ASKED_KEY = 'store_review_asked';
const APP_OPEN_COUNT_KEY = 'app_open_count';

export async function trackAppOpen() {
  const count = parseInt(await AsyncStorage.getItem(APP_OPEN_COUNT_KEY) || '0') + 1;
  await AsyncStorage.setItem(APP_OPEN_COUNT_KEY, String(count));
  return count;
}

export async function maybeAskReview() {
  // Sadece 3. açılışta sor, daha önce sormadıysan
  const alreadyAsked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
  if (alreadyAsked) return;

  const count = await trackAppOpen();
  if (count !== 3) return;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return;

  await StoreReview.requestReview();
  await AsyncStorage.setItem(REVIEW_ASKED_KEY, 'true');
}
