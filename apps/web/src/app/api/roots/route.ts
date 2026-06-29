export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { dbAll } from "../../../lib/dbUtils";
import type { RootItem } from "../../../types/root";

export async function GET(): Promise<NextResponse> {
  try {
    // NOT: root_meanings'te aynı kök birden çok kaynaktan gelebildiği için (tekrarlı
    // satırlar), eski "JOIN words GROUP BY root" frekansı 2-3 katına şişiriyordu ve
    // sıralamayı bozuyordu. Frekansı çoğaltmadan etkilenmeyen subquery ile sayıyoruz;
    // anlamı da öncelikli kaynaktan (zengin seed) seçiyoruz.
    const rows = await dbAll<RootItem>(`
        SELECT r.root,
               COALESCE(
                 MAX(CASE WHEN r.source = 'root_explanations_seed' THEN r.meaning_tr END),
                 MAX(r.meaning_tr)
               ) AS meaning_tr,
               (SELECT COUNT(*) FROM words w WHERE w.root = r.root) AS frequency
        FROM root_meanings r
        GROUP BY r.root
        ORDER BY frequency DESC
        LIMIT 200
      `);

    return NextResponse.json({ roots: rows }, {
      headers: {
        // statik liste (en sık 200 kök) — agresif cache, CDN edge'den hızlı servis
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[roots] hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}