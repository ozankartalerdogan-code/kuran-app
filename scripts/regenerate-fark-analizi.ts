/**
 * regenerate-fark-analizi.ts
 *
 * Meal ile (düzeltilmiş) literal çeviri arasındaki fark analizini DeepSeek ile
 * yeniden üretir. Kök/kelime anlamlarından faydalanır.
 *
 * Hedef küme (varsayılan): literal_ceviri'si bu oturumda değişen VE mevcut
 * fark_analizi'si kalıp olmayan ("bayat") ayetler. --all ile gerçek analizi olan
 * tüm ayetler işlenir.
 *
 * Çıktı: model { "ayni": bool, "analiz": string } JSON döndürür.
 *   ayni=true  → "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır." (footer yok)
 *   ayni=false → analiz + footer
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/regenerate-fark-analizi.ts [--dry] [--all] [--limit=N]
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");

const API_URL  = "https://api.deepseek.com/chat/completions";
const MODEL    = "deepseek-chat";
const DELAY_MS = 120;

const FOOTER = "ℹ️ AI tarafından üretilmiştir. Kesin bilgi için güvenilir tefsirlere başvurunuz.";
const AYNI_TEXT = "Meal ile literal çeviri arasında anlam farkı yoktur, sadece üslup farkı vardır.";

const DRY = process.argv.includes("--dry");
const ALL = process.argv.includes("--all");
// --boiler: literal'i değişen AMA fark_analizi'si kalıp ("fark yok") olan ayetler.
// Literal düzeldiği için bu eski "fark yok" yargısı yeniden değerlendirilir.
const BOILER = process.argv.includes("--boiler");
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
interface WRow { arabic: string | null; root: string | null; meaning_tr: string | null }

const noDiffRe = /anlam farkı yoktur|fark yoktur|sadece üslup|uyumludur, anlam|farkı bulunmamakta|farklılık yok/i;

function getTargets(db: DatabaseSync): VRow[] {
  if (ALL) {
    const rows = db.prepare(
      "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, fark_analizi FROM verses WHERE fark_analizi IS NOT NULL AND trim(fark_analizi)!='' ORDER BY surah_id, ayah_number"
    ).all() as unknown as VRow[];
    return rows.filter((r) => !noDiffRe.test(r.fark_analizi ?? ""));
  }
  // Bayat küme: literal'i değişen verse_key'ler ∩ gerçek analiz
  const keys = new Set<string>();
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith("_literal_backup_") && f.endsWith(".json")) {
      for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"))) keys.add(r.verse_key);
    }
  }
  // BOILER modunda: önceki fark-regen run'larında işlenmiş verse_key'leri hariç tut
  // (gerçek-analiz run'ında "ayni"a dönüp kalıp olanlar yeniden işlenmesin).
  const excluded = new Set<string>();
  if (BOILER) {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith("_fark_backup_") && f.endsWith(".json")) {
        for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"))) excluded.add(r.verse_key);
      }
    }
  }

  const sel = db.prepare(
    "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, fark_analizi FROM verses WHERE verse_key=?"
  );
  const out: VRow[] = [];
  for (const vk of keys) {
    if (BOILER && excluded.has(vk)) continue;
    const r = sel.get(vk) as unknown as VRow | undefined;
    if (!r || !r.fark_analizi) continue;
    const isBoiler = noDiffRe.test(r.fark_analizi);
    // --boiler → kalıp olanlar; varsayılan → gerçek analizi olanlar
    if (BOILER ? isBoiler : !isBoiler) out.push(r);
  }
  out.sort((a, b) => a.verse_key.localeCompare(b.verse_key, undefined, { numeric: true }));
  return out;
}

function buildPrompt(v: VRow, words: WRow[]): string {
  const kokListe = words
    .filter((w) => w.root || w.meaning_tr)
    .map((w) => `${w.arabic ?? ""} (kök: ${w.root ?? "-"}, anlam: ${w.meaning_tr ?? "-"})`)
    .join("; ");

  return `Sen bir Kuran semantik analiz uzmanısın. Bir ayetin MEAL'i ile LİTERAL çevirisi arasında ANLAM farkı olup olmadığını incele.

Kurallar:
- Anlam farkı YOKSA veya yalnızca üslup/akıcılık farkı varsa: {"ayni": true, "analiz": ""}
- Gerçek bir ANLAM/yorum farkı varsa: {"ayni": false, "analiz": "..."} — neyin farklı olduğunu ve çevirmenin neden öyle yorumladığını kök anlamlarına dayanarak 2-4 cümleyle açıkla. Türkçe, sade, kesin yargı yok.
- Kök/anlam verisinde açık bir hata görürsen analizde kısaca belirtebilirsin.
- Sadece geçerli JSON döndür. Başka metin, markdown, footer EKLEME.

ARAPÇA: ${v.arabic_text ?? ""}
MEAL: ${v.primary_translation ?? ""}
LİTERAL: ${v.literal_ceviri ?? ""}
KÖKLER: ${kokListe || "(yok)"}`;
}

async function ask(apiKey: string, prompt: string): Promise<{ ayni: boolean; analiz: string } | null> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const txt = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!txt) return null;
  try {
    const p = JSON.parse(txt) as { ayni?: boolean; analiz?: string };
    return { ayni: !!p.ayni, analiz: (p.analiz ?? "").trim() };
  } catch {
    return null;
  }
}

function finalText(out: { ayni: boolean; analiz: string }): string {
  if (out.ayni || !out.analiz) return AYNI_TEXT;
  return `${out.analiz}\n\n${FOOTER}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) { console.error("DEEPSEEK_API_KEY yok."); process.exit(1); }

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout=15000;");

  // --only=VK → tek ayet (parse hatası alanları elle düzeltmek için)
  if (ONLY) {
    const r = db.prepare(
      "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, fark_analizi FROM verses WHERE verse_key=?"
    ).get(ONLY) as unknown as VRow | undefined;
    if (!r) { console.error(`${ONLY} bulunamadı.`); process.exit(1); }
    const words = db.prepare("SELECT arabic, root, meaning_tr FROM words WHERE verse_key=? ORDER BY word_index").all(ONLY) as unknown as WRow[];
    const out = await ask(apiKey, buildPrompt(r, words));
    if (!out) { console.error("Parse hatası — tekrar deneyin."); process.exit(1); }
    const text = finalText(out);
    if (!DRY) db.prepare("UPDATE verses SET fark_analizi=? WHERE verse_key=?").run(text, ONLY);
    console.log(`${ONLY}: ${out.ayni ? "[AYNI]" : out.analiz.slice(0, 80)}`);
    console.log(DRY ? "(DRY)" : "✓ yazıldı");
    return;
  }

  let targets = getTargets(db);
  const mod = ALL ? "tüm gerçek analiz" : BOILER ? "literal-değişen kalıp" : "bayat literal-değişen";
  console.log(`Hedef (${mod}): ${targets.length}`);
  if (LIMIT) targets = targets.slice(0, LIMIT);
  console.log(`İşlenecek: ${targets.length} ${DRY ? "(DRY)" : ""}\n`);

  const wsel = db.prepare("SELECT arabic, root, meaning_tr FROM words WHERE verse_key=? ORDER BY word_index");
  const upd = db.prepare("UPDATE verses SET fark_analizi=? WHERE verse_key=?");

  if (!DRY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(
      path.join(dir, `_fark_backup_${stamp}.json`),
      JSON.stringify(targets.map((t) => ({ verse_key: t.verse_key, old: t.fark_analizi })), null, 2),
      "utf-8"
    );
    console.log(`Yedek: _fark_backup_${stamp}.json\n`);
  }

  let ok = 0, fail = 0, ayniCount = 0;
  for (let i = 0; i < targets.length; i++) {
    const v = targets[i];
    const words = wsel.all(v.verse_key) as unknown as WRow[];
    process.stdout.write(`[${i + 1}/${targets.length}] ${v.verse_key}  `);
    try {
      const out = await ask(apiKey, buildPrompt(v, words));
      if (!out) { console.log("✗ parse"); fail++; continue; }
      const text = finalText(out);
      if (out.ayni) ayniCount++;
      if (DRY) {
        console.log(`\n   ESKİ: ${(v.fark_analizi ?? "").split("\n")[0].slice(0, 90)}`);
        console.log(`   YENİ: ${out.ayni ? "[AYNI] " : ""}${(out.analiz || AYNI_TEXT).slice(0, 110)}`);
      } else {
        upd.run(text, v.verse_key);
        console.log(`✓ ${out.ayni ? "[AYNI]" : out.analiz.slice(0, 55)}`);
      }
      ok++;
    } catch (e) {
      console.log(`✗ ${(e as Error).message.slice(0, 80)}`);
      fail++;
    }
    await sleep(DELAY_MS);
  }
  console.log(`\nBitti. ok=${ok} fail=${fail} (ayni→${ayniCount})`);
}

main();
