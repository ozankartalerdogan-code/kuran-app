const fs = require("fs");
const path = require("path");
const j = require(path.join(__dirname, "..", "data", "Esmaülhüsna.json"));
const items = j
  .map((x) => `  { sira: ${x.sira}, arapca: ${JSON.stringify(x.arapca)}, isim: ${JSON.stringify(x.isim)}, anlam: ${JSON.stringify(x.anlam)} },`)
  .join("\n");
const out =
  "// Esmaul Husna — Allah'in 99 ismi (data/Esmaulhusna.json kaynagindan uretildi)\n" +
  "export interface EsmaItem {\n  sira: number;\n  arapca: string;\n  isim: string;\n  anlam: string;\n}\n\n" +
  "export const ESMA_UL_HUSNA: EsmaItem[] = [\n" +
  items +
  "\n];\n";
const dir = path.join(__dirname, "..", "apps", "mobile", "src", "data");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "esmaulHusna.ts"), out, "utf8");
console.log("yazildi: apps/mobile/src/data/esmaulHusna.ts (" + j.length + " isim)");
