/**
 * fill-word-meanings-tsv.ts
 *
 * kelime_anlam_manuel_v3.tsv içindeki "bilinmiyor" satırlarını
 * Claude Haiku ile işler, Türkçe anlam üretir.
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local \
 *     --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/fill-word-meanings-tsv.ts [--dry-run] [--test] [--limit N]
 *
 * Tahmini maliyet: 1011 kelime × ~$0.00013 = ~$0.13
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const DESKTOP   = path.join(os.homedir(), "OneDrive", "Masaüstü");
const IN_PATH   = path.join(DESKTOP, "kelime_anlam_manuel_v3.tsv");
const OUT_PATH  = path.join(DESKTOP, "kelime_anlam_manuel_v4.tsv");
const DELAY_MS  = 120;

interface TsvRow {
  verse_key:  string;
  word_index: string;
  arabic:     string;
  root:       string;
  lemma:      string;
  pos:        string;
  anlam:      string;
  kaynak:     string;
}

function getArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    test:   args.includes("--test"),
    limit:  args.includes("--limit")
      ? parseInt(args[args.indexOf("--limit") + 1] ?? "9999")
      : args.includes("--test") ? 5 : 9999,
  };
}

function parseTsv(content: string): TsvRow[] {
  const lines = content.split("\n").filter(Boolean);
  const headers = lines[0]!.split("\t");
  return lines.slice(1).map((line) => {
    const cols = line.split("\t");
    return Object.fromEntries(
      headers.map((h, i) => [h, cols[i] ?? ""])
    ) as TsvRow;
  });
}

function serializeTsv(rows: TsvRow[]): string {
  const headers: (keyof TsvRow)[] = [
    "verse_key", "word_index", "arabic", "root",
    "lemma", "pos", "anlam", "kaynak",
  ];
  const head = headers.join("\t");
  const body = rows.map((r) => headers.map((h) => r[h] ?? "").join("\t"));
  return [head, ...body].join("\n") + "\n";
}

async function askClaude(client: Anthropic, row: TsvRow): Promise<string | null> {
  const rootPart = row.root ? `, kök: ${row.root}` : "";
  const posPart  = row.pos  ? `, tür: ${row.pos}`   : "";

  const response = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 48,
    messages: [
      {
        role:    "user",
        content: `Kuran Arapçasında şu kelimenin Türkçe anlamı nedir?\nKelime: ${row.arabic}${rootPart}${posPart}\nSadece kısa Türkçe anlam yaz (en fazla 5 kelime, nokta olmadan, küçük harfle başla).`,
      },
    ],
  });

  const block = response.content[0];
  if (block?.type !== "text") return null;

  const text = block.text
    .trim()
    .replace(/^[#\-\*>\s]+/, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const cleaned = text.length > 0
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text;

  return cleaned.length > 0 && cleaned.length < 80 ? cleaned : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const { dryRun, test, limit } = getArgs();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY bulunamadı.");
    process.exit(1);
  }

  const tag = dryRun ? "[DRY-RUN] " : test ? "[TEST] " : "";
  console.log(`${tag}fill-word-meanings-tsv başlatılıyor`);
  console.log(`Giriş : ${IN_PATH}`);
  console.log(`Çıkış : ${OUT_PATH}`);
  console.log();

  const content = await readFile(IN_PATH, "utf8");
  const rows    = parseTsv(content);

  const toProcess = rows
    .filter((r) => r.anlam === "bilinmiyor")
    .slice(0, limit);

  const estCost = toProcess.length * 0.00013;
  console.log(`Toplam satır    : ${rows.length}`);
  console.log(`İşlenecek       : ${toProcess.length}`);
  console.log(`Tahmini maliyet : $${estCost.toFixed(3)}`);
  console.log();

  const client  = new Anthropic({ apiKey });
  let filled    = 0;
  let skipped   = 0;

  // toProcess referansları rows içindeki aynı nesnelerdir — direkt mutate ediyoruz
  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i]!;
    const prefix = `[${i + 1}/${toProcess.length}] ${row.verse_key}#${row.word_index} ${row.arabic}`;
    process.stdout.write(`${prefix}  →  `);

    try {
      const result = await askClaude(client, row);

      if (!result) {
        console.log("boş yanıt, atlandı.");
        skipped++;
      } else {
        console.log(`"${result}"`);
        if (!dryRun) {
          row.anlam  = result;
          row.kaynak = "claude-haiku-v4";
        }
        filled++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`hata: ${msg.slice(0, 80)}`);
      skipped++;
    }

    if (i < toProcess.length - 1) await sleep(DELAY_MS);
  }

  if (!dryRun) {
    await writeFile(OUT_PATH, serializeTsv(rows), "utf8");
  }

  const stillUnknown = rows.filter((r) => r.anlam === "bilinmiyor").length;

  console.log();
  console.log("=== SONUÇ ===");
  console.log(`Doldurulan    : ${filled}`);
  console.log(`Atlanan       : ${skipped}`);
  console.log(`Hâlâ boş     : ${stillUnknown}`);
  if (dryRun) console.log("(DRY-RUN: dosya değiştirilmedi)");
  else        console.log(`Çıktı         : ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
