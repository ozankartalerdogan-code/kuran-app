/**
 * fill-root-explanations.ts
 *
 * canonical_word_analysis.json içindeki tüm benzersiz kökleri çıkarır,
 * root_explanations_tr_v2_easy_only.json ile karşılaştırır ve short_tr
 * boş veya eksik olanları Anthropic API ile doldurur.
 *
 * Kullanım:
 *   node --no-warnings --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/fill-root-explanations.ts [--test]
 *
 * --test  → Sadece ilk 10 eksik kökü işle (deneme modu)
 */

import Anthropic from "@anthropic-ai/sdk";
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");

const DB_PATH = path.join(projectRoot, "data/app.db");
const V2_PATH = path.join(
  projectRoot,
  "data2/processed/root_explanations_tr_v2_easy_only.json"
);
const DELAY_MS = 100;
const TEST_LIMIT = 10;

interface V2Entry {
  root: string;
  frequency?: number;
  short_tr: string;
  summary_tr: string;
  sources?: string[];
  review_status?: string;
  [key: string]: unknown;
}

function isTestMode(): boolean {
  return process.argv.includes("--test");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCanonicalRoots(): Map<string, number> {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    const rows = db
      .prepare("SELECT root, COUNT(*) AS freq FROM words WHERE root IS NOT NULL AND trim(root) != '' AND root NOT IN ('Any', 'أني', 'كيف') AND (morphology IS NULL OR morphology NOT LIKE '%INTG%') GROUP BY root")
      .all() as unknown as Array<{ root: string; freq: number }>;
    const rootFreq = new Map<string, number>();
    for (const row of rows) {
      rootFreq.set(row.root.trim(), row.freq);
    }
    return rootFreq;
  } finally {
    db.close();
  }
}

async function loadV2(): Promise<V2Entry[]> {
  const content = await readFile(V2_PATH, "utf8");
  return JSON.parse(content) as V2Entry[];
}

async function saveV2(entries: V2Entry[]): Promise<void> {
  await writeFile(V2_PATH, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

function buildMissingList(
  rootFreq: Map<string, number>,
  v2Entries: V2Entry[]
): Array<{ root: string; freq: number; v2Index: number | null }> {
  const v2Map = new Map<string, number>();
  for (let i = 0; i < v2Entries.length; i++) {
    const entry = v2Entries[i];
    if (entry && entry.root) {
      v2Map.set(entry.root, i);
    }
  }

  const missing: Array<{ root: string; freq: number; v2Index: number | null }> = [];

  for (const [root, freq] of rootFreq.entries()) {
    const idx = v2Map.get(root);
    if (idx === undefined) {
      missing.push({ root, freq, v2Index: null });
    } else {
      const entry = v2Entries[idx];
      const hasText = entry && (entry.short_tr?.trim() || entry.summary_tr?.trim());
      if (!hasText) {
        missing.push({ root, freq, v2Index: idx });
      }
    }
  }

  return missing.sort((a, b) => b.freq - a.freq);
}

async function askClaude(client: Anthropic, root: string): Promise<string | null> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 64,
    messages: [
      {
        role: "user",
        content: `Bu Arapça kökün (${root}) kısa Türkçe açıklaması nedir? Sadece 3-5 kelimelik sade bir tanım ver, başka hiçbir şey yazma.`,
      },
    ],
  });

  const block = response.content[0];
  if (block?.type !== "text") return null;
  const text = block.text.trim();
  return text.length > 0 ? text : null;
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Hata: ANTHROPIC_API_KEY ortam degiskeni bulunamadi.");
    process.exit(1);
  }

  const testMode = isTestMode();
  console.log(testMode ? "=== TEST MODU (ilk 10 kok) ===" : "=== TAM CALISTIRMA ===");
  console.log();

  const client = new Anthropic({ apiKey });

  console.log("Veriler yukleniyor...");
  const [v2Entries] = await Promise.all([loadV2()]);
  const rootFreq = loadCanonicalRoots();

  console.log(`Canonical benzersiz kok: ${rootFreq.size}`);
  console.log(`V2 mevcut kayit: ${v2Entries.length}`);

  const missing = buildMissingList(rootFreq, v2Entries);
  const toProcess = testMode ? missing.slice(0, TEST_LIMIT) : missing;

  console.log(`Eksik veya bos short_tr: ${missing.length}`);
  console.log(`Isleme alinacak: ${toProcess.length}`);
  console.log();

  let filled = 0;
  let skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    if (!item) continue;
    const { root, freq, v2Index } = item;

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${root} (freq=${freq})  →  `);

    try {
      const result = await askClaude(client, root);

      if (!result) {
        console.log("bos yanit, atlaniyor.");
        skipped++;
      } else {
        console.log(`"${result}"`);

        if (v2Index !== null) {
          const entry = v2Entries[v2Index];
          if (entry) {
            entry.short_tr = result;
          }
        } else {
          v2Entries.push({
            root,
            frequency: freq,
            short_tr: result,
            summary_tr: "",
            sources: ["anthropic-fill"],
            review_status: "auto-filled",
          });
        }

        await saveV2(v2Entries);
        filled++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`hata, atlaniyor: ${message.slice(0, 80)}`);
      skipped++;
    }

    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log();
  console.log("=== SONUC ===");
  console.log(`Doldurulan kok:  ${filled}`);
  console.log(`Atlanan kok:     ${skipped}`);
  console.log(`Toplam islenen:  ${toProcess.length}`);

  if (!testMode && missing.length > toProcess.length) {
    console.log(`Kalan eksik:     ${missing.length - toProcess.length}`);
  }
}

main().catch((error) => {
  console.error("Beklenmedik hata:", error);
  process.exit(1);
});
