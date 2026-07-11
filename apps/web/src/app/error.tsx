"use client";

import Link from "next/link";

// Özel 500/hata sayfası — styled-jsx olmayan temiz hata gösterimi.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="rounded-lg border border-stone-200 bg-white p-10 text-center shadow-sm">
        <p className="text-5xl font-bold text-stone-300">500</p>
        <h1 className="mt-4 text-xl font-semibold text-stone-800">Bir hata oluştu</h1>
        <p className="mt-2 text-sm text-stone-500">
          Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Tekrar dene
          </button>
          <Link
            href="/surah/1/ayah/1"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
