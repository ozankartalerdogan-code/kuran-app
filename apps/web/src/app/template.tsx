import type { ReactNode } from "react";

/**
 * Kök template — her rota geçişinde yeniden mount olur, böylece .page-enter
 * animasyonu (globals.css) her gezinmede bir kez oynar. Sayfalar "pat diye"
 * değişmek yerine 200ms'lik yumuşak bir fade/yukarı-kayma ile girer.
 * prefers-reduced-motion açık olan kullanıcılarda animasyon devre dışıdır.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
