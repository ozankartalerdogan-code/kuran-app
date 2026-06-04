// Tek ayet JSON'unu stdin'den okur, kelime↔kök off-by-one kaymasını tespit eder.
// VK env değişkeni = "surah:ayah". Kayma varsa SHIFT, sahipsiz güçlü-kök uyumsuzu varsa ORPHAN basar.
const strip = (x) => (x || "").normalize("NFC")
  .replace(/[ً-ْٰـ]/g, "")  // harakat, hançer-elif, tatweel
  .replace(/[ۖ-ۭ]/g, "")              // Kur'an dizgi işaretleri
  .replace(/[ٓ-ٕ]/g, "")              // madde / hemze üstü-altı
  .replace(/[آأإ]/g, "ا").replace(/ى/g, "ي")
  .replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ة/g, "ه");

const weak = /[اويءآأإؤئىةه]/; // zayıf/illetli harf içeren kökleri eleriz (güvenilir değil)
const geminate = (r) => { for (let i = 1; i < r.length; i++) if (r[i] === r[i - 1]) return true; return false; }; // şeddeli kök (yüzeyde tek harf)
const subseq = (r, w) => { let i = 0; for (const ch of w) { if (ch === r[i]) i++; if (i === r.length) return true; } return false; };

let d = "";
process.stdin.on("data", (c) => d += c).on("end", () => {
  let j; try { j = JSON.parse(d); } catch { return; }
  if (!j.words || j.words.length < 2) return;
  const ws = j.words.map((w) => ({ a: strip(w.arabic), r: w.root ? strip(w.root) : "", raw: w.arabic }));
  const shift = [], orphan = [];
  for (let i = 0; i < ws.length; i++) {
    const r = ws[i].r;
    if (!r || r.length < 2 || weak.test(r) || geminate(r)) continue;   // yalnızca güçlü, şeddesiz kök
    if (subseq(r, ws[i].a)) continue;                    // kendi kelimesine uyuyorsa sağlam
    const next = ws[i + 1] ? subseq(r, ws[i + 1].a) : false;
    const prev = ws[i - 1] ? subseq(r, ws[i - 1].a) : false;
    if (next) shift.push(ws[i].raw + ">" + r + "(→sonraki)");
    else if (prev) shift.push(ws[i].raw + ">" + r + "(→önceki)");
    else orphan.push(ws[i].raw + ">" + r);
  }
  if (shift.length) console.log("SHIFT\t" + process.env.VK + "\t" + shift.length + "\t" + shift.join("  "));
  else if (orphan.length) console.log("ORPHAN\t" + process.env.VK + "\t" + orphan.length + "\t" + orphan.join("  "));
});
