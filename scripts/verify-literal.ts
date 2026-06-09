/**
 * verify-literal.ts  —  İKİ AŞAMALI literal çeviri doğrulama (ayet bazlı)
 *
 * AŞAMA 1 (--stage=flag, chat): her ayetin literal_ceviri'sini Arapça + meal'e karşı
 *   kontrol eder; HATALI/eksik/bozuk/fazladan-içerikli olanları işaretler (yüksek recall).
 *   Çıktı: _literal_suspects.json (verse_key listesi)
 * AŞAMA 2 (--stage=fix, reasoner): işaretli ayetlerin literal'ini YENİDEN üretir
 *   (Arapça'ya sadık, gramerli, yorumsuz). verse_key ile eşleştirilir (echo-güvenli).
 *
 * Kullanım:
 *   ... verify-literal.ts --stage=flag [--dry] [--batch=12] [--limit=N]
 *   ... verify-literal.ts --stage=fix  [--dry] [--batch=8] [--conc=6] [--limit=N]
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");
const API_URL = "https://api.deepseek.com/chat/completions";
const suspArg = process.argv.find((a) => a.startsWith("--suspects="));
const SUSPECTS_PATH = suspArg ? path.resolve(suspArg.split("=")[1]) : path.join(dir, "_literal_suspects.json");
const tagArg = process.argv.find((a) => a.startsWith("--tag="));
const TAG = tagArg ? `_${tagArg.split("=")[1]}` : "";
const FOOTER = ""; // literal'de footer yok

const STAGE = (process.argv.find((a) => a.startsWith("--stage="))?.split("=")[1]) ?? "flag";
const DRY = process.argv.includes("--dry");
const LIMIT = (() => { const a = process.argv.find((x) => x.startsWith("--limit=")); return a ? Number(a.split("=")[1]) : undefined; })();
const MODEL = STAGE === "fix" ? "deepseek-reasoner" : "deepseek-chat";
const CONCURRENCY = (() => { const a = process.argv.find((x) => x.startsWith("--conc=")); return a ? Number(a.split("=")[1]) : 6; })();
const BATCH = (() => { const a = process.argv.find((x) => x.startsWith("--batch=")); return a ? Number(a.split("=")[1]) : (STAGE === "fix" ? 5 : 12); })();

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface V { verse_key: string; arabic: string; meal: string; lit: string }

function getVerses(db: DatabaseSync): V[] {
  return db.prepare(
    "SELECT verse_key, arabic_text AS arabic, primary_translation AS meal, literal_ceviri AS lit FROM verses WHERE literal_ceviri IS NOT NULL AND trim(literal_ceviri)!='' AND arabic_text IS NOT NULL ORDER BY surah_id, ayah_number"
  ).all() as unknown as V[];
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
    body: JSON.stringify({ model: MODEL, max_tokens: maxTok, temperature: 0.3, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 100)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return { raw: json.choices?.[0]?.message?.content?.trim() ?? "", inTok: json.usage?.prompt_tokens ?? 0, outTok: json.usage?.completion_tokens ?? 0 };
}

function flagPrompt(batch: V[]): string {
  const list = batch.map((v, i) => `${i + 1}. [${v.verse_key}]\n   AR: ${v.arabic}\n   MEAL: ${v.meal}\n   LİTERAL: ${v.lit}`).join("\n");
  return `Aşağıda Kuran ayetleri; her biri için Arapça (AR), akıcı meal ve mevcut LİTERAL (lafzî) çeviri var.
LİTERAL çeviri = Arapça kelime sırasına sadık, gramerli, anlamlı Türkçe cümle olmalı.

ŞÜPHELİ işaretle (numarasını ver) yalnızca LİTERAL'de ŞU sorunlardan biri varsa:
- Anlam HATASI (Arapça/meal ile çelişen yanlış anlam)
- EKSİK (ayetin bir kısmı çevrilmemiş)
- FAZLADAN içerik (ayette olmayan, başka ayetten taşınmış cümle)
- BOZUK (kelime kelime kopuk, transliterasyon, anlamsız, meta-metin)
DOĞRU/akıcı literal'leri (ufak üslup farkı) İŞARETLEME.

ÇIKTI: yalnızca şüpheli numaraların JSON dizisi. Örn: [2,5]. Hiç yoksa: []

AYETLER:
${list}`;
}

function fixPrompt(batch: V[]): string {
  const list = batch.map((v) => `[${v.verse_key}]\n   AR: ${v.arabic}\n   MEAL: ${v.meal}\n   MEVCUT LİTERAL: ${v.lit}`).join("\n\n");
  return `Sen uzman bir Kuran çevirmenisin. Aşağıdaki ayetlerin LİTERAL çevirisi ÖN-ELEME ile şüpheli işaretlendi ama ÇOĞU ASLINDA DOĞRU olabilir.

Her ayet için MEVCUT LİTERAL'i değerlendir. SADECE şu sorunlardan biri GERÇEKTEN varsa yeniden üret:
- Anlam HATASI (Arapça/meal ile çelişen)
- EKSİK (ayetin bir kısmı çevrilmemiş)
- FAZLADAN içerik (ayette olmayan, başka ayetten taşınmış)
- BOZUK (kelime kelime kopuk, transliterasyon, meta-metin, anlamsız)

MEVCUT LİTERAL zaten doğru/akıcı ve ayete sadıksa (ufak üslup farkı önemli değil) → DEĞİŞTİRME, çıktıya EKLEME.

Yeni literal üretirken: Arapça sırasına sadık ama gramerli Türkçe; sadece ayetteki içerik; tefsir/yorum/parantez/başka ayet YOK; meali kopyalama.

ÇIKTI: yalnızca GERÇEKTEN düzeltilmesi gerekenler için JSON dizi (doğru olanları dahil etme):
[{"vk": "2:3", "lit": "yeni literal"}]
Hiç düzeltme yoksa: []

AYETLER:
${list}`;
}

async function runFlag(db: DatabaseSync, apiKey: string): Promise<void> {
  const verses = getVerses(db);
  let batches: V[][] = [];
  for (let i = 0; i < verses.length; i += BATCH) batches.push(verses.slice(i, i + BATCH));
  console.log(`[FLAG] ayet: ${verses.length} | batch: ${batches.length} (${BATCH}/batch)`);
  if (LIMIT) batches = batches.slice(0, LIMIT);

  const suspects: V[] = [];
  let ok = 0, fail = 0, totIn = 0, totOut = 0;
  for (let bi = 0; bi < batches.length; bi += CONCURRENCY) {
    const group = batches.slice(bi, bi + CONCURRENCY);
    const results = await Promise.all(group.map(async (batch) => {
      try { const r = await call(apiKey, flagPrompt(batch), 800); return { r, batch }; }
      catch (e) { return { err: (e as Error).message, batch }; }
    }));
    for (let gi = 0; gi < results.length; gi++) {
      const res = results[gi]; const idx = bi + gi + 1;
      process.stdout.write(`[${idx}/${batches.length}] `);
      if ("err" in res) { console.log(`✗ ${res.err!.slice(0, 40)}`); fail++; continue; }
      totIn += res.r.inTok; totOut += res.r.outTok;
      const ids = extractJsonArray(res.r.raw) as number[] | null;
      if (ids === null) { console.log("✗ parse"); fail++; continue; }
      for (const id of ids) { const v = res.batch[id - 1]; if (v) suspects.push(v); }
      console.log(ids.length ? `⚑ ${ids.length}` : "✓");
      ok++;
    }
  }
  if (!DRY) fs.writeFileSync(SUSPECTS_PATH, JSON.stringify(suspects, null, 2), "utf-8");
  const cost = (totIn / 1e6) * 0.14 + (totOut / 1e6) * 0.28;
  console.log(`\n[FLAG] bitti. ok=${ok} fail=${fail} | şüpheli ayet=${suspects.length}${DRY ? " (DRY)" : " → _literal_suspects.json"}`);
  console.log(`Token in=${totIn} out=${totOut} ≈ $${cost.toFixed(3)}`);
}

async function runFix(db: DatabaseSync, apiKey: string): Promise<void> {
  if (!fs.existsSync(SUSPECTS_PATH)) { console.error("_literal_suspects.json yok — önce flag çalıştır."); process.exit(1); }
  const all = JSON.parse(fs.readFileSync(SUSPECTS_PATH, "utf-8")) as V[];
  let batches: V[][] = [];
  for (let i = 0; i < all.length; i += BATCH) batches.push(all.slice(i, i + BATCH));
  console.log(`[FIX] şüpheli ayet: ${all.length} | batch: ${batches.length} (${BATCH}/batch) | ${MODEL}`);
  if (LIMIT) batches = batches.slice(0, LIMIT);

  const upd = db.prepare("UPDATE verses SET literal_ceviri=? WHERE verse_key=?");
  const progressPath = path.join(dir, `_literal_fix_progress${TAG}.json`);
  const backupPath = path.join(dir, `_literal_fix_corrections${TAG}.json`);
  let startBatch = 0;
  const corrections: { verse_key: string; old: string; yeni: string }[] = [];
  if (!DRY && fs.existsSync(progressPath)) {
    try {
      startBatch = (JSON.parse(fs.readFileSync(progressPath, "utf-8")) as { done: number }).done ?? 0;
      if (fs.existsSync(backupPath)) corrections.push(...JSON.parse(fs.readFileSync(backupPath, "utf-8")));
      console.log(`↻ Devam: ${startBatch}. batch'ten (${corrections.length} düzeltme korunuyor)`);
    } catch { /* baştan */ }
  }

  let ok = 0, fail = 0, totIn = 0, totOut = 0;
  for (let bi = startBatch; bi < batches.length; bi += CONCURRENCY) {
    const group = batches.slice(bi, bi + CONCURRENCY);
    const results = await Promise.all(group.map(async (batch) => {
      try { const r = await call(apiKey, fixPrompt(batch), 8000); return { r, batch }; }
      catch (e) { return { err: (e as Error).message, batch }; }
    }));
    for (let gi = 0; gi < results.length; gi++) {
      const res = results[gi]; const idx = bi + gi + 1;
      process.stdout.write(`[${idx}/${batches.length}] `);
      if ("err" in res) { console.log(`✗ ${res.err!.slice(0, 40)}`); fail++; continue; }
      totIn += res.r.inTok; totOut += res.r.outTok;
      const arr = extractJsonArray(res.r.raw) as { vk: string; lit: string }[] | null;
      if (arr === null) { console.log("✗ parse"); fail++; continue; }
      const bmap = new Map(res.batch.map((v) => [v.verse_key, v]));
      let applied = 0;
      for (const c of arr) {
        const v = bmap.get(c.vk);  // verse_key ile eşleştir (echo-güvenli)
        if (!v || !c.lit || c.lit.trim() === v.lit.trim()) continue;
        corrections.push({ verse_key: v.verse_key, old: v.lit, yeni: c.lit.trim() });
        if (!DRY) upd.run(c.lit.trim(), v.verse_key);
        applied++;
      }
      console.log(`✓ ${applied}`);
      ok++;
    }
    if (!DRY) {
      fs.writeFileSync(backupPath, JSON.stringify(corrections, null, 2), "utf-8");
      fs.writeFileSync(progressPath, JSON.stringify({ done: Math.min(bi + CONCURRENCY, batches.length) }), "utf-8");
    }
  }
  if (DRY) {
    console.log("\n--- örnekler ---");
    corrections.slice(0, 20).forEach((c) => console.log(`[${c.verse_key}]\n  ESKİ: ${c.old.slice(0, 90)}\n  YENİ: ${c.yeni.slice(0, 90)}`));
  }
  const cost = (totIn / 1e6) * 0.14 + (totOut / 1e6) * 0.28;
  console.log(`\n[FIX] bitti. ok=${ok} fail=${fail} | düzeltilen=${corrections.length}`);
  console.log(`Token in=${totIn} out=${totOut} ≈ $${cost.toFixed(3)}`);
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) { console.error("DEEPSEEK_API_KEY yok."); process.exit(1); }
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout=15000;");
  if (STAGE === "fix") await runFix(db, apiKey);
  else await runFlag(db, apiKey);
  void FOOTER; void sleep;
}

main();
