export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { dbAll } from "../../../lib/dbUtils";
import sayfaData from "../../../lib/mushaf_sayfalari.json";

// Mushaf sayfa görünümü (mobil): standart 604 sayfalık Medine mushafı düzeninde
// bir sayfanın ayetlerini (Arapça metin) döner. Sayfa sınırları Tanzil
// quran-data.xml (cc-by) kaynaklı; mobil taraf aynı JSON'un kopyasını taşır.

const SAYFA_SAYISI = 604;
const sayfalar = sayfaData.sayfaBaslangiclari as [number, number][];
const cuzler = sayfaData.cuzBaslangiclari as [number, number][];
const ayetSayilari = sayfaData.sureAyetSayilari as number[];

function karsilastir(s1: number, a1: number, s2: number, a2: number): number {
  return s1 !== s2 ? s1 - s2 : a1 - a2;
}

// Verilen ayeti içeren son "başlangıç ≤ ayet" girdisinin dizini (binary search).
function sonBaslangicIndeksi(liste: [number, number][], surahId: number, ayahNumber: number): number {
  let lo = 0, hi = liste.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, a] = liste[mid];
    if (karsilastir(s, a, surahId, ayahNumber) <= 0) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}

// Sayfanın kapsadığı ayet aralığı: [başlangıç, bir sonraki sayfanın başlangıcından
// bir önceki ayet]; son sayfa Nâs 114:6'da biter.
function sayfaAraligi(page: number) {
  const [s1, a1] = sayfalar[page - 1];
  if (page === SAYFA_SAYISI) {
    return { bas: { surahId: s1, ayahNumber: a1 }, son: { surahId: 114, ayahNumber: ayetSayilari[113] } };
  }
  const [s2, a2] = sayfalar[page];
  const son = a2 > 1
    ? { surahId: s2, ayahNumber: a2 - 1 }
    : { surahId: s2 - 1, ayahNumber: ayetSayilari[s2 - 2] };
  return { bas: { surahId: s1, ayahNumber: a1 }, son };
}

interface VerseRow { surah_id: number; ayah_number: number; arabic_text: string | null }
interface SurahRow { id: number; adi_turkce: string; adi_arapca: string }

export type MushafPageResponse = {
  page: number;
  juz: number;
  verses: { surahId: number; ayahNumber: number; arabic: string | null }[];
  surahs: { id: number; name: string; arabicName: string }[];
};

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page"));
  if (!Number.isInteger(page) || page < 1 || page > SAYFA_SAYISI) {
    return NextResponse.json({ error: `Geçersiz page (1-${SAYFA_SAYISI})` }, { status: 400 });
  }

  const { bas, son } = sayfaAraligi(page);
  const juz = sonBaslangicIndeksi(cuzler, bas.surahId, bas.ayahNumber) + 1;

  try {
    const [verses, surahs] = await Promise.all([
      dbAll<VerseRow>(
        `SELECT surah_id, ayah_number, arabic_text FROM verses
         WHERE (surah_id > ? OR (surah_id = ? AND ayah_number >= ?))
           AND (surah_id < ? OR (surah_id = ? AND ayah_number <= ?))
         ORDER BY surah_id, ayah_number`,
        bas.surahId, bas.surahId, bas.ayahNumber,
        son.surahId, son.surahId, son.ayahNumber,
      ),
      dbAll<SurahRow>(
        "SELECT id, adi_turkce, adi_arapca FROM sureler WHERE id BETWEEN ? AND ? ORDER BY id",
        bas.surahId, son.surahId,
      ),
    ]);

    const body: MushafPageResponse = {
      page,
      juz,
      verses: verses.map((v) => ({ surahId: v.surah_id, ayahNumber: v.ayah_number, arabic: v.arabic_text })),
      surahs: surahs.map((s) => ({ id: s.id, name: s.adi_turkce, arabicName: s.adi_arapca })),
    };

    return NextResponse.json(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // Mushaf metni değişmez — CDN'de uzun süre kalsın (deploy hatası ihtimaline
        // karşı sonsuz değil; SWR ile eski kopya anında servis edilir).
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=2592000",
      },
    });
  } catch (err) {
    console.error("[mushaf] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
