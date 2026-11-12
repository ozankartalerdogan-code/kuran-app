# Third Party Licenses

## Qur'an Arabic Text

- Source: Tanzil Quran Text
- Copyright: Copyright © 2007–2026 Tanzil Project
- License: Creative Commons Attribution 3.0
- Website: [https://tanzil.net/](https://tanzil.net/)
- Terms note: The Quran text may be used in websites and applications provided that Tanzil.net is clearly indicated as the source, a link to Tanzil.net is provided, and the text is kept verbatim / unmodified.

## Elmalılı Hamdi Yazır — Hak Dini Kur'an Dili

- Source: Elmalılı Hamdi Yazır, *Hak Dini Kur'an Dili*
- Usage: Original meal and tafsir basis referenced by the app.
- Digital source chain: Semar Ketir's `json-quran` transcription, MIT License, Copyright (c) 2015 Semar Ketir.
- Production policy: Elmalılı is the only Turkish runtime meal. When the mobile UI language is English, the Pickthall translation below is shown instead.
- Provenance note: the former Bulac, Diyanet, Ozturk and Vakfi sources are retained in the hash chain with `removed_from_runtime` status and are not presented by the application.
- Note: Simplified tafsir explanations are AI-assisted Kuran Yolu rewrites and are presented for informational use.
- Rights note: Verify the edition-specific publication and redistribution status of the exact digital source used in packaged builds.

## M. M. Pickthall — The Meaning of the Glorious Koran (English)

- Source: Mohammed Marmaduke Pickthall, *The Meaning of the Glorious Koran* (Alfred A. Knopf, 1930). The translator died in 1936.
- Digital source: Tanzil.net, translation ID `en.pickthall` (last update 2010-09-04): https://tanzil.net/trans/
- Usage: Bundled in the mobile app (`apps/mobile/src/data/meal_en_pickthall.json`) and shown when the UI language is English.
- Rights note: Treated as public domain (life+70; US publication 1930 + 95 years). Tanzil's digital edition contains minor wording edits relative to the 1930 print. Not asserted as legal certainty.

## Quranic Arabic Corpus

- Source: Quranic Arabic Corpus
- Author: Kais Dukes
- Copyright: Copyright © 2011 Kais Dukes
- License: GNU General Public License / Quranic Arabic Corpus Terms of Use
- Website: [https://corpus.quran.com/](https://corpus.quran.com/)
- Attribution requirement: The source should be clearly indicated and linked to `https://corpus.quran.com/` so users can track updates.
- Fork chain: `https://github.com/mustafa0x/quran-morphology`, a modified Arabic/fix fork of QAC v0.4.
- Change notice: Kelime morfolojisi, Quranic Arabic Corpus ve CAMeL kaynaklarından yararlanılarak Kuran Yolu'nun canonical token hizalama, Unicode normalizasyonu, bağlamsal seçim, hata düzeltme ve manuel doğrulama süreçleriyle hazırlanmıştır. Nihai veri kaynak dosyaların birebir kopyası değildir.
- Runtime note: the raw `morfoloji` table was removed from the runtime on 2026-07-28 (local and Turso); its full 130,030-row pre-image and schema are preserved in hashed provenance artefacts. It was never reclassified as the final Kuran Yolu morphology output.

## Kuran Yolu Analysis Layer

- Source: Kuran Yolu analysis pipeline
- Scope: Turkish root meanings, root corrections, data cleaning, and user-friendly morphology presentation layered on top of referenced source data.
- Status: Project-specific derivative analysis layer prepared separately from third-party source datasets.

## Tajweed (Tecvid) Rule Markers — AlQuran.cloud

- Source: AlQuran.cloud API, `quran-tajweed` edition
- API: https://api.alquran.cloud/v1/quran/quran-tajweed
- Terms: https://alquran.cloud/terms-and-conditions
- Usage: AlQuran.cloud tajweed-marked data is used as an intermediate
  rule source and processed through Kuran Yolu's in-house alignment,
  validation, and override pipeline. The resulting rule markers are
  aligned to Kuran Yolu's canonical Tanzil text and converted into
  derived span/color data. The AlQuran.cloud text is not used as the
  canonical display text, and the canonical Tanzil text is never
  modified by this process.
- Change notice: Tecvid işaretleri, AlQuran.cloud tecvid markerlarından yararlanılarak canonical Tanzil metnine yeniden hizalanmış; Kuran Yolu'nun span/koordinat sistemi, renk eşlemesi, güvenlik kontrolleri ve manuel düzeltmeleriyle hazırlanmıştır. 14 ayette 23 manuel span eklenmiştir.
- Coverage evidence: 79,343 of 86,595 recognized source clusters were aligned (approximately 91.63%); 23 manual spans covering 24 clusters were added in 14 already mapped verses.
- Runtime note: `verses.arabic_tajweed` remains a separately tracked raw runtime risk pending an API-compatible migration.

## Classical Hadith Sources

- Source: Classical hadith collections referenced during content preparation.
- Scope: Hadith-related content shown in the app is based on classical source material, while explanation and presentation text is simplified for Kuran Yolu in an informational style.
- Note: This section documents reference use and presentation context; it does not claim that the app republishes a full critical edition of any hadith collection.

## CAMeL Tools

- Source: https://github.com/CAMeL-Lab/camel_tools
- License: MIT
- Copyright: 2018-2025 New York University Abu Dhabi
- Full text: `licenses/CAMEL-TOOLS-MIT.txt`

## CAMeL Morph

- Source: https://github.com/CAMeL-Lab/camel_morph
- License: Creative Commons Attribution 4.0 International
- Change notice: Candidate analyses were contextually selected, rejected or normalized and combined with canonical Tanzil token alignment and manual review.
- Full attribution: `licenses/CAMEL-MORPH-CC-BY-4.0-NOTICE.md`

## Semar Ketir Digital Quran Dataset

- Source: https://github.com/kurancilar/json
- License: MIT
- Copyright: Copyright (c) 2015 Semar Ketir
- Full text: `licenses/SEMAR-KETIR-MIT.txt`

## Bundled Fonts

- Amiri: Copyright 2010-2022 The Amiri Project Authors; SIL OFL 1.1.
- Figtree: Copyright 2022 The Figtree Project Authors; SIL OFL 1.1.
- Lora: Copyright 2011 The Lora Project Authors; SIL OFL 1.1; Reserved Font Name "Lora".
- UthmanicHafs: Copyright (c) 2010 King Fahd Glorious Quran Printing Complex; distributed unmodified under the EULA embedded in the font.
- Full texts: `licenses/OFL-1.1.txt`, `licenses/FONT-NOTICES.md`, `licenses/UTHMANIC-HAFS-EULA.txt`

## AI-Assisted Kuran Yolu Content

AI-assisted project outputs include transliteration, Codex hadith translations,
Deep Research siyer/kıssa material, ChatGPT lesson research, Claude cards and
quizzes, Gemini Elifba audio and selected imagery, and AI-assisted prayer,
dhikr and explanatory text. Tool, method, review status, paths and SHA-256
values are recorded in `docs/provenance/source-content-provenance.json`.
Where exact research URL or model/run history was not preserved, the manifest
states that limitation explicitly.

## Runtime Packages

Direct production package versions, declared licenses, license-file hashes and
texts are generated in `licenses/PACKAGE-NOTICES.md` and
`licenses/PACKAGE-LICENSE-TEXTS.txt`. A release-specific check is still needed
for the final transitive/native dependency set actually shipped.

## Legal Scope

These notices record technical source and transformation provenance. They do
not provide legal advice, guarantee public-domain status for a particular
edition, or imply endorsement by any source provider.
