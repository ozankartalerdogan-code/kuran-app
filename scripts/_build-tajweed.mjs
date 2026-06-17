// Tecvid renklendirme veri pipeline'ı — AlQuran.cloud quran-tajweed → verses.arabic_tajweed
// GÜVENLİ MOD. Modlar:
//   --dry-run   : çek + parse, ilk 10 ayeti + kod özetini göster. DB'ye DOKUNMAZ.
//   --schema    : verses tablosuna arabic_tajweed TEXT kolonu ekle (ayrı onay gerekir).
//   --write     : 6236 ayeti bulk UPDATE (kolon var olmalı). Index kontrollü, batch'li.
// Turso: apps/web/.env.local (TURSO_DB_URL/TOKEN). Çekme: auth gerektirmez.
import fs from "node:fs";

const MODE = process.argv.includes("--write") ? "write"
  : process.argv.includes("--schema") ? "schema"
  : "dry-run";

const EDITION_URL = "https://api.alquran.cloud/v1/quran/quran-tajweed";

// AlQuran.cloud tek-harf tecvid kodları → kural adı + renk (standart şema)
const RULES = {
  h: { ad: "Hemze-i Vasl (sessiz)",   renk: "#9ca3af" },
  s: { ad: "Sessiz",                  renk: "#9ca3af" },
  l: { ad: "Şemsî Lâm (sessiz)",      renk: "#9ca3af" },
  n: { ad: "Tabii Med (2)",           renk: "#e11d48" },
  p: { ad: "Câiz Med (2/4/6)",        renk: "#e11d48" },
  m: { ad: "Lâzım Med (6)",           renk: "#b91c1c" },
  o: { ad: "Vâcip Med (4/5)",         renk: "#dc2626" },
  q: { ad: "Kalkale",                 renk: "#2563eb" },
  g: { ad: "Ğunne",                   renk: "#16a34a" },
  u: { ad: "İdgâm (ğunneli)",         renk: "#16a34a" },
  d: { ad: "İdgâm (ğunnesiz)",        renk: "#9ca3af" },
  i: { ad: "İhfâ",                    renk: "#16a34a" },
  f: { ad: "İhfâ",                    renk: "#16a34a" },
  a: { ad: "İhfâ Şefevî",             renk: "#16a34a" },
  b: { ad: "İklâb",                   renk: "#16a34a" },
  c: { ad: "İhfâ Şefevî",             renk: "#16a34a" },
  w: { ad: "İdgâm-ı Misleyn (mim)",   renk: "#16a34a" },
};

// Açılış: [kod[  ya da  [kod:NN[   ·   Kapanış: tek ]   ·   İÇ İÇE (nested) destekli.
// Stack-tabanlı: her karaktere EN İÇTEKİ aktif kural uygulanır. { ok, stray } döner.
const OPEN = /^\[([a-z]+)(?::\d+)?\[/;

function parse(text) {
  const raw = [];
  const stack = [];
  let stray = 0;
  let i = 0;
  while (i < text.length) {
    const om = OPEN.exec(text.slice(i));
    if (om) { stack.push(om[1]); i += om[0].length; continue; }
    if (text[i] === "[") { stack.push(null); i++; continue; }   // kodsuz [ → şeffaf grup (üst kuralı miras alır)
    if (text[i] === "]") { if (stack.length) stack.pop(); else stray++; i++; continue; }
    let code = null;
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k] !== null) { code = stack[k]; break; }
    raw.push({ code, t: text[i] });
    i++;
  }
  // bitişik aynı-kodları birleştir
  const segs = [];
  for (const ch of raw) {
    const last = segs[segs.length - 1];
    if (last && last.code === ch.code) last.t += ch.t;
    else segs.push({ code: ch.code, t: ch.t });
  }
  return { segs, ok: stray === 0 && stack.length === 0, stray, unclosed: stack.length };
}

function envGet(k) {
  const env = fs.readFileSync("apps/web/.env.local", "utf8");
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

async function turso() {
  const { createClient } = await import("@libsql/client");
  return createClient({ url: envGet("TURSO_DB_URL").replace(/^libsql:\/\//, "https://"), authToken: envGet("TURSO_AUTH_TOKEN") });
}

async function fetchAll() {
  process.stdout.write("AlQuran.cloud'dan quran-tajweed çekiliyor... ");
  const res = await fetch(EDITION_URL);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  const rows = [];
  for (const s of j.data.surahs) for (const a of s.ayahs) {
    rows.push({ verse_key: `${s.number}:${a.numberInSurah}`, text: a.text });
  }
  console.log(rows.length + " ayet ✓");
  return rows;
}

async function dryRun() {
  const rows = await fetchAll();
  // Kod özeti + bilinmeyen kod denetimi + parse anomalisi
  const codeCount = {};
  let anomalies = 0;
  for (const r of rows) {
    const { segs, ok, stray, unclosed } = parse(r.text);
    for (const sg of segs) if (sg.code) codeCount[sg.code] = (codeCount[sg.code] || 0) + 1;
    if (!ok) { anomalies++; if (anomalies <= 5) console.log("  ⚠️ parse anomalisi:", r.verse_key, `(stray=${stray}, unclosed=${unclosed})`); }
  }
  console.log("\n== AYET SAYISI:", rows.length, rows.length === 6236 ? "✓ (6236 beklendi)" : "✗ BEKLENEN 6236!");
  console.log("== AYRAÇ ANOMALİSİ:", anomalies);
  console.log("\n== BULUNAN KODLAR (renk haritası denetimi) ==");
  for (const [code, n] of Object.entries(codeCount).sort((a, b) => b[1] - a[1])) {
    const r = RULES[code];
    console.log(`  ${code.padEnd(3)} ×${String(n).padStart(5)}  →  ${r ? r.ad + "  " + r.renk : "❓ BİLİNMEYEN KOD — renk haritasına eklenmeli"}`);
  }
  console.log("\n== İLK 10 AYET (parse önizleme) ==");
  for (const r of rows.slice(0, 10)) {
    const { segs } = parse(r.text);
    const renkli = segs.map(sg => sg.code ? `[${sg.code}:${sg.t}]` : sg.t).join("");
    console.log(`\n--- ${r.verse_key} ---`);
    console.log("  HAM : " + r.text);
    console.log("  PARSE: " + renkli);
    console.log("  SEG  : " + segs.filter(s => s.code).map(s => `${s.t}→${RULES[s.code]?.ad ?? s.code}`).join(" · "));
  }
  console.log("\n⚠️ DRY-RUN — DB'ye hiçbir şey yazılmadı. Şema değişikliği için: --schema (ayrı onay).");
}

async function schema() {
  const c = await turso();
  const cols = await c.execute("PRAGMA table_info(verses)");
  if (cols.rows.some(r => r.name === "arabic_tajweed")) { console.log("arabic_tajweed kolonu ZATEN VAR — atlanıyor."); return; }
  const idxBefore = (await c.execute("PRAGMA index_list(verses)")).rows.map(r => r.name);
  console.log("Şema ÖNCESİ indeksler:", idxBefore.join(", "));
  await c.execute("ALTER TABLE verses ADD COLUMN arabic_tajweed TEXT");
  const idxAfter = (await c.execute("PRAGMA index_list(verses)")).rows.map(r => r.name);
  console.log("✅ Kolon eklendi: arabic_tajweed TEXT (nullable)");
  console.log("Şema SONRASI indeksler:", idxAfter.join(", "));
  console.log(idxBefore.length === idxAfter.length ? "✓ İndeksler değişmedi (yeniden inşa yok)" : "⚠️ İndeks sayısı değişti!");
}

async function write() {
  const c = await turso();
  const cols = await c.execute("PRAGMA table_info(verses)");
  if (!cols.rows.some(r => r.name === "arabic_tajweed")) throw new Error("arabic_tajweed kolonu yok — önce --schema çalıştır.");
  // INDEX KONTROLÜ: update WHERE verse_key=? PK indeksini kullanıyor mu?
  const plan = await c.execute({ sql: "EXPLAIN QUERY PLAN UPDATE verses SET arabic_tajweed=? WHERE verse_key=?", args: ["x", "1:1"] });
  const planTxt = plan.rows.map(r => r.detail).join(" | ");
  console.log("UPDATE planı:", planTxt);
  if (!/USING (INTEGER PRIMARY KEY|INDEX|PRIMARY KEY)|SEARCH/.test(planTxt)) console.log("⚠️ UPDATE indeks kullanmıyor olabilir (SCAN)!");
  else console.log("✓ UPDATE verse_key indeksini kullanıyor (SEARCH).");
  const rows = await fetchAll();
  let done = 0;
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map(r => ({ sql: "UPDATE verses SET arabic_tajweed=? WHERE verse_key=?", args: [r.text, r.verse_key] }));
    await c.batch(batch, "write");
    done += batch.length;
    process.stdout.write(`\r  yazıldı: ${done}/${rows.length}`);
  }
  console.log("\n✅ Bulk update tamamlandı:", done);
  const chk = await c.execute("SELECT count(*) AS n FROM verses WHERE arabic_tajweed IS NOT NULL AND arabic_tajweed<>''");
  console.log("Doğrulama — dolu arabic_tajweed:", chk.rows[0].n, "/ 6236");
}

(async () => {
  console.log("MOD:", MODE);
  if (MODE === "dry-run") await dryRun();
  else if (MODE === "schema") await schema();
  else if (MODE === "write") await write();
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
