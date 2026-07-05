import type { Metadata } from "next";
import { EsmaList } from "./EsmaList";

// Statik içerik (DB yok) → force-dynamic gereksiz; SEO + hız için statik render.
export const metadata: Metadata = {
  title: "Esmaül Hüsna — Allah'ın 99 Güzel İsmi",
  description:
    "Allah'ın 99 güzel ismi (Esmaül Hüsna): Arapça yazılışı, okunuşu ve açıklayıcı Türkçe anlamlarıyla. Klasik rivayet listeleri esas alınarak derlenmiştir.",
  openGraph: {
    title: "Esmaül Hüsna — Allah'ın 99 Güzel İsmi",
    description: "Allah'ın 99 ismi: Arapça, okunuş ve açıklayıcı anlamlar.",
    type: "article",
  },
  alternates: { canonical: "/esma" },
};

export default function EsmaPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Hero */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="text-2xl leading-none">📿</span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            Esmaül Hüsna
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Allah'ın 99 güzel ismi — Arapça yazılışı, okunuşu, anlamı ve her ismin kök (etimolojik) anlamıyla.
        </p>
      </div>

      {/* Bilgi notu */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 dark:border-amber-700/50 dark:bg-amber-900/15">
        <p className="text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
          <span className="font-bold">Esmaül Hüsna</span>, &ldquo;en güzel isimler&rdquo; demektir.
          Kur'an'da &ldquo;En güzel isimler Allah'ındır; O'na onlarla dua edin&rdquo; (A'râf 7:180) buyrulur.
          Aşağıdaki 99 isim ve anlamları, klasik rivayet listeleri esas alınarak derlenmiştir.
        </p>
      </div>

      <EsmaList />
    </main>
  );
}
