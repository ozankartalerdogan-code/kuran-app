# Kuran Yolu

**English** · [Türkçe](README.md)

Kuran Yolu is a web and mobile application that brings together Quran reading,
Elmalılı Hamdi Yazır Turkish translation (meal), word and root analysis,
tajweed visualization, tafsir explanations, Elifba and lesson content,
supplication and worship guides, and prayer times.

The project is a TypeScript monorepo using npm workspaces. The web application
uses Next.js 14 and React 18; the mobile application uses Expo SDK 56,
React Native, and React 19. Exact dependency versions are maintained in
package.json files and package-lock.json.

## Directories

| Path | Responsibility |
|---|---|
| `apps/web` | Next.js web application and HTTP API |
| `apps/mobile` | Expo / React Native mobile application |
| `packages/core` | Shared analysis, data adapters, presentation, and source notices |
| `packages/types` | Shared TypeScript data types |
| `packages/storage` | Web and native storage adapters |
| `packages/ui` | Shared UI package |
| `content` | Shared content |
| `data` | Local DB, source data, and data processing outputs; mostly excluded from Git |
| `data2` | Analysis sources, local JSON inputs, and data generation scripts; excluded from Git |
| `scripts` | Test, audit, data preparation, maintenance, and migration tools |
| `docs` | Technical documentation and provenance records |
| `licenses` | Third-party licenses and notices |
| `_arsiv` | Locally kept archive only; excluded from Git and distribution packages |

## Installation

Node.js 24 is recommended: existing test commands run TypeScript files directly,
and the CI test job uses Node 24. CI type checking also runs on Node 22.

TODO: Document the exact supported Node/npm version range and the mobile
development toolchain.

Install dependencies from the repo root:

```sh
npm ci
```

Local configuration:

- For web DB access, Turso is used if `TURSO_DB_URL` and `TURSO_AUTH_TOKEN` are
  defined together; otherwise, the local `data/app.db` is required.
- Keep web environment settings in `apps/web/.env.local`.
- The mobile API target can be configured with `EXPO_PUBLIC_WEB_URL` and
  `EXPO_PUBLIC_API_URL`; the audio target can be configured with
  `EXPO_PUBLIC_AUDIO_BASE_URL`.
- `EXPO_PUBLIC_*` values are exposed to the client; do not put secrets in these
  fields.
- Some maintenance commands use the `.env.local` file in the root.
- Do not add local configurations for Firebase and other services to Git.

TODO: Add environment templates without values, required variables by feature,
and the authoritative procurement method for the local DB.

## Development and Commands

The following commands are run from the repo root and correspond to existing
package.json scripts.

| Purpose | Command |
|---|---|
| Web development | `npm run dev:web` |
| Mobile development server | `npm run dev:mobile` |
| Android development build | `npm run android -w @quran-app/mobile` |
| iOS development build | `npm run ios -w @quran-app/mobile` |
| Workspace type check | `npm run typecheck` |
| Web Node tests | `npm test` |
| Mobile tests | `npm run test:mobile` |
| Core tests | `npm run test:core` |
| Web Jest data tests | `npm run test:data` |
| Quran runtime tests | `npm run test:quran` |
| Source/provenance tests | `npm run test:provenance` |
| Tajweed audit tests | `npm run test:tajweed-audit` |
| Diff analysis quality gate tests | `npm run gate:fark:test` |
| Workspace build | `npm run build` |
| Start compiled web application | `npm run start -w @quran-app/web` |

The root build command only runs workspaces that have a build script. Since the
mobile package does not have a build script, this command does not generate an
Android AAB or iOS package. The web build script runs its own type check first.

Maintenance commands:

| Purpose | Command |
|---|---|
| DB backup | `npm run backup` |
| Source provenance generation | `npm run provenance:sources` |
| Package license notices generation | `npm run licenses:packages` |
| Live system verification | `npm run verify:live` |

Backup and generation commands may write files; live verification makes network
access. Migration, synchronization, and upload operations are not routine
testing steps.

## Data

Web runtime data is accessed via Turso or local SQLite. The production
translation policy is Elmalılı Hamdi Yazır only. The Bulaç, Diyanet, Öztürk,
and Vakfı translations have been removed from the runtime; source history is
preserved in provenance records.

The canonical Arabic text is sourced from Tanzil Uthmani 1.1. The source Unicode
text is preserved; tajweed display is prepared with an aligned span layer.

`data2/` is in active use:

- The core adapter reads `processed/root_explanations_tr_v2_easy_only.json`
  at module load time.
- Analysis and audit pipelines can use canonical v2/v3/v4 JSONs.
- Inputs for data preparation and comparison scripts are located here.

Therefore, `data2/` must not be archived in bulk. Some legacy source directories
required by the `build:word-analysis:*` and `build:canonical-word-analysis:*`
commands in package.json are not present.

TODO: Determine the procurement of missing legacy inputs or the future of these
commands.

A clean clone does not include all local data. Some DB tests are skipped when
data is not present; skip counts should also be inspected when evaluating
successful test results.

Source and transformation records:
`docs/provenance/source-content-provenance.json`.

## Deployment

The web target is Vercel. `apps/web/vercel.json` defines the Next.js build
command, `.next` output, and `fra1` region. The project name in the owner's
notes is referenced as `kuran-app-web`.

Production web address: <https://kuran-app-web-ozan-s-projects8.vercel.app>.
The mobile application uses this address as the default API target
(`apps/mobile/src/lib/runtimeConfig.ts`; Android app link
`apps/mobile/app.config.js`). If switching to a custom domain, both locations
must be updated together.

On mobile, `apps/mobile/eas.json` defines development, preview, and production
profiles; the production Android output type is set to `app-bundle`.

For production Android AAB operations, the existing
[local production procedure](.agents/skills/local-production-aab/SKILL.md)
is used. The existing signing method is preserved; no new key or keystore is
created.

The iOS bundle identifier is `com.kuranapp.mobile`; App Store preparations
(permission descriptions, privacy manifest, Firebase plist) are completed,
and submission is handled via the `submit.production` profile in `eas.json`.

TODO: Document the App Store release status.

## Licenses and Third-Party Sources

The project's original application code is proprietary:
**All rights reserved — Tüm hakları saklıdır.** Details are in `LICENSE`.

Third-party materials are subject to their own licenses and terms of use;
the project code's license does not alter these rights.

| Source | Recorded license / status in repo |
|---|---|
| Tanzil Quran Text Uthmani 1.1 | CC BY 3.0; attribution, link, notice, and non-modification conditions |
| Elmalılı digital source chain / Semar Ketir | Digital JSON work MIT; rights for the exact edition/manuscript used TODO |
| Quranic Arabic Corpus / mustafa0x fork | GPL / Corpus Terms record; exact GPL version and fork license proof TODO |
| CAMeL Tools | MIT |
| CAMeL Morph | CC BY 4.0 |
| AlQuran.cloud tajweed markers | Provider terms of use; explicit license definition TODO |
| Amiri, Figtree, Lora | SIL OFL 1.1 |
| UthmanicHafs | KFGQPC EULA inside font |
| Production software dependencies | MIT, Apache-2.0, ISC, BSD, and other recorded licenses by package |

Full notices are located in `NOTICE`, `THIRD_PARTY_LICENSES.md`, and under
`licenses/`. Package notices are in `licenses/PACKAGE-NOTICES.md`, and license
texts are in `licenses/PACKAGE-LICENSE-TEXTS.txt`.

Exact provenance and redistribution conditions for classical hadith references,
Sunnah.com links, Aladhan API usage, and distributed audio/visuals must be
finalized. Generation and evidence constraints for AI-assisted content are
recorded in the provenance manifest.

## Archive Policy

`_arsiv/` is kept locally only; it is not included in Git, EAS, or Vercel
packages. Files are moved, not deleted. During moves, equality of old/new path,
size, and hash is verified in a local record.

Active data, script inputs, and provenance artifacts are not moved without
inspecting consumer paths. `data2/` and `backups/` are retained in their
current locations.

Tips of removed old branches are preserved on GitHub as
`archive/<branch-name>` tags (November 11, 2026); the `old-onedrive` remote
has been removed.
