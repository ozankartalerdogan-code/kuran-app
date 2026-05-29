function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-stone-200 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        <div className="space-y-2">
          <Pulse className="h-9 w-24" />
          <Pulse className="h-5 w-48" />
        </div>

        {/* Isı haritası */}
        <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm space-y-3">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-24 w-full" />
        </div>

        {/* Türev grupları */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm space-y-2">
              <Pulse className="h-5 w-16" />
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-3/4" />
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
