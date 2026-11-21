// Elif-Ba alıştırma kelimelerini Türkçe okunuşuyla (yazıldığı gibi) Gemini TTS'e okutur.
// Arapça metin verildiğinde Gemini sesleri mahreçleri bozuyordu (ظ → v); kullanıcı dinleyip
// Türkçe okunuş + Türkçe talimatı daha doğru buldu (21 Kasım 2026).
// Kullanım: node scripts/elifba-audio/generate-tr.mjs --out <repo dışı klasör> [--list] [--only id,...] [--force]
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { extractWords, transliterate, CONS_TR } from './generate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MODEL = 'gemini-2.5-flash-preview-tts';
export const TR_STYLE = "Türkçe konuşan sakin bir erkek Kur'an hocası, aşağıdaki kelimeyi Türkçe olarak, tam yazıldığı gibi, "
  + 'normal hızda ve net biçimde bir kez söyler. Bütün ünlüler kısa ve eşit uzunlukta okunur; hiçbir heceyi uzatmaz, '
  + 'vurgu için de uzatmaz. Yalnız şapkalı â, î, û uzun okunur. Başka hiçbir şey söylemez.';

// Bilimsel Latin okunuştan Türkçe yazıma (Elif-Ba kitaplarındaki alışılmış biçim).
export function trOkunus(arapca) {
  return transliterate(arapca, CONS_TR)
    .replace(/ā/g, 'â').replace(/ī/g, 'î').replace(/ū/g, 'û')
    .replace(/^'/, '');
}

function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function apiKey() {
  const env = await readFile(join(ROOT, '.env.local'), 'utf8');
  for (const name of ['GEMINI_TTS_API_KEY', 'GEMINI_API_KEY']) {
    const m = env.match(new RegExp(`^\\s*${name}\\s*=\\s*['"]?([^'"\\r\\n]+)`, 'm'));
    if (m) return m[1].trim();
  }
  throw new Error('.env.local içinde Gemini anahtarı yok.');
}

async function main() {
  const { values } = parseArgs({ options: {
    out: { type: 'string' }, only: { type: 'string' }, force: { type: 'boolean', default: false },
    list: { type: 'boolean', default: false }, voice: { type: 'string', default: 'Charon' },
  } });
  const all = extractWords(JSON.parse(await readFile(join(ROOT, 'data/diyanetelifba.json'), 'utf8')))
    .map(w => ({ ...w, okunus: trOkunus(w.arapca) }));
  if (!values.out) throw new Error('--out zorunlu (depo dışı klasör).');
  await mkdir(values.out, { recursive: true });
  await writeFile(join(values.out, 'okunuslar.tsv'), all.map(w => `${w.id}\t${w.arapca}\t${w.okunus}`).join('\n') + '\n');
  if (values.list) { console.log(`${all.length} okunuş yazıldı.`); return; }
  const only = values.only ? new Set(values.only.split(',')) : null;
  const key = await apiKey();
  let made = 0;
  for (const w of all.filter(x => !only || only.has(x.id))) {
    const path = join(values.out, `${w.id}.wav`);
    if (!values.force && (await stat(path).catch(() => null))?.size > 44) continue;
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `### PERFORMANCE\n${TR_STYLE}\n\n#### TRANSCRIPT\n${w.okunus}` }] }],
          generationConfig: { responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: values.voice } } } },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429 && /per day/i.test(j.error?.message ?? '')) {
        console.log(`Günlük kota doldu; ${made} yeni dosya. Yarın aynı komutla kaldığı yerden devam eder.`);
        return;
      }
      if (r.status === 429 || r.status >= 500) { await sleep(65_000); if (attempt < 4) continue; }
      const p = j.candidates?.[0]?.content?.parts?.find(x => x.inlineData);
      if (!p) { console.log(`${w.id} ${w.okunus}: ses yok (${r.status} ${j.candidates?.[0]?.finishReason ?? ''})`); break; }
      const buf = Buffer.from(p.inlineData.data, 'base64');
      await writeFile(path, /wav/.test(p.inlineData.mimeType) ? buf : wav(buf));
      made++;
      console.log(`${w.id} ${w.okunus}: ${(buf.length / 48000).toFixed(1)} sn`);
      break;
    }
    await sleep(21_000); // ücretsiz katman: dakikada 3 istek
  }
  console.log(`Bitti: ${made} yeni dosya.`);
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
