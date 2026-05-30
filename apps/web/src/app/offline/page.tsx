export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="text-center">
        <p className="mb-4 text-6xl">📵</p>
        <h1 className="mb-2 text-xl font-bold text-stone-800 dark:text-stone-100">
          İnternet bağlantısı yok
        </h1>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          Bağlantı kurulduğunda sayfayı yenileyin.
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Favoriler, Notlar, Hatim ve Kıble sayfaları çevrimdışı çalışır.
        </p>
      </div>
    </main>
  );
}
