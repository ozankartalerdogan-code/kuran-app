/**
 * GET /api/share/[verse_key]
 *
 * Dinamik ayet paylaşım görseli üretir.
 *
 * NOT — Yerel geliştirme kısıtı:
 *   @vercel/og (next/og), proje klasörünün adında Türkçe karakter varsa
 *   (örn. "Masaüstü") Windows'ta yol-URL dönüşümünde hata verir.
 *   Bu endpoint üretim ortamında (Vercel / Linux) düzgün çalışır.
 *   Yerel test için /api/share/[verse_key]/preview rotasını kullanın.
 *
 * Kullanım:
 *   <meta property="og:image" content="/api/share/2%3A255" />
 *   Paylaş butonu: href="/api/share/{encodeURIComponent(verseKey)}"
 */

import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { createClient } from "@libsql/client/web";

// next/og (Satori/resvg) edge runtime gerektirir; nodejs'te FUNCTION_INVOCATION_FAILED
// (exit 128) veriyordu. dbUtils node:sqlite import ettiğinden edge'de kullanılamaz —
// bu yüzden Turso'ya edge-uyumlu @libsql/client/web ile DOĞRUDAN bağlanıyoruz.
export const runtime = "edge";
export const dynamic  = "force-dynamic";

const W = 1200;
const H = 630;

interface VerseRow {
  arabic:    string | null;
  reading:   string | null;
  meal:      string | null;
  surahName: string | null;
  verseNum:  number;
  surahId:   number;
}

async function fetchVerse(verseKey: string): Promise<VerseRow | null> {
  const url = process.env.TURSO_DB_URL;
  if (!url) { console.error("[share] TURSO_DB_URL yok"); return null; }
  try {
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    const res = await client.execute({
      sql: `
        SELECT v.arabic_text                            AS arabic,
               v.reading_tr                             AS reading,
               COALESCE(t.text, v.primary_translation)  AS meal,
               s.adi_turkce                             AS surahName,
               v.ayah_number                            AS verseNum,
               v.surah_id                               AS surahId
        FROM   verses v
        JOIN   sureler s ON s.id = v.surah_id
        LEFT   JOIN translations t
               ON t.verse_key = v.verse_key AND t.source = 'diyanet'
        WHERE  v.verse_key = ?
        LIMIT  1`,
      args: [verseKey],
    });
    const row = res.rows[0];
    if (!row) return null;
    return {
      arabic:    (row.arabic    as string | null) ?? null,
      reading:   (row.reading   as string | null) ?? null,
      meal:      (row.meal      as string | null) ?? null,
      surahName: (row.surahName as string | null) ?? null,
      verseNum:  Number(row.verseNum),
      surahId:   Number(row.surahId),
    };
  } catch (e) {
    console.error("[share] DB:", e);
    return null;
  }
}

function trunc(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ verse_key: string }> }
): Promise<ImageResponse | Response> {
  const { verse_key: encodedVerseKey } = await context.params;
  let verseKey: string;
  try {
    verseKey = decodeURIComponent(encodedVerseKey ?? "");
  } catch {
    return new Response("Geçersiz verse_key. Örn: 2:255", { status: 400 });
  }

  if (!/^\d{1,3}:\d{1,3}$/.test(verseKey)) {
    return new Response("Geçersiz verse_key. Örn: 2:255", { status: 400 });
  }

  const verse = await fetchVerse(verseKey);
  if (!verse) return new Response(`Ayet bulunamadı: ${verseKey}`, { status: 404 });

  const meal     = trunc(verse.meal,   200);
  const arabic   = trunc(verse.arabic, 120);
  const reading  = trunc(verse.reading, 160);
  const surahLbl = verse.surahName ?? `Sure ${verse.surahId}`;
  const label    = `${surahLbl} · ${verse.verseNum}. Ayet`;

  // Font: Satori en az bir font ister. Aynı origin'deki Amiri (Arapça + Latin kapsar)
  // güvenilir — harici gstatic fetch'i edge'de başarısız oluyordu ("No fonts loaded").
  type FontDef = { name: string; data: ArrayBuffer; style?: "normal" | "italic" };
  let fonts: FontDef[] = [];
  try {
    const fontRes = await fetch(new URL("/fonts/Amiri-Regular.ttf", req.url), {
      signal: AbortSignal.timeout(8000),
    });
    if (fontRes.ok) {
      fonts = [{ name: "Amiri", data: await fontRes.arrayBuffer(), style: "normal" }];
    }
  } catch {
    /* origin font alınamazsa aşağıdaki son çare denenir */
  }
  // Son çare (origin başarısızsa): Google'dan Inter — en azından Latin render olsun.
  if (fonts.length === 0) {
    try {
      const r = await fetch(
        "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff",
        { signal: AbortSignal.timeout(5000) },
      );
      if (r.ok) fonts = [{ name: "Amiri", data: await r.arrayBuffer(), style: "normal" }];
    } catch { /* ignore */ }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: W, height: H,
          display: "flex", flexDirection: "column",
          background: "linear-gradient(135deg,#131d2e 0%,#1e2c42 55%,#2a3c58 100%)",
          padding: "56px 64px",
          fontFamily: "Amiri",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Dekoratif daireler */}
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 420, height: 420, borderRadius: "50%",
          background: "rgba(208,171,76,0.09)",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 280, height: 280, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        }} />

        {/* Üst bar: logo + ayet konumu */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "rgba(194,147,58,0.28)",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 20,
            }}>✨</div>
            <span style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 22, fontWeight: 700, letterSpacing: 1,
            }}>Kuran Yolu</span>
          </div>
          <span style={{ color: "rgba(220,194,114,0.85)", fontSize: 17 }}>
            {label}
          </span>
        </div>

        {/* Arapça metin */}
        {arabic ? (
          <div style={{
            color: "rgba(251,247,236,0.95)", fontSize: 34,
            textAlign: "right", lineHeight: 1.85,
            marginBottom: 16, direction: "rtl",
          }}>
            {arabic}
          </div>
        ) : null}

        {/* Okunuş */}
        {reading ? (
          <div style={{
            color: "rgba(255,255,255,0.60)", fontSize: 18,
            fontStyle: "italic", textAlign: "center",
            lineHeight: 1.5, marginBottom: 20,
          }}>
            {reading}
          </div>
        ) : null}

        {/* Ayraç */}
        <div style={{
          width: 64, height: 2, borderRadius: 2,
          background: "rgba(208,171,76,0.65)", marginBottom: 24,
        }} />

        {/* Meal metni */}
        <div style={{
          color: "rgba(255,255,255,0.92)",
          fontSize: 28, lineHeight: 1.65, flex: 1,
        }}>
          {meal}
        </div>

        {/* Alt bilgi */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginTop: 32, paddingTop: 20,
          borderTop: "1px solid rgba(208,171,76,0.28)",
        }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>
            Kuran Yolu
          </span>
          <span style={{
            background: "rgba(194,147,58,0.22)",
            color: "#eadaa5",
            fontSize: 14, fontWeight: 600,
            padding: "5px 14px", borderRadius: 20,
          }}>
            {verseKey}
          </span>
        </div>
      </div>
    ),
    {
      width: W, height: H, fonts,
      // Ayet görseli pratikte değişmez — CDN 1 gün taze tutsun, 1 hafta bayat servis edebilsin.
      // (force-dynamic yalnızca render'ı dinamik yapar; yanıt header'ı CDN cache'ine izin verir.)
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    }
  );
}
