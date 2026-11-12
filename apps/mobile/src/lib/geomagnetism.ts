// Manyetik sapma (deklinasyon) — NOAA World Magnetic Model (WMM2025), dünya geneli.
// Pusulanın gösterdiği manyetik kuzey ile coğrafi (gerçek) kuzey arasındaki açı;
// kıble yönü gerçek kuzeye göre hesaplandığı için pusula okumasına eklenir.
// Algoritma: NOAA WMM2025 Technical Report (küresel harmonik, Schmidt yarı-normalize).
// NOAA/NCEI World Magnetic Model WMM2025 katsayıları (kamu malı, ABD hükümeti eseri).
// Kaynak: https://www.ncei.noaa.gov/products/world-magnetic-model — WMM.COF
// (epoch 2025.0, yayın 11/13/2024; sha256 dfa85978…582f). Geçerlilik: 2025.0–2030.0.
// Satır: [n, m, g (nT), h (nT), ġ (nT/yıl), ḣ (nT/yıl)]
const WMM_EPOCH = 2025.0;
const WMM_COEFFS: readonly (readonly [number, number, number, number, number, number])[] = [
  [1, 0, -29351.8, 0, 12, 0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0, -11.6, 0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8, -12.1],
  [3, 0, 1361, 0, -1.3, 0],
  [3, 1, -2404.1, -56.6, -4.2, 4],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895, 0, -1.6, 0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6, 4.1],
  [4, 3, -281.1, 212, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7, -4.4],
  [5, 0, -233.2, 0, 0.6, 0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142, 43, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0, -0.2, 0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0, 0, 0],
  [7, 1, -77, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0],
  [7, 5, 2.5, -7.4, -0.8, -1],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0, -0.1, 0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0, 0.5],
  [8, 3, 2, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, 0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0, 0, 0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10, -0.1, 0.1],
  [10, 0, -1.3, 0, 0.1, 0],
  [10, 1, -6.4, 3.3, 0, 0],
  [10, 2, 0.2, 0, 0.1, 0],
  [10, 3, 2, 2.4, 0.1, -0.2],
  [10, 4, -1, 5.3, 0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, 0, 0.2],
  [10, 10, -3.9, -9.1, 0, 0],
  [11, 0, 2.9, 0, 0, 0],
  [11, 1, -1.5, 0, 0, 0],
  [11, 2, -2.5, 2.9, 0, 0.1],
  [11, 3, 2.4, -0.6, 0, 0],
  [11, 4, -0.6, 0.2, 0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, 0],
  [11, 6, -0.6, -0.3, 0, 0],
  [11, 7, -0.1, -1.2, 0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, 0],
  [11, 9, -1, -2.9, -0.1, 0],
  [11, 10, -0.2, -1.8, -0.1, 0],
  [11, 11, 2.6, -2.3, -0.1, 0],
  [12, 0, -2, 0, 0, 0],
  [12, 1, -0.2, -1.3, 0, 0],
  [12, 2, 0.3, 0.7, 0, 0],
  [12, 3, 1.2, 1, 0, -0.1],
  [12, 4, -1.3, -1.4, 0, 0.1],
  [12, 5, 0.6, 0, 0, 0],
  [12, 6, 0.6, 0.6, 0.1, 0],
  [12, 7, 0.5, -0.1, 0, 0],
  [12, 8, -0.1, 0.8, 0, 0],
  [12, 9, -0.4, 0.1, 0, 0],
  [12, 10, -0.2, -1, -0.1, 0],
  [12, 11, -1.3, 0.1, 0, 0],
  [12, 12, -0.7, 0.2, -0.1, -0.1],
];

const N_MAX = 12;
const A_REF = 6371.2; // km, geomanyetik referans yarıçapı
const WGS84_A = 6378.137; // km
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const DEG = Math.PI / 180;

const G0: number[][] = [];
const H0: number[][] = [];
const DG: number[][] = [];
const DH: number[][] = [];
for (let n = 0; n <= N_MAX; n++) {
  G0.push(new Array(n + 1).fill(0));
  H0.push(new Array(n + 1).fill(0));
  DG.push(new Array(n + 1).fill(0));
  DH.push(new Array(n + 1).fill(0));
}
for (const [n, m, g, h, dg, dh] of WMM_COEFFS) {
  G0[n][m] = g;
  H0[n][m] = h;
  DG[n][m] = dg;
  DH[n][m] = dh;
}

/** Tarihi ondalık yıla çevirir (ör. 2026-07-02 → ~2026.5). */
export function decimalYear(date: Date = new Date()): number {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - start) / (end - start);
}

/**
 * Manyetik sapma, derece (doğu +, batı −).
 * @param lat coğrafi enlem (derece)  @param lng boylam (derece)
 * @param year ondalık yıl (model 2025.0–2030.0 için geçerli)  @param altKm deniz seviyesinden yükseklik
 */
export function magneticDeclination(lat: number, lng: number, year: number = decimalYear(), altKm = 0): number {
  // Kutuplarda Y bileşeni tanımsız; çok yakınına kırp.
  const phi = Math.max(-89.999, Math.min(89.999, lat)) * DEG;
  const lam = lng * DEG;
  const dt = year - WMM_EPOCH;

  // Jeodezik → jeosentrik küresel koordinat.
  const sinPhi = Math.sin(phi);
  const rc = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi * sinPhi);
  const p = (rc + altKm) * Math.cos(phi);
  const z = (rc * (1 - WGS84_E2) + altKm) * sinPhi;
  const r = Math.hypot(p, z);
  const phiC = Math.asin(z / r);
  const s = Math.sin(phiC);
  const c = Math.cos(phiC);

  // Schmidt yarı-normalize Legendre fonksiyonları P(sin φ') ve dP/dφ'.
  const P: number[][] = [];
  const dP: number[][] = [];
  for (let n = 0; n <= N_MAX; n++) {
    P.push(new Array(n + 1).fill(0));
    dP.push(new Array(n + 1).fill(0));
  }
  P[0][0] = 1;
  for (let n = 1; n <= N_MAX; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) {
        const k = n === 1 ? 1 : Math.sqrt((2 * n - 1) / (2 * n));
        P[n][n] = k * c * P[n - 1][n - 1];
        dP[n][n] = k * (c * dP[n - 1][n - 1] - s * P[n - 1][n - 1]);
      } else {
        const k1 = 2 * n - 1;
        const k2 = n - 2 >= m ? Math.sqrt((n - 1) * (n - 1) - m * m) : 0;
        const prevP = n - 2 >= m ? P[n - 2][m] : 0;
        const prevD = n - 2 >= m ? dP[n - 2][m] : 0;
        const d = Math.sqrt(n * n - m * m);
        P[n][m] = (k1 * s * P[n - 1][m] - k2 * prevP) / d;
        dP[n][m] = (k1 * (c * P[n - 1][m] + s * dP[n - 1][m]) - k2 * prevD) / d;
      }
    }
  }

  let X = 0;
  let Y = 0;
  let Z = 0;
  const ratio = A_REF / r;
  let rn = ratio * ratio; // (a/r)^(n+2), n=0 için
  for (let n = 1; n <= N_MAX; n++) {
    rn *= ratio;
    for (let m = 0; m <= n; m++) {
      const g = G0[n][m] + dt * DG[n][m];
      const h = H0[n][m] + dt * DH[n][m];
      const cm = Math.cos(m * lam);
      const sm = Math.sin(m * lam);
      const gh = g * cm + h * sm;
      X -= rn * gh * dP[n][m];
      Y += rn * m * (g * sm - h * cm) * P[n][m];
      Z -= (n + 1) * rn * gh * P[n][m];
    }
  }
  Y /= c;

  // Jeosentrik → jeodezik çerçeveye döndür (D için yalnız X gerekli).
  const psi = phiC - phi;
  const Xg = X * Math.cos(psi) - Z * Math.sin(psi);
  return Math.atan2(Y, Xg) / DEG;
}
