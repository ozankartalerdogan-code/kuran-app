import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Kullanım: node scripts/elifba-audio/build-word-map.mjs <manifest.json>');
const rows = JSON.parse(await readFile(manifestPath, 'utf8'));
const words = Object.create(null);
for (const { arapca, id } of rows) {
  if (typeof arapca !== 'string' || !arapca || !/^s\d+_\d+$/.test(id)) {
    throw new Error('Geçersiz manifest kaydı');
  }
  const word = arapca.normalize('NFC');
  if (Object.hasOwn(words, word) && words[word] !== id) throw new Error(`Çakışan kelime: ${word}`);
  words[word] = id;
}
const target = fileURLToPath(new URL('../../apps/mobile/src/data/elifba_kelime_ses.json', import.meta.url));
const output = Object.fromEntries(Object.entries(words).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
await writeFile(`${target}.tmp`, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
await rename(`${target}.tmp`, target);
console.log(`${Object.keys(output).length} kelime eşlemesi üretildi.`);
