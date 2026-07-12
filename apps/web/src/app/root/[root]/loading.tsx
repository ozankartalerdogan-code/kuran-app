export default function RootDetailLoading() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="h-10 w-32 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="h-5 w-48 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="h-4 w-36 rounded bg-stone-200 dark:bg-stone-700" />
        </div>

        {/* Heatmap skeleton */}
        <div className="mb-8">
          <div className="h-5 w-40 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="mt-3 grid grid-cols-12 gap-px">
            {Array.from({ length: 114 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-10 rounded-sm bg-stone-200 dark:bg-stone-700 sm:h-11 sm:w-11"
              />
            ))}
          </div>
        </div>

        {/* Derived words skeleton */}
        <div>
          <div className="h-5 w-36 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-stone-200 dark:bg-stone-700"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}