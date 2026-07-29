import assert from "node:assert/strict";
import test from "node:test";

import { denetle, normAr, parseEkli, trKisi } from "./audit-weak-glosses.mjs";

test("normAr hareke ve tatvili düşürür", () => {
  assert.equal(normAr("مِّنۡهَا"), "منها");
  assert.equal(normAr("مِنكُم"), "منكم");
});

test("parseEkli edat ve zamir ekini ayırır", () => {
  assert.deepEqual(parseEkli("مِّنۡهَا"), { govde: "من", ek: "ها", kisi: "3s" });
  assert.deepEqual(parseEkli("مِنكُم"), { govde: "من", ek: "كم", kisi: "2p" });
  assert.deepEqual(parseEkli("عَلَيۡهِمۡ")?.kisi, undefined, "kural dışı gövde çözülmez");
});

test("parseEkli baştaki bağlacı yok sayar", () => {
  assert.equal(parseEkli("وَمِنۡهُم")?.kisi, "3p");
  assert.equal(parseEkli("فَمِنۡهَا")?.kisi, "3s");
});

test("parseEkli uzun eki kısa ekten önce dener", () => {
  assert.equal(parseEkli("مِنۡهُمَآ")?.kisi, "3p", "ikil eki, tekil dişil ekinden önce eşleşmeli");
});

test("trKisi Türkçe karşılığın şahsını çıkarır", () => {
  assert.equal(trKisi("benden"), "1s");
  assert.equal(trKisi("bizden"), "1p");
  assert.equal(trKisi("sizden"), "2p");
  assert.equal(trKisi("onlardan"), "3p");
  assert.equal(trKisi("mukattaa harfi"), null, "şahıs işareti yoksa denetim dışı");
});

test("denetle şahıs uyuşmazlığını yakalar — düzeltilen gerçek hata", () => {
  const d = denetle("مِّنۡهَا", "benden");
  assert.equal(d.uyum, false);
  assert.equal(d.beklenen, "3s");
  assert.equal(d.bulunan, "1s");
});

test("denetle doğru satırı geçirir", () => {
  assert.equal(denetle("مِّنۡهَا", "ondan").uyum, true);
  assert.equal(denetle("مِنكُم", "sizden").uyum, true);
  assert.equal(denetle("مِّنۡهُم", "onlardan").uyum, true);
});

test("denetle karar veremediğinde null döner, hata uydurmaz", () => {
  assert.equal(denetle("الٓمٓ", "mukattaa harfi"), null);
  assert.equal(denetle("فِيهِ", "içinde"), null, "karşılıkta şahıs yoksa denetlenmez");
});

test("parseEkli şeddeli birleşmeyi çözer — kaçırılan hata sınıfı", () => {
  // مِنَّا = min + nā; şedde iki nûnu tek harfe indiriyor
  assert.equal(parseEkli("مِنَّا")?.kisi, "1p");
  assert.equal(parseEkli("عَنَّا")?.kisi, "1p");
  // mevcut doğru davranış bozulmamalı
  assert.equal(parseEkli("مِنِّي")?.kisi, "1s");
});

test("denetle مِنَّا -> 'benden' hatasını yakalar", () => {
  const d = denetle("مِنَّا", "benden");
  assert.equal(d.uyum, false);
  assert.equal(d.beklenen, "1p");
  assert.equal(denetle("مِنَّا", "bizden").uyum, true);
});
