import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/tafsir/elmalili');

const results = [];

for (let i = 1; i <= 114; i++) {
  const text = await readFile(path.join(dir, `${i}.md`), 'utf8');
  const countDQ = (text.split('\\"').length - 1);
  const countSQ = (text.split("\\'").length - 1);

  // Örnek satır: \" içeren ilk satır
  const exampleLine = text.split('\n').find(l => l.includes('\\"')) ?? '';

  results.push({ surahId: i, countDQ, countSQ, total: countDQ + countSQ, exampleLine: exampleLine.slice(0, 80) });
}

// Toplam
const totalDQ = results.reduce((s, r) => s + r.countDQ, 0);
const totalSQ = results.reduce((s, r) => s + r.countSQ, 0);
const withAny  = results.filter(r => r.total > 0).length;

console.log(`=== GENEL ===`);
console.log(`Toplam \\"  : ${totalDQ}`);
console.log(`Toplam \\'  : ${totalSQ}`);
console.log(`Etkilenen sure: ${withAny}/114`);
console.log();

// En yoğun 20 sure
console.log('=== EN YOĞUN 20 SURE ===');
const top20 = [...results].sort((a, b) => b.total - a.total).slice(0, 20);
console.log('Sure  BQ    SQ    Toplam  Örnek satır');
for (const r of top20) {
  if (r.total === 0) break;
  console.log(`${String(r.surahId).padEnd(5)} ${String(r.countDQ).padEnd(5)} ${String(r.countSQ).padEnd(5)} ${String(r.total).padEnd(7)} ${r.exampleLine}`);
}

// Sıfır olanlar
const clean = results.filter(r => r.total === 0).map(r => r.surahId);
console.log(`\n=== TEMİZ SURELER (\\\" YOK) ===`);
console.log(clean.join(', '));
