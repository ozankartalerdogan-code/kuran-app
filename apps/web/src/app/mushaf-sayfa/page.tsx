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

  return null;
}
