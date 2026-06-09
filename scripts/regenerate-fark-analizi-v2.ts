/**
 * regenerate-fark-analizi-v2.ts
 *
 * TEMİZ pipeline: deepseek-reasoner (R1) + Arapça kökler (Türkçe bozuk gloss YOK) +
 * sıkılaştırılmış anti-halüsinasyon promptu.
 *
 * Hedef (varsayılan): literal_ceviri'si bu oturumda değişen VE mevcut fark_analizi'si
 * gerçek analiz (kalıp değil) olan ayetler. "ayni" olanlar reasoner'a gönderilmez.
 *   --all   → gerçek analizi olan TÜM ayetler
 *   --only=VK
 *   --limit=N
 *   --dry   → yazma yok
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/regenerate-fark-analizi-v2.ts [--dry] [--all] [--only=VK] [--limit=N]
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");

const API_URL  = "https://api.deepseek.com/chat/completions";
const MODEL    = "deepseek-reasoner";
const DELAY_MS = 100;

const FOOTER = "ℹ️ AI tarafından üretilmiştir. Kesin bilgi için güvenilir tefsirlere başvurunuz.";
const AYNI_TEXT = "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır.";

const DRY = process.argv.includes("--dry");
const ALL = process.argv.includes("--all");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.split("=")[1] : undefined;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface VRow {
  verse_key: string;
  arabic_text: string | null;
  primary_translation: string | null;
  literal_ceviri: string | null;
  fark_analizi: string | null;
}
interface WRow { arabic: string | null; root: string | null }

const noDiffRe = /anlam farkı yoktur|fark yoktur|sadece üslup|uyumludur, anlam|farkı bulunmamakta|farklılık yok/i;

function getTargets(db: DatabaseSync): VRow[] {
  const sel = "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, fark_analizi FROM verses";
  if (ALL) {
    const rows = db.prepare(`${sel} WHERE fark_analizi IS NOT NULL AND trim(fark_analizi)!='' ORDER BY surah_id, ayah_number`).all() as unknown as VRow[];
    return rows.filter((r) => !noDiffRe.test(r.fark_analizi ?? ""));
  }
  // literal'i değişen verse_key'ler
  const keys = new Set<string>();
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith("_literal_backup_") && f.endsWith(".json")) {
      for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"))) keys.add(r.verse_key);
    }
  }
  const one = db.prepare(`${sel} WHERE verse_key=?`);
  const out: VRow[] = [];
  for (const vk of keys) {
    const r = one.get(vk) as unknown as VRow | undefined;
    if (r && r.fark_analizi && !noDiffRe.test(r.fark_analizi)) out.push(r); // sadece gerçek analiz
  }
  out.sort((a, b) => a.verse_key.localeCompare(b.verse_key, undefined, { numeric: true }));
  return out;
}

function buildPrompt(v: VRow, words: WRow[]): string {
  // Sadece Arapça kelime + Arapça kök (Türkçe gloss verilmez — o veri hatalı olabilir)
  const kokListe = words
    .filter((w) => w.root && w.arabic)
    .map((w) => `${w.arabic} → ${w.root}`)
    .join(" | ");

  return `Sen uzman bir Kuran dilbilimcisisin. Bir ayetin MEAL'i ile LİTERAL çevirisi arasında ANLAM farkı olup olmadığını titizlikle incele.

ÇOK ÖNEMLİ KURALLAR:
1. Yalnızca aşağıda VERİLEN Arapça metne dayan. Ayette/girdide GEÇMEYEN hiçbir Arapça kelime zikretme, uydurma.
2. KÖKLER listesi sadece ipucudur ve HATALI olabilir; asıl Arapça metni esas al, emin olmadığın kök/etimoloji iddiasında BULUNMA.
3. SURE ADI veya NUMARASI yazma (örn. "Tevbe Suresi", "9:5" gibi atıflar YASAK). Başka ayetlere atıf gerekiyorsa sadece "önceki ayetler" / "sonraki ayetler" de.
4. Anlam farkı yoksa ya da sadece üslup/akıcılık farkı varsa: {"ayni": true, "analiz": ""}
5. Gerçek bir anlam/yorum farkı varsa: {"ayni": false, "analiz": "..."} — farkı ve çevirmenin neden öyle yorumladığını 2-4 cümleyle, Türkçe, kesin yargısız açıkla.
6. SADECE geçerli JSON döndür. Markdown, açıklama, footer YOK.

ARAPÇA: ${v.arabic_text ?? ""}
MEAL: ${v.primary_translation ?? ""}
LİTERAL: ${v.literal_ceviri ?? ""}
KÖKLER (Arapça, ipucu — hatalı olabilir): ${kokListe || "(yok)"}`;
}

interface AskOut { ayni: boolean; analiz: string; inTok: number; outTok: number }

function extractJson(txt: string): { ayni?: boolean; analiz?: string } | null {
  let s = txt.trim();
  // ```json ... ``` çitlerini kaldır
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // ilk { ... son } aralığını al
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b < a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

async function ask(apiKey: string, prompt: string): Promise<AskOut | null> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 6000, // reasoner: akıl yürütme + cevaba bol alan (bitince durur)
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const txt = json.choices?.[0]?.message?.content?.trim() ?? "";
  const p = extractJson(txt);
  if (!p) return null;
  return {
    ayni: !!p.ayni,
    analiz: (p.analiz ?? "").trim(),
    inTok: json.usage?.prompt_tokens ?? 0,
    outTok: json.usage?.completion_tokens ?? 0,
  };
}

function finalText(out: AskOut): string {
  if (out.ayni || !out.analiz) return AYNI_TEXT;
  return `${out.analiz}\n\n${FOOTER}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) { console.error("DEEPSEEK_API_KEY yok."); process.exit(1); }

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout=15000;");
  const wsel = db.prepare("SELECT arabic, root FROM words WHERE verse_key=? ORDER BY word_index");
  const upd = db.prepare("UPDATE verses SET fark_analizi=? WHERE verse_key=?");

  if (ONLY) {
    const r = db.prepare(
      "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, fark_analizi FROM verses WHERE verse_key=?"
    ).get(ONLY) as unknown as VRow | undefined;
    if (!r) { console.error(`${ONLY} yok.`); process.exit(1); }
    const out = await ask(apiKey, buildPrompt(r, wsel.all(ONLY) as unknown as WRow[]));
    if (!out) { console.error("parse hatası"); process.exit(1); }
    if (!DRY) upd.run(finalText(out), ONLY);
    console.log(`${ONLY} [${out.inTok}/${out.outTok} tok]: ${out.ayni ? "[AYNI]" : out.analiz}`);
    return;
  }

  let targets = getTargets(db);
  console.log(`Hedef (${ALL ? "tüm gerçek analiz" : "literal-değişen gerçek analiz"}): ${targets.length}`);
  if (LIMIT) targets = targets.slice(0, LIMIT);
  console.log(`İşlenecek: ${targets.length} ${DRY ? "(DRY)" : ""}  model=${MODEL}\n`);

  if (!DRY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(
      path.join(dir, `_fark_v2_backup_${stamp}.json`),
      JSON.stringify(targets.map((t) => ({ verse_key: t.verse_key, old: t.fark_analizi })), null, 2),
      "utf-8"
    );
  }

  let ok = 0, fail = 0, ayni = 0, totIn = 0, totOut = 0;
  for (let i = 0; i < targets.length; i++) {
    const v = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${v.verse_key}  `);
    try {
      const out = await ask(apiKey, buildPrompt(v, wsel.all(v.verse_key) as unknown as WRow[]));
      if (!out) { console.log("✗ parse"); fail++; continue; }
      totIn += out.inTok; totOut += out.outTok;
      if (out.ayni) ayni++;
      if (DRY) console.log(`\n   YENİ: ${out.ayni ? "[AYNI]" : out.analiz.slice(0, 120)}`);
      else { upd.run(finalText(out), v.verse_key); console.log(`✓ ${out.ayni ? "[AYNI]" : out.analiz.slice(0, 50)} [${out.outTok}t]`); }
      ok++;
    } catch (e) {
      console.log(`✗ ${(e as Error).message.slice(0, 80)}`);
      fail++;
    }
    await sleep(DELAY_MS);
  }
  // Maliyet tahmini (deepseek-reasoner ~ $0.55/M in, $2.19/M out)
  const cost = (totIn / 1e6) * 0.55 + (totOut / 1e6) * 2.19;
  console.log(`\nBitti. ok=${ok} fail=${fail} (ayni→${ayni})`);
  console.log(`Token: in=${totIn} out=${totOut} ≈ $${cost.toFixed(3)} | ortalama out/ayet=${ok ? Math.round(totOut / ok) : 0}`);
}

main();
