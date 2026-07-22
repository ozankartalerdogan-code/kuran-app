import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAyahImageShareContent,
  buildNativeImageShareOptions,
  getImageShareResult,
} from "./ayahImageShare.ts";

const baseInput = {
  surahName: "Âl-i İmrân & Dua",
  ayahNumber: 37,
  webUrl: "https://kuranyolu.example/surah/3/ayah/37",
};

test("okunuşu olan kart verisi, imza ve HTTPS bağlantılı caption üretir", () => {
  const content = buildAyahImageShareContent({
    ...baseInput,
    reading: "Ve kefelehâ Zekeriyyâ",
  });

  assert.equal(content.reading, "Ve kefelehâ Zekeriyyâ");
  assert.ok(content.message.includes("Âl-i İmrân & Dua 37. Ayet"));
  assert.ok(content.message.includes("Kuran Yolu"));
  assert.ok(content.message.includes(baseInput.webUrl));
});

test("okunuşu olmayan kart verisi boş bölüm üretmez", () => {
  const content = buildAyahImageShareContent({ ...baseInput, reading: "   " });

  assert.equal(content.reading, null);
  assert.ok(content.message.includes("Kuran Yolu"));
  assert.ok(content.message.includes(baseInput.webUrl));
});

test("Android paylaşımı PNG URI, MIME türü ve mesajı birlikte gönderir", () => {
  const options = buildNativeImageShareOptions({
    fileUri: "file:///cache/ayah.png",
    title: "Fatiha 1. Ayet",
    message: "Fatiha 1. Ayet\n\nKuran Yolu\n\nhttps://kuranyolu.example/surah/1/ayah/1",
    platform: "android",
  });

  assert.equal(options.url, "file:///cache/ayah.png");
  assert.equal(options.type, "image/png");
  assert.ok(options.message.includes("Kuran Yolu"));
  assert.equal(options.useInternalStorage, true);
});

test("iOS paylaşımı aynı dosya ve mesajı Android'e özgü seçenek olmadan kullanır", () => {
  const options = buildNativeImageShareOptions({
    fileUri: "file:///cache/ayah.png",
    title: "Fatiha 1. Ayet",
    message: "Kuran Yolu\n\nhttps://kuranyolu.example/surah/1/ayah/1",
    platform: "ios",
  });

  assert.equal(options.url, "file:///cache/ayah.png");
  assert.equal(options.type, "image/png");
  assert.ok(options.message.includes("https://"));
  assert.equal("useInternalStorage" in options, false);
});

test("paylaşım ekranını kapatmak hata sayılmaz", () => {
  assert.equal(getImageShareResult({ success: false, dismissedAction: true }), "cancelled");
});
