#!/usr/bin/env node
/**
 * upload-audio-to-r2.js
 *
 * Surah MP3'lerini Cloudflare R2 bucket'a yükler.
 * Yalnızca eksik dosyaları yükler (upsert — mevcut olanları ezmez).
 *
 * Kullanım:
 *   node scripts/upload-audio-to-r2.js
 *   node scripts/upload-audio-to-r2.js --dry-run   (yükleme yapmaz, sadece listeler)
 *   node scripts/upload-audio-to-r2.js --force      (mevcut dosyaları da yeniden yükler)
 *
 * Gerekli env değişkenleri (.env.local veya ortam):
 *   R2_ACCESS_KEY_ID        Cloudflare R2 Access Key ID
 *   R2_SECRET_ACCESS_KEY    Cloudflare R2 Secret Access Key
 *   R2_ENDPOINT             https://<account-id>.r2.cloudflarestorage.com
 *   R2_BUCKET_NAME          kuran-audio (veya özelleştirilmiş isim)
 *   R2_PUBLIC_URL           https://pub-xxx.r2.dev veya custom domain (opsiyonel)
 *
 * Kurulum:
 *   npm install @aws-sdk/client-s3 dotenv --save-dev   (kök dizinde)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// dotenv — .env.local veya .env dosyasını yükle
try {
  const { config } = await import("dotenv");
  const envPath = path.resolve(process.cwd(), "apps/web/.env.local");
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
  } else {
    config(); // .env fallback
  }
} catch {
  // dotenv kurulu değilse çevre değişkenlerini doğrudan okur
}

// ── Konfigürasyon ────────────────────────────────────────────────────────────

const DRY_RUN  = process.argv.includes("--dry-run");
const FORCE    = process.argv.includes("--force");

const REQUIRED_ENV = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT", "R2_BUCKET_NAME"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n❌  Eksik env değişkenleri: ${missing.join(", ")}`);
  console.error("   apps/web/.env.local dosyasına ekleyin:\n");
  missing.forEach((k) => console.error(`   ${k}=...`));
  process.exit(1);
}

const BUCKET   = process.env.R2_BUCKET_NAME;
const ENDPOINT = process.env.R2_ENDPOINT;
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? `${ENDPOINT}/${BUCKET}`;

// ── S3 Client (R2 S3-compatible API) ────────────────────────────────────────

const client = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ── Dosya kaynağı ────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.resolve(__dirname, "../public/audio/surah");
const ALT_DIR   = path.resolve(__dirname, "../apps/web/public/audio/surah");

const sourceDir = fs.existsSync(AUDIO_DIR) ? AUDIO_DIR : ALT_DIR;

if (!fs.existsSync(sourceDir)) {
  console.error(`❌  Ses klasörü bulunamadı:\n   ${AUDIO_DIR}\n   ${ALT_DIR}`);
  process.exit(1);
}

// ── Yardımcılar ──────────────────────────────────────────────────────────────

async function objectExists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function listExisting(prefix) {
  const keys = new Set();
  let token;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    (res.Contents ?? []).forEach((o) => keys.add(o.Key));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function upload(localPath, key) {
  const body = fs.readFileSync(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket:       BUCKET,
      Key:          key,
      Body:         body,
      ContentType:  "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

// ── Ana akış ─────────────────────────────────────────────────────────────────

const mp3Files = fs
  .readdirSync(sourceDir)
  .filter((f) => f.endsWith(".mp3"))
  .sort();

if (mp3Files.length === 0) {
  console.error(`❌  ${sourceDir} içinde .mp3 bulunamadı`);
  process.exit(1);
}

console.log(`\n📦  Cloudflare R2 Upload`);
console.log(`    Bucket   : ${BUCKET}`);
console.log(`    Endpoint : ${ENDPOINT}`);
console.log(`    Kaynak   : ${sourceDir}`);
console.log(`    Dosyalar : ${mp3Files.length} MP3`);
console.log(`    Mod      : ${DRY_RUN ? "DRY-RUN" : FORCE ? "FORCE (hepsini yükle)" : "UPSERT (eksikleri yükle)"}`);
console.log();

let existing = new Set();
if (!DRY_RUN && !FORCE) {
  console.log("🔍  Mevcut dosyalar kontrol ediliyor…");
  existing = await listExisting("surah/");
  console.log(`    Bucket'ta mevcut: ${existing.size} dosya\n`);
}

let uploaded = 0;
let skipped  = 0;
let errors   = 0;

for (const file of mp3Files) {
  const key       = `surah/${file}`;
  const localPath = path.join(sourceDir, file);
  const cdnUrl    = `${PUBLIC_URL}/${key}`;

  if (DRY_RUN) {
    console.log(`  [DRY]  ${key}  →  ${cdnUrl}`);
    continue;
  }

  if (!FORCE && existing.has(key)) {
    skipped++;
    continue;
  }

  try {
    process.stdout.write(`  ⬆️   ${key}…`);
    await upload(localPath, key);
    uploaded++;
    console.log(` ✓  ${cdnUrl}`);
  } catch (err) {
    errors++;
    console.log(` ❌  HATA: ${err.message}`);
  }
}

// ── Sonuç ────────────────────────────────────────────────────────────────────

console.log();
if (DRY_RUN) {
  console.log(`✅  Dry-run tamamlandı. ${mp3Files.length} dosya listelenecekti.`);
} else {
  console.log(`✅  Tamamlandı.`);
  console.log(`    Yüklenen : ${uploaded}`);
  console.log(`    Atlanan  : ${skipped} (zaten mevcut)`);
  console.log(`    Hata     : ${errors}`);
  if (uploaded > 0) {
    console.log(`\n🌐  CDN Base URL: ${PUBLIC_URL}/surah/`);
    console.log(`    Örnek     : ${PUBLIC_URL}/surah/001.mp3`);
  }
}

process.exit(errors > 0 ? 1 : 0);
