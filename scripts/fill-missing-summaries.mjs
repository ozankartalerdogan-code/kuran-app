/**
 * fill-missing-summaries.mjs
 * ai_meaning_summary eksik olan ayetler için Diyanet çevirisiyle Haiku çağırır.
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local scripts/fill-missing-summaries.mjs
 */

import Anthropic from "@anthropic-ai/sdk";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir    = path.dirname(fileURLToPath(import.meta.url));
const DB     = path.resolve(dir, "../data/app.db");
const MODEL  = "claude-haiku-4-5-20251001";
const TYPE   = "ai_meaning_summary";
const SOURCE = "diyanet";

const db = new DatabaseSync(DB, { readOnly: false });
db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;");

// 1. Eksik ayetleri bul
const missing = db.prepare(`
  SELECT v.verse_key FROM verses v
  WHERE NOT EXISTS (
    SELECT 1 FROM context_notes c
    WHERE c.verse_key = v.verse_key AND c.type = ?
  )
  ORDER BY v.verse_key
`).all(TYPE).map(r => r.verse_key);

console.log(`Eksik ayet: ${missing.length}`);
if (missing.length === 0) { console.log("Tüm ayetlerde summary mevcut."); db.close(); process.exit(0); }

// 2. Çeviri al
const getTranslation = db.prepare(
  "SELECT text FROM translations WHERE verse_key=? AND source=? LIMIT 1"
);

// 3. Haiku çağrısı
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summarize(verseKey, text) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [{
      role: "user",
      content: `Kuran ayeti çevirisi: "${text}"\n\nBu ayetin içeriğini tek sade Türkçe cümleyle özetle. Başlık, markdown veya yorum ekleme.`
    }]
  });
  const block = res.content[0];
  return block?.type === "text" ? block.text.trim() : null;
}

// 4. Insert
const insert = db.prepare(
  "INSERT OR IGNORE INTO context_notes (verse_key, scope, type, source, text) VALUES (?, 'ayah', ?, ?, ?)"
);

let done = 0, skipped = 0;

for (const vk of missing) {
  process.stdout.write(`[${vk}] `);

  // Diyanet çevirisini al
  const row = getTranslation.get(vk, SOURCE);
  if (!row?.text) {
    // Diyanet yoksa farklı kaynak dene
    const alt = db.prepare(
      "SELECT text FROM translations WHERE verse_key=? LIMIT 1"
    ).get(vk);
    if (!alt?.text) {
      console.log("çeviri yok, atlaniyor");
      skipped++;
      continue;
    }
    row = alt;
  }

  try {
    const summary = await summarize(vk, row.text);
    if (!summary) { console.log("boş yanıt, atlaniyor"); skipped++; continue; }

    insert.run(vk, TYPE, MODEL, summary);
    console.log(`✓  "${summary.slice(0, 70)}${summary.length > 70 ? "..." : ""}"`);
    done++;
  } catch (err) {
    console.log(`hata: ${err.message?.slice(0, 60)}`);
    skipped++;
  }

  await new Promise(r => setTimeout(r, 250));
}

db.close();
console.log(`\nTamamlanan: ${done}  Atlanan: ${skipped}`);
