/**
 * cleanMeal.test.ts — kritik metin temizleme mantığı testleri.
 * Çalıştır: npm test  (Node yerleşik test runner + native TS, sıfır bağımlılık)
 *
 * cleanMealText kullanıcının gördüğü meal/literal/fark metnini üretir; buradaki
 * bir regresyon çevirileri boş/bozuk gösterebilir → bu yüzden test ediliyor.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanMealText, hasEncodingError } from "./cleanMeal.ts";

test("boş/null girdi → null", () => {
  assert.equal(cleanMealText(null), null);
  assert.equal(cleanMealText(undefined), null);
  assert.equal(cleanMealText(""), null);
  assert.equal(cleanMealText("   "), null);
});

test("baştaki (1-2) dipnotu temizlenir", () => {
  assert.equal(cleanMealText("(1-2) Rahman ve Rahim"), "Rahman ve Rahim");
  // tek numara (-\d yok) dipnot SAYILMAZ, korunur
  assert.equal(cleanMealText("(5) test"), "(5) test");
});

test("[1] dipnot işaretleri silinir, boşluk daraltılır", () => {
  assert.equal(cleanMealText("Allah[1] birdir[2]"), "Allah birdir");
});

test("HTML entity'leri çözülür", () => {
  assert.equal(cleanMealText("Adem &amp; Havva"), "Adem & Havva");
  assert.equal(cleanMealText("a&nbsp;b"), "a b");
  assert.equal(cleanMealText("&quot;söz&quot;"), '"söz"');
});

test("fazla boşluk/satır daraltılır + trim", () => {
  assert.equal(cleanMealText("çok    boşluk\n\tvar  "), "çok boşluk var");
});

test("temiz literal aynen döner (Ayetü'l-Kürsi başı, parantezli)", () => {
  const s = "Allah; O'ndan başka ilah yoktur. O, Hayy'dır (diridir), Kayyûm'dur";
  assert.equal(cleanMealText(s), s); // parantez/gloss korunur, kısaltma YOK
});

test("hasEncodingError: bozuk encoding yakalanır, temiz Türkçe geçer", () => {
  assert.equal(hasEncodingError("Ã¶ bozuk metin"), true);
  assert.equal(hasEncodingError("temiz Türkçe meal: çğıöşü"), false);
});

test("encoding hatası olan metin → null (kullanıcıya bozuk gösterme)", () => {
  assert.equal(cleanMealText("Ø¨Ù bozuk arapça-bozulması"), null);
});
