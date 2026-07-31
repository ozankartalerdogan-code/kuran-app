import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  SOURCE_LICENSE_CONTENT,
  getSourceLicenseLinks,
} from "../../../../packages/core/src/presentation/sourceLicenses.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

// packages/core/src/presentation/sourceLicenses.ts merkezi kaynak/lisans
// içeriğidir. Web ve mobil hakkında ekranlarının İKİSİ DE artık metni satır içi
// tutmuyor, bu içerikten render ediyor. Lisans şartının karşılandığı yer bu
// yüzden merkezi içeriktir; bu dosya (1) içeriğin atıf zorunluluğu olan tüm
// kaynakları taşıdığını, (2) her iki ekranın onu gerçekten render ettiğini ve
// (3) hiçbir ekranın URL kopyalayarak merkezi içeriği baypas etmediğini
// doğrular.

/** Atıfı lisans şartı olan kaynaklar — ekranda görünmek zorundalar. */
const REQUIRED_ON_SCREEN = [
  { needle: "Tanzil", why: "Tanzil Quran Text CC BY 3.0 atıf şartı" },
  { needle: "CAMeL Morph", why: "CAMeL Morph CC BY 4.0 atıf şartı" },
  { needle: "CAMeL Tools", why: "CAMeL Tools MIT bildirim şartı" },
  { needle: "Semar Ketir", why: "Semar Ketir MIT bildirim şartı" },
  { needle: "AlQuran.cloud", why: "AlQuran.cloud tecvid verisi kaynak atfı" },
  { needle: "mustafa0x", why: "mustafa0x Quran Morphology kaynak atfı" },
  { needle: "Quranic Arabic Corpus", why: "QAC kaynak atfı" },
];

/** Ekranların merkezi içeriği render ettiği dosyalar. */
const SCREEN_FILES = [
  "apps/mobile/app/hakkinda.tsx",
  "apps/web/src/app/hakkinda/page.tsx",
];

test("merkezi içerik, atıf zorunluluğu olan tüm kaynakları taşır", () => {
  // Ekranlar artık metni satır içi tutmuyor, SOURCE_LICENSE_CONTENT'ten render
  // ediyor. Lisans şartının karşılandığı yer bu yüzden merkezi içeriktir.
  const rendered = [
    SOURCE_LICENSE_CONTENT.title,
    SOURCE_LICENSE_CONTENT.intro,
    ...SOURCE_LICENSE_CONTENT.sections.flatMap((section) => [section.title, section.body]),
    ...SOURCE_LICENSE_CONTENT.links.flatMap((link) => [link.title, link.license ?? "", link.url]),
  ].join("\n");

  for (const { needle, why } of REQUIRED_ON_SCREEN) {
    assert.ok(rendered.includes(needle), `merkezi içerikte "${needle}" atfı yok — ${why}`);
  }
});

test("her iki ekran da merkezi içeriği render eder ve kopya taşımaz", () => {
  const centralUrls = SOURCE_LICENSE_CONTENT.links.map((link) => link.url);

  for (const relativePath of SCREEN_FILES) {
    const screen = readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

    assert.match(
      screen,
      /SOURCE_LICENSE_CONTENT.+sourceLicenses"|SOURCE_LICENSE_CONTENT.+@quran-app\/core"/s,
      `${relativePath} merkezi sourceLicenses içeriğini import etmiyor`,
    );
    assert.match(
      screen,
      /SOURCE_LICENSE_CONTENT\.sections\.map/,
      `${relativePath} bölümleri merkezi içerikten render etmiyor`,
    );
    // Bağlantılar da merkezi listeden çözülmeli — ekran kendi listesini kurarsa
    // merkezi içerikten sessizce sapar.
    assert.match(
      screen,
      /getSourceLicenseLinks/,
      `${relativePath} bağlantıları getSourceLicenseLinks ile çözmüyor`,
    );

    // Merkezi içerik baypas edilip URL elle yazılırsa sapma yeniden mümkün olur.
    for (const url of centralUrls) {
      assert.ok(
        !screen.includes(url),
        `${relativePath} "${url}" adresini elle kopyalıyor — merkezi listeden okunmalı`,
      );
    }
  }
});

test("her bölümün bağlantı id'leri merkezi listede çözülür", () => {
  for (const section of SOURCE_LICENSE_CONTENT.sections) {
    const resolved = getSourceLicenseLinks(section.linkIds);
    assert.equal(resolved.length, section.linkIds.length, `${section.id} bölümünde çözülemeyen id var`);
    for (const link of resolved) {
      assert.ok(link.title.trim(), `${link.id} başlıksız`);
      assert.equal(new URL(link.url).protocol, "https:");
    }
  }
});

test("required morphology and tajweed disclosures stay exact", () => {
  const morphology = SOURCE_LICENSE_CONTENT.sections.find((section) => section.id === "morphology");
  const tajweed = SOURCE_LICENSE_CONTENT.sections.find((section) => section.id === "tajweed");

  assert.equal(
    morphology?.body,
    "Kelime morfolojisi, Quranic Arabic Corpus ve CAMeL kaynaklarından yararlanılarak Kuran Yolu'nun canonical token hizalama, Unicode normalizasyonu, bağlamsal seçim, hata düzeltme ve manuel doğrulama süreçleriyle hazırlanmıştır. Nihai veri kaynak dosyaların birebir kopyası değildir.",
  );
  assert.equal(
    tajweed?.body,
    "Tecvid işaretleri, AlQuran.cloud tecvid markerlarından yararlanılarak canonical Tanzil metnine yeniden hizalanmış; Kuran Yolu'nun span/koordinat sistemi, renk eşlemesi, güvenlik kontrolleri ve manuel düzeltmeleriyle hazırlanmıştır. Tanınan 86.595 kaynak kümesinin 79.343'ü hizalanmıştır (%91,6254); 14 ayette 23 manuel span eklenmiştir.",
  );
});

test("all central links are unique, HTTPS and resolvable by section", () => {
  const urls = new Set<string>();
  for (const link of SOURCE_LICENSE_CONTENT.links) {
    const url = new URL(link.url);
    assert.equal(url.protocol, "https:");
    assert.ok(!urls.has(url.href), `duplicate source URL: ${url.href}`);
    urls.add(url.href);
  }

  for (const section of SOURCE_LICENSE_CONTENT.sections) {
    assert.equal(getSourceLicenseLinks(section.linkIds).length, section.linkIds.length);
  }
});
