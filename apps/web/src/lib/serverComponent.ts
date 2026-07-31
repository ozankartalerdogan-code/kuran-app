import type { ReactNode } from "react";

/**
 * Async Server Component'i JSX'te kullanılabilir tipe daraltır.
 *
 * NEDEN GEREKLİ: `@types/react` 18 (apps/web'in sabitlediği sürüm, Next 14 ile
 * uyumlu olan) bir bileşenin `Promise<ReactNode>` döndürmesine izin vermez —
 * JSX'te kullanıldığında TS2786 verir. Async Server Component'leri JSX dönüş
 * tipi olarak tanıyan `JSX.ElementType`, `@types/react` 19 ile geldi. Next 14
 * bunları RUNTIME'da zaten destekliyor; eksik olan yalnızca tip tarafı.
 *
 * Bu sarmalayıcı SADECE tip düzeyinde çalışır — çalışma zamanında fonksiyonu
 * olduğu gibi döndürür, davranış değişmez.
 *
 * Monorepo kökünde React Native yüzünden `@types/react` 19 da duruyor. İki
 * kopya aynı programa girdiğinde hangisinin global JSX ad alanını belirlediği
 * kurulum ağacına göre değişiyordu: lokalde 19 kazanıp build geçiyor, Vercel'in
 * kurulumunda 18 kazanıp build kırılıyordu. tsconfig'teki `paths` sabiti artık
 * her yerde 18'i seçiyor; bu sarmalayıcı da kodu o sürüm altında geçerli kılar.
 */
export function asServerComponent<P extends object>(
  component: (props: P) => Promise<ReactNode>,
): (props: P) => ReactNode {
  return component as unknown as (props: P) => ReactNode;
}
