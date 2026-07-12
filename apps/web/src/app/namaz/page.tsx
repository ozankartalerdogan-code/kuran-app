export const dynamic = "force-dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { MoonStar } from "lucide-react";
import { NamazKategorileri } from "./NamazKategorileri";
import { NamazVakitTablosu } from "./NamazVakitTablosu";
import { PageHeader } from "../../components/PageHeader";

export const metadata = {
  title: "Namaz — Vakitler ve Namaz Ayetleri",
  description:
    "Bugünün namaz vakitleri ve Kur'an'da namaza dair ayetler: vakitler, huşu, teheccüd, cuma ve daha fazlası.",
  alternates: { canonical: "/namaz" },
};

function VakitSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-5 w-32 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    </div>
  );
}

function KategoriSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
      ))}
    </div>
  );
}

export default function NamazPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={MoonStar}
        title="Namaz — Vakitler ve Ayetler"
        description="Bugünün namaz vakitleri ve Kur'an'da namaza dair ayetler; huşu, teheccüd ve daha fazlası."
      >
        <Link
          href="/namaz-rehberi"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline dark:text-navy-400"
        >
          Namazın adım adım nasıl kılındığını öğrenmek için Namaz Rehberi&apos;ne bakın →
        </Link>
      </PageHeader>

      <Suspense fallback={<VakitSkeleton />}>
        <NamazVakitTablosu />
      </Suspense>

      <div className="mt-8">
        <Suspense fallback={<KategoriSkeleton />}>
          <NamazKategorileri />
        </Suspense>
      </div>
    </main>
  );
}
