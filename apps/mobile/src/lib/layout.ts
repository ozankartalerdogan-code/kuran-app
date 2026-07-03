/**
 * Uzun-form okuma metinleri (ayet, meal, tefsir, dua, hadis) için satır
 * genişliği sınırı. Telefonlarda etkisiz (ekran zaten dar); tablet gibi
 * geniş ekranlarda satırların okunamayacak kadar uzamasını engeller.
 * `alignSelf: "stretch"` ile birlikte kullan — dar ekranda tam genişlik,
 * geniş ekranda ortalanmış sabit genişlik verir.
 */
export const READING_MAX_WIDTH = 680;
