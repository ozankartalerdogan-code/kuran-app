import { Suspense } from "react";
import { NamazKategorileri } from "./NamazKategorileri";
import { NamazVakitTablosu } from "./NamazVakitTablosu";

export const metadata = { title: "Namaz — KuranApp" };

export default function NamazPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-10 border-b border-stone-200 pb-8 dark:border-stone-700/60">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="text-2xl leading-none">🕌</span>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            Namaz
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Kur&apos;an&apos;da namaza dair ayetler; vakitler, huşu, teheccüd ve daha fazlası.
        </p>
      </div>

      <Suspense fallback={null}>
        <NamazVakitTablosu />
      </Suspense>

      <Suspense fallback={null}>
        <NamazKategorileri />
      </Suspense>
    </main>
  );
}
