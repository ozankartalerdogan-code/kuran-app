// Toplu sürüm: sayfa (ya da dilim) başına tek TTS isteği, kelimeler satır satır; ses sessizliklerden bölünür.
// Ücretsiz kota istek başına (~10/gün/model) sayıldığı için tek tek okutmak yerine bu kullanılır.
// Neon incelemesi (22 Kasım) sonrası:
//  - Talimatta "Kur'an hocası" yok: model Türkçe okunuşun arkasındaki Arapça kelimeyi tanıyıp
//    bozuk Arapça okuyordu (zahera → "vahera"). Nötr Türkçe spiker + "yapay sözcük" çerçevesi.
//  - Her N kelimede bir sıradan Türkçe "çapa" kelime araya girer (Arapça kök örüntüsünü kırar); bölünce atılır.
//  - Kısa (liste) duraklama varsayılan: uzun sessizlik istendiğinde model satır atlıyordu (19/28).
//  - finishReason STOP değilse ya da parça sayısı tutmazsa hiçbir kelime dosyası yazılmaz.
//  - 3.8+ modellerde talimat speech_metadata.style'da (Interactions API), metinde yalnız kelimeler.
// Kullanım:
//   node scripts/elifba-audio/generate-tr-batch.mjs --out <repo dışı klasör> --sayfa 13 [--dilim 0,25]
//     [--model gemini-3.1-flash-tts-preview] [--capa 5 (0 = kapalı)] [--eksik] [--tekrar 1] [--etiket ad]
//   Kelimeler <out>/<etiket>/<id>.wav olarak yazılır; ham kayıt ve liste <out>/<etiket>/_ham_sayfaN*.wav|json.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { extractWords } from './generate.mjs';
import { trOkunus } from './generate-tr.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const CAPALAR = ['kalem', 'masa', 'deniz', 'kitap', 'elma', 'kapı', 'bulut', 'çiçek', 'yol', 'ağaç', 'sokak', 'tepe', 'süt', 'balık', 'ayna'];

export function style(words) {
  return 'Anadili Türkçe olan, sakin ve net diksiyonlu bir erkek spiker, aşağıdaki yapay Türkçe sözcük listesini '
    + 'harf harf, tam yazıldığı gibi, düz Türkçe harf değerleriyle ve yabancı bir dile uyarlamadan okur. '
    + 'Her satırı yalnız bir kez, normal hızda okur; her satırdan sonra bir listeyi okur gibi kısa bir duraklama yapar. '
    + 'Bütün ünlüler kısa ve eşit uzunluktadır; hiçbir heceyi uzatmaz.'
    + (words.some(w => /[âîû]/.test(w)) ? ' Yalnız şapkalı â, î, û uzun okunur.' : '')
    + ' Numara, açıklama ya da başka hiçbir şey söylemez.';
}

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// Ham PCM (16 bit mono) ya da WAV → { pcm, rate }
function toPcm(buf, mime) {
  if (/wav/i.test(mime) || buf.subarray(0, 4).toString() === 'RIFF') {
    const rate = buf.readUInt32LE(24);
    let o = 12;
    while (o + 8 <= buf.length) {
      const id = buf.subarray(o, o + 4).toString(), size = buf.readUInt32LE(o + 4);
      if (id === 'data') return { pcm: buf.subarray(o + 8, o + 8 + size), rate };
      o += 8 + size;
    }
    return { pcm: buf.subarray(44), rate };
  }
  return { pcm: buf, rate: Number(mime?.match(/rate=(\d+)/)?.[1] ?? 24000) };
}

// bol.py'nin Node karşılığı: 10 ms'lik çerçevelerde tepe genlik; sayı tutan ilk (boşluk, eşik) çifti.
export function split(pcm, rate, n) {
  const step = Math.floor(rate / 100), frames = Math.floor(pcm.length / 2 / step);
  const env = [];
  for (let f = 0; f < frames; f++) {
    let m = 0;
    for (let i = 0; i < step; i++) m = Math.max(m, Math.abs(pcm.readInt16LE((f * step + i) * 2)));
    env.push(m);
  }
  const segs = (thr, gap) => {
    const s = []; let on = null, quiet = 0;
    env.forEach((e, k) => {
      if (e > thr) { if (on === null) on = k; quiet = 0; }
      else if (on !== null && ++quiet >= gap) { s.push([on, k - quiet + 1]); on = null; quiet = 0; }
    });
    if (on !== null) s.push([on, env.length]);
    return s.filter(([b, e]) => e - b >= 10); // ≥100 ms (14. sayfadaki kısa heceler için)
  };
  for (const gap of [60, 50, 70, 40, 80, 35, 90]) {
    for (const thr of [800, 1200, 600, 1600, 400, 2000]) {
      const s = segs(thr, gap);
      if (s.length !== n) continue;
      const pad = 8;
      return { thr, gap, parts: s.map(([b, e]) => {
        const a = Math.max(0, b - pad), z = Math.min(frames, e + pad);
        return { pcm: pcm.subarray(a * step * 2, z * step * 2), sn: (e - b) / 100,
          kirpik: env[b] > thr * 4 || env[e - 1] > thr * 4 };
      }) };
    }
  }
  return null;
}

async function tts({ key, model, voice, lines }) {
  const modern = Number(model.match(/gemini-(\d+(?:\.\d+)?)/)?.[1]) >= 3.8;
  let r, j;
  if (modern) {
    r = await fetch(`${API}/interactions`, {
      method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [{ type: 'user_input', content: [{ type: 'text', text: lines.join('\n<short pause>\n'),
          annotations: [{ type: 'speech_metadata', style: style(lines) }] }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      }),
    });
    j = await r.json().catch(() => ({}));
    const out = (j.steps ?? []).flatMap(s => s.content ?? []).filter(c => c.type === 'audio' && c.data);
    if (!r.ok || !out.length) return { hata: `${r.status} ${j.error?.message?.slice(0, 200) ?? j.status ?? 'ses yok'}` };
    const bufs = out.map(c => toPcm(Buffer.from(c.data, 'base64'), c.mime_type));
    return { pcm: Buffer.concat(bufs.map(b => b.pcm)), rate: bufs[0].rate, bitti: j.status ?? 'completed' };
  }
  r = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `### PERFORMANCE\n${style(lines)}\n\n#### TRANSCRIPT\n${lines.join('\n')}` }] }],
      generationConfig: { responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    }),
  });
  j = await r.json().catch(() => ({}));
  if (r.status === 429) return { hata: `429 kota: ${j.error?.message?.slice(0, 120)}`, kota: true };
  const c = j.candidates?.[0], chunks = (c?.content?.parts ?? []).filter(p => p.inlineData?.data);
  if (!r.ok || !chunks.length) return { hata: `${r.status} ${c?.finishReason ?? j.error?.message?.slice(0, 200) ?? 'ses yok'}` };
  const bufs = chunks.map(p => toPcm(Buffer.from(p.inlineData.data, 'base64'), p.inlineData.mimeType));
  return { pcm: Buffer.concat(bufs.map(b => b.pcm)), rate: bufs[0].rate, bitti: c.finishReason };
}

async function main() {
  const { values } = parseArgs({ options: {
    out: { type: 'string' }, sayfa: { type: 'string' }, dilim: { type: 'string' }, eksik: { type: 'boolean', default: false },
    model: { type: 'string', default: 'gemini-3.1-flash-tts-preview' }, voice: { type: 'string', default: 'Charon' },
    capa: { type: 'string', default: '5' }, tekrar: { type: 'string', default: '1' }, etiket: { type: 'string' },
  } });
  if (!values.out || !values.sayfa) throw new Error('--out ve --sayfa zorunlu.');
  const env = await readFile(join(ROOT, '.env.local'), 'utf8');
  const key = env.match(/^\s*GEMINI_TTS_API_KEY\s*=\s*['"]?([^'"\r\n]+)/m)?.[1].trim();
  if (!key) throw new Error('.env.local içinde GEMINI_TTS_API_KEY yok.');
  const capa = Number(values.capa);
  const etiket = values.etiket ?? `${values.model.replace(/^gemini-|-tts.*$/g, '')}${capa ? `-capa${capa}` : ''}`;
  const dir = join(values.out, etiket);
  await mkdir(dir, { recursive: true });

  let words = extractWords(JSON.parse(await readFile(join(ROOT, 'data/diyanetelifba.json'), 'utf8')))
    .filter(w => w.sayfa === Number(values.sayfa))
    .map(w => ({ id: w.id, arapca: w.arapca, okunus: trOkunus(w.arapca) }));
  if (values.dilim) words = words.slice(...values.dilim.split(',').map(Number));
  if (values.eksik) {
    const keep = [];
    for (const w of words) if (!((await stat(join(dir, `${w.id}.wav`)).catch(() => null))?.size > 44)) keep.push(w);
    words = keep;
  }
  if (!words.length) { console.log('Okunacak kelime yok.'); return; }

  // Çapa kelimeleri: her `capa` kelimeden sonra (sona değil) bir sıradan Türkçe kelime.
  const items = [];
  words.forEach((w, i) => {
    items.push(w);
    if (capa && (i + 1) % capa === 0 && i < words.length - 1) {
      const k = items.filter(x => x.capa).length;
      items.push({ id: `_capa_${k}`, okunus: CAPALAR[k % CAPALAR.length], capa: true });
    }
  });
  const name = `_ham_sayfa${values.sayfa}${values.dilim ? '_' + values.dilim.replace(',', '-') : ''}${values.eksik ? '_eksik' : ''}`;
  await writeFile(join(dir, `${name}.json`), JSON.stringify(items, null, 1));

  let res;
  for (let a = 0; a <= Number(values.tekrar); a++) {
    if (a) { console.log(`  tekrar deneniyor (${res.hata})…`); await sleep(21_000); }
    res = await tts({ key, model: values.model, voice: values.voice, lines: items.map(x => x.okunus) });
    if (!res.hata || res.kota) break;
  }
  if (res.hata) { console.log(`${name}: ses alınamadı — ${res.hata}`); process.exitCode = 1; return; }
  await writeFile(join(dir, `${name}.wav`), wav(res.pcm, res.rate));
  const sure = (res.pcm.length / 2 / res.rate).toFixed(1);
  if (!/^(STOP|completed)$/i.test(res.bitti ?? '')) {
    console.log(`${name}: ${sure} sn ama bitiş nedeni ${res.bitti} (kesik olabilir) — bölünmedi.`); process.exitCode = 1; return;
  }
  const s = split(res.pcm, res.rate, items.length);
  if (!s) { console.log(`${name}: ${sure} sn, ${items.length} parçaya bölünemedi (kelime atlanmış olabilir) — yazılmadı.`); process.exitCode = 1; return; }
  let yazilan = 0;
  const uyari = [];
  for (const [k, it] of items.entries()) {
    const p = s.parts[k];
    if (p.sn < 0.18 || p.sn > 1.1) uyari.push(`${it.id} ${it.okunus} süre ${p.sn} sn`);
    if (p.kirpik) uyari.push(`${it.id} ${it.okunus} başı/sonu kırpık olabilir`);
    if (it.capa) continue;
    await writeFile(join(dir, `${it.id}.wav`), wav(p.pcm, res.rate));
    yazilan++;
  }
  console.log(`${name}: ${sure} sn, ${items.length} parça (eşik ${s.thr}, boşluk ${s.gap * 10} ms); ${yazilan} kelime → ${dir}`);
  if (uyari.length) console.log('  Kontrol et:\n  ' + uyari.join('\n  '));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
}
