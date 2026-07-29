/**
 * regenerate-fark-analizi-v4.ts
 *
 * TAM SET yeniden üretim: 6236 ayetin fark_analizi'sini Elmalılı meali karşısında
 * sıfırdan üretir. Eski metinler Diyanet meali esas alınarak yazılmıştı; meal katmanı
 * Elmalılı'ya indirildikten sonra (bkz. migrate-elmalili-only.mjs) hem alıntılar hem
 * "aynı / farklı" kararları geçersiz kaldı.
 *
 * v2'den farkları:
 *  - Hedef kümesi TÜM ayetler; kalıp ("anlam farkı yoktur") metinli ayetler de dahil,
 *    çünkü o karar da Diyanet'e göre verilmişti.
 *  - Prompt'a ARKAİZM kuralı eklendi: Elmalılı'nın 1930'lar Türkçesi tek başına
 *    anlam farkı sayılmaz. Bu kural olmadan model üslup farkını anlam farkı sanıyor.
 *  - Model DeepSeek V4 (flash/pro), --model ile seçilir.
 *  - Maliyet raporu V4 tarifesiyle ve cache hit/miss ayrımıyla hesaplanır.
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/regenerate-fark-analizi-v4.ts [--dry] [--limit=N] [--only=VK]
 *     [--model=deepseek-v4-flash] [--conc=8] [--tag=pilot] [--keys=<dosya.json>]
 *
 * --keys ile kapıdan (gate-fark-analizi.ts) çıkan başarısız verse_key listesi verilir;
 * ikinci turu pahalı modelle yalnız o ayetlere uygulamak için.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");
const API_URL = "https://api.deepseek.com/chat/completions";

const FOOTER = "ℹ️ AI tarafından üretilmiştir. Kesin bilgi için güvenilir tefsirlere başvurunuz.";
const AYNI_TEXT = "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır.";

// V4 tarifesi ($/1M token)
const PRICING: Record<string, { hit: number; miss: number; out: number }> = {
  "deepseek-v4-flash": { hit: 0.0028, miss: 0.14, out: 0.28 },
  "deepseek-v4-pro": { hit: 0.003625, miss: 0.435, out: 0.87 },
};

const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const DRY = process.argv.includes("--dry");
const PRINT_PROMPT = process.argv.includes("--print-prompt");
const MODEL = arg("model") ?? "deepseek-v4-flash";
const LIMIT = arg("limit") ? Number(arg("limit")) : undefined;
const ONLY = arg("only");
const KEYS_PATH = arg("keys");
const TAG = arg("tag") ? `_${arg("tag")}` : "";
const CONCURRENCY = arg("conc") ? Number(arg("conc")) : 8;
const RETRIES = arg("retries") ? Number(arg("retries")) : 4;
const THINKING = process.argv.includes("--thinking");
const ROOT_MEANINGS = process.argv.includes("--root-meanings");
const EFFORT = arg("effort");
const SAMPLE = arg("sample") ? Number(arg("sample")) : undefined;

const PROGRESS_PATH = path.join(dir, `_fark_v4_progress${TAG}.json`);
const RESULTS_PATH = path.join(dir, `_fark_v4_results${TAG}.json`);
const PREIMAGE_PATH = path.join(dir, `_fark_v4_preimage${TAG}.json`);

interface VRow {
  verse_key: string;
  arabic_text: string | null;
  primary_translation: string | null;
  literal_ceviri: string | null;
  fark_analizi: string | null;
}
interface WRow { arabic: string | null; root: string | null; root_tr: string | null }

function getTargets(db: DatabaseSync): VRow[] {
  const sel =
    "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, fark_analizi FROM verses";
  if (ONLY) {
    const r = db.prepare(`${sel} WHERE verse_key=?`).get(ONLY) as unknown as VRow | undefined;
    if (!r) { console.error(`${ONLY} yok.`); process.exit(1); }
    return [r];
  }
  if (KEYS_PATH) {
    const keys = JSON.parse(fs.readFileSync(path.resolve(KEYS_PATH), "utf-8")) as
      | string[]
      | { verse_key: string }[];
    const set = new Set(keys.map((k) => (typeof k === "string" ? k : k.verse_key)));
    const rows = db.prepare(`${sel} ORDER BY surah_id, ayah_number`).all() as unknown as VRow[];
    return rows.filter((r) => set.has(r.verse_key));
  }
  return db.prepare(`${sel} ORDER BY surah_id, ayah_number`).all() as unknown as VRow[];
}

function buildPrompt(v: VRow, words: WRow[]): string {
  // --root-meanings: köke Türkçe anlamını da iliştirir. root_meanings tablosu
  // 1703 küratörlü satır ve kök taşıyan kelimelerin %99.7'sini kapsıyor.
  // words.meaning_tr (kelime bazlı gloss) BİLEREK dışarıda: bilinen hataların
  // %97.3'ü kökü olmayan kelimelerde ve o katman küratörlenmemiş.
  const kokListe = words
    .filter((w) => w.root && w.arabic)
    .map((w) =>
      ROOT_MEANINGS && w.root_tr ? `${w.arabic} → ${w.root} (${w.root_tr})` : `${w.arabic} → ${w.root}`
    )
    .join(" | ");

  return `Sen uzman bir Kuran dilbilimcisisin. Bir ayetin MEAL'i ile LİTERAL çevirisi arasında ANLAM farkı olup olmadığını titizlikle incele.

ÇOK ÖNEMLİ KURALLAR:
1. Yalnızca aşağıda VERİLEN Arapça metne dayan. Ayette/girdide GEÇMEYEN hiçbir Arapça kelime zikretme, uydurma.
2. KÖKLER listesi sadece ipucudur ve HATALI olabilir; asıl Arapça metni esas al, emin olmadığın kök/etimoloji iddiasında BULUNMA.
3. SURE ADI veya NUMARASI yazma (örn. "Tevbe Suresi", "9:5" gibi atıflar YASAK). Başka ayetlere atıf gerekiyorsa sadece "önceki ayetler" / "sonraki ayetler" de.
4. MEAL, Elmalılı Hamdi Yazır'ın 1930'lar Türkçesiyle yazılmıştır. Eskimiş kelime, ek ve tamlamalar (örn. "hidayet eyle", "felaha ermek", "dürüst kılmak", "zikrolunmak") TEK BAŞINA anlam farkı DEĞİLDİR. Bunları önce zihninde çağdaş Türkçeye çevir, sonra karşılaştır. Fark ancak kelimenin İŞARET ETTİĞİ ANLAM değiştiğinde vardır; eski/yeni kelime tercihi fark değildir.
5. Anlam farkı yoksa ya da sadece üslup/akıcılık/arkaik dil farkı varsa: {"ayni": true, "analiz": ""}
6. Gerçek bir anlam/yorum farkı varsa: {"ayni": false, "analiz": "..."} — farkı ve çevirmenin neden öyle yorumladığını 2-4 cümleyle, Türkçe, kesin yargısız açıkla. Mealden alıntı yaparken MEAL satırındaki kelimeleri birebir kullan, başka bir mealin ifadesini yazma.
7. SADECE geçerli JSON döndür. Markdown, açıklama, footer YOK.

ARAPÇA: ${v.arabic_text ?? ""}
MEAL: ${v.primary_translation ?? ""}
LİTERAL: ${v.literal_ceviri ?? ""}
KÖKLER (Arapça, ipucu — hatalı olabilir): ${kokListe || "(yok)"}`;
}

interface AskOut { ayni: boolean; analiz: string; hitTok: number; missTok: number; outTok: number; reasonTok: number }

function extractJson(txt: string): { ayni?: boolean; analiz?: string } | null {
  const s = txt.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b < a) return null;
  try { return JSON.parse(s.slice(a, b + 1)) as { ayni?: boolean; analiz?: string }; } catch { return null; }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 429 ve 5xx geçicidir; üstel bekleyerek tekrar denenir. 6236 ayetlik bir koşuda
 * tek bir hız sınırı dalgası, tekrar denenmezse yüzlerce ayeti "başarısız"a düşürür.
 * 4xx (400 hatalı model adı, 401 anahtar) kalıcıdır; beklemeden hata verilir.
 */
async function askOnce(apiKey: string, prompt: string): Promise<AskOut | null> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      // thinking açıkken akıl yürütme de bu bütçeden yiyor; dar bırakılırsa
      // cevap JSON'u yarıda kesilir ve parse hatası olarak görünür.
      max_tokens: THINKING ? 16000 : 4000,
      // V4 Flash ve Pro'da thinking VARSAYILAN OLARAK AÇIK. Bu görev için akıl
      // yürütme gereksiz (karşılaştırılacak iki cümle de prompt'ta veriliyor) ve
      // çıktı token'ı üzerinden faturalanıyor; açık bırakmak maliyeti katlar.
      // Zor kümede ikinci tur için --thinking ile açılır.
      thinking: { type: THINKING ? "enabled" : "disabled" },
      ...(THINKING && EFFORT ? { reasoning_effort: EFFORT } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = new Error(`${res.status} ${(await res.text()).slice(0, 120)}`) as Error & {
      status: number; retryAfter?: number;
    };
    err.status = res.status;
    const ra = Number(res.headers.get("retry-after"));
    if (Number.isFinite(ra) && ra > 0) err.retryAfter = ra * 1000;
    throw err;
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      prompt_cache_hit_tokens?: number;
      prompt_cache_miss_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  };
  const p = extractJson(json.choices?.[0]?.message?.content?.trim() ?? "");
  if (!p) return null;
  const u = json.usage ?? {};
  const hit = u.prompt_cache_hit_tokens ?? 0;
  return {
    ayni: !!p.ayni,
    analiz: (p.analiz ?? "").trim(),
    hitTok: hit,
    missTok: u.prompt_cache_miss_tokens ?? Math.max(0, (u.prompt_tokens ?? 0) - hit),
    outTok: u.completion_tokens ?? 0,
    reasonTok: u.completion_tokens_details?.reasoning_tokens ?? 0,
  };
}

async function ask(apiKey: string, prompt: string): Promise<AskOut | null> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const out = await askOnce(apiKey, prompt);
      if (out) return out;
      lastErr = new Error("parse");           // bozuk JSON: bir kez daha denemeye değer
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status && status !== 429 && status < 500) throw e;  // kalıcı hata
      lastErr = e;
      const wait = (e as { retryAfter?: number }).retryAfter ?? 1000 * 2 ** attempt;
      if (attempt < RETRIES - 1) await sleep(wait);
    }
  }
  if (lastErr instanceof Error && lastErr.message !== "parse") throw lastErr;
  return null;
}

const finalText = (o: AskOut): string =>
  o.ayni || !o.analiz ? AYNI_TEXT : `${o.analiz}\n\n${FOOTER}`;

async function main(): Promise<void> {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout=15000;");
  const wsel = db.prepare(`
    SELECT w.arabic, w.root, COALESCE(rm.short_tr, rm.meaning_tr) AS root_tr
    FROM   words w
    LEFT   JOIN root_meanings rm ON rm.root = w.root
    WHERE  w.verse_key = ?
    GROUP  BY w.word_index, w.segment_index
    ORDER  BY w.word_index, w.segment_index
  `);
  const upd = db.prepare("UPDATE verses SET fark_analizi=? WHERE verse_key=?");

  let targets = getTargets(db);
  // --sample: korpusa eşit aralıklı yayılmış örneklem. --limit ilk N ayeti alır ve
  // pilot için yanıltıcıdır: ilk 50 ayet Fatiha + Bakara başı, kısa ve tanıdık metinler.
  if (SAMPLE && SAMPLE < targets.length) {
    const step = targets.length / SAMPLE;
    targets = Array.from({ length: SAMPLE }, (_, i) => targets[Math.floor(i * step)]);
  }
  if (LIMIT) targets = targets.slice(0, LIMIT);

  // Sıfır maliyetli inceleme: prompt'u yazdırıp çıkar, API'ye dokunmaz.
  if (PRINT_PROMPT) {
    for (const v of targets.slice(0, LIMIT ?? 1)) {
      console.log(`──── ${v.verse_key} ────`);
      console.log(buildPrompt(v, wsel.all(v.verse_key) as unknown as WRow[]));
      console.log();
    }
    db.close();
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) { console.error("DEEPSEEK_API_KEY yok."); process.exit(1); }
  if (!PRICING[MODEL]) console.warn(`! ${MODEL} tarifede yok; maliyet raporu atlanacak.`);

  // Pre-image: ilk çalıştırmada tüm hedeflerin eski metni saklanır (geri dönüş için).
  if (!DRY && !fs.existsSync(PREIMAGE_PATH)) {
    fs.writeFileSync(
      PREIMAGE_PATH,
      JSON.stringify(targets.map((t) => ({ verse_key: t.verse_key, old: t.fark_analizi })), null, 2),
      "utf-8"
    );
    console.log(`Pre-image yazıldı: ${path.basename(PREIMAGE_PATH)} (${targets.length} kayıt)`);
  }

  // Resume
  let start = 0;
  const results: { verse_key: string; ayni: boolean; analiz: string }[] = [];
  if (!DRY && fs.existsSync(PROGRESS_PATH)) {
    try {
      start = (JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf-8")) as { done: number }).done ?? 0;
      if (fs.existsSync(RESULTS_PATH)) results.push(...JSON.parse(fs.readFileSync(RESULTS_PATH, "utf-8")));
      console.log(`↻ Devam: ${start}. ayetten (${results.length} kayıt)`);
    } catch { /* bozuk progress dosyası yok sayılır */ }
  }

  console.log(
    `Hedef: ${targets.length} ayet | model=${MODEL} | thinking=${THINKING ? "AÇIK" : "kapalı"}` +
    ` | conc=${CONCURRENCY} | retry=${RETRIES}` +
    `${SAMPLE ? ` | örneklem=${SAMPLE} (yayılmış)` : ""}${DRY ? " (DRY — DB'ye yazılmaz)" : ""}`
  );

  let ok = 0, fail = 0, ayni = 0, hitTok = 0, missTok = 0, outTok = 0, reasonTok = 0;
  const failedKeys: string[] = [];

  for (let i = start; i < targets.length; i += CONCURRENCY) {
    const group = targets.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      group.map(async (v) => {
        try {
          return { v, r: await ask(apiKey, buildPrompt(v, wsel.all(v.verse_key) as unknown as WRow[])) };
        } catch (e) {
          return { v, err: (e as Error).message };
        }
      })
    );

    for (let gi = 0; gi < settled.length; gi++) {
      const s = settled[gi];
      process.stdout.write(`[${i + gi + 1}/${targets.length}] ${s.v.verse_key} `);
      if ("err" in s || !s.r) {
        console.log(`✗ ${("err" in s ? s.err : "parse")?.slice(0, 60)}`);
        fail++; failedKeys.push(s.v.verse_key); continue;
      }
      hitTok += s.r.hitTok; missTok += s.r.missTok; outTok += s.r.outTok; reasonTok += s.r.reasonTok;
      if (s.r.ayni) ayni++;
      results.push({ verse_key: s.v.verse_key, ayni: s.r.ayni, analiz: s.r.analiz });
      if (!DRY) upd.run(finalText(s.r), s.v.verse_key);
      console.log(s.r.ayni ? `[AYNI] [${s.r.outTok}t]` : `✓ ${s.r.analiz.slice(0, 45)} [${s.r.outTok}t]`);
      ok++;
    }

    // Sonuç dosyası DRY modda da yazılır: pilotun çıktısı DB'ye dokunmadan
    // gate-fark-analizi.mjs --results= ile denetlenebilsin diye.
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2), "utf-8");
    if (!DRY) {
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ done: Math.min(i + CONCURRENCY, targets.length) }), "utf-8");
    }
  }

  console.log(`\nBitti. ok=${ok} fail=${fail} (ayni→${ayni}, farklı→${ok - ayni})`);
  console.log(
    `Token: hit=${hitTok} miss=${missTok} out=${outTok}` +
    ` (akıl yürütme=${reasonTok}${reasonTok && !THINKING ? " ← thinking kapalıyken sıfır olmalıydı!" : ""})`
  );
  console.log(`Önbellek isabet oranı: %${(100 * hitTok / Math.max(1, hitTok + missTok)).toFixed(1)}`);
  const p = PRICING[MODEL];
  if (p) {
    const cost = (hitTok / 1e6) * p.hit + (missTok / 1e6) * p.miss + (outTok / 1e6) * p.out;
    const perVerse = ok ? cost / ok : 0;
    console.log(`Maliyet: $${cost.toFixed(4)} | ayet başı $${perVerse.toFixed(6)} | 6236 ayet ≈ $${(perVerse * 6236).toFixed(3)}`);
  }
  if (failedKeys.length) {
    const fp = path.join(dir, `_fark_v4_failed${TAG}.json`);
    fs.writeFileSync(fp, JSON.stringify(failedKeys, null, 2), "utf-8");
    console.log(`Başarısız ayetler: ${path.basename(fp)} (--keys= ile tekrar denenebilir)`);
  }
  db.close();
}

main();
