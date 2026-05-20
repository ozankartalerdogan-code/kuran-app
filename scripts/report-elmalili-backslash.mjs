import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mdDir = path.join(root, 'data/tafsir/elmalili');
const outDir = path.join(root, 'docs');
const outFile = path.join(outDir, 'elmalili-missing-arabic.md');

const lines = ['# Elmalılı Tefsiri — `\\"` Karakteri İçeren Satırlar\n'];
lines.push('Kaynak: `data/tafsir/elmalili/*.md`\n');

let totalLines = 0;
let totalSures = 0;

for (let i = 1; i <= 114; i++) {
  const text = await readFile(path.join(mdDir, `${i}.md`), 'utf8');
  const fileLines = text.split('\n');
  const hits = [];

  fileLines.forEach((line, idx) => {
    if (line.includes('\\"')) {
      hits.push({ lineNo: idx + 1, content: line });
    }
  });

  if (hits.length === 0) continue;
  totalSures++;
  totalLines += hits.length;

  lines.push(`## Sure ${i} (${hits.length} satır)\n`);
  for (const h of hits) {
    lines.push(`- **Satır ${h.lineNo}:** \`${h.content.replace(/`/g, "'")}\``);
  }
  lines.push('');
}

lines.push(`---\n**Toplam:** ${totalSures} sure, ${totalLines} satır`);

await mkdir(outDir, { recursive: true });
await writeFile(outFile, lines.join('\n'), 'utf8');

console.log(`Kaydedildi: docs/elmalili-missing-arabic.md`);
console.log(`Toplam sure: ${totalSures}, toplam satır: ${totalLines}`);
