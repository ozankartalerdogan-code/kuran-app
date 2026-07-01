import { storage } from '../lib/storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let StoreReview: any = null;
// eslint-disable-next-line @typescript-eslint/no-var-requires
try { StoreReview = require('expo-store-review'); } catch (_e) { /* noop */ }

const REVIEW_ASKED_KEY = 'store_review_asked';
const APP_OPEN_COUNT_KEY = 'app_open_count';

export async function trackAppOpen() {
  const count = parseInt(await storage.getString(APP_OPEN_COUNT_KEY) || '0') + 1;
  await storage.setString(APP_OPEN_COUNT_KEY, String(count));
  return count;
}

export async function maybeAskReview() {
  if (!StoreReview) return;

  const alreadyAsked = await storage.getString(REVIEW_ASKED_KEY);
  if (alreadyAsked) return;

  const count = await trackAppOpen();
  if (count !== 3) return;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return;

  await StoreReview.requestReview();
  await storage.setString(REVIEW_ASKED_KEY, 'true');
}
