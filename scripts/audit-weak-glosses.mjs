#!/usr/bin/env node
/**
 * audit-weak-glosses.mjs — kökü olmayan kelimelerdeki zayıf Türkçe gloss denetimi.
 *
 * words.meaning_tr, kök taşıyan kelimelerde küratörlenmiş durumda; kökü OLMAYAN
 * kelimelerde (edat, zamir, bağlaç) ise düşük güvenli satırların %97'si toplanıyor
 * ve içlerinde gerçek hata var (örn. 21:12 مِنْهَا -> "benden", doğrusu "ondan").
 *
 * Bu sınıf kapalı: sonlu sayıda edat + zamir eki. Yani hata LLM'siz, kurallı
 * biçimde saptanabilir. Edat+zamir birleşimlerinde ekin şahsı ile Türkçe karşılığın
 * şahsı örtüşmeli; örtüşmüyorsa satır hatalıdır.
 *
 * Kullanım:
 *   node scripts/audit-weak-glosses.mjs              # özet
 *   node scripts/audit-weak-glosses.mjs --list       # hatalı satırları listele
 *   node scripts/audit-weak-glosses.mjs --json=out.json
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(dir, "../data/app.db");

/** Hareke, tatvil ve yazım varyantlarını düşürür. */
export function normAr(s) {
  return (s ?? "")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Zamir ekleri. Sıra önemli: uzun ekler önce denenir, yoksa "هما" içindeki
 * "ها" yanlış eşleşir.
 */
const SUFFIXES = [
  { ar: "كما", kisi: "2d" },  // kumā  — siz ikiniz
  { ar: "هما", kisi: "3d" },  // humā  — onlar ikisi
  { ar: "كنّ", kisi: "2fp" }, // kunna — siz (dişil çoğul)
  { ar: "هنّ", kisi: "3fp" }, // hunna — onlar (dişil çoğul)
  { ar: "كن",       kisi: "2fp" },
  { ar: "هن",       kisi: "3fp" },
  { ar: "كم",       kisi: "2mp" }, // kum   — siz
  { ar: "هم",       kisi: "3mp" }, // hum   — onlar
  { ar: "نا",       kisi: "1p"  }, // nā    — biz
  { ar: "ها",       kisi: "3fs" }, // hā    — o (dişil)
  { ar: "ك",             kisi: "2s"  }, // ka/ki — sen
  { ar: "ه",             kisi: "3ms" }, // hu    — o
  { ar: "ي",             kisi: "1s"  }, // ī     — ben
];

/** Türkçe karşılığın işaret ettiği şahıs. İlk eşleşen kazanır. */
const TR_KISI = [
  { re: /\bben(den|im|imle|e|i)?\b|\bbana\b|\bbenim\b/i, kisi: "1s" },
  { re: /\bbiz(den|im|e|i|de|imle|le)?\b|\bbize\b|\büzerimize\b|\byanımızda\b/i, kisi: "1p" },
  { re: /\bsen(den|in|inle|i)?\b|\bsana\b|\bsenin\b/i, kisi: "2s" },
  { re: /\bsiz(den|in|inle|e|i|de|ler|lere)?\b|\bsize\b|\büzerinize\b/i, kisi: "2p" },
  { re: /\bonlar(dan|ın|la|a|ı|ca)?\b|\büzerlerine\b|\byanlarında\b/i, kisi: "3p" },
  { re: /\bon(dan|un|unla|a|u)\b|\bo\b|\bkendisi(nden|ne)?\b/i, kisi: "3s" },
];

/** Ek şahsını Türkçe şahıs sınıfına indirger (cinsiyet/ikil ayrımı korunmaz). */
const KABA = { "1s": "1s", "1p": "1p", "2s": "2s", "2d": "2p", "2mp": "2p", "2fp": "2p",
               "3ms": "3s", "3fs": "3s", "3d": "3p", "3mp": "3p", "3fp": "3p" };

/** Zamir eki taşıyan edatlar — kapalı liste, gövde en az 1 harf kalmalı. */
const EDATLAR = ["من", "على", "ل", "ب", "في",
                 "إلى", "مع", "عن", "إن",
                 "أن", "لعل", "كأن"];

/**
 * Formu edat + zamir eki olarak çözer; çözemezse null.
 * Baştaki bağlaç (و/ف) ve yemin/te'kid lamı düşürülür — "وَمِنْهُم" de "مِنْهُم"
 * ile aynı kurala tabidir.
 */
export function parseEkli(form) {
  let f = normAr(form);
  const onek = /^[وفل]/.test(f) && f.length > 3 ? f[0] : "";
  const govdeler = onek ? [f, f.slice(1)] : [f];
  for (const cand of govdeler) {
    for (const s of SUFFIXES) {
      if (!cand.endsWith(s.ar) || cand.length <= s.ar.length) continue;
      const govde = cand.slice(0, cand.length - s.ar.length);
      if (EDATLAR.includes(govde)) return { govde, ek: s.ar, kisi: KABA[s.kisi] };
      // Şeddeli birleşme: edatın son ünsüzü ile ekin ilk ünsüzü aynıysa tek harfe
      // iner (مِن + نا -> مِنَّا, yazımda "منا"). Düşen ünsüzü geri koyup dene.
      const telafi = govde + s.ar[0];
      if (EDATLAR.includes(telafi)) return { govde: telafi, ek: s.ar, kisi: KABA[s.kisi] };
    }
  }
  return null;
}

/** Türkçe karşılığın şahsı; bulunamazsa null. */
export function trKisi(meaning) {
  const m = (meaning ?? "").toLocaleLowerCase("tr");
  for (const t of TR_KISI) if (t.re.test(m)) return t.kisi === "3s" || t.kisi === "3p" ? t.kisi : t.kisi;
  return null;
}

/** Satır tutarlı mı? null = karar verilemedi (denetim dışı). */
export function denetle(arabic, meaning) {
  const p = parseEkli(arabic);
  if (!p) return null;
  const t = trKisi(meaning);
  if (!t) return null;
  return { beklenen: p.kisi, bulunan: t, uyum: p.kisi === t, govde: p.govde, ek: p.ek };
}

function main() {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
  const LIST = process.argv.includes("--list");
  const JSON_OUT = arg("json");

  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const rows = db.prepare(`
    SELECT verse_key, word_index, arabic, meaning_tr, confidence
    FROM   words
    WHERE  (root IS NULL OR TRIM(root) = '')
    ORDER  BY verse_key, word_index
  `).all();
  db.close();

  let denetlenen = 0, uyumlu = 0;
  const hatali = [];
  for (const r of rows) {
    const d = denetle(r.arabic, r.meaning_tr);
    if (!d) continue;
    denetlenen++;
    if (d.uyum) { uyumlu++; continue; }
    hatali.push({ ...r, beklenen: d.beklenen, bulunan: d.bulunan });
  }

  console.log(`Kökü olmayan kelime      : ${rows.length}`);
  console.log(`Kurallı denetlenebilen   : ${denetlenen} (edat + zamir eki)`);
  console.log(`  tutarlı                : ${uyumlu}`);
  console.log(`  ŞAHIS UYUŞMAZLIĞI      : ${hatali.length}`);
  const dusuk = hatali.filter((h) => h.confidence === "low").length;
  console.log(`  bunlardan low güvenli  : ${dusuk} | medium/high: ${hatali.length - dusuk}`);

  if (LIST) {
    console.log("");
    for (const h of hatali.slice(0, 60)) {
      console.log(`  ${h.verse_key.padEnd(8)} ${h.arabic}  →  ${JSON.stringify(h.meaning_tr)}  ` +
                  `[ek: ${h.beklenen}, anlam: ${h.bulunan}] ${h.confidence}`);
    }
    if (hatali.length > 60) console.log(`  … ve ${hatali.length - 60} satır daha`);
  }
  if (JSON_OUT) {
    fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify(hatali, null, 1), "utf-8");
    console.log(`\nHatalı satırlar: ${JSON_OUT}`);
  }
  process.exitCode = hatali.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
