"use client";

/**
 * LazyClientWidgets.tsx — Next 15 uyumluluk sınırı.
 *
 * Next 15'te `next/dynamic` + `ssr: false` bir Server Component içinde HATA
 * veriyor ("Please move it into a Client Component"); Next 14'te yalnız uyarıydı.
 * page.tsx bir Server Component olduğu için iki tembel import bu ince client
 * dosyasına taşındı.
 *
 * Davranış birebir korunur: her iki bileşen de yalnız istemcide (SSR yok) ve
 * ayrı chunk olarak tembel yüklenir — page.tsx'teki önceki kurulumun aynısı.
 */
import dynamicImport from "next/dynamic";

export const NoteEditor = dynamicImport(
  () => import("./NoteEditor").then((m) => m.NoteEditor),
  { ssr: false },
);

export const StreakTracker = dynamicImport(
  () => import("./StreakTracker").then((m) => m.StreakTracker),
  { ssr: false },
);
