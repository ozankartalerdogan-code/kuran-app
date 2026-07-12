/**
 * Kimlikli skeleton — düz gri kutu yerine krem zemin + hafif shimmer.
 * Tüm loading.tsx dosyaları bu bileşeni kullanır ki bekleme ekranı da
 * marka dilinde kalsın (animasyon globals.css'teki .skeleton-shimmer).
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-xl bg-stone-200/70 dark:bg-stone-800 ${className}`}
    />
  );
}

/** Standart sayfa iskeleti: PageHeader taklidi + kart listesi */
export function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Sayfa yükleniyor">
      {/* Başlık iskeleti */}
      <div className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700/60">
        <div className="mb-2 flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="mb-2.5 h-0.5 w-12 rounded-full bg-gold-400/50" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {/* İçerik iskeleti */}
      <div className="space-y-3">
        {[...Array(cards)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </main>
  );
}
