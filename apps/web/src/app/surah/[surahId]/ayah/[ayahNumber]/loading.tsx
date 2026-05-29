function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-stone-200 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Pulse className="h-9 w-40" />
              <Pulse className="h-4 w-28" />
              <div className="flex gap-2">
                <Pulse className="h-10 w-28" />
                <Pulse className="h-10 w-20" />
                <Pulse className="h-10 w-14" />
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Pulse className="h-6 w-20 rounded-full" />
              <div className="flex flex-col gap-2 w-36">
                <Pulse className="h-10 w-full" />
                <Pulse className="h-10 w-full" />
                <Pulse className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex justify-between">
          <Pulse className="h-9 w-28" />
          <Pulse className="h-9 w-28" />
        </div>

        {/* Arapça metin */}
        <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex justify-between">
            <Pulse className="h-5 w-24" />
            <Pulse className="h-5 w-14 rounded-full" />
          </div>
          <Pulse className="h-16 w-full" />
        </div>

        {/* Okunuş */}
        <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm space-y-3">
          <Pulse className="h-5 w-20" />
          <Pulse className="h-5 w-3/4" />
          <Pulse className="h-5 w-1/2" />
        </div>

        {/* Sekmeli içerik */}
        <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex gap-2 border-b border-stone-100 pb-4">
            {["Mealler", "Kelime Analizi", "Kökler", "Analiz"].map((l) => (
              <Pulse key={l} className="h-8 w-24" />
            ))}
          </div>
          <div className="space-y-3">
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-5/6" />
            <Pulse className="h-4 w-4/6" />
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-3/4" />
          </div>
        </div>

      </div>
    </main>
  );
}
