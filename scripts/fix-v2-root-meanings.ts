/**
 * fix-v2-root-meanings.ts
 *
 * root_meanings tablosundaki source='v2_easy_only' kayıtlarını
 * Claude Haiku ile yeniden işler ve daha doğru Türkçe anlamlar üretir.
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local \
 *     --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/fix-v2-root-meanings.ts [--dry-run] [--limit N]
 *
 * --dry-run  → DB'yi değiştirmez, sadece çıktı gösterir
 * --limit N  → En sık N kökü işle (varsayılan: tümü)
 * --test     → İlk 5 kökü işle (hızlı test)
 *
 * Tahmini maliyet: 721 kök × ~$0.00014 = ~$0.10
 */

import Anthropic from "@anthropic-ai/sdk";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dir, "..", "data", "app.db");
const DELAY_MS = 120;

interface RootRow {
  id: number;
  root: string;
  short_tr: string;
  freq: number;
}

function getArgs(): { dryRun: boolean; limit: number; test: boolean } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const test   = args.includes("--test");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? "9999") : (test ? 5 : 9999);
  return { dryRun, limit, test };
}

function loadRoots(limit: number): RootRow[] {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const rows = db.prepare(`
    SELECT rm.id, rm.root, rm.short_tr,
           COALESCE(freq.cnt, 0) AS freq
    FROM root_meanings rm
    LEFT JOIN (
      SELECT root, COUNT(*) AS cnt
      FROM words
      WHERE root IS NOT NULL AND trim(root) != ''
      GROUP BY root
    ) freq ON rm.root = freq.root
    WHERE rm.source = 'v2_easy_only'
    ORDER BY freq DESC
    LIMIT ?
  `).all(limit) as unknown as RootRow[];
  db.close();
  return rows;
}

function updateRoot(id: number, shortTr: string): void {
  const db = new DatabaseSync(DB_PATH);
  db.prepare(
    "UPDATE root_meanings SET short_tr = ?, meaning_tr = ? WHERE id = ?"
  ).run(shortTr, shortTr, id);
  db.close();
}

async function askClaude(client: Anthropic, root: string): Promise<string | null> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 48,
    messages: [
      {
        role: "user",
        content: `Arapça kök: ${root}\nBu kökün Kuran'daki temel Türkçe anlamını yaz. Kural: küçük harfle başla, en fazla 4 kelime, virgülle ayır, nokta/markdown/açıklama yazma.`,
      },
    ],
  });

  const block = response.content[0];
  if (block?.type !== "text") return null;

  const text = block.text
    .trim()
    .replace(/^[#\-\*>\s]+/, "")   // markdown öneki temizle
    .replace(/\.$/, "")            // sondaki nokta
    .replace(/\s+/g, " ")
    .trim();

  // İlk harfi küçük yap
  const cleaned = text.length > 0 ? text.charAt(0).toLowerCase() + text.slice(1) : text;
  return cleaned.length > 0 && cleaned.length < 80 ? cleaned : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const { dryRun, limit, test } = getArgs();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY bulunamadı.");
    process.exit(1);
  }

  const tag = dryRun ? "[DRY-RUN] " : test ? "[TEST] " : "";
  console.log(`${tag}fix-v2-root-meanings başlatılıyor`);
  console.log(`Limit: ${limit === 9999 ? "tümü" : limit}, DB: ${DB_PATH}`);
  console.log();

  const roots = loadRoots(limit);
  console.log(`İşlenecek kayıt: ${roots.length}`);

  // Tahmini maliyet
  const estCost = roots.length * 0.00014;
  console.log(`Tahmini maliyet: $${estCost.toFixed(3)}`);
  console.log();

  const client = new Anthropic({ apiKey });
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < roots.length; i++) {
    const row = roots[i];
    if (!row) continue;

    const prefix = `[${i + 1}/${roots.length}] ${row.root} (freq=${row.freq})`;
    process.stdout.write(`${prefix}  →  `);

    try {
      const result = await askClaude(client, row.root);

      if (!result) {
        console.log("boş yanıt, atlandı.");
        skipped++;
      } else {
        console.log(`"${result}"  (eski: "${row.short_tr}")`);
        if (!dryRun) {
          updateRoot(row.id, result);
        }
        updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`hata: ${msg.slice(0, 80)}`);
      skipped++;
    }

    if (i < roots.length - 1) await sleep(DELAY_MS);
  }

  console.log();
  console.log("=== SONUÇ ===");
  console.log(`Güncellenen : ${updated}`);
  console.log(`Atlanan     : ${skipped}`);
  if (dryRun) console.log("(DRY-RUN: DB değiştirilmedi)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
