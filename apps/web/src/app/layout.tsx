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
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
