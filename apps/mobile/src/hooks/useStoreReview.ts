import { storage } from '../lib/storage';
import { Linking } from 'react-native';
import { parseLastAsked, shouldRequestReview, REVIEW_WAIT_MS } from './storeReviewPolicy';
import { withOverlayBusy } from '../tour/overlayBusy';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let StoreReview: any = null;
// eslint-disable-next-line @typescript-eslint/no-var-requires
try { StoreReview = require('expo-store-review'); } catch (_e) { /* noop */ }

const REVIEW_ASKED_KEY = 'store_review_asked';
const REVIEW_LAST_ASKED_KEY = 'store_review_last_asked';
const REVIEW_RATED_KEY = 'store_review_rated';
const APP_OPEN_COUNT_KEY = 'app_open_count';
// Kaçıncı açılıştan İTİBAREN sorulacağı. "Tam N'inci açılışta" değil — o anda
// Play Store müsait değilse (isAvailableAsync false / hata) fırsat sonsuza dek
// kaçardı; >= ile bir sonraki açılışta yeniden denenir.

export async function trackAppOpen() {
  const stored = parseInt(await storage.getString(APP_OPEN_COUNT_KEY) || '0');
  // Bozuk değer (NaN) sayacı kalıcı bozmasın — sıfırdan başlat.
  const count = (Number.isFinite(stored) ? stored : 0) + 1;
  await storage.setString(APP_OPEN_COUNT_KEY, String(count));
  return count;
}

// Sayım açılışta yapılır; istek yalnız tamamlanan quizin sonuç ekranında,
// bekleme süresi dolunca ve çağıranın güncel uygunluk kontrolüyle açılır.
export async function maybeAskReview(eligible: () => boolean) {
  if (!StoreReview) return;

  if (await storage.getString(REVIEW_RATED_KEY) === 'true') return;

  const nowMs = Date.now();
  let rawLastAsked = await storage.getString(REVIEW_LAST_ASKED_KEY);
  if (rawLastAsked === null && await storage.getString(REVIEW_ASKED_KEY) === 'true') {
    rawLastAsked = String(parseLastAsked('true', nowMs));
    await storage.setString(REVIEW_LAST_ASKED_KEY, rawLastAsked);
    await storage.remove(REVIEW_ASKED_KEY);
  }
  const lastAskedMs = parseLastAsked(rawLastAsked, nowMs);

  const count = parseInt(await storage.getString(APP_OPEN_COUNT_KEY) || '0');
  // NaN >= N her zaman false → bozuk sayaçta sormadan çık (trackAppOpen zaten
  // bir sonraki açılışta sayacı onarır).
  const allowed = async () => shouldRequestReview({ opens: count,
    rated: await storage.getString(REVIEW_RATED_KEY) === 'true', lastAskedMs, nowMs: Date.now(),
    completed: true, eligible: eligible(), waitedMs: REVIEW_WAIT_MS });
  if (!await allowed()) return;

  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return; // bir sonraki açılışta tekrar dene
    if (!await allowed()) return;

    await withOverlayBusy(() => StoreReview.requestReview());
    // Zaman YALNIZ istek başarıyla tamamlanınca kaydedilir; Play zaten kendi
    // kotasıyla diyaloğu gösterip göstermemeye karar verir.
    await storage.setString(REVIEW_LAST_ASKED_KEY, String(Date.now()));
  } catch {
    // Play Store hatası — sessiz geç, bir sonraki açılışta tekrar denenir.
  }
}

export async function openStoreListing(): Promise<void> {
  try {
    await storage.setString(REVIEW_RATED_KEY, 'true');
    try {
      await Linking.openURL(StoreReview?.storeUrl() || 'market://details?id=com.kuranapp.mobile');
    } catch {
      await Linking.openURL('https://play.google.com/store/apps/details?id=com.kuranapp.mobile');
    }
  } catch {
    // Mağaza açılamazsa sessiz geç.
  }
}
