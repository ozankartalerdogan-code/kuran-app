export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { IbadetRehberiClient } from "./IbadetRehberiClient";

export const metadata: Metadata = {
  title: "İbadet Rehberi — İnanç, İbadet ve Temizlik",
  description: "İslam'ın 5 şartı, İman'ın 6 şartı, namaz rekâtları, oruç, zekât, hac, kurban ve abdest rehberi.",
};

export default function IbadetRehberiPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Başlık */}
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/discover"
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            aria-label="Keşfet'e Dön"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">İbadet Rehberi</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">İnanç esasları, ibadetler ve temizlik rehberi</p>
          </div>
        </header>

        <IbadetRehberiClient />
      </div>
    </main>
  );
}
