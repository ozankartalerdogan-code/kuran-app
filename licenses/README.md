# License files

This directory contains the notices and license texts needed for Kuran Yolu's
tracked source data, bundled fonts and direct runtime dependencies.

- `TANZIL-QURAN-TEXT-NOTICE.txt`: the notice distributed with Tanzil Uthmani 1.1.
- `CAMEL-TOOLS-MIT.txt`: CAMeL Tools MIT license.
- `CAMEL-MORPH-CC-BY-4.0-NOTICE.md`: CAMeL Morph attribution and change notice.
- `SEMAR-KETIR-MIT.txt`: Semar Ketir digital Quran dataset MIT license.
- `OFL-1.1.txt` and `FONT-NOTICES.md`: Amiri, Figtree and Lora notices.
- `UTHMANIC-HAFS-EULA.txt`: EULA embedded in the bundled KFGQPC font.
- `PACKAGE-NOTICES.md` and `PACKAGE-LICENSE-TEXTS.txt`: generated direct
  runtime dependency inventory and license texts.

Run `npm run provenance:sources` after changing tracked source/content
artefacts, and `npm run licenses:packages` after changing runtime dependencies.
A release still needs a bundle-specific transitive/native dependency check.
