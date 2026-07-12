import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Standart sayfa başlığı: ikon rozeti + serif başlık + açıklama + altın ayraç.
 * Kuran Yolu tasarım sistemi — başlık ölçeği tüm sayfalarda text-2xl,
 * kimlik: lacivert başlık + ince altın vurgu çizgisi.
 * İkonlar lucide (emoji platformlar arası tutarsız render ediliyordu).
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700/60">
      <div className="mb-2 flex items-center gap-3">
        {Icon && (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy-900 dark:text-stone-50">
          {title}
        </h1>
      </div>
      <div aria-hidden="true" className="mb-2.5 h-0.5 w-12 rounded-full bg-gold-400" />
      {description && (
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
