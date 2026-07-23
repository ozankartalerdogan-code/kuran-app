"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleAreaProps {
  children: ReactNode;
  /** İçerik öğe sayısı — eşiğin altındaysa katlama hiç devreye girmez */
  itemCount: number;
  /** Hedef baglantisiyla acildiginda icerigin ilk anda acik olmasi gerekir. */
  initiallyOpen?: boolean;
  /** Bu sayı ve altı öğede katlama yok (varsayılan 12) */
  minItems?: number;
  /** Kapalı durumdaki azami yükseklik (px, varsayılan 460) */
  collapsedHeight?: number;
  /** Aç düğmesi metni */
  showLabel?: string;
  /** Kapat düğmesi metni */
  hideLabel?: string;
}

/**
 * Sunucuda render edilmiş uzun içeriği (örn. kelime analizi tablosu) görsel
 * olarak katlar: kapalıyken üstten sınırlı yükseklik + alta doğru solma,
 * altın vurgulu "tümünü göster" düğmesiyle açılır. Veri istemciye zaten
 * geldiğinden yalnızca sunum katmanıdır — SEO içeriği HTML'de kalır.
 */
export function CollapsibleArea({
  initiallyOpen = false,
  children,
  itemCount,
  minItems = 12,
  collapsedHeight = 460,
  showLabel = "Tümünü göster",
  hideLabel = "Daha az göster",
}: CollapsibleAreaProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const collapsible = itemCount > minItems;

  if (!collapsible) return <>{children}</>;

  return (
    <div>
      <div
        className="relative overflow-hidden transition-[max-height] duration-300"
        style={{ maxHeight: open ? undefined : collapsedHeight }}
      >
        {children}
        {!open && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-stone-900"
          />
        )}
      </div>
      <div className="mt-3 text-center">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold-300 bg-gold-50 px-4 py-2 text-xs font-semibold text-gold-800 transition-colors hover:bg-gold-100 dark:border-gold-800/50 dark:bg-gold-950/40 dark:text-gold-300 dark:hover:bg-gold-900/40"
        >
          {open ? hideLabel : `${showLabel} (${itemCount})`}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
