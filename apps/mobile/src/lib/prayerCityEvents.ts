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
