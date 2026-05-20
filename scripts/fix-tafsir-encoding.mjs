import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PATH = path.resolve(dir, '../data/tafsir/surah/index.json');
const BAK  = PATH + '.bak';

const raw = await readFile(PATH, 'utf8');
const entries = JSON.parse(raw);

// Yedek al (varsa üzerine yaz)
await copyFile(PATH, BAK);

// Regex'ler — dosya içinde yazıldığı için heredoc sorunu yok
const reBackslashQuote = /\\"/g;   // \" → "
const reBackslashApos  = /\\'/g;   // \' → '
const reEuro           = /€/g;     // € → space
const reEEClose        = /ÉÊ\}/g;  // ÉÊ} → (remove)
// Bozuk Arapça bloklar: {* veya {harfler...} içinde CP1256 kalıpları
const reCorruptArabic  = /\{\*?\n?\n?\d*\.?\s*[èòåîãæñÇÉÊÓäö]{2,}[^}]*\}/gms;

function countOccurrences(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

let stats = { backslashQuote: 0, backslashApos: 0, euro: 0, eeClose: 0, corruptArabic: 0 };
let fixedEntries = 0;

const result = entries.map(entry => {
  const orig = entry.text ?? '';
  if (!orig) return entry;

  // İstatistik say
  stats.backslashQuote += countOccurrences(orig, reBackslashQuote);
  stats.backslashApos  += countOccurrences(orig, reBackslashApos);
  stats.euro           += countOccurrences(orig, reEuro);
  stats.eeClose        += countOccurrences(orig, reEEClose);
  stats.corruptArabic  += countOccurrences(orig, reCorruptArabic);

  // Düzelt
  let t = orig;
  t = t.replace(reBackslashQuote, '"');
  t = t.replace(reBackslashApos,  "'");
  t = t.replace(reEuro,           ' ');
  t = t.replace(reEEClose,        '');
  t = t.replace(reCorruptArabic,  '');
  t = t.replace(/  +/g,           ' ').trim();

  if (t !== orig) fixedEntries++;
  return { ...entry, text: t };
});

await writeFile(PATH, JSON.stringify(result, null, 2) + '\n', 'utf8');

// Doğrulama: yeniden oku
const check = JSON.parse(await readFile(PATH, 'utf8'));
let remaining = { backslashQuote: 0, backslashApos: 0, euro: 0, eeClose: 0 };
for (const e of check) {
  const t = e.text ?? '';
  if (t.includes('\\"'))  remaining.backslashQuote++;
  if (t.includes("\\'"))  remaining.backslashApos++;
  if (t.includes('€'))    remaining.euro++;
  if (t.includes('ÉÊ}')) remaining.eeClose++;
}

console.log('=== DÜZELTME İSTATİSTİKLERİ ===');
console.log('Düzeltilen sure sayısı :', fixedEntries);
console.log();
console.log('Düzeltilen occurence:');
console.log('  backslashQuote:', stats.backslashQuote);
console.log('  backslashApos :', stats.backslashApos);
console.log('  € → boşluk :', stats.euro);
console.log('  ÉÊ} kaldır :', stats.eeClose);
console.log('  Bozuk Arapça blok:', stats.corruptArabic);
console.log();
console.log('=== DOĞRULAMA (kalan sorunlar) ===');
console.log(remaining);
