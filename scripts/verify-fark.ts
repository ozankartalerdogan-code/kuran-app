/**
 * verify-fark.ts  —  İKİ AŞAMALI fark analizi üretimi (6236 ayet, sıfırdan)
 *
 * Altyapı (kök/gloss + literal) temizlendikten sonra TÜM ayetlerin meal↔literal
 * fark analizini yeniden üretir.
 *
 * AŞAMA 1 (--stage=flag, chat): her ayette meal ile literal arasında GERÇEK bir
 *   anlam/yorum farkı var mı? (yüksek recall — şüphede işaretle). Çıktı: _fark_suspects.json
 *   İşaretlenmeyenler "ayni" kabul edilir (kalıp metin).
 * AŞAMA 2 (--stage=fix, reasoner): işaretli ayetler için DETAYLI, anlaşılır açıklama
 *   yazar (ne farklı, neden, kök temelli). Gerçekte fark yoksa "ayni"ye düşürür.
 * AŞAMA 3 (--stage=boiler): işaretlenmeyen tüm ayetlere kalıp metni yazar.
 *
 * Kullanım:
 *   ... verify-fark.ts --stage=flag [--dry] [--batch=12] [--limit=N]
 *   ... verify-fark.ts --stage=fix  [--dry] [--batch=6] [--conc=6] [--limit=N]
 *   ... verify-fark.ts --stage=boiler
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");
const API_URL = "https://api.deepseek.com/chat/completions";
const suspArg = process.argv.find((a) => a.startsWith("--suspects="));
const SUSPECTS_PATH = suspArg ? path.resolve(suspArg.split("=")[1]) : path.join(dir, "_fark_suspects.json");
const tagArg = process.argv.find((a) => a.startsWith("--tag="));
const TAG = tagArg ? `_${tagArg.split("=")[1]}` : "";
const FOOTER = "ℹ️ AI tarafından üretilmiştir. Kesin bilgi için güvenilir tefsirlere başvurunuz.";
const AYNI = "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır.";

const STAGE = (process.argv.find((a) => a.startsWith("--stage="))?.split("=")[1]) ?? "flag";
const DRY = process.argv.includes("--dry");
const LIMIT = (() => { const a = process.argv.find((x) => x.startsWith("--limit=")); return a ? Number(a.split("=")[1]) : undefined; })();
const MODEL = STAGE === "fix" ? "deepseek-reasoner" : "deepseek-chat";
const CONCURRENCY = (() => { const a = process.argv.find((x) => x.startsWith("--conc=")); return a ? Number(a.split("=")[1]) : 6; })();
const BATCH = (() => { const a = process.argv.find((x) => x.startsWith("--batch=")); return a ? Number(a.split("=")[1]) : (STAGE === "fix" ? 6 : 12); })();

interface V { verse_key: string; arabic: string; meal: string; lit: string }
interface W { arabic: string; root: string; meaning: string }

function getVerses(db: DatabaseSync): V[] {
  return db.prepare(
    "SELECT verse_key, arabic_text AS arabic, primary_translation AS meal, literal_ceviri AS lit FROM verses WHERE arabic_text IS NOT NULL AND primary_translation IS NOT NULL AND literal_ceviri IS NOT NULL ORDER BY surah_id, ayah_number"
  ).all() as unknown as V[];
}

function rootsOf(db: DatabaseSync, vk: string): string {
  const ws = db.prepare("SELECT arabic, root, meaning_tr AS meaning FROM words WHERE verse_key=? AND root IS NOT NULL AND meaning_tr IS NOT NULL ORDER BY word_index").all(vk) as unknown as W[];
  return ws.map((w) => `${w.arabic}(${w.root}: ${w.meaning})`).join(", ");
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
    body: JSON.stringify({ model: MODEL, max_tokens: maxTok, temperature: 0.4, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 100)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return { raw: json.choices?.[0]?.message?.content?.trim() ?? "", inTok: json.usage?.prompt_tokens ?? 0, outTok: json.usage?.completion_tokens ?? 0 };
}

function flagPrompt(batch: V[]): string {
  const list = batch.map((v, i) => `${i + 1}. [${v.verse_key}]\n   MEAL: ${v.meal}\n   LİTERAL: ${v.lit}`).join("\n");
  return `Aşağıda Kuran ayetlerinin akıcı MEAL'i ve lafzî LİTERAL çevirisi var.
Her ayet için: MEAL ile LİTERAL arasında GERÇEK bir ANLAM veya YORUM farkı var mı?
(Örn. meal bir kelimeyi yorumlamış, ekleme yapmış, farklı anlam vermiş, ya da literal başka türlü anlaşılıyor.)

ŞÜPHELİ (farklı) işaretle (numarasını ver): gerçek bir anlam/yorum farkı OLABİLİR ise.
Sadece üslup/akıcılık/kelime sırası farkı olanları (anlam aynı) İŞARETLEME.
Şüphede kalırsan İŞARETLE (ikinci aşamada detaylı incelenecek).

ÇIKTI: yalnızca farklı olanların numara dizisi. Örn: [1,4,7]. Hiç yoksa: []

AYETLER:
${list}`;
}

function fixPrompt(v: V, roots: string): string {
  return `Sen uzman bir Kuran dilbilimci ve tefsir araştırmacısısın. Bir ayetin akıcı MEAL'i ile lafzî LİTERAL çevirisi arasındaki farkı analiz et.

ARAPÇA: ${v.arabic}
MEAL: ${v.meal}
LİTERAL: ${v.lit}
KÖKLER: ${roots || "(yok)"}

GÖREV:
- Meal ile literal arasında GERÇEK bir anlam/yorum farkı varsa: bunu DETAYLI ve ANLAŞILIR biçimde açıkla.
  • Neyin farklı olduğunu net söyle (hangi kelime/ifade).
  • Çevirmenin neden öyle yorumladığını kök anlamlarına dayanarak açıkla.
  • Sıradan bir okuyucunun anlayacağı, akıcı Türkçe; 3-5 cümle.
  • Kesin dini hüküm verme; "...şeklinde yorumlanmıştır / ...anlamına gelebilir" gibi temkinli dil.
  • SURE ADI/NUMARASI yazma; başka ayete atıf gerekiyorsa "önceki/sonraki ayetler" de.
- Gerçekte anlam farkı yoksa (sadece üslup): {"ayni": true, "analiz": ""}

ÇIKTI: yalnızca geçerli JSON, başka metin yok:
{"ayni": false, "analiz": "detaylı açıklama"}
veya
{"ayni": true, "analiz": ""}`;
}

function extractObj(txt: string): { ayni?: boolean; analiz?: string } | null {
  const s = txt.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b < a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

async function runFlag(db: DatabaseSync, apiKey: string): Promise<void> {
  const verses = getVerses(db);
  let batches: V[][] = [];
  for (let i = 0; i < verses.length; i += BATCH) batches.push(verses.slice(i, i + BATCH));
  console.log(`[FLAG] ayet: ${verses.length} | batch: ${batches.length}`);
  if (LIMIT) batches = batches.slice(0, LIMIT);
  const suspects: V[] = [];
  let ok = 0, fail = 0, totIn = 0, totOut = 0;
  for (let bi = 0; bi < batches.length; bi += CONCURRENCY) {
    const group = batches.slice(bi, bi + CONCURRENCY);
    const results = await Promise.all(group.map(async (b) => { try { return { r: await call(apiKey, flagPrompt(b), 600), b }; } catch (e) { return { err: (e as Error).message, b }; } }));
    for (let gi = 0; gi < results.length; gi++) {
      const res = results[gi]; process.stdout.write(`[${bi + gi + 1}/${batches.length}] `);
      if ("err" in res) { console.log(`✗ ${res.err!.slice(0, 30)}`); fail++; continue; }
      totIn += res.r.inTok; totOut += res.r.outTok;
      const ids = extractJsonArray(res.r.raw) as number[] | null;
      if (ids === null) { console.log("✗ parse"); fail++; continue; }
      for (const id of ids) { const v = res.b[id - 1]; if (v) suspects.push(v); }
      console.log(ids.length ? `⚑${ids.length}` : "✓"); ok++;
    }
  }
  if (!DRY) fs.writeFileSync(SUSPECTS_PATH, JSON.stringify(suspects, null, 2), "utf-8");
  console.log(`\n[FLAG] ok=${ok} fail=${fail} | farklı=${suspects.length}/${verses.length}${DRY ? " (DRY)" : ""}`);
  console.log(`≈ $${((totIn / 1e6) * 0.14 + (totOut / 1e6) * 0.28).toFixed(3)}`);
}

async function runFix(db: DatabaseSync, apiKey: string): Promise<void> {
  if (!fs.existsSync(SUSPECTS_PATH)) { console.error("_fark_suspects.json yok."); process.exit(1); }
  const all = JSON.parse(fs.readFileSync(SUSPECTS_PATH, "utf-8")) as V[];
  console.log(`[FIX] şüpheli ayet: ${all.length} | ${MODEL}`);
  let items = all;
  if (LIMIT) items = items.slice(0, LIMIT * BATCH);

  const upd = db.prepare("UPDATE verses SET fark_analizi=? WHERE verse_key=?");
  const progressPath = path.join(dir, `_fark_fix_progress${TAG}.json`);
  const backupPath = path.join(dir, `_fark_fix_corrections${TAG}.json`);
  let start = 0;
  const done: { verse_key: string; ayni: boolean; analiz: string }[] = [];
  if (!DRY && fs.existsSync(progressPath)) {
    try { start = (JSON.parse(fs.readFileSync(progressPath, "utf-8")) as { done: number }).done ?? 0;
      if (fs.existsSync(backupPath)) done.push(...JSON.parse(fs.readFileSync(backupPath, "utf-8")));
      console.log(`↻ Devam: ${start}. ayetten (${done.length} kayıt)`); } catch { /**/ }
  }

  let ok = 0, fail = 0, ayni = 0, totIn = 0, totOut = 0;
  for (let i = start; i < items.length; i += CONCURRENCY) {
    const group = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(group.map(async (v) => { try { return { r: await call(apiKey, fixPrompt(v, rootsOf(db, v.verse_key)), 4000), v }; } catch (e) { return { err: (e as Error).message, v }; } }));
    for (let gi = 0; gi < results.length; gi++) {
      const res = results[gi]; process.stdout.write(`[${i + gi + 1}/${items.length}] ${res.v.verse_key} `);
      if ("err" in res) { console.log(`✗ ${res.err!.slice(0, 30)}`); fail++; continue; }
      totIn += res.r.inTok; totOut += res.r.outTok;
      const o = extractObj(res.r.raw);
      if (!o) { console.log("✗ parse"); fail++; continue; }
      const text = (o.ayni || !o.analiz) ? AYNI : `${o.analiz.trim()}\n\n${FOOTER}`;
      done.push({ verse_key: res.v.verse_key, ayni: !!o.ayni, analiz: o.analiz ?? "" });
      if (!DRY) upd.run(text, res.v.verse_key);
      if (o.ayni) ayni++;
      console.log(o.ayni ? "[AYNI]" : `✓ ${(o.analiz || "").slice(0, 45)}`); ok++;
    }
    if (!DRY) { fs.writeFileSync(backupPath, JSON.stringify(done, null, 2), "utf-8"); fs.writeFileSync(progressPath, JSON.stringify({ done: Math.min(i + CONCURRENCY, items.length) }), "utf-8"); }
  }
  console.log(`\n[FIX] ok=${ok} fail=${fail} (ayni→${ayni}) | ≈ $${((totIn / 1e6) * 0.14 + (totOut / 1e6) * 0.28).toFixed(3)}`);
}

// İşaretlenmeyen tüm ayetlere kalıp metni yaz
function runBoiler(db: DatabaseSync): void {
  const verses = getVerses(db);
  const susp = new Set((JSON.parse(fs.readFileSync(SUSPECTS_PATH, "utf-8")) as V[]).map((v) => v.verse_key));
  const upd = db.prepare("UPDATE verses SET fark_analizi=? WHERE verse_key=?");
  let n = 0;
  for (const v of verses) { if (!susp.has(v.verse_key)) { upd.run(AYNI, v.verse_key); n++; } }
  console.log(`[BOILER] işaretlenmeyen ${n} ayete kalıp metni yazıldı.`);
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout=15000;");
  if (STAGE === "fix") { if (!apiKey) { console.error("DEEPSEEK_API_KEY yok."); process.exit(1); } await runFix(db, apiKey); }
  else if (STAGE === "boiler") runBoiler(db);
  else { if (!apiKey) { console.error("DEEPSEEK_API_KEY yok."); process.exit(1); } await runFlag(db, apiKey); }
}

main();
