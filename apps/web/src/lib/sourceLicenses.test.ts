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
// içeriğidir. Web ve mobil ekranlarının ona bağlanması planlanıyor ama henüz
// yapılmadı; o yüzden bu test merkezi içeriğin KENDİ tutarlılığını doğrular
// ve ayrıca atıf zorunluluğu olan kaynakların mobil ekranda FİİLEN göründüğünü
// kontrol eder (asıl lisans riski burada).

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

test("mobil Kaynaklar ekranı, atıf zorunluluğu olan tüm kaynakları gösterir", () => {
  const mobile = readFileSync(path.join(REPO_ROOT, "apps/mobile/app/hakkinda.tsx"), "utf8");

  for (const { needle, why } of REQUIRED_ON_SCREEN) {
    assert.ok(mobile.includes(needle), `mobil hakkinda ekranında "${needle}" atfı yok — ${why}`);
  }
});

test("mobil ekrandaki atıf bağlantıları merkezi içerikteki URL'lerle birebir aynı", () => {
  const mobile = readFileSync(path.join(REPO_ROOT, "apps/mobile/app/hakkinda.tsx"), "utf8");
  const centralUrls = new Map(SOURCE_LICENSE_CONTENT.links.map((link) => [link.id, link.url]));

  // Ekranda geçen bu kaynakların URL'leri merkezi listeden sapmamalı ki
  // ileride merkezileştirme yapıldığında içerik çelişmesin.
  for (const id of ["camel-morph", "camel-tools", "mustafa0x", "semar-ketir", "alquran-tajweed", "alquran-terms"]) {
    const url = centralUrls.get(id);
    assert.ok(url, `merkezi içerikte "${id}" bağlantısı yok`);
    assert.ok(mobile.includes(url), `mobil ekran "${id}" için merkezi URL'i kullanmıyor: ${url}`);
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
    "Tecvid işaretleri, AlQuran.cloud tecvid markerlarından yararlanılarak canonical Tanzil metnine yeniden hizalanmış; Kuran Yolu'nun span/koordinat sistemi, renk eşlemesi, güvenlik kontrolleri ve manuel düzeltmeleriyle hazırlanmıştır. 14 ayette 23 manuel span eklenmiştir.",
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
