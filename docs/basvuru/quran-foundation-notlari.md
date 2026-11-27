# Quran Foundation API Application Notes — Kuran Yolu

## 1. Content and Rights

Kuran Yolu displays the canonical Arabic Quran text from **Tanzil Quran Text Uthmani 1.1** (CC BY 3.0) verbatim and unmodified behind an immutable SHA-256 gate, with attribution and links to `https://tanzil.net/`. Turkish translation uses **Elmalılı Hamdi Yazır** (*Hak Dini Kur'an Dili*, digital chain via Semar Ketir's MIT-licensed `json-quran`) `[CONFIRM: edition-specific public-domain/redistribution rights for the packaged Elmalılı digital edition]`; mobile English mode uses **M. M. Pickthall** (1930, Tanzil `en.pickthall`, treated as public domain) and AlQuran Cloud/Quran.com `en.transliteration` `[CONFIRM: explicit redistribution license for AlQuran Cloud English transliteration]`. Word morphology builds on **Quranic Arabic Corpus v0.4** / `mustafa0x/quran-morphology` `[CONFIRM: exact GPL version and fork license evidence]`, **CAMeL Tools** (MIT), and **CAMeL Morph** (CC BY 4.0). Tajweed spans realign **AlQuran.cloud** `quran-tajweed` markers `[CONFIRM: open license definition beyond AlQuran.cloud terms]` onto canonical Tanzil text. Classical hadith references `[CONFIRM: exact source/redistribution terms for hadith references and Sunnah.com links]` and prayer times (**Diyanet Awqat Salah** `[CONFIRM: formal API usage/redistribution terms with Diyanet]`, **Aladhan** fallback, **GeoNames** CC BY 4.0) are attributed in the in-app/web **About** (`Hakkında`) screen, `NOTICE`, and `THIRD_PARTY_LICENSES.md`. Fonts: Amiri, Figtree, Lora (SIL OFL 1.1) and UthmanicHafs (KFGQPC EULA).

**AI-assisted content:** Simplified tafsir (`DeepSeek`), selected lessons/quizzes (`ChatGPT`/`Claude`), Elifba audio and prayer-guide images (`Gemini`), and English UI/lesson/word/literal translations are AI-assisted and separately disclosed in the About screen and `docs/provenance/source-content-provenance.json`.

---

## 2. Integration

Kuran Yolu's web app and mobile backend run on **Next.js (Vercel, `fra1`)** backed by **Turso (libSQL)** for Quran verses, word/root morphology, tafsir, search, and Elifba data. **Upstash Redis** handles API rate limiting and Diyanet auth/slot coordination. Prayer times are fetched server-side per city from **Diyanet Awqat Salah**, falling back to **Aladhan.com** when no Diyanet city is nearby or Diyanet is unavailable; the web Qibla tool also queries **OpenStreetMap Nominatim** for city lookup. Mobile uses **Firebase** (Analytics, Anonymous Auth, Cloud Firestore) for optional anonymous cloud backup and **Sentry** for crash reporting. Elifba letter audio MP3s are self-hosted on Vercel (`AUDIO_BASE_URL`).

**Offline bundled data:** Mobile bundles the full 604-page tajweed mushaf, Elmalılı/Pickthall translations, 16 lessons, duas, worship guides, and simplified tafsir fallback for offline use.

**Planned Quran Foundation API usage:** `[FILL: specify which Quran Foundation API endpoints/resources we plan to integrate (e.g., audio recitations, translations, tafsir, word-by-word sync), expected request volume/caching strategy, and target rollout]`.

---

## 3. Business and Operations

Kuran Yolu is a **free, ad-free** project with no in-app purchases, developed and maintained by an independent solo developer (**Kartal Studio**). Platforms include **Web** (Vercel), **Android** (Google Play, v1.2.5 live since November 25, 2026), and **iOS** (App Store, v1.2.5 submitted November 25, 2026, under review), with v1.2.6 in active preparation.

**Maintenance & release process:** User bug reports and feedback are collected through GitHub and the `/support` page (`kuranyolu.iletisim@gmail.com`). Code and datasets are guarded by TypeScript typechecking, unit/data/tajweed/provenance tests in CI, and a SHA-256 provenance manifest (`npm run provenance:sources`), with regular web deployments and store updates.

**Corrections & deprecations:** Reported content errors are verified against canonical sources and fixed in the dataset/migrations with regression tests. Deprecated or retired sources are removed from runtime while preserving their metadata and hashes in `docs/provenance/source-content-provenance.json` (for example, the Bulaç, Diyanet, Öztürk, and Vakfı Turkish translations were removed from runtime via `migrate-elmalili-only.mjs` and retained as `removed_from_runtime`, and the raw `morfoloji` table was dropped from runtime and archived as a hashed provenance artifact).

---

## 4. Declarations Checklist

Production base URL (from `apps/mobile/src/lib/runtimeConfig.ts`): `https://kuran-app-web-ozan-s-projects8.vercel.app`

- **Privacy Policy (TR):** `https://kuran-app-web-ozan-s-projects8.vercel.app/privacy`
- **Privacy Policy (EN):** `https://kuran-app-web-ozan-s-projects8.vercel.app/privacy/en`
- **Terms of Use (TR):** `https://kuran-app-web-ozan-s-projects8.vercel.app/terms`
- **Terms of Use (EN):** `https://kuran-app-web-ozan-s-projects8.vercel.app/terms/en`
- **Support:** `https://kuran-app-web-ozan-s-projects8.vercel.app/support`
- **About / Sources & Licenses:** `https://kuran-app-web-ozan-s-projects8.vercel.app/hakkinda`
- **Contact Email:** `kuranyolu.iletisim@gmail.com`

---

## 5. Open Items

### Privacy Policy Gaps (for separate follow-up — not modified in this task)
1. **Notifications:** Neither web (`/privacy`, `/privacy/en`) nor mobile (`gizlilik.json`, `gizlilik.en.json`) mentions local prayer/daily-verse notifications (`expo-notifications`) or notification permission/preferences.
2. **Upstash Redis:** Used in `apps/web/src/middleware.ts` (IP-based API rate limiting) and `apps/web/src/app/api/vakit/route.ts` (Diyanet rate limiting/auth slot), but not listed under Third-Party Services.
3. **OpenStreetMap Nominatim:** Declared in `apps/web/next.config.mjs` CSP (`connect-src`) for web Qibla lookup (`KibleClient`), but not listed in web Third-Party Services.

### `[CONFIRM]` / `[FILL]` Placeholders
- `[CONFIRM: edition-specific public-domain/redistribution rights for the packaged Elmalılı digital edition]`
- `[CONFIRM: explicit redistribution license for AlQuran Cloud English transliteration]`
- `[CONFIRM: exact GPL version and fork license evidence]` (Quranic Arabic Corpus / `mustafa0x/quran-morphology`)
- `[CONFIRM: open license definition beyond AlQuran.cloud terms]` (`quran-tajweed` markers)
- `[CONFIRM: exact source/redistribution terms for hadith references and Sunnah.com links]`
- `[CONFIRM: formal API usage/redistribution terms with Diyanet]` (Awqat Salah)
- `[FILL: specify which Quran Foundation API endpoints/resources we plan to integrate (e.g., audio recitations, translations, tafsir, word-by-word sync), expected request volume/caching strategy, and target rollout]`
