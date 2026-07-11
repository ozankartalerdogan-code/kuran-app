"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SAYFA_SAYISI, ayetinSayfasi } from "../../lib/mushafSayfaUtils";
import { getMushafBookmark, parseMushafBookmark } from "../../lib/mushafBookmark";

const LAST_PAGE_KEY = "mushafSayfaLastPage";

export default function MushafSayfaIndexPage() {
  const router = useRouter();

  useEffect(() => {
    let target = 1;
    try {
      const lastPage = Number(localStorage.getItem(LAST_PAGE_KEY));
      if (Number.isInteger(lastPage) && lastPage >= 1 && lastPage <= SAYFA_SAYISI) {
        target = lastPage;
      } else {
        const bm = parseMushafBookmark(getMushafBookmark());
        if (bm) target = ayetinSayfasi(bm.surahId, bm.ayahNumber);
      }
    } catch { /* localStorage kullanılamıyor */ }
    router.replace(`/mushaf-sayfa/${target}`);
  }, [router]);

  // Yönlendirme sırasında boş sayfa flaşı yerine küçük bir iskelet göster
  return (
    <main className="mx-auto max-w-3xl px-3 py-4">
      <div className="animate-pulse rounded-2xl border border-gold-300/60 bg-[#fdfbf4] px-4 py-6 shadow-card dark:border-gold-800/40 dark:bg-stone-900 sm:px-8 sm:py-8">
        <div className="mx-auto mb-4 h-10 w-2/3 rounded-xl bg-stone-100 dark:bg-stone-800" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="mb-3 h-6 rounded bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    </main>
  );
}
