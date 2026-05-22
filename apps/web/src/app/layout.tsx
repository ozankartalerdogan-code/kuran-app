import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "./components/SearchBar";
import { tr } from "../locales/tr";
import "./globals.css";

export const metadata: Metadata = {
  title: tr.appTitle,
  description: tr.appDescription
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <nav className="border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/surah"
              className="shrink-0 text-sm font-medium text-stone-700 hover:text-stone-900"
            >
              ← Tüm Sureler
            </Link>
            <SearchBar />
            <Link
              href="/discover"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              Keşfet
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
