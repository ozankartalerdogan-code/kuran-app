// İslam Duaları markdown → yapılandırılmış JSON (kategori bazlı).
// Kullanım: node scripts/_parse_dualar.mjs
import fs from "node:fs";
import path from "node:path";

const SRC = "data/islam_dualari_tam_koleksiyon.md";
const OUT = "apps/mobile/src/data/dualar.json";

const raw = fs.readFileSync(SRC, "utf8");
const lines = raw.split(/\r?\n/);

// Alan anahtarı normalizasyonu (md key → json key)
const KEYMAP = {
  "kategori": null, // ## başlığından alınıyor, atla
  "baslik": "baslik",
  "arapca": "arapca",
  "okunuş": "okunus",
  "anlam": "anlam",
  "kaynak": "kaynak",
  "derece": "derece",
  "tekrar": "tekrar",
  "neZaman": "neZaman",
  "aciklama": "aciklama",
  "not": "not",
};

const kategoriler = [];
let curKat = null;
let curDua = null;

function pushDua() {
  if (curKat && curDua && curDua.baslik) curKat.dualar.push(curDua);
  curDua = null;
}

for (const line of lines) {
  const katM = line.match(/^##\s+([A-Z])\)\s+(.+?)\s*$/);
  if (katM) {
    pushDua();
    curKat = { kod: katM[1], isim: katM[2].trim(), dualar: [] };
    kategoriler.push(curKat);
    continue;
  }
  if (/^###\s+/.test(line)) {
    pushDua();
    curDua = {};
    continue;
  }
  const f = line.match(/^\*\s+\*\*(.+?):\*\*\s*(.*)$/);
  if (f && curDua) {
    const key = KEYMAP[f[1].trim()];
    if (key) curDua[key] = f[2].trim();
  }
}
pushDua();

// Giriş paragrafı (# başlık ile **Kategoriler:** arası ilk paragraf)
const introLine = lines.find(l => l.startsWith("Aşağıdaki çalışma")) ?? "";

const data = {
  baslik: "Dualar ve Zikirler",
  aciklama: introLine.trim(),
  kategoriler: kategoriler.filter(k => k.dualar.length > 0),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data, null, 2), "utf8");

const toplamDua = data.kategoriler.reduce((s, k) => s + k.dualar.length, 0);
console.log(`✓ ${OUT}`);
console.log(`Kategori: ${data.kategoriler.length} | Dua: ${toplamDua}`);
console.log("İlk kategori:", data.kategoriler[0].kod, data.kategoriler[0].isim, `(${data.kategoriler[0].dualar.length} dua)`);
console.log("Örnek dua alanları:", Object.keys(data.kategoriler[0].dualar[0]).join(", "));
// Eksik alan denetimi
const REQ = ["baslik", "arapca", "okunus", "anlam", "kaynak", "derece"];
let eksik = 0;
for (const k of data.kategoriler) for (const d of k.dualar) for (const r of REQ) if (!d[r]) { eksik++; console.warn("  EKSİK", r, "→", k.kod, d.baslik); }
console.log(eksik === 0 ? "Tüm zorunlu alanlar dolu ✓" : `${eksik} eksik alan!`);
