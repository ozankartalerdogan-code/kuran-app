import { Suspense } from "react";
import { DiscoverContent } from "./DiscoverContent";
import { DuaKategorileri } from "./DuaKategorileri";
import { NamazKategorileri } from "../namaz/NamazKategorileri";
import { NamazVakitTablosu } from "../namaz/NamazVakitTablosu";

export const metadata = { title: "Keşfet" };

function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
      ))}
    </div>
  );
}

function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
      ))}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <DiscoverContent
      duaBolumu={
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <DuaKategorileri />
        </Suspense>
      }
      namazBolumu={
        <>
          <Suspense fallback={<ListSkeleton count={6} />}>
            <NamazVakitTablosu />
          </Suspense>
          <Suspense fallback={<ListSkeleton count={5} />}>
            <NamazKategorileri />
          </Suspense>
        </>
      }
    />
  );
}
