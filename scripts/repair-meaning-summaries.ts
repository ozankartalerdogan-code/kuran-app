/**
 * repair-meaning-summaries.ts
 *
 * Bozuk ai_meaning_summary kayıtlarını siler ve yeniden üretir:
 *  1. Türkçe dışı karakter (Japonca, Arapça vb.) içerenler
 *  2. Nokta/!/? ile bitmeyen ve length > 100 olan truncate kayıtlar
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/repair-meaning-summaries.ts [--dry-run]
 *
 * --dry-run  → Silme/yazma yapmaz, sadece listeler
 */

import Anthropic from "@anthropic-ai/sdk";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(currentDirectory, "../data/app.db");

const DELAY_MS  = 200;
const NOTE_TYPE = "ai_meaning_summary";
const MODEL     = "claude-haiku-4-5";

// CJK, Japonca, Arapça bloklar
const FOREIGN_RE = /[؀-ۿ　-鿿가-힯]/;

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface NoteRow    { verse_key: string; text: string }
interface WordRow    { meaning_tr: string | null }

function findBadKeys(db: DatabaseSync): string[] {
  const rows = db
    .prepare(`SELECT verse_key, text FROM context_notes WHERE type = ?`)
    .all(NOTE_TYPE) as unknown as NoteRow[];

  const bad = new Set<string>();
  for (const r of rows) {
    const t = r.text.trim();
    if (FOREIGN_RE.test(t)) {
      bad.add(r.verse_key);
    }
    if (t.length > 100 && !/[.!?]$/.test(t)) {
      bad.add(r.verse_key);
    }
  }
  return [...bad].sort();
}

function getMeanings(db: DatabaseSync, verseKey: string): string[] {
  const rows = db
    .prepare(
      "SELECT meaning_tr FROM words WHERE verse_key = ? AND meaning_tr IS NOT NULL AND trim(meaning_tr) != '' AND role NOT IN ('particle', 'pronoun') ORDER BY word_index ASC"
    )
    .all(verseKey) as unknown as WordRow[];
  return rows.map((r) => r.meaning_tr as string).filter(Boolean);
}

function deleteNote(db: DatabaseSync, verseKey: string): void {
  db.prepare(`DELETE FROM context_notes WHERE verse_key = ? AND type = ?`).run(verseKey, NOTE_TYPE);
}

function writeNote(db: DatabaseSync, verseKey: string, text: string): void {
  db.prepare(
    "INSERT INTO context_notes (verse_key, scope, type, source, text) VALUES (?, 'ayah', ?, ?, ?)"
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
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Bu Kuran ayetinin kelime anlamlarından kısa, sade bir Türkçe özet yaz. Sadece Türkçe yaz. Kurallar: başlık ekleme, markdown kullanma, düz metin yaz, maksimum 1 cümle, yorum yapma sadece kelimelerin anlamını birleştir. Kelimeler: ${kelimeler}`,
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

  const dryRun = isDryRun();
  console.log(dryRun ? "=== DRY-RUN MODU ===" : "=== ONARIM CALISTIRILIYOR ===");
  console.log();

  const client = new Anthropic({ apiKey });
  const db = new DatabaseSync(DB_PATH);

  const badKeys = findBadKeys(db);
  console.log(`Bozuk kayıt sayısı: ${badKeys.length}`);
  console.log();

  let repaired    = 0;
  let skipped     = 0;
  let totalInput  = 0;
  let totalOutput = 0;

  for (let i = 0; i < badKeys.length; i++) {
    const verseKey = badKeys[i]!;
    process.stdout.write(`[${i + 1}/${badKeys.length}] ${verseKey}  `);

    const meanings = getMeanings(db, verseKey);
    if (meanings.length === 0) {
      console.log("[anlam yok, atlaniyor]");
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] (${meanings.length} kelime)`);
      continue;
    }

    if (meanings.length === 1) {
      deleteNote(db, verseKey);
      const direct = meanings[0] + ".";
      writeNote(db, verseKey, direct);
      console.log(`(1 kelime) [direkt] "${direct}"`);
      repaired++;
      continue;
    }

    process.stdout.write(`(${meanings.length} kelime)  →  `);

    try {
      const result = await askHaiku(client, meanings);
      totalInput  += result.inputTokens;
      totalOutput += result.outputTokens;

      if (!result.text) {
        console.log("[bos yanit, atlaniyor]");
        skipped++;
      } else {
        deleteNote(db, verseKey);
        writeNote(db, verseKey, result.text);
        console.log(`"${result.text.slice(0, 90)}${result.text.length > 90 ? "..." : ""}"  [in:${result.inputTokens} out:${result.outputTokens}]`);
        repaired++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[hata: ${message.slice(0, 60)}]`);
      skipped++;
    }

    if (i < badKeys.length - 1) await sleep(DELAY_MS);
  }

  db.close();

  console.log();
  console.log("=== SONUC ===");
  console.log(`Onarilan  : ${repaired}`);
  console.log(`Atlanan   : ${skipped}`);
  console.log(`Toplam    : ${badKeys.length}`);
  if (totalInput > 0) {
    console.log();
    console.log("=== TOKEN ===");
    console.log(`Input    : ${totalInput}`);
    console.log(`Output   : ${totalOutput}`);
    console.log(`Toplam   : ${totalInput + totalOutput}`);
  }
}

main().catch((error) => {
  console.error("Beklenmedik hata:", error);
  process.exit(1);
});
