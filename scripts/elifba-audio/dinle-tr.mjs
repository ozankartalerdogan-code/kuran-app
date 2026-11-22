// Üretilen kelime seslerini bir Gemini modeline dinletip duyulanı Türkçe harflerle yazdırır, okunuşla karşılaştırır.
// Ön eleme içindir, kesin hakem değildir: hatalıların hepsi ve kalın harfli doğruların bir kısmı kulakla dinlenmeli.
// Neon önerisi: sayfa sırası bağlamı tahmine itmesin diye kayıtlar karıştırılır, 10'luk gruplarla, sıcaklık 0.
// Kullanım: node scripts/elifba-audio/dinle-tr.mjs --dir <kelime klasörü> --liste <_ham_*.json> [--model gemini-3.6-flash]
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PROMPT = n => `Aşağıda ${n} kısa ses kaydı var. Her kayıtta tek bir sözcük söyleniyor; sözcükler anlamsız olabilir. `
  + 'Her kayıt için yalnız duyduğuna göre sözcüğü TÜRKÇE Latin harfleriyle, tam duyulduğu gibi yaz; Arap harfi kullanma, '
  + 'bildiğin bir kelimeye benzetme, düzeltme. İnce/kalın ünlü farkına dikkat et (a/e, ı/i, o/ö, u/ü). '
  + "Uzun ünlüyü â î û ile, boğazdan gelen durak sesini ' ile göster. "
  + 'Ayrıca her kayıt için: uzatma_var (bir hece belirgin uzatıldı mı), yabanci_aksan (Arapça boğaz/kalın ses, '
  + 'ğayn, hı gibi Türkçede olmayan ses var mı), kirpik (baş ya da son ses kesik mi). '
  + 'Yalnız JSON dizi döndür: [{"no":1,"duyulan":"...","uzatma_var":false,"yabanci_aksan":false,"kirpik":false}, ...]';

const norm = s => (s ?? '').toLocaleLowerCase('tr').replace(/[’`ʼ]/g, "'").replace(/q/g, 'k').replace(/[.\s-]/g, '');

async function main() {
  const { values } = parseArgs({ options: {
    dir: { type: 'string' }, liste: { type: 'string' }, model: { type: 'string', default: 'gemini-3.6-flash' },
    grup: { type: 'string', default: '10' },
  } });
  if (!values.dir || !values.liste) throw new Error('--dir ve --liste zorunlu.');
  const key = (await readFile(join(ROOT, '.env.local'), 'utf8')).match(/^\s*GEMINI_TTS_API_KEY\s*=\s*['"]?([^'"\r\n]+)/m)[1].trim();
  const words = JSON.parse(await readFile(values.liste, 'utf8')).filter(w => !w.capa);
  const shuffled = words.map(w => [Math.random(), w]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const size = Number(values.grup), sonuc = {};
  for (let i = 0; i < shuffled.length; i += size) {
    const g = shuffled.slice(i, i + size);
    const parts = [{ text: PROMPT(g.length) }];
    for (const [k, w] of g.entries()) {
      parts.push({ text: `Kayıt ${k + 1}:` });
      parts.push({ inlineData: { mimeType: 'audio/wav', data: (await readFile(join(values.dir, `${w.id}.wav`))).toString('base64') } });
    }
    let j;
    for (let a = 0; a < 3; a++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${values.model}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
      });
      j = await r.json().catch(() => ({}));
      if (r.ok) break;
      console.log(`  ${r.status} ${j.error?.message?.slice(0, 100)} — bekleniyor`); j = null; await sleep(20_000);
    }
    const arr = JSON.parse((j?.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('') || '[]');
    for (const x of arr) if (g[x.no - 1]) sonuc[g[x.no - 1].id] = x;
  }
  let ok = 0;
  const rows = words.map(w => {
    const x = sonuc[w.id] ?? {};
    const same = norm(x.duyulan) === norm(w.okunus);
    if (same) ok++;
    const isaret = [x.uzatma_var && 'uzatma', x.yabanci_aksan && 'aksan', x.kirpik && 'kırpık'].filter(Boolean).join(',');
    return `${same ? '  ' : 'XX'} ${w.id}\t${w.okunus}\t${x.duyulan ?? '-'}${isaret ? `\t[${isaret}]` : ''}`;
  });
  const txt = rows.join('\n') + `\n${ok}/${words.length} birebir (${values.model})`;
  await writeFile(values.liste.replace(/\.json$/, '.dinleme.txt'), txt);
  console.log(txt);
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
