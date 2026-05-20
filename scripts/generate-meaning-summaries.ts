/**
 * generate-meaning-summaries.ts
 *
 * Her ayet için kelime anlamlarından (noun/verb/adjective) Claude Haiku ile
 * kısa Türkçe özet üretir. Sonucu app.db context_notes tablosuna
 * (type='ai_meaning_summary') yazar. Mevcut kayıtları atlar (cache).
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/generate-meaning-summaries.ts [--test]
 *
 * --test  → Sadece ilk 5 ayeti işle
 */

import Anthropic from "@anthropic-ai/sdk";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(currentDirectory, "../data/app.db");

const DELAY_MS   = 200;
const TEST_LIMIT = 5;
const NOTE_TYPE  = "ai_meaning_summary";
const MODEL      = "claude-haiku-4-5";

function isTestMode(): boolean {
  return process.argv.includes("--test");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface VerseKeyRow { verse_key: string }
interface WordRow     { meaning_tr: string | null }
interface CacheRow    { text: string }

function getAllVerseKeys(db: DatabaseSync): string[] {
  const rows = db
    .prepare("SELECT DISTINCT verse_key FROM verses ORDER BY verse_key")
    .all() as unknown as VerseKeyRow[];
  return rows.map((r) => r.verse_key);
}

function getUncachedVerseKeys(db: DatabaseSync, limit: number): string[] {
  const rows = db
    .prepare(
      "SELECT v.verse_key FROM verses v LEFT JOIN context_notes cn ON cn.verse_key = v.verse_key AND cn.type = ? WHERE cn.verse_key IS NULL ORDER BY v.verse_key LIMIT ?"
    )
    .all(NOTE_TYPE, limit) as unknown as VerseKeyRow[];
  return rows.map((r) => r.verse_key);
}

function getCachedSummary(db: DatabaseSync, verseKey: string): string | null {
  const row = db
    .prepare("SELECT text FROM context_notes WHERE verse_key = ? AND type = ?")
    .get(verseKey, NOTE_TYPE) as unknown as CacheRow | undefined;
  return row?.text ?? null;
}

function getMeanings(db: DatabaseSync, verseKey: string): string[] {
  const rows = db
    .prepare(
      "SELECT meaning_tr FROM words WHERE verse_key = ? AND meaning_tr IS NOT NULL AND trim(meaning_tr) != '' AND role NOT IN ('particle', 'pronoun') ORDER BY word_index ASC"
    )
    .all(verseKey) as unknown as WordRow[];
  return rows.map((r) => r.meaning_tr as string).filter(Boolean);
}

function writeSummary(db: DatabaseSync, verseKey: string, text: string): void {
  db.prepare(
    "INSERT OR IGNORE INTO context_notes (verse_key, scope, type, source, text) VALUES (?, 'ayah', ?, ?, ?)"
  ).run(verseKey, NOTE_TYPE, MODEL, text);
}

interface AskResult {
  text: string | null;
  inputTokens: number;
  outputTokens: number;
}

async function askHaiku(client: Anthropic, meanings: string[]): Promise<AskResult> {
  const kelimeler = meanings.join(", ");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 120,
    messages: [
      {
        role: "user",
        content: `Bu Kuran ayetinin kelime anlamlarından kısa, sade bir Türkçe özet yaz. Kurallar: başlık ekleme, markdown kullanma, düz metin yaz, maksimum 1 cümle, yorum yapma sadece kelimelerin anlamını birleştir. Kelime sayısı ne olursa olsun tek düz cümle yaz, asla başlık veya markdown ekleme. Kelimeler: ${kelimeler}`,
      },
    ],
  });

  const block = response.content[0];
  const text = block?.type === "text" && block.text.trim().length > 0
    ? block.text.trim()
    : null;

  return {
    text,
    inputTokens:  response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Hata: ANTHROPIC_API_KEY ortam degiskeni bulunamadi.");
    process.exit(1);
  }

  const testMode = isTestMode();
  console.log(testMode ? "=== TEST MODU (ilk 5 ayet) ===" : "=== TAM CALISTIRMA ===");
  console.log();

  const client = new Anthropic({ apiKey });
  const db = new DatabaseSync(DB_PATH);

  const allKeys    = getAllVerseKeys(db);
  const toProcess  = testMode ? getUncachedVerseKeys(db, TEST_LIMIT) : allKeys;

  console.log(`Toplam ayet    : ${allKeys.length}`);
  console.log(`Isleme alinacak: ${toProcess.length}`);
  console.log();

  let generated      = 0;
  let cached         = 0;
  let skipped        = 0;
  let totalInputTok  = 0;
  let totalOutputTok = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const verseKey = toProcess[i];
    if (!verseKey) continue;

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${verseKey}  `);

    const existing = getCachedSummary(db, verseKey);
    if (existing) {
      console.log(`[cache] "${existing.slice(0, 60)}..."`);
      cached++;
      continue;
    }

    const meanings = getMeanings(db, verseKey);
    if (meanings.length === 0) {
      console.log("[anlam yok, atlaniyor]");
      skipped++;
      continue;
    }

    if (meanings.length === 1) {
      const direct = meanings[0] + ".";
      writeSummary(db, verseKey, direct);
      console.log(`(1 kelime) [direkt] "${direct}"`);
      generated++;
      continue;
    }

    process.stdout.write(`(${meanings.length} kelime)  →  `);

    try {
      const result = await askHaiku(client, meanings);

      totalInputTok  += result.inputTokens;
      totalOutputTok += result.outputTokens;

      if (!result.text) {
        console.log("[bos yanit, atlaniyor]");
        skipped++;
      } else {
        writeSummary(db, verseKey, result.text);
        console.log(`"${result.text.slice(0, 80)}${result.text.length > 80 ? "..." : ""}"  [in:${result.inputTokens} out:${result.outputTokens}]`);
        generated++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[hata: ${message.slice(0, 60)}]`);
      skipped++;
    }

    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  db.close();

  console.log();
  console.log("=== SONUC ===");
  console.log(`Uretilen   : ${generated}`);
  console.log(`Cache hit  : ${cached}`);
  console.log(`Atlanan    : ${skipped}`);
  console.log(`Toplam     : ${toProcess.length}`);
  if (totalInputTok > 0 || totalOutputTok > 0) {
    console.log();
    console.log("=== TOKEN KULLANIMI ===");
    console.log(`Input token  : ${totalInputTok}`);
    console.log(`Output token : ${totalOutputTok}`);
    console.log(`Toplam       : ${totalInputTok + totalOutputTok}`);
    if (generated > 0) {
      console.log(`Ort. input/ayet  : ${(totalInputTok  / generated).toFixed(1)}`);
      console.log(`Ort. output/ayet : ${(totalOutputTok / generated).toFixed(1)}`);
    }
  }
}

main().catch((error) => {
  console.error("Beklenmedik hata:", error);
  process.exit(1);
});
