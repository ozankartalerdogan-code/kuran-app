import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAyahShareText } from "./ayahShare.ts";

const link = "https://kuran-app-web-ozan-s-projects8.vercel.app/surah/1/ayah/1";

test("tam ayet paylaşımı alanları belirlenen sırayla gönderir", () => {
  assert.equal(buildAyahShareText({
    surahName: "Fatiha", ayahNumber: 1, arabicText: "بِسْمِ اللّٰهِ", reading: "Bismillahirrahmanirrahim", meal: "Rahmân ve Rahîm olan Allah'ın adıyla.", webUrl: link,
  }), [
    "Fatiha · 1. Ayet", "بِسْمِ اللّٰهِ", "Bismillahirrahmanirrahim", "Rahmân ve Rahîm olan Allah'ın adıyla.", "Kuran Yolu", link,
  ].join("\n\n"));
});

test("okunuş eksikse boş satır bırakmadan atlar", () => {
  const text = buildAyahShareText({
    surahName: "İhlâs", ayahNumber: 1, arabicText: "قُلْ هُوَ اللّٰهُ أَحَدٌ", reading: null, meal: "De ki: O Allah birdir.", webUrl: link,
  });
  assert.equal(text, ["İhlâs · 1. Ayet", "قُلْ هُوَ اللّٰهُ أَحَدٌ", "De ki: O Allah birdir.", "Kuran Yolu", link].join("\n\n"));
  assert.ok(!text.includes("\n\n\n"));
});

test("özel karakterli sure adı, imza ve bağlantı korunur", () => {
  const text = buildAyahShareText({
    surahName: "Mü’minûn & Şûrâ", ayahNumber: 12, arabicText: null, reading: "", meal: null, webUrl: link,
  });
  assert.match(text, /^Mü’minûn & Şûrâ · 12\. Ayet/);
  assert.ok(text.includes("Kuran Yolu"));
  assert.ok(text.endsWith(link));
});