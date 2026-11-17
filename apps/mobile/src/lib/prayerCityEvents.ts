/**
 * Namaz vakti şehri değiştiğinde ana sayfaya haber veren küçük modül bayrağı.
 * Ekranlar arası geçişte event emitter yerine tek seferlik tüketilen bayrak.
 */

let changed = false;

export function markPrayerCityChanged(): void {
  changed = true;
}

export function consumePrayerCityChanged(): boolean {
  const value = changed;
  changed = false;
  return value;
}

// Diyanet günleri önbelleğe yazıldığında ana sayfaya haber veren dinleyiciler.
const diyanetDaysCachedListeners = new Set<() => void>();

export function onDiyanetDaysCached(listener: () => void): () => void {
  diyanetDaysCachedListeners.add(listener);
  return () => {
    diyanetDaysCachedListeners.delete(listener);
  };
}

let diyanetDaysCachedVersion = 0;

/** Her notifyDiyanetDaysCached çağrısında artar; arada olay kaçtı mı diye bakmak için. */
export function getDiyanetDaysCachedVersion(): number {
  return diyanetDaysCachedVersion;
}

export function notifyDiyanetDaysCached(): void {
  diyanetDaysCachedVersion += 1;
  for (const listener of diyanetDaysCachedListeners) {
    try {
      listener();
    } catch {
      /* dinleyici hatası diğerlerini etkilemesin */
    }
  }
}
