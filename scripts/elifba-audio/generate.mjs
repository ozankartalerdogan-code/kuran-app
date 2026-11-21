import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://generativelanguage.googleapis.com/v1beta';
// Keep delivery directions separate from the transcript for Gemini >= 3.8.
export const PROMPT = `Read the single Arabic learning word exactly once, and nothing else.
Use a calm, clear male voice, slowly and distinctly, with classical Quranic Arabic
makharij and tajweed articulation, as an Elif-Ba teacher demonstrating an isolated word.
Pronounce EXACTLY what is written, preserving ALL vowel marks, including the FINAL
short vowel or tanwin. Use connected-form pronunciation (wasl), never waqf: do NOT
drop the final vowel, replace it with sukun, or change final tanwin to a pause form.
For example رَزَقَ is razaqa, NOT razaq; أَحَدٌ is ahadun, NOT ahad.
Respect sukun, shadda and natural madd lengths. No introduction, translation,
letter names, repetition, music, or extra words. This is a single-word exercise.`;

export function extractWords(data) {
  const seen = new Set();
  const result = [];
  for (const page of [...data.sayfalar].sort((a, b) => a.sayfa - b.sayfa)) {
    // Explicit boundary: never include verse pages 24–25 or later prayers.
    if (page.sayfa < 13 || page.sayfa > 21) continue;
    let index = 0;
    for (const token of page.icerik.split(/\s+|\|/u)) {
      // Whole Arabic tokens with at least one haraka; excludes Turkish prose
      // and unvowelled letter examples in explanatory paragraphs.
      if (!/^[\u0621-\u063A\u0641-\u064A\u064B-\u065F\u0670\u0671]+$/u.test(token)
        || !/[\u064B-\u0652]/u.test(token)) continue;
      // Source position, before deduplication: later IDs do not shift when a
      // duplicate is omitted. IDs may therefore have intentional gaps.
      index++;
      const key = token.normalize('NFC');
      if (seen.has(key)) continue;
      seen.add(key);
      const id = `s${page.sayfa}_${String(index).padStart(2, '0')}`;
      result.push({ id, sayfa: page.sayfa, arapca: token, dosya: `${id}.wav` });
    }
  }
  return result;
}

export function selectModel(models) {
  const candidates = models.filter(m => /tts/i.test(m.name)
    && m.supportedGenerationMethods?.includes('generateContent'));
  const version = m => m.name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1]?.split('.').map(Number) ?? [0];
  candidates.sort((a, b) => {
    const av = version(a), bv = version(b);
    return Number(/preview|experimental|exp-/i.test(a.name)) - Number(/preview|experimental|exp-/i.test(b.name))
      || bv[0] - av[0] || (bv[1] ?? 0) - (av[1] ?? 0)
      || Number(/lite/i.test(a.name)) - Number(/lite/i.test(b.name))
      || Number(/pro/i.test(b.name)) - Number(/pro/i.test(a.name))
      || b.name.localeCompare(a.name);
  });
  if (!candidates.length) throw new Error('API listesinde kullanılabilir TTS modeli yok.');
  return candidates[0].name;
}

export function toWav(data, mime = '') {
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WAVE') {
    if (data.length <= 44) throw new Error('Boş WAV yanıtı.');
    return data;
  }
  if (!/^audio\/(?:l16|pcm)(?:;|$)/i.test(mime)) throw new Error('Desteklenmeyen ses biçimi.');
  const rate = Number(mime.match(/rate=(\d+)/i)?.[1] ?? 24000);
  const channels = Number(mime.match(/channels=(\d+)/i)?.[1] ?? 1);
  if (!data.length || data.length % (channels * 2)) throw new Error('Geçersiz PCM uzunluğu.');
  const h = Buffer.alloc(44);
  h.write('RIFF'); h.writeUInt32LE(data.length + 36, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * channels * 2, 28); h.writeUInt16LE(channels * 2, 32);
  h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  // Gemini raw PCM is signed 16-bit little-endian; do not trim quiet consonants.
  return Buffer.concat([h, data]);
}

async function atomicWrite(path, data) {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
}
const writeJson = (path, value) => atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);

async function apiKey() {
  const env = await readFile(join(ROOT, '.env.local'), 'utf8');
  // Ücretsiz katman anahtarı (GEMINI_TTS_API_KEY) varsa önce o, yoksa genel anahtar.
  const lines = env.split(/\r?\n/);
  const ordered = [...lines.filter(l => /^\s*(?:export\s+)?GEMINI_TTS_API_KEY\s*=/.test(l)),
    ...lines.filter(l => /^\s*(?:export\s+)?GEMINI_API_KEY\s*=/.test(l))];
  for (const line of ordered) {
    const m = line.match(/^\s*(?:export\s+)?GEMINI_(?:TTS_)?API_KEY\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[1];
    if (/^["']/.test(value)) {
      const end = value.indexOf(value[0], 1);
      if (end < 0) throw new Error('GEMINI_API_KEY tırnağı kapanmamış.');
      value = value.slice(1, end);
    } else value = value.replace(/\s+#.*$/, '').trim();
    if (value) return value;
  }
  throw new Error('.env.local içinde GEMINI_API_KEY bulunamadı.');
}

async function main() {
  const { values } = parseArgs({ options: {
    limit: { type: 'string' }, out: { type: 'string' }, only: { type: 'string' },
    force: { type: 'boolean', default: false }, voice: { type: 'string', default: 'Charon' }, model: { type: 'string' },
    help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('node scripts/elifba-audio/generate.mjs --out <repo dışı klasör> [--limit N] [--only id,...] [--voice Charon] [--force]');
    return;
  }
  if (!values.out) throw new Error('--out zorunludur (sesler depo dışında tutulur).');
  const out = resolve(values.out);
  const rel = relative(ROOT, out);
  if (!rel || (!rel.startsWith(`..\\`) && !rel.startsWith('../') && !isAbsolute(rel))) {
    throw new Error('--out depo dışında olmalıdır.');
  }
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(values.voice)) throw new Error('Geçersiz ses adı.');
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  if (values.limit !== undefined && (!/^\d+$/.test(values.limit) || !Number.isSafeInteger(limit) || limit < 1)) {
    throw new Error('--limit pozitif tamsayı olmalıdır.');
  }
  const all = extractWords(JSON.parse(await readFile(join(ROOT, 'data/diyanetelifba.json'), 'utf8')));
  const only = values.only === undefined ? null : new Set(values.only.split(','));
  if (only && [...only].some(id => !all.some(w => w.id === id))) throw new Error('--only içinde bilinmeyen kimlik var.');
  const selected = all.filter(w => !only || only.has(w.id)).slice(0, limit);
  await mkdir(out, { recursive: true });
  // Full deterministic inventory; selection is recorded separately in run.json.
  await writeJson(join(out, 'manifest.json'), all);
  const started = Date.now();
  const report = { startedAt: new Date(started).toISOString(), status: 'running', voice: values.voice,
    totalWords: all.length, selected: selected.map(w => w.id), generated: [], skipped: [],
    retries: [], usage: [], elapsedSeconds: 0 };
  const save = async () => {
    report.elapsedSeconds = Math.round((Date.now() - started) / 100) / 10;
    await writeJson(join(out, 'run.json'), report);
  };
  const key = await apiKey();
  let lastRequest = 0;
  async function request(path, body) {
    for (let attempt = 0; ; attempt++) {
      await sleep(Math.max(0, 750 - (Date.now() - lastRequest)));
      lastRequest = Date.now();
      let response;
      try {
        response = await fetch(`${API}/${path}`, {
          method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(120_000),
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      } catch { throw new Error('API ağ hatası veya zaman aşımı; otomatik tekrar yapılmadı.'); }
      if (response.ok) return response.json();
      // Never print API error bodies or fetch errors: they may contain secrets.
      const status = response.status;
      const retryHeader = response.headers.get('retry-after');
      await response.body?.cancel();
      if ((status !== 429 && status < 500) || attempt >= 4) {
        throw new Error(`API HTTP ${status}${status === 402 ? ' (Payment Required: ödeme/kredi erişimini kontrol edin)' : ''}`);
      }
      const retryAfter = /^\d+(?:\.\d+)?$/.test(retryHeader ?? '')
        ? Number(retryHeader) * 1000 : Math.max(0, Date.parse(retryHeader ?? '') - Date.now()) || 0;
      const delay = Math.min(60_000, Math.max(retryAfter, 2000 * 2 ** attempt));
      report.retries.push({ status, attempt: attempt + 1, delayMs: delay });
      await save();
      console.log(`HTTP ${status}: ${delay} ms geri çekilme (${attempt + 1}/4).`);
      await sleep(delay);
    }
  }
  try {
    await save();
    const models = [];
    let pageToken;
    do {
      const page = await request(`models?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
      models.push(...(page.models ?? [])); pageToken = page.nextPageToken;
    } while (pageToken);
    const model = values.model ? `models/${values.model.replace(/^models\//, '')}` : selectModel(models);
    if (!models.some(m => m.name === model)) throw new Error(`Model listede yok: ${model}`);
    report.model = model;
    console.log(`Model: ${model}; ses: ${values.voice}; toplam: ${all.length}; seçilen: ${selected.length}`);
    await save();
    // 3.8+: talimat speech_metadata.style'da, metin yalnız kelime (yoksa talimat da okunuyor).
    const modern = Number(model.match(/gemini-(\d+(?:\.\d+)?)/)?.[1]) >= 3.8;
    for (const word of selected) {
      const path = join(out, word.dosya);
      const existing = await stat(path).catch(e => { if (e.code !== 'ENOENT') throw e; });
      if (!values.force && existing?.size > 44) {
        report.skipped.push(word.id); await save(); continue;
      }
      let response, audio, mime;
      if (modern) {
        response = await request('interactions', {
          model: model.replace(/^models\//, ''),
          input: [{ type: 'user_input', content: [{ type: 'text', text: word.arapca,
            annotations: [{ type: 'speech_metadata', style: PROMPT }] }] }],
          response_format: { type: 'audio' },
          generation_config: { speech_config: [{ voice: values.voice }] },
        });
        // Yanıt: steps[].content[] içinde { type: 'audio', data, mime_type } (elle doğrulandı).
        const out = (response.steps ?? []).flatMap(s => s.content ?? []).find(c => c.type === 'audio' && c.data)
          ?? response.output_audio;
        audio = out?.data;
        mime = out?.mime_type ?? 'audio/wav';
      } else {
        response = await request(`${model}:generateContent`, {
          // Eski modeller: talimat ile okunacak metin net ayraçla ayrılır.
          contents: [{ parts: [{ text: `### PERFORMANCE\n${PROMPT}\n\n#### TRANSCRIPT\n${word.arapca}` }] }],
          generationConfig: { responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: values.voice } } } },
        });
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        const chunks = parts.filter(p => p.inlineData?.data);
        if (chunks.length && chunks.every(p => p.inlineData.mimeType === chunks[0].inlineData.mimeType)) {
          audio = Buffer.concat(chunks.map(p => Buffer.from(p.inlineData.data, 'base64')));
          mime = chunks[0].inlineData.mimeType;
        }
      }
      if (!audio) throw new Error(`${word.id}: ses verisi dönmedi.`);
      const wav = toWav(Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'base64'), mime);
      await atomicWrite(path, wav);
      report.generated.push(word.id);
      const usage = response.usageMetadata ?? response.usage;
      if (usage) report.usage.push({ id: word.id, ...usage });
      await save();
      console.log(`${word.id} ${word.arapca}: ${wav.length} bayt`);
    }
    report.status = 'complete'; await save();
    console.log(`Tamamlandı: ${report.generated.length} yeni, ${report.skipped.length} atlandı; ${report.elapsedSeconds} sn.`);
  } catch (error) {
    report.status = 'failed'; report.error = error.message.replaceAll(key, '[REDACTED]');
    await save();
    throw new Error(report.error);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Üretim başarısız; --help seçeneklerini ve varsa çıktı klasöründeki run.json özetini kontrol edin.');
    process.exitCode = 1;
  });
}
