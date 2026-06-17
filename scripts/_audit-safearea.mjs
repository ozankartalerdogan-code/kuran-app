// Safe-area tarama — hangi mobil ekranlar üst/alt sınıra dayanma riski taşıyor?
import fs from "node:fs";
import path from "node:path";

const ROOT = "apps/mobile/app";
function walk(d) {
  let o = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) o = o.concat(walk(p));
    else if (f.endsWith(".tsx")) o.push(p);
  }
  return o;
}

const files = walk(ROOT).filter(f => !f.includes("_layout"));
console.log("EKRAN".padEnd(46), "SafeArea  Header  Scroll/List  Tab");
console.log("-".repeat(92));
const riskli = [];
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const safe = /useSafeAreaInsets|SafeAreaView/.test(s);
  const header = /Stack\.Screen|headerShown/.test(s);
  const scroll = /<ScrollView|FlatList|SectionList/.test(s);
  const tab = f.replace(/\\/g, "/").includes("(tabs)");
  const rel = f.replace(/\\/g, "/").replace(ROOT + "/", "");
  // Risk: scroll var ama safe-area yok (alt kesilir) || tab(başlıksız) ama safe-area yok (üst kesilir)
  const risk = (scroll && !safe) || (tab && !safe);
  if (risk) riskli.push(rel);
  console.log(
    (risk ? "⚠️ " : "   ") + rel.padEnd(43),
    (safe ? "✓" : "✗").padEnd(8),
    (header ? "✓" : "-").padEnd(6),
    (scroll ? "✓" : "-").padEnd(11),
    tab ? "TAB" : "",
  );
}
console.log("\nRİSKLİ EKRAN:", riskli.length);
riskli.forEach(r => console.log("  • " + r));
