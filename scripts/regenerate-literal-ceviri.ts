/**
 * regenerate-literal-ceviri.ts
 *
 * Bozuk literal_ceviri alanlarını (kelime kelime ham gloss girmiş olanları)
 * Arapça metin + primary_translation + ham gloss girdilerinden yola çıkarak
 * Claude ile DÜZGÜN, gramerli "literal çeviri" cümlesine dönüştürür.
 *
 * Tespit: literal_ceviri küçük harfle başlıyor VEYA ham morfoloji eki içeriyor
 *         (ham_anlam_ozeti ile birebir aynı olanlar).
 *
 * Çalıştırmadan önce orijinal değerler scripts/_literal_backup_*.json'a yedeklenir.
 *
 * Kullanım:
 *   node --no-warnings --env-file=.env.local --loader ./scripts/ts-extension-loader.mjs \
 *     scripts/regenerate-literal-ceviri.ts [--test] [--limit=N]
 *
 *   --test       → Sadece ilk 5 ayet (yazma yapar, dikkat)
 *   --dry        → Hiç yazma yapma, sadece üretip ekrana bas
 *   --limit=N    → En fazla N ayet işle
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(currentDirectory, "../data/app.db");

// DeepSeek — OpenAI uyumlu endpoint
const API_URL  = "https://api.deepseek.com/chat/completions";
const MODEL    = "deepseek-chat";
const DELAY_MS = 150;

interface VerseRow {
  verse_key: string;
  arabic_text: string | null;
  primary_translation: string | null;
  literal_ceviri: string | null;
  ham_anlam_ozeti: string | null;
}

function arg(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : undefined;
}
const TEST = process.argv.includes("--test");
const DRY  = process.argv.includes("--dry");
const LIMIT = arg("limit") ? Number(arg("limit")) : undefined;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Bozuk tespiti (sayım scriptiyle aynı mantık) ──────────────────────────────
function startsLower(t: string): boolean {
  const c = t.trim()[0];
  return !!c && c === c.toLowerCase() && c !== c.toUpperCase();
}
function isBroken(t: string | null): boolean {
  if (!t || !t.trim()) return false;
  // Düzgün Türkçe cümle büyük harfle başlar; küçük harfle başlayanlar ham gloss.
  return startsLower(t);
}

function getBrokenVerses(db: DatabaseSync): VerseRow[] {
  const rows = db
    .prepare(
      "SELECT verse_key, arabic_text, primary_translation, literal_ceviri, ham_anlam_ozeti FROM verses WHERE literal_ceviri IS NOT NULL AND literal_ceviri != '' ORDER BY surah_id, ayah_number"
    )
    .all() as unknown as VerseRow[];
  return rows.filter((r) => isBroken(r.literal_ceviri));
}

async function askDeepSeek(apiKey: string, v: VerseRow): Promise<string | null> {
  const prompt = `Bu Kuran ayetinin TÜRKÇE literal (lafzî) çevirisini yaz: Arapça kelime sırasına sadık ama gramerli, akıcı tek cümle. Kelimeleri TÜRKÇE'ye çevir (Arapça transliterasyon yazma). Yorum/parantez/başlık/tırnak/markdown EKLEME, sadece düz metin cümleyi döndür.
ARAPÇA: ${v.arabic_text ?? ""}
MEAL: ${v.primary_translation ?? ""}
GLOSS: ${v.ham_anlam_ozeti ?? v.literal_ceviri ?? ""}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      temperature: 1.0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  return text.length > 0 ? text : null;
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("Hata: DEEPSEEK_API_KEY bulunamadı.");
    process.exit(1);
  }

  const db = new DatabaseSync(DB_PATH);

  let broken = getBrokenVerses(db);
  console.log(`Bozuk literal_ceviri tespit edilen ayet: ${broken.length}`);

  if (TEST) broken = broken.slice(0, 5);
  if (LIMIT) broken = broken.slice(0, LIMIT);
  console.log(`İşlenecek: ${broken.length}  ${DRY ? "(DRY — yazma yok)" : ""}`);
  console.log();

  // Yedek
  if (!DRY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.resolve(currentDirectory, `_literal_backup_${stamp}.json`);
    fs.writeFileSync(
      backupPath,
      JSON.stringify(broken.map((b) => ({ verse_key: b.verse_key, old: b.literal_ceviri })), null, 2),
      "utf-8"
    );
    console.log(`Yedek alındı: ${backupPath}\n`);
  }

  const update = db.prepare("UPDATE verses SET literal_ceviri = ? WHERE verse_key = ?");

  let ok = 0, fail = 0;
  for (let i = 0; i < broken.length; i++) {
    const v = broken[i];
    process.stdout.write(`[${i + 1}/${broken.length}] ${v.verse_key}  `);
    try {
      const text = await askDeepSeek(apiKey, v);
      if (!text) { console.log("✗ boş yanıt"); fail++; continue; }
      if (DRY) {
        console.log(`\n   ESKİ: ${v.literal_ceviri}\n   YENİ: ${text}`);
      } else {
        update.run(text, v.verse_key);
        console.log(`✓ ${text.slice(0, 60)}${text.length > 60 ? "…" : ""}`);
      }
      ok++;
    } catch (e) {
      console.log(`✗ hata: ${(e as Error).message}`);
      fail++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nBitti. Başarılı: ${ok}  Hata: ${fail}`);
}

main();
