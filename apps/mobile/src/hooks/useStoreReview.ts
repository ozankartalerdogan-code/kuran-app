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
  const stored = parseInt(await storage.getString(APP_OPEN_COUNT_KEY) || '0');
  // Bozuk değer (NaN) sayacı kalıcı bozmasın — sıfırdan başlat.
  const count = (Number.isFinite(stored) ? stored : 0) + 1;
  await storage.setString(APP_OPEN_COUNT_KEY, String(count));
  return count;
}

// Sayım (trackAppOpen) açılışta hemen yapılır; SORU ise çağıranın uygun gördüğü
// anda (splash/onboarding bittikten sonra) sorulur. Play In-App Review tek
// atımlık: bayrak ilk denemede konur, o yüzden cold start'ta splash'in üstüne
// sorup hakkı yakmamak önemli.
export async function maybeAskReview() {
  if (!StoreReview) return;

  const alreadyAsked = await storage.getString(REVIEW_ASKED_KEY);
  if (alreadyAsked) return;

  const count = parseInt(await storage.getString(APP_OPEN_COUNT_KEY) || '0');
  // NaN >= N her zaman false → bozuk sayaçta sormadan çık (trackAppOpen zaten
  // bir sonraki açılışta sayacı onarır).
  if (!(count >= MIN_OPENS_BEFORE_ASK)) return;

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
