"use client";

import { useState } from "react";
import Link from "next/link";
import { GuideTab } from "./GuideTab";
import { OzelNamazlarTab } from "./OzelNamazlarTab";

const TABS = [
  { id: "rehber", label: "Nasıl Kılınır" },
  { id: "ozel", label: "Özel Namazlar" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NamazRehberiClient() {
  const [tab, setTab] = useState<TabId>("rehber");

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-stone-950 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700/60">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="text-2xl leading-none">🕌</span>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">Namaz Rehberi</h1>
          </div>
          <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Yeni başlayanlar için adım adım namaz rehberi ve özel namazlar (cenaze, teheccüd, teravih ve daha fazlası).
            Namaza dair ayetleri incelemek için{" "}
            <Link href="/namaz" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              Namaz Ayetleri
            </Link>{" "}
            sayfasına bakabilirsiniz.
          </p>
        </header>

        <div className="mb-6 flex gap-1.5 rounded-xl bg-stone-100 p-1.5 dark:bg-stone-900">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-selected={active}
                role="tab"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white text-emerald-700 shadow-sm dark:bg-stone-800 dark:text-emerald-400"
                    : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "rehber" ? <GuideTab /> : <OzelNamazlarTab />}
      </div>
    </main>
  );
}
