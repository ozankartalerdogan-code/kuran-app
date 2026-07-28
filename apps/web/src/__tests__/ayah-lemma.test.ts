/**
 * ayah-lemma.test.ts — /api/ayah artık kelime bazında `lemma` döndürüyor.
 *
 * v1.8 additive morfoloji merge'i 664 lemma + 333 root hücresi doldurdu; bu
 * hücrelerin mobil ve web tarafına ulaşabilmesi için endpoint response'una
 * lemma eklendi. Test, üç doldurma sınıfını (yalnız lemma, yalnız root, her
 * ikisi) gerçek local `data/app.db` üzerinden GET handler ile doğrular ve
 * mobil sözleşmenin (AyahDetailResponse) lemma alanını gerçekten taşıdığını
 * kanıtlar.
 *
 * Turso yerine daima local DB kullanılır (QURAN_APP_FORCE_LOCAL_DB=1) ve DB
 * yolu cwd'den bağımsız sabitlenir (DATA_PATH), böylece test deterministiktir.
 */
import path from "path";
import { NextRequest } from "next/server";

// route → dbUtils modül yüklenmeden ÖNCE ayarlanmalı (dinamik import ile garanti).
process.env.QURAN_APP_FORCE_LOCAL_DB = "1";
process.env.DATA_PATH = path.resolve(__dirname, "../../../../data");

type AyahWord = {
  wordIndex: number;
  arabic: string | null;
  meaningTr: string | null;
  pos: string | null;
  root: string | null;
  lemma: string | null;
  morphology: string | null;
};

let GET: (req: NextRequest) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("../app/api/ayah/route"));
});

async function fetchWord(surahId: number, ayahNumber: number, wordIndex: number): Promise<AyahWord> {
  const url = `http://localhost/api/ayah?surah_id=${surahId}&ayah_number=${ayahNumber}`;
  const res = await GET(new NextRequest(new URL(url)));
  expect(res.status).toBe(200);
  const body = (await res.json()) as { words: AyahWord[] };
  const word = body.words.find((w) => w.wordIndex === wordIndex);
  if (!word) throw new Error(`word_index ${wordIndex} bulunamadı (${surahId}:${ayahNumber})`);
  return word;
}

describe("/api/ayah lemma desteği", () => {
  it("lemma-only kayıt: root null, lemma dolu (2:8:10)", async () => {
    const w = await fetchWord(2, 8, 10);
    expect(w).toHaveProperty("lemma");
    expect(w.lemma).toBe("هُم");
    expect(w.root).toBeNull();
  });

  // Örnek token 2:34:8 (إبليس) idi; v1.8 merge'ün oraya eklediği "أبلس" kökü
  // sonradan apply-certain-rollback-v1_8.mjs ile UNRESOLVED verdict'i nedeniyle
  // kalıcı olarak NULL'landı. Sınıfın kendisi (v1.8 yalnız root ekledi, lemma
  // zaten vardı) 2:79:1 ile korunuyor — doğrulanmış ve rollback dışı bir token.
  it("root-only kayıt: hem root hem (önceden var olan) lemma dolu (2:79:1)", async () => {
    const w = await fetchWord(2, 79, 1);
    expect(w.root).toBe("ويل");
    expect(w.lemma).toBe("وَيْل");
  });

  it("both kayıt: root ve lemma birlikte dolu (2:181:14)", async () => {
    const w = await fetchWord(2, 181, 14);
    expect(w.root).toBe("علم");
    expect(w.lemma).toBe("عَلِيم");
  });

  it("mevcut alanlar korunuyor: her kelimede lemma anahtarı var", async () => {
    const url = "http://localhost/api/ayah?surah_id=2&ayah_number=8";
    const res = await GET(new NextRequest(new URL(url)));
    const body = (await res.json()) as { words: AyahWord[] };
    expect(body.words.length).toBeGreaterThan(0);
    for (const w of body.words) {
      expect(w).toHaveProperty("lemma");
      expect(w).toHaveProperty("root");
      expect(w).toHaveProperty("morphology");
    }
  });
});
