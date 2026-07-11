import Link from "next/link";

// Özel 404 sayfası — Next.js'in styled-jsx kullanan varsayılan /_error sayfasını
// override eder ve monorepo çift-React sorunundan kaçınır.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="rounded-lg border border-stone-200 bg-white p-10 text-center shadow-sm">
        <p className="text-5xl font-bold text-stone-300">404</p>
        <h1 className="mt-4 text-xl font-semibold text-stone-800">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-stone-500">
          Aradığınız sayfa mevcut değil ya da taşınmış olabilir.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
