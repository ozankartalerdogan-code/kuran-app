import { storage } from '../lib/storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let StoreReview: any = null;
// eslint-disable-next-line @typescript-eslint/no-var-requires
try { StoreReview = require('expo-store-review'); } catch (_e) { /* noop */ }

const REVIEW_ASKED_KEY = 'store_review_asked';
const APP_OPEN_COUNT_KEY = 'app_open_count';
// Kaçıncı açılıştan İTİBAREN sorulacağı. "Tam N'inci açılışta" değil — o anda
// Play Store müsait değilse (isAvailableAsync false / hata) fırsat sonsuza dek
// kaçardı; >= ile bir sonraki açılışta yeniden denenir.
const MIN_OPENS_BEFORE_ASK = 3;

export async function trackAppOpen() {
  const count = parseInt(await storage.getString(APP_OPEN_COUNT_KEY) || '0') + 1;
  await storage.setString(APP_OPEN_COUNT_KEY, String(count));
  return count;
}

export async function maybeAskReview() {
  // Açılış sayacı her koşulda ilerlesin (review modülü olmayan build'de bile) —
  // aksi halde Expo Go'da geçen açılışlar sayılmaz, gerçek build'de baştan başlardı.
  const count = await trackAppOpen();
  if (!StoreReview) return;

  const alreadyAsked = await storage.getString(REVIEW_ASKED_KEY);
  if (alreadyAsked) return;

  if (count < MIN_OPENS_BEFORE_ASK) return;

  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return; // bir sonraki açılışta tekrar dene

    await StoreReview.requestReview();
    // Bayrak YALNIZ istek başarıyla tamamlanınca konur; Play zaten kendi
    // kotasıyla diyaloğu gösterip göstermemeye karar verir, biz tekrar sormayız.
    await storage.setString(REVIEW_ASKED_KEY, 'true');
  } catch {
    // Play Store hatası — sessiz geç, bir sonraki açılışta tekrar denenir.
  }
}
