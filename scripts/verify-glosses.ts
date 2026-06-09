/**
 * verify-glosses.ts  —  İKİ AŞAMALI çift-bazlı gloss doğrulama
 *
 * Veri: secili kaynak (canonical_word_analysis veya meaning_override) + EN gloss.
 *   Benzersiz (TR, EN) çiftleri (temsilî Arapça+kök ile) çıkarılır.
 *   Aynı çift her yerde aynı yargı → düzeltme tüm eşleşen kelimelere uygulanır.
 *
 * AŞAMA 1 (--stage=flag, chat): AR+EN+TR üçlemesine bakıp ŞÜPHELİ çiftleri işaretler
 *   (yüksek recall — fazla işaretlemesi sorun değil). Çıktı: _gloss_suspects.json
 * AŞAMA 2 (--stage=fix, reasoner): şüphelileri AR+EN+TR ile yeniden yargılar,
 *   gerçek hataları düzeltir (yüksek precision). DB'ye uygular + yedek alır.
 *
 * Kullanım:
 *   ... verify-glosses.ts --stage=flag [--dry] [--batch=60] [--limit=N]
 *   ... verify-glosses.ts --stage=fix  [--dry] [--batch=25] [--limit=N]
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");
const API_URL = "https://api.deepseek.com/chat/completions";
const suspectsArg = process.argv.find((a) => a.startsWith("--suspects="));
const SUSPECTS_PATH = suspectsArg ? path.resolve(suspectsArg.split("=")[1]) : path.join(dir, "_gloss_suspects.json");
const tagArg = process.argv.find((a) => a.startsWith("--tag="));
const TAG = tagArg ? `_${tagArg.split("=")[1]}` : "";
// Faz B: EN gloss'u OLMAYAN kelimeler (Arapça bilgisiyle değerlendirilir)
const PHASE_B = (process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1]) === "b";
// Hangi kaynak taranacak (varsayılan: otomatik analiz)
const srcArg = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1];
const SOURCE = srcArg === "meaning_override" ? "meaning_override" : "canonical_word_analysis";

const STAGE = (process.argv.find((a) => a.startsWith("--stage="))?.split("=")[1]) ?? "flag";
const DRY = process.argv.includes("--dry");
const batchArg = process.argv.find((a) => a.startsWith("--batch="));
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const DELAY_MS = 120;

const MODEL = STAGE === "fix" ? "deepseek-reasoner" : "deepseek-chat";
const concArg = process.argv.find((a) => a.startsWith("--conc="));
const CONCURRENCY = concArg ? Number(concArg.split("=")[1]) : 6;
const BATCH = batchArg ? Number(batchArg.split("=")[1]) : (STAGE === "fix" ? 15 : 60);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Pair { ar: string; root: string; tr: string; en: string; count: number }

function getPairs(db: DatabaseSync): Pair[] {
  if (PHASE_B) {
    // EN'siz: (arabic, meaning_tr) çiftleri — apply ar+tr ile yapılır (tr tek başına ambigü)
    return db.prepare(`
      SELECT arabic AS ar, meaning_tr AS tr, '' AS en,
             MAX(COALESCE(root,'')) AS root, COUNT(*) AS count
      FROM words
      WHERE source='${SOURCE}' AND meaning_tr IS NOT NULL AND trim(meaning_tr)!=''
        AND (gloss_en IS NULL OR trim(gloss_en)='')
      GROUP BY arabic, meaning_tr ORDER BY count DESC
    `).all() as unknown as Pair[];
  }
  // Faz A: Her (TR,EN) çifti için temsilî bir Arapça+kök (en sık geçen kelime)
  return db.prepare(`
    SELECT meaning_tr AS tr, gloss_en AS en,
           (SELECT arabic FROM words w2 WHERE w2.meaning_tr=w.meaning_tr AND w2.gloss_en=w.gloss_en AND w2.source='${SOURCE}' LIMIT 1) AS ar,
           (SELECT root   FROM words w3 WHERE w3.meaning_tr=w.meaning_tr AND w3.gloss_en=w.gloss_en AND w3.source='${SOURCE}' AND w3.root IS NOT NULL LIMIT 1) AS root,
           COUNT(*) AS count
    FROM words w
    WHERE source='${SOURCE}' AND meaning_tr IS NOT NULL AND trim(meaning_tr)!='' AND gloss_en IS NOT NULL AND trim(gloss_en)!=''
    GROUP BY meaning_tr, gloss_en ORDER BY count DESC
  `).all() as unknown as Pair[];
}

function extractJsonArray(txt: string): unknown[] | null {
  const s = txt.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a === -1 || b === -1 || b < a) return null;
  try { const arr = JSON.parse(s.slice(a, b + 1)); return Array.isArray(arr) ? arr : null; } catch { return null; }
}

async function call(apiKey: string, prompt: string, maxTok: number): Promise<{ raw: string; inTok: number; outTok: number }> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTok, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(180000), // 3 dk takılırsa iptal et (asılmayı önler)
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 100)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return { raw: json.choices?.[0]?.message?.content?.trim() ?? "", inTok: json.usage?.prompt_tokens ?? 0, outTok: json.usage?.completion_tokens ?? 0 };
}

// ── AŞAMA 1: FLAG (chat) ──────────────────────────────────────────────────────
function flagPrompt(batch: Pair[]): string {
  if (PHASE_B) {
    const list = batch.map((p, i) => `${i + 1}. AR:"${p.ar}" kök:${p.root || "-"} | TR:"${p.tr}"`).join("\n");
    return `Aşağıda Kuran kelimeleri: Arapça (AR), kök ve mevcut Türkçe anlam (TR). İngilizce referans yok; KENDİ Arapça bilginle değerlendir.
TR gloss, bu Arapça kelimenin anlamıyla TEMELDE uyuşuyor mu?

ŞÜPHELİ işaretle (numarasını ver) yalnızca: TR, kelimenin Arapça anlamından FARKLI/ALAKASIZ olabilirse
(örn. مَن "kim" iken TR "-den"; أَن "ki/-mek" iken TR "şüphesiz").
Çekim/edat nüansı/eş anlam/küçük üslup farkı ŞÜPHE DEĞİLDİR — işaretleme.
Kararsızsan işaretle (ikinci kontrol var).

ÇIKTI: yalnızca şüpheli numaraların JSON dizisi. Örn: [3,17]. Hiç yoksa: []

KELİMELER:
${list}`;
  }
  const list = batch.map((p, i) => `${i + 1}. AR:"${p.ar}" kök:${p.root ?? "-"} | TR:"${p.tr}" | EN:"${p.en}"`).join("\n");
  return `Aşağıda Kuran kelimeleri: Arapça (AR), kök, Türkçe anlam (TR), güvenilir İngilizce anlam (EN).
TR glossun, kelimenin Arapça'daki ve EN'deki anlamıyla TEMELDE UYUŞUP UYUŞMADIĞINI kontrol et.

ŞÜPHELİ işaretle (numarasını ver) yalnızca: TR, AR/EN'den FARKLI/ALAKASIZ bir kelime anlamı taşıyor olabilirse.
Çekim/zaman/şahıs/sayı/iyelik/hal/artikel/büyük-küçük harf farkları ŞÜPHE DEĞİLDİR — bunları işaretleme.
Kararsız kalırsan işaretle (sonra ikinci kontrol var).

ÇIKTI: yalnızca şüpheli numaraların JSON dizisi, başka metin yok. Örn: [3,17]. Hiç yoksa: []

KELİMELER:
${list}`;
}

// ── AŞAMA 2: FIX (reasoner) ───────────────────────────────────────────────────
function fixPrompt(batch: Pair[]): string {
  if (PHASE_B) {
    const list = batch.map((p, i) => `${i + 1}. AR:"${p.ar}" kök:${p.root || "-"} | TR:"${p.tr}"`).join("\n");
    return `Sen uzman bir Kuran Arapçası dilbilimcisisin. Aşağıda ÖN-ELEME ile şüpheli işaretlenmiş kelimeler var (İngilizce referans YOK; kendi Arapça bilginle). ÇOĞU ASLINDA DOĞRUDUR.

DÜZELT (sadece bunlar): TR, kelimenin Arapça anlamından KAVRAM olarak tamamen farklı/alakasız ise.
  Örnek: AR:"مَن" TR:"-den" → "kim" ; AR:"أَن" TR:"şüphesiz" → "ki" ; AR:"بَل" TR:"ve" → "bilakis"
KESİNLİKLE DOKUNMA: çekim/edat nüansı/eş anlam/üslup; doğru olan edatlar (في="içinde", من="-den", على="üzerine" DOĞRUDUR). Emin değilsen DOKUNMA.
Düzeltme KISA (1-3 kelime), Türkçe.

ÇIKTI: yalnızca KAVRAM olarak yanlış olanlar için JSON dizi. Her madde mevcut TR'yi ("eski") aynen + doğrusunu ("dogru"):
[{"id": numara, "eski": "mevcut TR aynen", "dogru": "doğru TR anlam"}]
Hiç yoksa: []

KELİMELER:
${list}`;
  }
  const list = batch.map((p, i) => `${i + 1}. AR:"${p.ar}" kök:${p.root ?? "-"} | TR:"${p.tr}" | EN:"${p.en}"`).join("\n");
  return `Sen uzman bir Kuran Arapçası dilbilimcisisin. Aşağıda ÖN-ELEME ile şüpheli işaretlenmiş kelimeler var; ÇOĞU ASLINDA DOĞRUDUR. Görevin yalnızca TR anlamı KAVRAM olarak YANLIŞ olanları ayıklamak.

DÜZELT (sadece bunlar): TR, kelimenin ifade ettiği KAVRAMDAN tamamen farklı/alakasız bir şey gösteriyorsa.
  Örnek: TR:"sana" EN:"to them" → "onlara" (zamir yanlış)
         TR:"kavim" EN:"straight" → "dosdoğru" (yanlış kavram)
         TR:"Allah" EN:"a god" → "ilah" (teolojik ayrım)
         TR:"nimet" EN:"the cattle" → "hayvanlar"
         TR:"dikkat!" EN:"except" → "hariç"

KESİNLİKLE DOKUNMA (bunlar HATA DEĞİL):
  - Çekim/zaman/şahıs/sayı: TR:"der" EN:"they say"; TR:"yalanlar" EN:"they denied" → DOKUNMA
  - Kelime türü (isim/fiil/sıfat) farkı ama AYNI kök/kavram: TR:"der" EN:"they say" (söylemek); TR:"kul" EN:"you worship" (عبد) → DOKUNMA
  - İyelik/hal/edat/artikel: TR:"yol" EN:"to the path"; bağlaç "ve" eklemek → DOKUNMA
  - Eş anlamlı / ufak üslup farkı → DOKUNMA
  - EMİN DEĞİLSEN → DOKUNMA

Yani: TR ile EN AYNI KAVRAMI gösteriyorsa (çekim/tür ne olursa olsun) DOĞRU'dur. Sadece kavram yanlışsa düzelt.
Düzeltme KISA (1-3 kelime), Türkçe.

ÇIKTI: yalnızca KAVRAM olarak yanlış olanlar için JSON dizi, başka metin yok. Her madde:
[{"id": numara, "eski": "mevcut TR aynen", "dogru": "doğru TR anlam"}]
Hiç yoksa: []

KELİMELER:
${list}`;
}

async function runFlag(db: DatabaseSync, apiKey: string): Promise<void> {
  const pairs = getPairs(db);
  let batches: Pair[][] = [];
  for (let i = 0; i < pairs.length; i += BATCH) batches.push(pairs.slice(i, i + BATCH));
  console.log(`[FLAG] benzersiz çift: ${pairs.length} | batch: ${batches.length} (${BATCH}/batch)`);
  if (LIMIT) batches = batches.slice(0, LIMIT);

  const suspects: Pair[] = [];
  let ok = 0, fail = 0, totIn = 0, totOut = 0;
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    process.stdout.write(`[${bi + 1}/${batches.length}]  `);
    try {
      const { raw, inTok, outTok } = await call(apiKey, flagPrompt(batch), 1500);
      totIn += inTok; totOut += outTok;
      const ids = extractJsonArray(raw) as number[] | null;
      if (ids === null) { console.log("✗ parse"); fail++; await sleep(DELAY_MS); continue; }
      for (const id of ids) { const p = batch[id - 1]; if (p) suspects.push(p); }
      console.log(ids.length ? `⚑ ${ids.length}` : "✓");
      ok++;
    } catch (e) { console.log(`✗ ${(e as Error).message.slice(0, 60)}`); fail++; }
    await sleep(DELAY_MS);
  }
  if (!DRY) fs.writeFileSync(SUSPECTS_PATH, JSON.stringify(suspects, null, 2), "utf-8");
  const cost = (totIn / 1e6) * 0.14 + (totOut / 1e6) * 0.28;
  console.log(`\n[FLAG] bitti. ok=${ok} fail=${fail} | şüpheli çift=${suspects.length}${DRY ? " (DRY—kaydedilmedi)" : ` → _gloss_suspects.json`}`);
  console.log(`Token in=${totIn} out=${totOut} ≈ $${cost.toFixed(3)}`);
}

async function runFix(db: DatabaseSync, apiKey: string): Promise<void> {
  if (!fs.existsSync(SUSPECTS_PATH)) { console.error("_gloss_suspects.json yok — önce --stage=flag çalıştır."); process.exit(1); }
  const all = JSON.parse(fs.readFileSync(SUSPECTS_PATH, "utf-8")) as Pair[];
  let batches: Pair[][] = [];
  for (let i = 0; i < all.length; i += BATCH) batches.push(all.slice(i, i + BATCH));
  console.log(`[FIX] şüpheli çift: ${all.length} | batch: ${batches.length} (${BATCH}/batch) | model=${MODEL}`);
  if (LIMIT) batches = batches.slice(0, LIMIT);

  // Faz A: (tr,en) ile eşle; Faz B: (ar,tr) ile eşle (tr tek başına ambigü, en yok)
  const updA = db.prepare(`UPDATE words SET meaning_tr=? WHERE source='${SOURCE}' AND meaning_tr=? AND gloss_en=?`);
  const updB = db.prepare(`UPDATE words SET meaning_tr=? WHERE source='${SOURCE}' AND arabic=? AND meaning_tr=? AND (gloss_en IS NULL OR trim(gloss_en)='')`);
  const applyCorr = (p: Pair, dogru: string) => PHASE_B ? updB.run(dogru, p.ar, p.tr) : updA.run(dogru, p.tr, p.en);

  // Kademeli yedek + resume: kalınan batch'i ve birikmiş düzeltmeleri kalıcı tut
  const progressPath = path.join(dir, `_gloss_fix_progress${TAG}.json`);
  const backupPath = path.join(dir, `_gloss_fix_corrections${TAG}.json`);
  let startBatch = 0;
  const corrections: { ar: string; tr: string; en: string; dogru: string; count: number }[] = [];
  if (!DRY && fs.existsSync(progressPath)) {
    try {
      const prog = JSON.parse(fs.readFileSync(progressPath, "utf-8")) as { done: number };
      startBatch = prog.done ?? 0;
      if (fs.existsSync(backupPath)) corrections.push(...JSON.parse(fs.readFileSync(backupPath, "utf-8")));
      console.log(`↻ Devam: ${startBatch}. batch'ten (önceki ${corrections.length} düzeltme korunuyor)`);
    } catch { /* baştan */ }
  }

  // Tek batch işle → ham JSON döndür (uygulama ana thread'de sıralı yapılır)
  async function processBatch(batch: Pair[]): Promise<{ corr: { id: number; eski?: string; dogru: string }[] | null; inTok: number; outTok: number; err?: string }> {
    try {
      const { raw, inTok, outTok } = await call(apiKey, fixPrompt(batch), 8000);
      return { corr: extractJsonArray(raw) as { id: number; eski?: string; dogru: string }[] | null, inTok, outTok };
    } catch (e) { return { corr: null, inTok: 0, outTok: 0, err: (e as Error).message }; }
  }

  let ok = 0, fail = 0, totIn = 0, totOut = 0;
  // CONCURRENCY batch'i aynı anda (I/O-bound reasoner çağrıları paralel → ~Nx hız)
  for (let bi = startBatch; bi < batches.length; bi += CONCURRENCY) {
    const group = batches.slice(bi, bi + CONCURRENCY);
    const results = await Promise.all(group.map(processBatch));
    for (let gi = 0; gi < group.length; gi++) {
      const batch = group[gi]; const r = results[gi];
      const idx = bi + gi + 1;
      process.stdout.write(`[${idx}/${batches.length}]  `);
      if (r.err) { console.log(`✗ ${r.err.slice(0, 50)}`); fail++; continue; }
      if (r.corr === null) { console.log("✗ parse"); fail++; continue; }
      let applied = 0, mismatch = 0;
      for (const c of r.corr) {
        if (!c.dogru) continue;
        let p = batch[c.id - 1];
        const eski = (c.eski ?? "").trim();
        // Echo doğrulama: id tutmazsa eski TR ile bul (Faz B'de ar zaten id'ye bağlı)
        if (!p || (eski && p.tr.trim() !== eski)) {
          const found = batch.find((x) => x.tr.trim() === eski);
          if (!found) { mismatch++; continue; }
          p = found;
        }
        if (c.dogru.trim() === p.tr.trim()) continue;
        corrections.push({ ar: p.ar, tr: p.tr, en: p.en, dogru: c.dogru.trim(), count: p.count });
        if (!DRY) applyCorr(p, c.dogru.trim());
        applied += p.count;
      }
      totIn += r.inTok; totOut += r.outTok;
      if (mismatch) process.stdout.write(`(⚠${mismatch}) `);
      console.log(r.corr.length ? `✓ ${r.corr.length} çift / ${applied} kelime` : "✓");
      ok++;
    }
    // Grup sonunda checkpoint (sıralı ilerleme)
    if (!DRY) {
      fs.writeFileSync(backupPath, JSON.stringify(corrections, null, 2), "utf-8");
      fs.writeFileSync(progressPath, JSON.stringify({ done: Math.min(bi + CONCURRENCY, batches.length) }), "utf-8");
    }
  }
  if (corrections.length && !DRY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(path.join(dir, `_gloss_backup_${stamp}.json`), JSON.stringify(corrections, null, 2), "utf-8");
    console.log(`\nYedek: _gloss_backup_${stamp}.json`);
  }
  if (DRY && corrections.length) {
    console.log("\n--- örnek düzeltmeler ---");
    corrections.slice(0, 50).forEach((c) => console.log(`  AR:${c.ar} "${c.tr}" (EN:${c.en}) → "${c.dogru}" [${c.count}]`));
  }
  const totalWords = corrections.reduce((s, c) => s + c.count, 0);
  const cost = (totIn / 1e6) * 0.14 + (totOut / 1e6) * 0.28;
  console.log(`\n[FIX] bitti. ok=${ok} fail=${fail} | düzeltilen çift=${corrections.length} | etkilenen kelime=${totalWords}`);
  console.log(`Token in=${totIn} out=${totOut} ≈ $${cost.toFixed(3)}`);
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) { console.error("DEEPSEEK_API_KEY yok."); process.exit(1); }
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout=15000;");
  if (STAGE === "fix") await runFix(db, apiKey);
  else await runFlag(db, apiKey);
}

main();
