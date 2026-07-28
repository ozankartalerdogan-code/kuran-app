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

test("web and mobile consume the same central source and license content", () => {
  const web = readFileSync(path.join(REPO_ROOT, "apps/web/src/app/hakkinda/page.tsx"), "utf8");
  const mobile = readFileSync(path.join(REPO_ROOT, "apps/mobile/app/hakkinda.tsx"), "utf8");

  for (const source of [web, mobile]) {
    assert.match(source, /SOURCE_LICENSE_CONTENT/);
    assert.match(source, /getSourceLicenseLinks/);
  }
  assert.match(web, /from "@quran-app\/core"/);
  assert.match(mobile, /packages\/core\/src\/presentation\/sourceLicenses/);
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
