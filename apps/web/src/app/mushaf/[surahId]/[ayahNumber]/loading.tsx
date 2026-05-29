function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-stone-200 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-900 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Pulse className="h-7 w-32 bg-stone-700" />
            <Pulse className="h-4 w-20 bg-stone-700" />
          </div>
          <Pulse className="h-9 w-24 bg-stone-700" />
        </div>

        {/* Arapça metin */}
        <div className="rounded-xl bg-stone-800 p-8 text-center space-y-4">
          <Pulse className="h-12 w-full bg-stone-700" />
          <Pulse className="h-12 w-4/5 mx-auto bg-stone-700" />
          <Pulse className="h-12 w-3/5 mx-auto bg-stone-700" />
        </div>

        {/* Nav butonları */}
        <div className="flex justify-between">
          <Pulse className="h-9 w-28 bg-stone-700" />
          <Pulse className="h-9 w-28 bg-stone-700" />
        </div>

      </div>
    </main>
  );
}
