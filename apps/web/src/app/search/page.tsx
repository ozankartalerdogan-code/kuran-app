import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchContent } from "./SearchContent";

export const metadata: Metadata = {
  title: "Arama",
  description: "Sure adı, ayet numarası veya Türkçe kelime arayın; tema etiketlerine göre filtreleyin.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
            <div className="h-10 animate-pulse rounded-lg bg-stone-200" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-stone-200" />
            ))}
          </div>
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
