#!/usr/bin/env python3
"""LEXICON_OOV bucket (50 tokens): group by lexical core and check repo sources.

No value is ever guessed from the surface. Every lemma/root/POS in this report is
copied from a source file, and each group records WHICH sources carry it and
whether they agree:

  S1  data/word-analysis/quran-morphology.txt   the raw QAC dump - the origin of
                                                the teacher export
  S2  data/app.db  table `morfoloji`            130,030 segment rows, the same
                                                count the QAC exporter expects
  S3  data/app.db  table `words`                the legacy production word layer
  S4  data/app.db  table `root_meanings`        an editorial ROOT layer, read
                                                only for rows whose `source` is
                                                not itself QAC lineage

Independence is not assumed, it is tested. S1 and S2 are checked for the same
row count and the same values; if they match, they are one lineage, not two, and
the report says so instead of counting them twice.

Split:
  READY_FOR_AUTHORED_LEXICON     lemma, root and POS agree across every source
                                 that carries them AND the root is corroborated
                                 by a layer outside the QAC lineage (S4)
  NEEDS_EXTERNAL_VERIFICATION    anything else, with the missing leg named

Nothing is written to the CAMeL DB and no dump is regenerated.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import re
import sqlite3
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

CAND_ROOT = REPO_ROOT / "data" / "candidates" / "morphology"
LEXICON_GAP = CAND_ROOT / "lexicon-gap-v2" / "classification.jsonl"
BASE_DB = CAND_ROOT / "lexicon-extension-v1" / "camel_morph_msa_v1.0+paradigm-ext-v1.db"
QAC_DUMP = REPO_ROOT / "data" / "word-analysis" / "quran-morphology.txt"
APP_DB = REPO_ROOT / "data" / "app.db"
FREEZE = SCRIPT_DIR / "resources" / "frozen-hamza-carrier-v1-manifest.json"
OUT_DIR = CAND_ROOT / "lexicon-oov-sources-v1"

SCHEMA_VERSION = "lexicon-oov-sources-v1"
EXPECTED_SCOPE_TOKENS = 50
QAC_LINEAGE_ROOT_SOURCES = {"canonical_word_analysis"}


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


V = load_module(SCRIPT_DIR / "select-camel-candidate-v1_2c.py", "camel_selector_v1_2c_lx")
COVERAGE = V.COVERAGE


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(text):
    surah, ayah, word = text.split(":")
    return (int(surah), int(ayah), int(word))


_LEM = re.compile(r"LEM:([^|]+)")
_ROOT = re.compile(r"ROOT:([^|]+)")


def stem_segment(segments):
    """The STEM segment of a word, chosen on QAC's own markers.

    QAC tags a proclitic `PREF` and an enclitic `SUFF`; whatever is neither is
    the stem. Among stems the one carrying ROOT: wins. Lemma, root and POS are
    all read from that one segment - taking the first segment instead would read
    the proclitic (وَبَآءُو would come back as the conjunction و)."""
    stems = [s for s in segments
             if "PREF" not in s["features"].split("|")
             and "SUFF" not in s["features"].split("|")]
    if not stems:
        stems = segments
    with_root = [s for s in stems if _ROOT.search(s["features"])]
    return (with_root or stems)[0]


def read_qac(keys):
    """(lemma, root, pos) per word key, straight from the raw QAC dump."""
    by_word = collections.defaultdict(list)
    seen_segments = 0
    with QAC_DUMP.open(encoding="utf-8") as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#") or line.startswith("LOCATION"):
                continue
            parts = line.split("\t")
            if len(parts) < 4:
                continue
            bits = parts[0].strip("()").split(":")
            if len(bits) != 4:
                continue
            seen_segments += 1
            word_key = f"{bits[0]}:{bits[1]}:{bits[2]}"
            if word_key not in keys:
                continue
            by_word[word_key].append({"segment": int(bits[3]),
                                      "pos": parts[2].strip(),
                                      "features": parts[3]})
    out = {}
    for word_key, segments in by_word.items():
        segments.sort(key=lambda s: s["segment"])
        stem = stem_segment(segments)
        lemma = _LEM.search(stem["features"])
        root = _ROOT.search(stem["features"])
        out[word_key] = {"lemma": lemma.group(1) if lemma else None,
                         "root": root.group(1) if root else None,
                         "pos": stem["pos"] if stem["pos"] in ("N", "V", "P") else None}
    return out, seen_segments


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    manifest = json.loads(FREEZE.read_text(encoding="utf-8"))
    drift = [rel for rel, meta in manifest["artifacts"].items()
             if not (REPO_ROOT / rel).exists()
             or sha256_file(REPO_ROOT / rel) != meta["sha256"]]
    if drift:
        raise SystemExit("frozen chain drifted: " + ", ".join(drift[:5]))

    scope = [json.loads(l) for l in LEXICON_GAP.open(encoding="utf-8")]
    if len(scope) != EXPECTED_SCOPE_TOKENS:
        raise SystemExit(f"scope moved: {len(scope)} != {EXPECTED_SCOPE_TOKENS}")

    # ---- teacher values (the pipeline's own oracle) -------------------------
    teacher = {}
    wanted = {(r["verse_key"], r["word_index"]) for r in scope}
    for line in V.TEACHER_PATH.open(encoding="utf-8"):
        obj = json.loads(line)
        key = (obj["verse_key"], obj["word_index"])
        if key in wanted:
            teacher[key] = obj

    qac_keys = {f"{k[0]}:{k[1]}" for k in wanted}
    qac, qac_segments = read_qac(qac_keys)

    connection = sqlite3.connect(f"file:{APP_DB}?mode=ro", uri=True)
    morfoloji, words = {}, {}
    for verse_key, word_index in sorted(wanted, key=lambda k: (k[0], k[1])):
        surah, ayah = verse_key.split(":")
        row = connection.execute(
            "select segment, tag, features from morfoloji "
            "where sure=? and ayet=? and kelime_sira=? order by segment",
            (int(surah), int(ayah), word_index)).fetchall()
        if row:
            segments = [{"segment": r[0], "pos": (r[1] or "").strip(),
                         "features": r[2] or ""} for r in row]
            stem = stem_segment(segments)
            lemma = _LEM.search(stem["features"])
            root = _ROOT.search(stem["features"])
            morfoloji[(verse_key, word_index)] = {
                "lemma": lemma.group(1) if lemma else None,
                "root": root.group(1) if root else None,
                "pos": stem["pos"] if stem["pos"] in ("N", "V", "P") else None}
        word = connection.execute(
            "select root, lemma, pos, source from words "
            "where verse_key=? and word_index=? order by segment_index limit 1",
            (verse_key, word_index)).fetchone()
        if word:
            words[(verse_key, word_index)] = {"root": word[0], "lemma": word[1],
                                              "pos": word[2], "source": word[3]}
    root_meanings = {}
    for root, source in connection.execute("select root, source from root_meanings"):
        root_meanings.setdefault(COVERAGE.normalize_root(root), set()).add(source)
    morfoloji_rows = connection.execute("select count(*) from morfoloji").fetchone()[0]
    words_rows = connection.execute("select count(*) from words").fetchone()[0]
    connection.close()

    # ---- lineage test: are S1 and S2 actually two sources? -----------------
    agree = disagree = 0
    for key in wanted:
        s1 = qac.get(f"{key[0]}:{key[1]}")
        s2 = morfoloji.get(key)
        if not s1 or not s2:
            continue
        if (COVERAGE.normalize_lemma(s1["lemma"]) == COVERAGE.normalize_lemma(s2["lemma"])
                and COVERAGE.normalize_root(s1["root"]) == COVERAGE.normalize_root(s2["root"])):
            agree += 1
        else:
            disagree += 1
    lineage = {
        "qac_segments_in_dump": qac_segments,
        "app_db_morfoloji_rows": morfoloji_rows,
        "app_db_words_rows": words_rows,
        "same_row_count_as_qac": qac_segments == morfoloji_rows,
        "scope_tokens_agreeing": agree,
        "scope_tokens_disagreeing": disagree,
        "verdict": ("SINGLE_LINEAGE" if qac_segments == morfoloji_rows and not disagree
                    else "POSSIBLY_INDEPENDENT"),
        "note": ("app.db carries a provenance manifest declaring it a legacy "
                 "reference with an unknown build chain, so agreement with QAC is "
                 "evidence of shared lineage, not of independent confirmation"),
    }

    # ---- CAMeL inventory ----------------------------------------------------
    camel_lemmas, camel_roots = set(), set()
    section = None
    for raw in BASE_DB.open(encoding="utf-8"):
        if raw.startswith("###"):
            section = raw.strip()
            continue
        if section != "###STEMS###":
            continue
        parts = raw.split("\t")
        if len(parts) < 3:
            continue
        feats = dict(i.split(":", 1) for i in parts[2].split() if ":" in i)
        lemma = COVERAGE.normalize_lemma(feats.get("lex"))
        if lemma:
            camel_lemmas.add(lemma)
        root = COVERAGE.normalize_root(feats.get("root"))
        if root:
            camel_roots.add(root)

    # ---- group by lexical core ---------------------------------------------
    groups = collections.defaultdict(lambda: {"tokens": [], "surfaces": collections.Counter()})
    for row in scope:
        key = (row["verse_key"], row["word_index"])
        t = teacher[key]
        core = (COVERAGE.normalize_lemma(t.get("lemma")),
                COVERAGE.normalize_root(t.get("root")), t.get("pos"))
        group = groups[core]
        group["tokens"].append(f"{key[0]}:{key[1]}")
        group["surfaces"][row["canonical_text"]] += 1
        group["teacher_lemma"] = t.get("lemma")
        group["teacher_root"] = t.get("root")
        group["teacher_pos"] = t.get("pos")

    out_groups = []
    for core, group in groups.items():
        keys = [tuple(t.rsplit(":", 1)) for t in group["tokens"]]
        keys = [(k[0], int(k[1])) for k in keys]
        sources, conflicts = {}, []
        for name, table in (("S1_qac_dump", {k: qac.get(f"{k[0]}:{k[1]}") for k in keys}),
                            ("S2_app_db_morfoloji", {k: morfoloji.get(k) for k in keys}),
                            ("S3_app_db_words", {k: words.get(k) for k in keys})):
            multi_tag_pos = name == "S3_app_db_words"
            values = {(COVERAGE.normalize_lemma((v or {}).get("lemma")),
                       COVERAGE.normalize_root((v or {}).get("root")),
                       (v or {}).get("pos")) for v in table.values() if v}
            present = bool(values)
            consistent = len(values) == 1
            # `words.pos` is the word-level '+'-joined tag string, so the teacher
            # POS is checked for membership rather than equality.
            matches_teacher = bool(values) and all(
                lemma == core[0] and root == core[1]
                and (core[2] in (pos or "").split("+") if multi_tag_pos
                     else pos == core[2])
                for lemma, root, pos in values)
            sources[name] = {"present": present, "internally_consistent": consistent,
                             "matches_teacher_core": matches_teacher,
                             "values": sorted(f"{a}|{b}|{c}" for a, b, c in values)}
            if present and not matches_teacher:
                conflicts.append(name)

        root_sources = sorted(root_meanings.get(core[1], set()) - QAC_LINEAGE_ROOT_SOURCES)
        root_corroborated = bool(root_sources)

        camel_status = {
            "lemma_in_camel": core[0] in camel_lemmas if core[0] else False,
            "root_in_camel": core[1] in camel_roots if core[1] else False,
        }

        missing = []
        if conflicts:
            missing.append("SOURCE_CONFLICT::" + "+".join(conflicts))
        if not root_corroborated:
            missing.append("NO_ROOT_CORROBORATION_OUTSIDE_QAC_LINEAGE")
        if not sources["S1_qac_dump"]["present"]:
            missing.append("ABSENT_FROM_THE_QAC_DUMP")
        if core[0] is None or core[1] is None or core[2] is None:
            missing.append("INCOMPLETE_CORE")

        status = "READY_FOR_AUTHORED_LEXICON" if not missing else "NEEDS_EXTERNAL_VERIFICATION"

        out_groups.append({
            "lexical_core": {"lemma": group["teacher_lemma"],
                             "root": group["teacher_root"],
                             "pos": group["teacher_pos"]},
            "normalized_core": {"lemma": core[0], "root": core[1], "pos": core[2]},
            "tokens": len(group["tokens"]),
            "token_keys": sorted(group["tokens"], key=sort_key),
            "distinct_surfaces": len(group["surfaces"]),
            "surfaces": dict(sorted(group["surfaces"].items(),
                                    key=lambda kv: (-kv[1], kv[0]))),
            "sources": sources,
            "root_corroboration_outside_qac_lineage": root_sources,
            "camel_status": camel_status,
            "status": status,
            "missing_for_ready": missing,
        })

    out_groups.sort(key=lambda g: (-g["tokens"], g["normalized_core"]["lemma"] or ""))

    status_counts = collections.Counter(g["status"] for g in out_groups)
    report = {
        "schema_version": SCHEMA_VERSION,
        "frozen_chain": {"manifest": str(FREEZE.relative_to(REPO_ROOT)).replace("\\", "/"),
                         "sha256": sha256_file(FREEZE), "status": "VERIFIED_UNCHANGED"},
        "contract": {
            "no_value_guessed_from_the_surface": True,
            "every_value_copied_from_a_named_source": True,
            "readiness_requires_root_corroboration_outside_the_qac_lineage": True,
            "camel_db_entry_written": False,
            "full_dump_not_regenerated": True,
            "production_db_written": False,
        },
        "sources": {
            "S1_qac_dump": str(QAC_DUMP.relative_to(REPO_ROOT)).replace("\\", "/"),
            "S2_app_db_morfoloji": "data/app.db :: morfoloji",
            "S3_app_db_words": "data/app.db :: words",
            "S4_app_db_root_meanings": "data/app.db :: root_meanings "
                                       "(rows whose source is not QAC lineage)",
        },
        "readiness_definition": (
            "READY_FOR_AUTHORED_LEXICON means: every repo layer that carries this "
            "token's morphology agrees on lemma, root and POS, and the ROOT also "
            "appears as a lexical item in an editorial layer outside the QAC "
            "export. It is a statement about assembled, conflict-free evidence - "
            "not a proof that the analysis is correct."),
        "readiness_caveat": (
            "This repo contains exactly ONE morphological authority: the QAC dump. "
            "app.db's `morfoloji` is the same 130,030 rows and `words` is a legacy "
            "layer with an unreproducible build chain, so neither is an independent "
            "witness. `root_meanings` corroborates the ROOT only. LEMMA and POS "
            "therefore rest on the QAC lineage alone for every group below, "
            "including the READY ones. An entry author must still confirm lemma and "
            "POS against a source outside this repo."),
        "lineage_test": lineage,
        "scope_tokens": len(scope),
        "groups": len(out_groups),
        "distinct_surfaces": len({s for g in out_groups for s in g["surfaces"]}),
        "status_counts": dict(sorted(status_counts.items())),
        "tokens_by_status": {
            status: sum(g["tokens"] for g in out_groups if g["status"] == status)
            for status in sorted(status_counts)},
        "missing_reasons": dict(sorted(collections.Counter(
            reason for g in out_groups for reason in g["missing_for_ready"]).items(),
            key=lambda kv: (-kv[1], kv[0]))),
        "group_detail": out_groups,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "groups.jsonl").write_text(
        "".join(json.dumps(g, ensure_ascii=False, sort_keys=True) + "\n"
                for g in out_groups), encoding="utf-8", newline="\n")
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    checksums = {
        "schema_version": SCHEMA_VERSION,
        "groups.jsonl": sha256_file(out_dir / "groups.jsonl"),
        "report.json": sha256_file(out_dir / "report.json"),
    }
    (out_dir / "checksums.json").write_text(
        json.dumps(checksums, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in
                      ("lineage_test", "scope_tokens", "groups", "distinct_surfaces",
                       "status_counts", "tokens_by_status", "missing_reasons")}
                     | {"checksums": checksums}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
