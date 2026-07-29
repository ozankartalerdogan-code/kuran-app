import assert from "node:assert/strict";
import test from "node:test";

import {
  AYNI_TEXT,
  FOOTER,
  arSkeleton,
  checkFabricatedArabic,
  checkMealQuote,
  checkShape,
  checkSelfContradiction,
  checkSurahRef,
  gateVerse,
} from "./gate-fark-analizi.mjs";

const ELMALILI_1_6 = "Hidayet eyle bizi doğru yola";
const DIYANET_1_6 = "Bizi doğru yola eriştir";

test("K1: mealden yapılan alıntı Elmalılı metninde geçiyorsa kabul edilir", () => {
  const t = `Mealdeki 'Hidayet eyle bizi doğru yola' ifadesi fiilin temel anlamını korur.`;
  assert.deepEqual(checkMealQuote(t, ELMALILI_1_6), []);
});

test("K1: kaldırılmış mealden yapılan alıntı yakalanır", () => {
  const t = `Oysa mealdeki 'Bizi doğru yola eriştir' ifadesi sonuca ulaştırma anlamını katmaktadır.`;
  assert.deepEqual(checkMealQuote(t, ELMALILI_1_6), [DIYANET_1_6]);
});

test("K1: meale atfedilmeyen alıntılar denetlenmez", () => {
  const t = `Literal çeviri 'Bizi doğru yola ilet' fiilin temel anlamını yansıtır.`;
  assert.deepEqual(checkMealQuote(t, ELMALILI_1_6), []);
});

test("arSkeleton mushaf ve standart imlâyı aynı iskelete indirger", () => {
  assert.equal(arSkeleton("خَالِدُونَ"), arSkeleton("خَٰلِدُونَ"));
  assert.equal(arSkeleton("الْكِتَابَ"), arSkeleton("ٱلْكِتَٰبَ"));
  assert.equal(arSkeleton("إِبْرَٰهِيمَ"), arSkeleton("إِبْرَٰهِۦمَ"));
});

test("K2: ayette geçen kelime — farklı imlâyla yazılsa da — uydurma sayılmaz", () => {
  const ayet = "وَبَشِّرِ ٱلَّذِينَ ءَامَنُوا۟ ... خَٰلِدُونَ";
  assert.deepEqual(checkFabricatedArabic("Ayetteki 'خَالِدُونَ' ifadesi", ayet), []);
});

test("K2: ayette geçmeyen kelime yakalanır", () => {
  const ayet = "لَا يَغُرَّنَّكَ تَقَلُّبُ ٱلَّذِينَ كَفَرُوا۟ فِى ٱلْبِلَـٰدِ";
  assert.deepEqual(checkFabricatedArabic("'مَتَاع' kelimesi geçer", ayet), ["مَتَاع"]);
});

test("K2: kök listesindeki kökler meşrudur", () => {
  const ayet = "فُجِّرَتْ";
  assert.deepEqual(checkFabricatedArabic("'فجر' kökünden gelir", ayet, ["فجر"]), []);
});

test("K3: sure adı ve ayet numarası atıfları yakalanır", () => {
  assert.ok(checkSurahRef("Tevbe Suresinde geçtiği gibi"));
  assert.ok(checkSurahRef("bkz. 9:5"));
  assert.ok(checkSurahRef("önceki 5. ayet"));
  assert.equal(checkSurahRef("önceki ayetlerde belirtildiği gibi"), null);
});

test("K4: kalıp metinden footer beklenmez, gerçek analizden beklenir", () => {
  assert.equal(checkShape(AYNI_TEXT), null);
  assert.equal(checkShape("Kısa bir analiz."), "footer yok");
  assert.equal(checkShape(""), "boş");
  assert.equal(checkShape(`Kısa.\n\n${FOOTER}`), "gövde çok kısa (5)");
});

test("gateVerse temiz metni geçirir", () => {
  const text = `Mealdeki 'Hidayet eyle bizi doğru yola' ifadesi, dilemenin sonucuna ulaşmayı öne çıkarır; literal çeviri ise fiilin yol gösterme yönünü korur.\n\n${FOOTER}`;
  assert.deepEqual(
    gateVerse({ text, mealText: ELMALILI_1_6, arabicText: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ" }),
    []
  );
});

test("gateVerse kaldırılmış meal alıntısını raporlar", () => {
  const text = `Oysa mealdeki 'Bizi doğru yola eriştir' ifadesi sonuca ulaştırma anlamını katmaktadır; bu ince bir kaymadır.\n\n${FOOTER}`;
  const issues = gateVerse({ text, mealText: ELMALILI_1_6, arabicText: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ" });
  assert.deepEqual(issues.map((i) => i.code), ["K1_MEAL_ALINTISI"]);
});

test("K1: ayete/Arapçaya atfedilen transkripsiyon meal alıntısı sayılmaz", () => {
  const t = `Meal, ayette geçen 'la ted'u' fiilini olumsuz emir olarak değil, dolaylı aktarmıştır.`;
  assert.deepEqual(checkMealQuote(t, ELMALILI_1_6), []);
});

test("K1: literale atfedilen alıntı meal alıntısı sayılmaz", () => {
  const t = `Meal ile literal arasındaki fark, literaldeki 'bir yok oluş dilemeyin' ifadesindedir.`;
  assert.deepEqual(checkMealQuote(t, ELMALILI_1_6), []);
});

test("K1: çekim farkı (sözlük biçimi) yanlış alıntı sayılmaz", () => {
  const meal = "Kuşkusuz bunda, saygı duyacaklar için bir ibret vardır";
  assert.deepEqual(checkMealQuote("Meal bu korkuyu 'saygı duymak' olarak yorumlamıştır.", meal), []);
});

test("K1: kaldırılmış mealden alıntı gövde toleransına rağmen yakalanır", () => {
  assert.deepEqual(
    checkMealQuote("Oysa mealdeki 'Bizi doğru yola eriştir' ifadesi", ELMALILI_1_6),
    ["Bizi doğru yola eriştir"]
  );
});

test("K5: 'farklı' deyip anlam farkı olmadığını itiraf eden metin yakalanır", () => {
  assert.ok(checkSelfContradiction("Bu, kelimelerin işaret ettiği anlamda değil, vurguda bir farktır.", false));
  assert.equal(checkSelfContradiction("Meal 'azap' yorumunu eklemiştir.", false), null);
  assert.equal(checkSelfContradiction("anlam farkı yoktur", true), null, "ayni=true ise denetlenmez");
});

test("birleşik meal açıklaması meşru üçüncü durumdur — denetim dışı", () => {
  const t = "Bu ayetin meali, 37:124–126 ayetlerini birlikte kapsamaktadır. Arapça cümle ayet sınırını aştığı için meal ile tek ayetin literal çevirisi birebir karşılaştırılamaz.";
  assert.equal(checkShape(t), null, "footer beklenmez");
  assert.deepEqual(gateVerse({ text: t, mealText: "herhangi", arabicText: "herhangi" }), [],
    "içindeki ayet aralığı sure atfı sayılmaz");
});

test("birleşik meal kalıbına benzeyen ama uymayan metin denetlenir", () => {
  const t = `Meal, 37:124 ayetinde geçmeyen bir ifade eklemiştir.\n\n${FOOTER}`;
  const issues = gateVerse({ text: t, mealText: "x", arabicText: "y" });
  assert.ok(issues.some((i) => i.code === "K3_SURE_ATFI"));
});
