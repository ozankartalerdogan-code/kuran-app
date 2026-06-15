/**
 * _build-esma-roots.mjs
 * 99 isim → kök eşlemesi + kısa kök anlamı. Kökleri root_meanings ile çapraz
 * kontrol eder (gerçek/Kur'ânî kök mü) ve esmaul-husna.ts'i kok+kokAnlam ile yeniden üretir.
 *   --check  : sadece kapsama raporu (yazmaz)
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(dir, "..");
const CHECK = process.argv.includes("--check");

// sira → { kok (boşluklu görünüm), r (root_meanings eşleşmesi için bitişik), kokAnlam }
const KOK = {
  1:  ["ر ح م", "رحم", "merhamet ve şefkat göstermek"],
  2:  ["ر ح م", "رحم", "merhamet ve şefkat göstermek"],
  3:  ["م ل ك", "ملك", "sahip olmak, hükmetmek"],
  4:  ["ق د س", "قدس", "temizlemek, kutsamak, arınmak"],
  5:  ["س ل م", "سلم", "esenlik, kusursuzluk, teslimiyet"],
  6:  ["ا م ن", "أمن", "güven vermek, emin kılmak"],
  7:  ["ه ي م ن", "هيمن", "gözetmek, koruyup denetlemek"],
  8:  ["ع ز ز", "عزز", "üstün ve yenilmez olmak"],
  9:  ["ج ب ر", "جبر", "onarmak, eksiği tamamlamak, zorla düzeltmek"],
  10: ["ك ب ر", "كبر", "büyük ve ulu olmak"],
  11: ["خ ل ق", "خلق", "yoktan yaratmak, takdir etmek"],
  12: ["ب ر ا", "برأ", "kusursuz ve uyumlu yaratmak"],
  13: ["ص و ر", "صور", "biçim ve suret vermek"],
  14: ["غ ف ر", "غفر", "örtmek, bağışlamak"],
  15: ["ق ه ر", "قهر", "boyun eğdirmek, üstün gelmek"],
  16: ["و ه ب", "وهب", "karşılıksız vermek, bağışlamak"],
  17: ["ر ز ق", "رزق", "rızık verip beslemek"],
  18: ["ف ت ح", "فتح", "açmak, çözüme kavuşturmak"],
  19: ["ع ل م", "علم", "bilmek, ilim sahibi olmak"],
  20: ["ق ب ض", "قبض", "tutmak, daraltmak, almak"],
  21: ["ب س ط", "بسط", "yaymak, genişletmek, açmak"],
  22: ["خ ف ض", "خفض", "alçaltmak, indirmek"],
  23: ["ر ف ع", "رفع", "yükseltmek, kaldırmak"],
  24: ["ع ز ز", "عزز", "üstün ve değerli kılmak"],
  25: ["ذ ل ل", "ذلل", "alçaltmak, zelil kılmak"],
  26: ["س م ع", "سمع", "işitmek, duymak"],
  27: ["ب ص ر", "بصر", "görmek, basiretle kavramak"],
  28: ["ح ك م", "حكم", "hüküm vermek, karar kılmak"],
  29: ["ع د ل", "عدل", "adalet, denge, doğruluk"],
  30: ["ل ط ف", "لطف", "incelik, lütuf, nazik davranış"],
  31: ["خ ب ر", "خبر", "bir şeyin iç yüzünü bilmek"],
  32: ["ح ل م", "حلم", "yumuşaklık, acele etmeyip hoş görmek"],
  33: ["ع ظ م", "عظم", "büyük ve yüce olmak"],
  34: ["غ ف ر", "غفر", "örtmek, çokça bağışlamak"],
  35: ["ش ك ر", "شكر", "iyiliğe karşılık vermek, takdir etmek"],
  36: ["ع ل و", "علو", "yüce ve yüksek olmak"],
  37: ["ك ب ر", "كبر", "büyük ve ulu olmak"],
  38: ["ح ف ظ", "حفظ", "korumak, gözetmek, muhafaza etmek"],
  39: ["ق و ت", "قوت", "gıda ve güç vermek, beslemek"],
  40: ["ح س ب", "حسب", "hesap görmek, yeterli olmak"],
  41: ["ج ل ل", "جلل", "ululuk, heybet, azamet"],
  42: ["ك ر م", "كرم", "cömertlik, asalet, ikram"],
  43: ["ر ق ب", "رقب", "gözetlemek, gözetim altında tutmak"],
  44: ["ج و ب", "جوب", "cevap vermek, karşılık vermek"],
  45: ["و س ع", "وسع", "geniş olmak, kuşatmak"],
  46: ["ح ك م", "حكم", "hikmet, sağlam ve yerinde hüküm"],
  47: ["و د د", "ودد", "sevmek, sevgi beslemek"],
  48: ["م ج د", "مجد", "şan, şeref, yücelik"],
  49: ["ب ع ث", "بعث", "diriltmek, göndermek, harekete geçirmek"],
  50: ["ش ه د", "شهد", "şahit olmak, tanıklık etmek"],
  51: ["ح ق ق", "حقق", "gerçek, sabit ve değişmez olan"],
  52: ["و ك ل", "وكل", "işleri üstlenmek, vekil olmak"],
  53: ["ق و ي", "قوي", "güçlü ve kuvvetli olmak"],
  54: ["م ت ن", "متن", "sağlam, dayanıklı, metin olmak"],
  55: ["و ل ي", "ولي", "dost olmak, yardım edip sahip çıkmak"],
  56: ["ح م د", "حمد", "övgü, hamde layık olmak"],
  57: ["ح ص ي", "حصي", "saymak, eksiksiz kuşatmak"],
  58: ["ب د ا", "بدأ", "başlatmak, ilk kez ortaya koymak"],
  59: ["ع و د", "عود", "geri döndürmek, yeniden yapmak"],
  60: ["ح ي ي", "حيي", "hayat vermek, diriltmek"],
  61: ["م و ت", "موت", "ölüm vermek, canı almak"],
  62: ["ح ي ي", "حيي", "diri ve canlı olmak"],
  63: ["ق و م", "قوم", "ayakta tutmak, var kılıp yönetmek"],
  64: ["و ج د", "وجد", "bulmak, dilediğini elde etmek"],
  65: ["م ج د", "مجد", "şan ve şeref sahibi olmak"],
  66: ["و ح د", "وحد", "tek ve eşsiz olmak"],
  67: ["ا ح د", "أحد", "bölünmez biriciklik, mutlak teklik"],
  68: ["ص م د", "صمد", "hiçbir şeye muhtaç olmayan, başvurulan"],
  69: ["ق د ر", "قدر", "güç yetirmek, ölçü ve takdir"],
  70: ["ق د ر", "قدر", "her şeye gücü yeten, muktedir"],
  71: ["ق د م", "قدم", "öne almak, ileri geçirmek"],
  72: ["ا خ ر", "أخر", "geri bırakmak, sona almak"],
  73: ["ا و ل", "أول", "ilk, başlangıcı olmayan"],
  74: ["ا خ ر", "أخر", "son, sonu olmayan"],
  75: ["ظ ه ر", "ظهر", "açık, üstün ve apaçık olmak"],
  76: ["ب ط ن", "بطن", "gizli, içte ve örtülü olmak"],
  77: ["و ل ي", "ولي", "yönetmek, idare edip sahip çıkmak"],
  78: ["ع ل و", "علو", "her şeyden yüce olmak"],
  79: ["ب ر ر", "برر", "iyilik, lütuf ve vefa sahibi olmak"],
  80: ["ت و ب", "توب", "tövbeyi kabul etmek, dönüşe karşılık vermek"],
  81: ["ن ق م", "نقم", "suçluyu cezalandırmak, hakkı almak"],
  82: ["ع ف و", "عفو", "affetmek, günahı tamamen silmek"],
  83: ["ر ا ف", "رأف", "çok şefkatli ve merhametli olmak"],
  84: ["م ل ك", "ملك", "mülkün gerçek sahibi olmak"],
  85: ["ج ل ل / ك ر م", "جلل", "ululuk ve cömertlik sahibi olmak"],
  86: ["ق س ط", "قسط", "adaletle hükmetmek, denge kurmak"],
  87: ["ج م ع", "جمع", "toplamak, bir araya getirmek"],
  88: ["غ ن ي", "غني", "zengin ve hiçbir şeye muhtaç olmamak"],
  89: ["غ ن ي", "غني", "zenginleştirmek, ihtiyaçtan kurtarmak"],
  90: ["م ن ع", "منع", "engellemek, alıkoymak, korumak"],
  91: ["ض ر ر", "ضرر", "zarar verebilmek (hikmetle)"],
  92: ["ن ف ع", "نفع", "fayda ve yarar vermek"],
  93: ["ن و ر", "نور", "nur, aydınlık, ışık vermek"],
  94: ["ه د ي", "هدي", "doğru yola iletmek, kılavuzluk etmek"],
  95: ["ب د ع", "بدع", "eşi benzeri olmadan icat etmek"],
  96: ["ب ق ي", "بقي", "kalıcı ve baki olmak"],
  97: ["و ر ث", "ورث", "varis olmak, sonunda kalıp sahip olmak"],
  98: ["ر ش د", "رشد", "doğruya iletmek, isabetli yönlendirmek"],
  99: ["ص ب ر", "صبر", "sabretmek, cezada acele etmemek"],
};

const local = new DatabaseSync(path.join(ROOT, "data", "app.db"), { readOnly: true });
const rmRoots = new Set(local.prepare("SELECT DISTINCT root FROM root_meanings").all().map((r) => r.root));

let inRm = 0, missing = [];
for (const [sira, [, r]] of Object.entries(KOK)) {
  if (rmRoots.has(r)) inRm++; else missing.push(`${sira}:${r}`);
}
console.log(`Kök eşleme: ${Object.keys(KOK).length} isim`);
console.log(`root_meanings'te bulunan kök: ${inRm}/${Object.keys(KOK).length}`);
console.log(`root_meanings'te OLMAYAN (nadir/farklı imla olabilir): ${missing.join(", ")}`);

if (CHECK) process.exit(0);

// ── esmaul-husna.ts'i yeniden üret ──
// Anlam KAYNAĞI: mobil esmaulHusna.ts (v12 curate edilmiş zengin anlamlar), JSON DEĞİL.
const mobileMod = await import(pathToFileURL(path.join(ROOT, "apps", "mobile", "src", "data", "esmaulHusna.ts")).href);
const arr = mobileMod.ESMA_UL_HUSNA;
const out = arr.map((e) => {
  const k = KOK[e.sira];
  return { sira: e.sira, arapca: e.arapca, isim: e.isim, anlam: e.anlam, kok: k[0], kokAnlam: k[2] };
});
const ts =
  `// Esmaul Husna — Allah'in 99 ismi (kok + kok anlami ile)\n` +
  `// Kokler standart Arapca sozlukten; root_meanings ile capraz dogrulanmistir.\n` +
  `export interface EsmaItem {\n  sira: number;\n  arapca: string;\n  isim: string;\n  anlam: string;\n  kok: string;\n  kokAnlam: string;\n}\n\n` +
  `export const ESMA_UL_HUSNA: EsmaItem[] = [\n` +
  out.map((e) => `  { sira: ${e.sira}, arapca: ${JSON.stringify(e.arapca)}, isim: ${JSON.stringify(e.isim)}, anlam: ${JSON.stringify(e.anlam)}, kok: ${JSON.stringify(e.kok)}, kokAnlam: ${JSON.stringify(e.kokAnlam)} },`).join("\n") +
  `\n];\n`;
fs.writeFileSync(path.join(ROOT, "apps", "web", "src", "data", "esmaul-husna.ts"), ts, "utf-8");
console.log(`\n✅ apps/web/src/data/esmaul-husna.ts yazildi (${out.length} isim, kok+kokAnlam).`);
