"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nightMode";

export function NightModeToggle() {
  const [active, setActive] = useState(false);

  // Mount'ta localStorage'dan oku (SSR sırasında bu çalışmaz, sadece client'ta)
  useEffect(() => {
    setActive(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !active;
    setActive(next);
    if (next) {
      document.documentElement.classList.add("night-mode");
      localStorage.setItem(STORAGE_KEY, "1");
    } else {
      document.documentElement.classList.remove("night-mode");
      localStorage.setItem(STORAGE_KEY, "0");
    }
  }

  return (
    <button
      onClick={toggle}
      type="button"
      aria-label="Gece modunu değiştir"
      title={active ? "Gece modunu kapat" : "Gece modunu aç"}
      aria-pressed={active}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-gold-500/70 bg-gold-500/15 text-gold-300 hover:bg-gold-500/25"
          : "border-white/20 bg-white/5 text-navy-200 hover:bg-white/10 hover:text-white"
      }`}
    >
      {active ? (
        // Dolu ay ikonu — gece modu açık
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Çerçeveli ay ikonu — gece modu kapalı
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
