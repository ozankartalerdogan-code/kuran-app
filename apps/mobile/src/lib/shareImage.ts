// Görsel paylaşım altyapısı — react-native-view-shot + expo-sharing NATIVE
// modüllerdir; mevcut dev build'de yoksa require patlar → null'a düşer ve
// çağıran taraf metin paylaşımına devam eder (build-gated guard deseni,
// bkz. useKeepAwakeSafe / storage MMKV guard'ı).

type CaptureRefFn = (
  ref: unknown,
  options?: { format?: "png" | "jpg"; quality?: number; result?: "tmpfile" | "base64" | "data-uri" },
) => Promise<string>;

type ShareAsyncFn = (
  url: string,
  options?: { mimeType?: string; dialogTitle?: string; UTI?: string },
) => Promise<void>;

let captureRefImpl: CaptureRefFn | null = null;
let shareAsyncImpl: ShareAsyncFn | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const vs = require("react-native-view-shot") as { captureRef?: CaptureRefFn };
  if (typeof vs.captureRef === "function") captureRefImpl = vs.captureRef;
} catch { /* modül build'de yok — görsel paylaşım kapalı */ }

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const sh = require("expo-sharing") as { shareAsync?: ShareAsyncFn };
  if (typeof sh.shareAsync === "function") shareAsyncImpl = sh.shareAsync;
} catch { /* modül build'de yok — görsel paylaşım kapalı */ }

// İki modül birden varsa görsel paylaşım sunulabilir; yoksa UI bu seçeneği hiç göstermez.
export const isImageShareAvailable = captureRefImpl !== null && shareAsyncImpl !== null;

// Verilen view ref'ini PNG'ye çevirip paylaşım sayfasını açar.
// Başarı: true; kullanıcı iptali dahil her hata: false (çağıran fallback'e karar verir).
export async function captureAndShareView(ref: unknown, dialogTitle: string): Promise<boolean> {
  if (!captureRefImpl || !shareAsyncImpl) return false;
  try {
    const uri = await captureRefImpl(ref, { format: "png", quality: 1, result: "tmpfile" });
    const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
    await shareAsyncImpl(fileUri, { mimeType: "image/png", dialogTitle, UTI: "public.png" });
    return true;
  } catch {
    return false;
  }
}
