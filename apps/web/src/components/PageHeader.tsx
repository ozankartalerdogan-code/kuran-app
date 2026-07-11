import type { ReactNode } from "react";

/**
 * Standart sayfa başlığı: ikon + başlık + açıklama + alt çizgi.
 * Konular sayfasındaki desen site geneline ortak bileşen olarak alındı;
 * başlık ölçeği tüm sayfalarda text-2xl'e sabitlenir.
 */
export function PageHeader({
  icon,
  title,
  description,
  children,
}: {
  icon?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700/60">
      <div className="mb-2 flex items-center gap-2.5">
        {icon && (
          <span aria-hidden="true" className="text-2xl leading-none">
            {icon}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          {title}
        </h1>
      </div>
      {description && (
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
