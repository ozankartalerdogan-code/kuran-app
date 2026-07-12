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
      <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-card">
        <p className="font-display text-5xl font-bold text-navy-200">500</p>
        <div aria-hidden="true" className="mx-auto mt-3 h-0.5 w-10 rounded-full bg-gold-400" />
        <h1 className="mt-4 font-display text-xl font-semibold text-navy-900">Bir hata oluştu</h1>
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
            href="/"
            className="rounded-lg bg-navy-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
