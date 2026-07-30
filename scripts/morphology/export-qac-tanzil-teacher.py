#!/usr/bin/env python3
"""QAC -> Tanzil teacher exporter (internal-only).

Reads the read-only QAC morphology dump and the Tanzil canonical token-map and
emits one canonical analysis token per Tanzil `arabic_word` span.

The alignment contract is frozen: four split records, a 62-entry source-corruption
repair layer (33 form, 7 ROOT:, 22 LEM:) and a closed normalization ladder.
Anything outside that contract is a hard failure -- the exporter never invents a
tolerance at runtime. The raw QAC dump is read-only and never rewritten.

Output is a candidate/teacher artifact. It is NOT production input and NOT
distributable data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

QAC_PATH = REPO_ROOT / "data" / "word-analysis" / "quran-morphology.txt"
TOKEN_MAP_PATH = (
    REPO_ROOT
    / "data"
    / "candidates"
    / "morphology"
    / "camel-morph-msa-v1.0"
    / "token-map.jsonl"
)
OUTPUT_PATH = REPO_ROOT / "data" / "candidates" / "morphology" / "qac-tanzil-teacher.jsonl"

# ---------------------------------------------------------------------------
# Frozen input invariants
# ---------------------------------------------------------------------------

EXPECT_QAC_SEGMENTS = 130030
EXPECT_QAC_WORDS = 77429
EXPECT_TANZIL_ARABIC_WORDS = 77429

# QAC words that are the Fatiha opening basmala. Verified against the
# `opening_basmala_excluded` spans of 1:1, then dropped from the export.
OPENING_BASMALA_WORDS = ("1:1:1", "1:1:2", "1:1:3", "1:1:4")

# Frozen split contract: one QAC word -> two Tanzil tokens.
# value = number of QAC segments assigned to the first Tanzil token
# (0 means the single segment backs both tokens).
SPLIT_CONTRACT = {
    "2:181:3": 1,
    "8:6:4": 1,
    "13:37:8": 1,
    "37:130:3": 0,
}

# ---------------------------------------------------------------------------
# Frozen source-corruption repair layer
# ---------------------------------------------------------------------------
# The QAC dump carries 62 UTF-8 damaged fields (each a single 2-byte Arabic
# character lost to mojibake). The raw source file is never rewritten; the
# repairs below are applied in memory only.
#
#   * form repairs  -> alignment/validation input only. The exported `arabic`
#     always comes from the Tanzil canonical text, never from a repaired form.
#   * ROOT:/LEM: repairs -> written to the corresponding field only. No other
#     feature and no neighbouring segment is touched, and a damaged value is
#     never silently inherited from an adjacent segment.
#
# Rows built from a repaired segment keep `alignment_class = SOURCE_CORRUPTION`
# so the provenance stays visible in the output.

CORRUPT_FORM_REPAIRS = {
    # 33 segments: repaired QAC form, used for alignment only
    "2:19:12:1": "ءَاذَانِ",
    "2:39:8:1": "هُمْ",
    "3:112:16:1": "مِّنَ",
    "4:62:3:1": "أَصَٰبَتْ",
    "5:49:12:1": "يَفْتِنُ",
    "5:77:23:2": "سَّبِيلِ",
    "6:6:25:2": "أَهْلَكْ",
    "6:158:32:1": "إِيمَٰنِ",
    "7:25:3:1": "تَحْيَ",
    "7:199:4:2": "ٱلْ",
    "9:57:4:1": "أَوْ",
    "9:68:6:1": "نَارَ",
    "9:87:10:1": "لَا",
    "9:98:12:1": "دَآئِرَةُ",
    "19:25:4:2": "نَّخْلَةِ",
    "22:23:6:1": "وَ",
    "23:33:10:2": "أَتْرَفْ",
    "24:30:5:1": "أَبْصَٰرِ",
    "24:45:16:1": "رِجْلَيْنِ",
    "27:42:2:1": "جَآءَتْ",
    "27:91:14:1": "أَنْ",
    "28:36:6:2": "وا۟",
    "29:13:2:1": "أَثْقَالَ",
    "34:20:4:1": "إِبْلِيسُ",
    "35:43:12:2": "هَلْ",
    "40:19:1:1": "يَعْلَمُ",
    "42:16:9:2": "هُۥ",
    "45:34:9:3": "كُمُ",
    "49:11:34:1": "وَ",
    "60:2:7:1": "إِلَيْ",
    "65:12:12:3": "وٓا۟",
    "72:2:1:1": "يَهْدِىٓ",
    "78:29:1:2": "كُلَّ",
}

CORRUPT_ROOT_REPAIRS = {
    # 7 segments: repaired ROOT: value
    "2:23:2:1": "كون",
    "4:150:15:2": "كفر",
    "6:33:9:1": "كذب",
    "20:63:13:2": "مثل",
    "20:80:11:2": "نزل",
    "25:27:10:2": "رسل",
    "50:33:5:2": "جيأ",
}

CORRUPT_LEMMA_REPAIRS = {
    # 22 segments: repaired LEM: value
    "2:17:16:1": "لا",
    "2:22:7:1": "بِناء",
    "2:193:10:1": "انتَهَى",
    "2:248:12:1": "مِن",
    "3:150:6:2": "ناصِر",
    "4:23:45:1": "ال",
    "4:171:40:1": "أَن",
    "5:59:7:1": "إِلّا",
    "5:89:29:2": "صِيام",
    "9:44:9:1": "جاهَدَ",
    "9:76:4:1": "فَضْل",
    "11:36:13:1": "ف",
    "12:56:17:2": "مُحْسِن",
    "16:112:1:1": "و",
    "18:50:8:1": "إِبْلِيس",
    "19:82:1:1": "كَلّا",
    "20:13:2:1": "اخْتارَ",
    "27:58:6:1": "ال",
    "34:33:14:2": "اللَّه",
    "34:45:12:2": "كَيْف",
    "51:22:3:1": "رِزْق",
    "77:29:1:1": "انطَلَقَ",
}

# Closed normalization ladder. The alif-maqsura carrier rule applies to these
# two QAC words only; it is not a general tolerance.
MAQSURA_CARRIER_WORDS = ("12:39:1", "12:41:1")

REPLACEMENT_CHAR = "�"

# ---------------------------------------------------------------------------
# Normalization ladder (closed set -- do not extend)
# ---------------------------------------------------------------------------

_MARKS = re.compile(
    "["
    "ً-ٰ"  # harakat, shadda, sukun, superscript alif
    "ۖ-ۭ"  # quranic annotation signs
    "ـ"  # tatweel
    "ࣰ-ࣿ"
    "]"
)
_TATWEEL_HAMZA = re.compile("ـ[ً-ْٰ]*ٔ")
_ALIF_FAMILY = re.compile("[آأإٱ]")
_MAQSURA_CARRIER = re.compile("ى(?=ٰ)")


def strip_marks(text: str) -> str:
    return _MARKS.sub("", _TATWEEL_HAMZA.sub("ء", text)).replace(" ", "")


def skeleton(text: str) -> str:
    return _ALIF_FAMILY.sub("ا", strip_marks(text))


def classify(qac_text: str, tanzil_text: str, *, word_key: str) -> str | None:
    """Return the alignment class, or None when the pair is unresolvable.

    `qac_text` is always the repaired form, so a repaired segment must resolve
    through the ordinary ladder -- a repair that does not align is a failure.
    """
    if qac_text == tanzil_text:
        return "EXACT_POSITION"
    if strip_marks(qac_text) == strip_marks(tanzil_text):
        return "MARKER_ONLY_DIFFERENCE"
    if skeleton(qac_text) == skeleton(tanzil_text):
        return "NORMALIZED_1_TO_1"
    if word_key in MAQSURA_CARRIER_WORDS and skeleton(
        _MAQSURA_CARRIER.sub("", qac_text)
    ) == skeleton(_MAQSURA_CARRIER.sub("", tanzil_text)):
        return "NORMALIZED_1_TO_1"
    return None


# ---------------------------------------------------------------------------
# QAC loading
# ---------------------------------------------------------------------------


class Segment:
    __slots__ = ("location", "index", "form", "text", "pos", "features")

    def __init__(self, location: str, index: int, form: str, pos: str, features: str):
        self.location = location
        self.index = index
        self.form = form
        # `text` is the repaired form used for alignment; `form` stays raw.
        self.text = CORRUPT_FORM_REPAIRS.get(location, form)
        self.pos = pos
        self.features = [f for f in features.split("|") if f]


def load_qac() -> tuple[dict[str, list[Segment]], int]:
    words: dict[str, list[Segment]] = defaultdict(list)
    segment_keys: set[str] = set()
    parsed = 0
    with QAC_PATH.open(encoding="utf-8") as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            columns = line.split("\t")
            if len(columns) != 4:
                raise SystemExit(f"QAC: malformed column count in {line!r}")
            location, form, pos, features = columns
            parts = location.split(":")
            if len(parts) != 4 or not all(p.isdigit() for p in parts):
                raise SystemExit(f"QAC: malformed location {location!r}")
            if location in segment_keys:
                raise SystemExit(f"QAC: duplicate segment {location!r}")
            segment_keys.add(location)
            parsed += 1
            word_key = ":".join(parts[:3])
            words[word_key].append(Segment(location, int(parts[3]), form, pos, features))
    for segments in words.values():
        segments.sort(key=lambda s: s.index)
    return words, parsed


# ---------------------------------------------------------------------------
# Morphology derivation (validated legacy merge rules)
# ---------------------------------------------------------------------------


ROLE_TAGS = ("ADJ", "PN", "ACT_PCPL", "PASS_PCPL")


def derive(segments: list[Segment]) -> dict:
    root = None
    lemma = None
    pos = None
    morphology: list[str] = []
    for segment in segments:
        features = segment.features
        if "PREF" in features:
            morphology.extend(f"PREF:{f}" for f in features if f in ("DET", "P"))
            continue
        for feature in features:
            if feature.startswith("ROOT:") and root is None:
                if REPLACEMENT_CHAR in feature:
                    root = CORRUPT_ROOT_REPAIRS.get(segment.location)
                    if root is None:
                        raise SystemExit(f"unrepaired ROOT: at {segment.location}")
                else:
                    root = feature[5:]
            elif feature.startswith("LEM:") and lemma is None:
                if REPLACEMENT_CHAR in feature:
                    lemma = CORRUPT_LEMMA_REPAIRS.get(segment.location)
                    if lemma is None:
                        raise SystemExit(f"unrepaired LEM: at {segment.location}")
                else:
                    lemma = feature[4:]
        if pos is None:
            pos = segment.pos
        morphology.extend(
            f for f in features if not f.startswith("ROOT:") and not f.startswith("LEM:")
        )
    role = next((tag for tag in morphology if tag in ROLE_TAGS), pos)
    return {"root": root, "lemma": lemma, "pos": pos, "morphology": morphology, "role": role}


# ---------------------------------------------------------------------------
# Tanzil token-map loading
# ---------------------------------------------------------------------------


def load_token_map() -> tuple[dict[str, list[dict]], list[dict]]:
    verses: dict[str, list[dict]] = defaultdict(list)
    opening_fatiha: list[dict] = []
    with TOKEN_MAP_PATH.open(encoding="utf-8") as handle:
        for raw in handle:
            if not raw.strip():
                continue
            record = json.loads(raw)
            rule = record["tokenization_rule"]
            if rule == "arabic_word":
                verses[record["verse_key"]].append(
                    {
                        "word_index": record["word_index"],
                        "text": record["canonical_text"],
                        "span_index": record["span_index"],
                    }
                )
            elif (
                rule == "opening_basmala_excluded"
                and record["basmala_classification"] == "opening_fatiha"
            ):
                opening_fatiha.append(
                    {"span_index": record["span_index"], "text": record["canonical_text"]}
                )
    for tokens in verses.values():
        tokens.sort(key=lambda t: t["word_index"])
    opening_fatiha.sort(key=lambda s: s["span_index"])
    return verses, opening_fatiha


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


def verse_sort_key(verse_key: str) -> tuple[int, int]:
    surah, ayah = verse_key.split(":")
    return int(surah), int(ayah)


def build_rows(qac_words: dict[str, list[Segment]], verses: dict[str, list[dict]]) -> list[dict]:
    corrupt_words = {loc.rsplit(":", 1)[0] for loc in CORRUPT_FORM_REPAIRS}
    rows: list[dict] = []
    for verse_key in sorted(verses, key=verse_sort_key):
        tokens = verses[verse_key]
        # QAC words of this verse, in position order, expanded through the
        # frozen split contract into one entry per expected Tanzil token.
        expanded: list[tuple[str, list[Segment], str | None]] = []
        position = 1
        while True:
            word_key = f"{verse_key}:{position}"
            segments = qac_words.get(word_key)
            if segments is None:
                break
            if word_key in SPLIT_CONTRACT:
                cut = SPLIT_CONTRACT[word_key]
                if cut == 0:
                    expanded.append((word_key, segments, "split-a"))
                    expanded.append((word_key, segments, "split-b"))
                else:
                    expanded.append((word_key, segments[:cut], "split-a"))
                    expanded.append((word_key, segments[cut:], "split-b"))
            else:
                expanded.append((word_key, segments, None))
            position += 1

        if len(expanded) != len(tokens):
            raise SystemExit(
                f"UNRESOLVED: {verse_key} expands to {len(expanded)} QAC tokens "
                f"but Tanzil has {len(tokens)} arabic_word tokens"
            )

        for (word_key, segments, split_part), token in zip(expanded, tokens):
            corrupt = word_key in corrupt_words
            qac_text = "".join(s.text for s in segments)
            if split_part is not None:
                # Split rows are contractual; the concatenated word is validated
                # once, on the first half, against both Tanzil tokens.
                alignment_class = "QAC_1_TO_TANZIL_2"
                if split_part == "split-a":
                    whole = "".join(s.text for s in qac_words[word_key])
                    joined = "".join(t["text"] for t in tokens if t["word_index"] in
                                     (token["word_index"], token["word_index"] + 1))
                    if skeleton(whole) != skeleton(joined):
                        raise SystemExit(
                            f"UNRESOLVED: split contract mismatch at {word_key}"
                        )
            else:
                alignment_class = classify(qac_text, token["text"], word_key=word_key)
                if alignment_class is None:
                    raise SystemExit(
                        f"UNRESOLVED: {word_key} {qac_text!r} vs "
                        f"{verse_key}:{token['word_index']} {token['text']!r}"
                    )
            if corrupt and alignment_class != "SOURCE_CORRUPTION":
                alignment_class = "SOURCE_CORRUPTION"

            derived = derive(segments)
            rows.append(
                {
                    "verse_key": verse_key,
                    "word_index": token["word_index"],
                    "arabic": token["text"],
                    "root": derived["root"],
                    "lemma": derived["lemma"],
                    "pos": derived["pos"],
                    "morphology": derived["morphology"],
                    "role": derived["role"],
                    "alignment_class": alignment_class,
                    "qac_locations": [s.location for s in segments],
                }
            )
    return rows


def write_atomic(path: Path, rows: list[dict]) -> str:
    payload = "".join(
        json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows
    ).encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
    return hashlib.sha256(payload).hexdigest()


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------


def verify(rows: list[dict], qac_verse_count: int, nulled_by_corruption: int) -> list[tuple[str, object, object, str]]:
    keys = {(r["verse_key"], r["word_index"]) for r in rows}
    classes: dict[str, int] = defaultdict(int)
    for row in rows:
        classes[row["alignment_class"]] += 1
    checks = [
        ("rows", 77429, len(rows), "hard"),
        ("unique (verse_key, word_index)", len(rows), len(keys), "hard"),
        ("UNRESOLVED", 0, classes.get("UNRESOLVED", 0), "hard"),
        ("pos non-null", 77429, sum(1 for r in rows if r["pos"]), "hard"),
        ("role non-null", 77429, sum(1 for r in rows if r["role"]), "hard"),
        ("lemma non-null", 74122, sum(1 for r in rows if r["lemma"]), "hard"),
        ("root non-null", 50264, sum(1 for r in rows if r["root"]), "hard"),
        ("corrupt value leaked", 0,
         sum(1 for r in rows if REPLACEMENT_CHAR in json.dumps(r, ensure_ascii=False)), "hard"),
        ("SOURCE_CORRUPTION rows", 33, classes.get("SOURCE_CORRUPTION", 0), "hard"),
        ("QAC_1_TO_TANZIL_2 rows", 8, classes.get("QAC_1_TO_TANZIL_2", 0), "hard"),
        ("QAC verse coverage", 6236, qac_verse_count, "hard"),
        # Documented deviations from the pre-export QAC-word-level tally.
        ("exported verse coverage", 6236, len({r["verse_key"] for r in rows}), "deviation"),
        ("fields nulled by corruption", 0, nulled_by_corruption, "hard"),
        ("form repairs", 33, len(CORRUPT_FORM_REPAIRS), "hard"),
        ("ROOT: repairs", 7, len(CORRUPT_ROOT_REPAIRS), "hard"),
        ("LEM: repairs", 22, len(CORRUPT_LEMMA_REPAIRS), "hard"),
        ("lemma vs. 74118 estimate", 74118, sum(1 for r in rows if r["lemma"]), "deviation"),
        ("root vs. word-level tally", 50268, sum(1 for r in rows if r["root"]), "deviation"),
    ]
    return checks


DEVIATION_NOTES = {
    "exported verse coverage":
        "1:1 has zero arabic_word tokens in the token-map, so the export covers 6235 verses.",
    "lemma vs. 74118 estimate":
        "77429 QAC words carry a lemma, -4 excluded 1:1 basmala words, +4 rows added "
        "by the split contract that each carry a lemma -> 74122. Every damaged LEM: "
        "is restored by the repair layer; nothing is lost to corruption.",
    "root vs. word-level tally":
        "-4 excluded 1:1 basmala words (50268 -> 50264); the split rows add no root. "
        "Every damaged ROOT: is restored by the repair layer.",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    qac_words, segment_count = load_qac()
    if segment_count != EXPECT_QAC_SEGMENTS:
        raise SystemExit(f"QAC segments: expected {EXPECT_QAC_SEGMENTS}, got {segment_count}")
    if len(qac_words) != EXPECT_QAC_WORDS:
        raise SystemExit(f"QAC words: expected {EXPECT_QAC_WORDS}, got {len(qac_words)}")

    # Corruption must live exactly where the allowlist says it does.
    all_segments = [seg for segments in qac_words.values() for seg in segments]

    def damaged(predicate) -> set[str]:
        return {seg.location for seg in all_segments if predicate(seg)}

    for label, observed, repairs in (
        ("form", damaged(lambda s: REPLACEMENT_CHAR in s.form), CORRUPT_FORM_REPAIRS),
        (
            "ROOT:",
            damaged(
                lambda s: any(
                    f.startswith("ROOT:") and REPLACEMENT_CHAR in f for f in s.features
                )
            ),
            CORRUPT_ROOT_REPAIRS,
        ),
        (
            "LEM:",
            damaged(
                lambda s: any(
                    f.startswith("LEM:") and REPLACEMENT_CHAR in f for f in s.features
                )
            ),
            CORRUPT_LEMMA_REPAIRS,
        ),
    ):
        expected = set(repairs)
        # Every known-damaged location must still be damaged, and nothing else
        # may be damaged: the repair map and the source must match exactly.
        if observed != expected:
            raise SystemExit(
                f"source drift in {label} corruption: "
                f"unexpected={sorted(observed - expected)} "
                f"repaired-but-clean={sorted(expected - observed)}"
            )
        leaked = sorted(k for k, v in repairs.items() if REPLACEMENT_CHAR in v)
        if leaked:
            raise SystemExit(f"{label} repair values still contain U+FFFD: {leaked}")

    # After the repair layer nothing damaged may remain in play.
    residual = sorted(
        seg.location
        for seg in all_segments
        if REPLACEMENT_CHAR in seg.text
        or any(
            REPLACEMENT_CHAR in f
            and not (
                f.startswith("ROOT:") and seg.location in CORRUPT_ROOT_REPAIRS
                or f.startswith("LEM:") and seg.location in CORRUPT_LEMMA_REPAIRS
            )
            for f in seg.features
        )
    )
    if residual:
        raise SystemExit(f"unrepaired U+FFFD remains at: {residual}")

    qac_verse_count = len({key.rsplit(":", 1)[0] for key in qac_words})

    verses, opening_fatiha = load_token_map()
    tanzil_total = sum(len(v) for v in verses.values())
    if tanzil_total != EXPECT_TANZIL_ARABIC_WORDS:
        raise SystemExit(
            f"Tanzil arabic_word: expected {EXPECT_TANZIL_ARABIC_WORDS}, got {tanzil_total}"
        )

    # 1:1 basmala: verify the link, then drop the words from the export.
    if len(opening_fatiha) != 4:
        raise SystemExit(f"expected 4 opening_fatiha spans, got {len(opening_fatiha)}")
    for word_key, span in zip(OPENING_BASMALA_WORDS, opening_fatiha):
        segments = qac_words.pop(word_key, None)
        if segments is None:
            raise SystemExit(f"missing QAC basmala word {word_key}")
        qac_text = "".join(s.text for s in segments)
        if skeleton(qac_text) != skeleton(span["text"]):
            raise SystemExit(
                f"basmala mismatch {word_key} {qac_text!r} vs span {span['span_index']}"
            )
    if "1:1" in verses:
        raise SystemExit("1:1 unexpectedly carries arabic_word tokens")

    rows = build_rows(qac_words, verses)
    digest = write_atomic(args.output, rows)

    # A damaged field that the repair layer failed to restore would surface as
    # a null on exactly the rows built from a damaged segment.
    repaired_locations = set(CORRUPT_ROOT_REPAIRS) | set(CORRUPT_LEMMA_REPAIRS)
    nulled_by_corruption = sum(
        1
        for row in rows
        if repaired_locations.intersection(row["qac_locations"])
        and (
            (set(row["qac_locations"]) & set(CORRUPT_ROOT_REPAIRS) and row["root"] is None)
            or (set(row["qac_locations"]) & set(CORRUPT_LEMMA_REPAIRS) and row["lemma"] is None)
        )
    )
    checks = verify(rows, qac_verse_count, nulled_by_corruption)
    failed = []
    if not args.quiet:
        print(f"output : {args.output}")
        print(f"sha256 : {digest}")
        print(f"{'check':<32} {'expected':>10} {'actual':>10}  status")
    for name, expected, actual, kind in checks:
        ok = expected == actual
        if kind == "hard" and not ok:
            failed.append(name)
        status = "OK" if ok else ("FAIL" if kind == "hard" else "EXPECTED-DEVIATION")
        if not args.quiet:
            print(f"{name:<32} {expected!s:>10} {actual!s:>10}  {status}")
            if not ok and kind == "deviation":
                print(f"{'':<32} note: {DEVIATION_NOTES[name]}")
    if failed:
        print(f"FAILED: {', '.join(failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
