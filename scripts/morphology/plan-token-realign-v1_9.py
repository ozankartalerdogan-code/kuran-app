#!/usr/bin/env python3
"""Structural dry-run for the nine token/analysis misalignment verses.

Strictly read-only with respect to every database: the production sqlite file is
opened `mode=ro` and Turso is never contacted. All output goes to new files
under data/candidates/morphology/token-realign-v1_9/.

Evidence sources (all frozen or already verified):
  1. hc1-ext-v1_8/token-map-hc1-ext-v1_8.jsonl - the frozen Tanzil token map.
     Defines the canonical token sequence and the canonical word_index of every
     one of the 77,429 analysis words.
  2. app.db verses.arabic_text - canonical Tanzil verse text, codepoint
     identical to the token map.
  3. app.db words - the production rows that have to be re-anchored.
  4. qac-tanzil-teacher.jsonl - QAC/Tanzil teacher, canonical-indexed. Proves
     which canonical token each production analysis payload really belongs to.
  5. final-v1_8/final-morphology-v1_8.jsonl - the v1.8 final artefact,
     canonical-indexed, used as a second opinion only.

Two facts drive the whole design.

  * `words.arabic` is NOT the Tanzil rendering. Production uses a different
    Uthmani typesetting (U+06E1 where Tanzil has U+0652, no tatweel before the
    dagger alef, U+065E/U+0657 tanwin shapes, `ي+U+0655` where Tanzil has `ئ`).
    44,891 of the 77,429 tokens differ this way, corpus wide, in verses that are
    otherwise perfectly aligned. Canonical Tanzil therefore supplies token
    BOUNDARIES, never codepoints. Every repaired surface is a re-cut of the
    bytes production already stores; the concatenation of a verse never changes.

  * The analysis payload and the surface drifted independently. Some verses have
    a broken surface with an intact analysis order; others have an intact
    surface with a merged analysis cell that shifts everything after it by one.
    The two axes are detected separately and each conclusion is checked against
    the teacher before it is written into the plan.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import unicodedata as ud
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DB = REPO / "data" / "app.db"
CAND = REPO / "data" / "candidates" / "morphology"
TOKEN_MAP = CAND / "hc1-ext-v1_8" / "token-map-hc1-ext-v1_8.jsonl"
TEACHER = CAND / "qac-tanzil-teacher.jsonl"
FINAL_V18 = CAND / "final-v1_8" / "final-morphology-v1_8.jsonl"
OUT = CAND / "token-realign-v1_9"

TARGET_VERSES = ["2:72", "2:181", "8:6", "13:37", "15:7", "27:20", "36:22", "37:164", "41:47"]

# Columns that travel together as one analysis payload. meaning_tr is handled
# separately because it is demonstrably not always aligned with the rest.
ANALYSIS_COLUMNS = ["root", "lemma", "pos", "morphology", "gloss_en", "confidence", "source", "role"]
PAYLOAD_COLUMNS = ANALYSIS_COLUMNS + ["meaning_tr"]
ALL_COLUMNS = ["verse_key", "word_index", "segment_index", "arabic"] + PAYLOAD_COLUMNS


# ---------------------------------------------------------------------------
# orthography-independent skeleton
# ---------------------------------------------------------------------------

def _is_drop(ch: str) -> bool:
    """Marks, tatweel, joiners, superscript letters and standalone signs."""
    if ud.category(ch) == "Mn":
        return True
    return ch in {
        "ـ",  # tatweel
        "‌", "‍",  # ZWNJ / ZWJ
        "۞",  # start of rub el hizb
        "۩",  # place of sajdah
        "۝",  # end of ayah
        "ۥ",  # small waw
        "ۦ",  # small yeh
    }


SKELETON_DROP = {
    chr(cp) for cp in list(range(0x0600, 0x0700)) + [0x200C, 0x200D]
    if _is_drop(chr(cp))
}

# Letter variants the two editions swap freely. Folding them never merges two
# distinct consonants, so it cannot move a token boundary.
LETTER_FOLD = {
    "ٱ": "ا",  # alef wasla       -> alef
    "أ": "ا",  # alef hamza above -> alef  (canon: alef + U+0654)
    "إ": "ا",  # alef hamza below -> alef  (canon: alef + U+0655)
    "آ": "ا",  # alef madda       -> alef  (canon: alef + U+0653)
    "ى": "ي",  # alef maksura     -> yeh
    "ی": "ي",  # farsi yeh        -> yeh
    "ئ": "ي",  # yeh with hamza   -> yeh   (prod: yeh + U+0655)
    "ؤ": "و",  # waw with hamza   -> waw   (prod: waw + U+0655)
    "ک": "ك",  # keheh            -> kaf
}


def skeleton(text: str) -> str:
    out = []
    for ch in text:
        if ch in SKELETON_DROP or ch.isspace():
            continue
        out.append(LETTER_FOLD.get(ch, ch))
    return "".join(out)


def is_skeleton_char(ch: str) -> bool:
    return skeleton(ch) != ""


# ---------------------------------------------------------------------------
# loading
# ---------------------------------------------------------------------------

def load_token_map():
    canonical = defaultdict(dict)
    with TOKEN_MAP.open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            if row["word_index"] is not None:
                canonical[row["verse_key"]][row["word_index"]] = row["canonical_text"]
    return canonical


def load_indexed(path):
    out = defaultdict(dict)
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            out[row["verse_key"]][row["word_index"]] = row
    return out


def load_words(connection):
    columns = ["id"] + ALL_COLUMNS
    rows = connection.execute(
        "SELECT " + ", ".join(columns) + " FROM words ORDER BY id"
    ).fetchall()
    by_verse = defaultdict(list)
    for row in rows:
        record = dict(zip(columns, row))
        by_verse[record["verse_key"]].append(record)
    for key in by_verse:
        by_verse[key].sort(key=lambda r: (r["word_index"], r["segment_index"], r["id"]))
    return by_verse


# ---------------------------------------------------------------------------
# surface axis: re-cut the production bytes at canonical boundaries
# ---------------------------------------------------------------------------

def resegment(prod_surfaces, canonical_tokens):
    stream = "".join(prod_surfaces)
    if skeleton(stream) != skeleton("".join(canonical_tokens)):
        return None, "skeleton_mismatch"
    positions = [i for i, ch in enumerate(stream) if is_skeleton_char(ch)]
    lengths = [len(skeleton(token)) for token in canonical_tokens]
    if sum(lengths) != len(positions):
        return None, "skeleton_length_mismatch"
    cuts, consumed = [0], 0
    for length in lengths[:-1]:
        consumed += length
        # Cut immediately before the next token's first skeleton character, so
        # trailing marks and pause signs stay glued to the token they follow and
        # leading signs glue forward. This reproduces production's own
        # convention, which is why the no-op gate below can be exact.
        cuts.append(positions[consumed])
    cuts.append(len(stream))
    surfaces = [stream[cuts[i]:cuts[i + 1]] for i in range(len(canonical_tokens))]
    if "".join(surfaces) != stream:
        return None, "reassembly_mismatch"
    if any(surface == "" for surface in surfaces):
        return None, "empty_segment"
    return surfaces, None


# ---------------------------------------------------------------------------
# analysis axis: which canonical token does a payload really describe?
# ---------------------------------------------------------------------------

def nfc(text):
    return ud.normalize("NFC", text) if text else text


def bare(text):
    """NFC plus every combining mark removed - tolerates case-vowel drift."""
    return "".join(c for c in nfc(text or "") if ud.category(c) != "Mn")


def teacher_match(record, teacher_row):
    """Score a production payload against a canonical token's teacher row.

    Production and the teacher disagree on two harmless spellings: combining
    mark ORDER (fatha before shadda vs the reverse, which NFC settles) and the
    final case vowel of a lemma. Both are normalised away here rather than being
    allowed to look like a genuine mismatch.
    """
    if teacher_row is None:
        return 0
    score = 0
    root, lemma = teacher_row.get("root"), teacher_row.get("lemma")
    morphology = nfc(record["morphology"] or "")
    if root and record["root"] and nfc(root) == nfc(record["root"]):
        score += 3
    if lemma and record["lemma"]:
        if nfc(lemma) == nfc(record["lemma"]):
            score += 3
        elif bare(lemma) == bare(record["lemma"]):
            score += 2
    if root and f"ROOT:{nfc(root)}" in morphology:
        score += 2
    if lemma and f"LEM:{nfc(lemma)}" in morphology:
        score += 2
    return score


def payload_is_empty(record):
    return all(record[column] in (None, "") for column in ("root", "lemma", "pos", "morphology"))


def find_analysis_breakpoint(rows, teacher_verse, canonical_count):
    """Fit a monotone step map row -> canonical index.

    Hypothesis family: the analysis of row k describes canonical k for k < b,
    and canonical k+1 for k >= b. b = len(rows)+1 is the identity hypothesis.
    The winner must beat every rival on total teacher score and must never place
    a payload on a canonical token the teacher contradicts.
    """
    candidates = []
    for breakpoint in range(1, len(rows) + 2):
        total, contradictions = 0, 0
        for offset, record in enumerate(rows):
            index = offset + 1
            target = index if index < breakpoint else index + 1
            if target > canonical_count:
                # A row with no canonical slot left. Empty is the expected
                # NULL pad; a payload that simply repeats the last canonical
                # token is the residual-duplicate tail, reported separately.
                if not payload_is_empty(record):
                    if teacher_match(record, teacher_verse.get(canonical_count)) == 0:
                        contradictions += 1
                continue
            score = teacher_match(record, teacher_verse.get(target))
            total += score
            if score == 0 and (record["root"] or record["lemma"]):
                # Function words carry no root or lemma the teacher can confirm;
                # only count a miss against the hypothesis when both sides
                # actually have something to compare.
                teacher_row = teacher_verse.get(target) or {}
                if teacher_row.get("root") or teacher_row.get("lemma"):
                    contradictions += 1
        candidates.append({"breakpoint": breakpoint, "score": total, "contradictions": contradictions})
    ranked = sorted(candidates, key=lambda c: (-c["score"], c["contradictions"], c["breakpoint"]))
    best = ranked[0]
    # Breakpoints past the last canonical token are indistinguishable: they only
    # differ in where they send rows that have no canonical slot at all. Collapse
    # them so a degenerate tie is not reported as a real ambiguity.
    def owner_map(breakpoint):
        mapping = {}
        for offset in range(len(rows)):
            index = offset + 1
            target = index if index < breakpoint else index + 1
            if 1 <= target <= canonical_count:
                mapping.setdefault(target, index)
        return tuple(sorted(mapping.items()))

    best_map = owner_map(best["breakpoint"])
    rivals = [c for c in ranked[1:] if owner_map(c["breakpoint"]) != best_map]
    runner_up = rivals[0] if rivals else None
    return {
        "breakpoint": best["breakpoint"],
        "is_identity": best["breakpoint"] > len(rows),
        "best_score": best["score"],
        "best_contradictions": best["contradictions"],
        "runner_up_breakpoint": runner_up["breakpoint"] if runner_up else None,
        "runner_up_score": runner_up["score"] if runner_up else None,
        "margin": best["score"] - runner_up["score"] if runner_up else None,
        "top_candidates": ranked[:4],
    }


def split_merged_payload(source, part, teacher_row, role_lexicon):
    '''Cut one legacy analysis cell that describes two canonical tokens.

    A legacy morphology value is a pipe-joined list of numbered segments, for
    example "1:N:T|ROOT:...|LEM:... | 2:N:REL|LEM:...". When a cell was built
    from two canonical tokens, the split is exactly that segment boundary. Each
    half is accepted only if the ROOT/LEM it declares agrees with the teacher
    for the canonical token it is assigned to; otherwise it is left NULL.
    '''
    payload = {column: None for column in ANALYSIS_COLUMNS}
    segments = [x.strip() for x in (source["morphology"] or "").split("|") if x.strip()]
    groups, current = [], []
    for segment in segments:
        head = segment.split(":", 1)[0]
        if head.isdigit():
            if current:
                groups.append(current)
            current = [segment]
        else:
            current.append(segment)
    if current:
        groups.append(current)
    if len(groups) != 2 or part not in (0, 1):
        return payload, "split_failed_segment_count", False

    chosen = groups[part]
    body = "|".join(chosen)
    body = "1:" + body.split(":", 1)[1]          # renumber to 1, keep format
    root = lemma = None
    for field in body.split("|"):
        if field.startswith("ROOT:"):
            root = field[5:]
        elif field.startswith("LEM:"):
            lemma = field[4:]
    parts = chosen[0].split(":")
    tag = parts[1] if len(parts) > 1 else None

    teacher_root = (teacher_row or {}).get("root")
    teacher_lemma = (teacher_row or {}).get("lemma")
    if teacher_root and root and nfc(teacher_root) != nfc(root):
        return payload, "split_rejected_teacher_root_disagrees", False
    if teacher_lemma and lemma and bare(teacher_lemma) != bare(lemma):
        return payload, "split_rejected_teacher_lemma_disagrees", False
    if teacher_root and not root and not lemma:
        return payload, "split_rejected_no_evidence_in_half", False

    payload["morphology"] = body
    payload["root"] = root
    payload["lemma"] = lemma
    payload["pos"] = tag
    # role is only copied when the healthy corpus already attests it for this
    # exact (pos, morphology) pair. gloss_en is never split: an English gloss
    # covering two tokens cannot be divided by evidence.
    attested = role_lexicon.get((tag, body))
    if attested:
        payload["role"] = attested.most_common(1)[0][0]
        evidence = "split_from_merged_cell_role_attested"
    else:
        evidence = "split_from_merged_cell_role_unattested"
    payload["confidence"] = "low"
    payload["source"] = "token_realign_v1_9_split"
    return payload, evidence, True


def build_role_lexicon(words, canonical, targets):
    '''(pos, morphology) -> Counter of role, from aligned verses only.'''
    lexicon = defaultdict(Counter)
    for verse_key, rows in words.items():
        if verse_key in targets or verse_key not in canonical:
            continue
        if len(rows) != len(canonical[verse_key]):
            continue
        for record in rows:
            if record["role"] and record["morphology"]:
                lexicon[(record["pos"], record["morphology"])][record["role"]] += 1
    return lexicon


# ---------------------------------------------------------------------------
# meaning_tr adjudication against the healthy corpus
# ---------------------------------------------------------------------------

MEANING_DOMINANCE_THRESHOLD = 5


def meaning_key(text):
    """Compare Turkish glosses without tripping over casing artefacts.

    Some cells were written through a Turkish lowercase pass, so "ilim" and
    "i" + U+0307 + "lim" both occur for the same word. Treating those as
    different values would make an identical gloss look like a change.
    """
    if not text:
        return ""
    folded = ud.normalize("NFC", text).casefold()
    folded = folded.replace("\u0307", "").replace("\u0131", "i")
    return " ".join(folded.split())


def build_meaning_lexicon(words, canonical, targets):
    '''exact NFC surface -> Counter of meaning_tr, from aligned verses only.

    Keyed on the exact surface rather than the skeleton: every production row is
    written in the same edition, so exact matching loses nothing and avoids
    collapsing distinct vocalisations of the same consonants onto one entry.
    '''
    lexicon, lexicon_display = defaultdict(Counter), defaultdict(Counter)
    for verse_key, rows in words.items():
        if verse_key in targets or verse_key not in canonical:
            continue
        if len(rows) != len(canonical[verse_key]):
            continue
        for record in rows:
            meaning = (record["meaning_tr"] or "").strip()
            if meaning:
                lexicon[nfc(record["arabic"])][meaning_key(meaning)] += 1
                lexicon_display[meaning_key(meaning)][meaning] += 1
    return lexicon, lexicon_display


def adjudicate_meaning(target_surface, candidates, current_meaning, surface_changed,
                       lexicon, lexicon_display):
    '''Decide meaning_tr for one target token without inventing anything.

    Order of evidence:
      1. a candidate value the healthy corpus already attests for this exact
         surface - the cell is proven to belong to this token;
      2. otherwise the corpus-dominant value, but only when enough independent
         verses back it, so a two-row coincidence cannot overwrite a good cell;
      3. otherwise the cell keeps whatever it has, flagged for a human, because
         alignment is the mandate here and meaning revision is not;
      4. otherwise NULL, flagged.
    '''
    attested = lexicon.get(nfc(target_surface), Counter())
    for label, value in candidates:
        key = meaning_key(value)
        if key and attested.get(key, 0) > 0:
            # keep the cell's own spelling, not the corpus spelling
            return {"value": value, "decision": "ATTESTED", "from": label,
                    "corpus_support": attested[key], "rejected_candidates": []}
    suggestion = None
    if attested:
        key, support = attested.most_common(1)[0]
        if support >= MEANING_DOMINANCE_THRESHOLD:
            suggestion = {"value": lexicon_display[key].most_common(1)[0][0],
                          "corpus_support": support}
    rejected = [{"from": label, "value": value} for label, value in candidates if value]
    if surface_changed:
        # The value sitting here provably describes a different token, and
        # nothing attested replaces it. Writing the corpus favourite instead
        # would be a guess - and would import whatever error the corpus already
        # holds - so the cell is emptied and queued, with the suggestion kept.
        return {"value": None, "decision": "NULL_PENDING_REVIEW", "from": None,
                "corpus_support": 0, "suggestion": suggestion,
                "rejected_candidates": rejected}
    if current_meaning and current_meaning.strip():
        # Surface unchanged: nothing proves the cell wrong, and revising
        # meanings is not this migration's mandate. Keep it, flag it.
        return {"value": current_meaning, "decision": "KEEP_EXISTING_FLAGGED",
                "from": "current_cell",
                "corpus_support": attested.get(meaning_key(current_meaning), 0),
                "suggestion": suggestion, "rejected_candidates": rejected}
    return {"value": None, "decision": "NULL_NO_EVIDENCE", "from": None,
            "corpus_support": 0, "suggestion": suggestion,
            "rejected_candidates": rejected}


# ---------------------------------------------------------------------------
# SQL emission
# ---------------------------------------------------------------------------

def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> int:
    canonical = load_token_map()
    teacher = load_indexed(TEACHER)
    final_v18 = load_indexed(FINAL_V18)
    connection = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    words = load_words(connection)
    max_id = connection.execute("SELECT MAX(id) FROM words").fetchone()[0]
    OUT.mkdir(parents=True, exist_ok=True)

    targets = set(TARGET_VERSES)
    lexicon, lexicon_display = build_meaning_lexicon(words, canonical, targets)
    # Second pass: adjudicate-token-realign-v1_9-meanings.py turns every cell
    # this planner could not prove into an explicit human-auditable verdict.
    # When that file is present its verdicts win, so the emitted SQL carries
    # decided values rather than provisional ones.
    adjudication = {}
    adjudication_path = OUT / "meaning-adjudication.json"
    if adjudication_path.exists():
        for entry in json.loads(adjudication_path.read_text(encoding="utf-8"))["decisions"]:
            if entry["target_word_index"] is not None:
                adjudication[(entry["verse_key"], entry["target_word_index"])] = entry
    role_lexicon = build_role_lexicon(words, canonical, targets)

    # ---- gate 1: the resegmenter must be a provable no-op everywhere else ---
    noop_failures, noop_checked = [], 0
    for verse_key, rows in words.items():
        if verse_key in targets or verse_key not in canonical:
            continue
        canonical_tokens = [canonical[verse_key][i] for i in sorted(canonical[verse_key])]
        surfaces = [r["arabic"] for r in rows]
        if len(surfaces) != len(canonical_tokens):
            noop_failures.append({"verse_key": verse_key, "reason": "count_mismatch"})
            continue
        produced, reason = resegment(surfaces, canonical_tokens)
        noop_checked += 1
        if reason is not None:
            noop_failures.append({"verse_key": verse_key, "reason": reason})
        elif produced != surfaces:
            noop_failures.append({
                "verse_key": verse_key,
                "reason": "resegmentation_would_change_untargeted_verse",
                "before": surfaces, "after": produced,
            })

    # ---- per-verse plan ----------------------------------------------------
    verse_reports, before_after, row_mapping, field_changes = [], [], [], []
    forward_sql, reverse_sql, preimage, split_failures = [], [], [], []
    next_id = max_id

    for verse_key in TARGET_VERSES:
        rows = words[verse_key]
        canonical_tokens = [canonical[verse_key][i] for i in sorted(canonical[verse_key])]
        canonical_count = len(canonical_tokens)
        current_count = len(rows)
        teacher_verse = teacher.get(verse_key, {})

        target_surfaces, surface_reason = resegment([r["arabic"] for r in rows], canonical_tokens)
        anchoring = find_analysis_breakpoint(rows, teacher_verse, canonical_count)
        breakpoint = anchoring["breakpoint"]

        unresolved = []
        if surface_reason is not None:
            unresolved.append(f"surface_resegmentation_failed:{surface_reason}")
        if len(teacher_verse) != canonical_count:
            unresolved.append("teacher_coverage_incomplete")
        if anchoring["margin"] is not None and anchoring["margin"] <= 0:
            unresolved.append("analysis_anchor_not_separable")
        if anchoring["best_contradictions"] > 0:
            unresolved.append("analysis_anchor_contradicted_by_teacher")

        # canonical index -> production row that owns its analysis
        owner, merged_cell, merged_indexes = {}, None, ()
        for offset, record in enumerate(rows):
            index = offset + 1
            target = index if index < breakpoint else index + 1
            if 1 <= target <= canonical_count:
                owner.setdefault(target, record)
        if not anchoring["is_identity"] and 2 <= breakpoint <= canonical_count:
            # Rows 1..b-1 map to canonical 1..b-1 and rows b.. map to b+1.., so
            # canonical index b has no owner: row b-1 carries BOTH b-1 and b in
            # one merged legacy cell. That row owns the orphan index too.
            merged_cell = rows[breakpoint - 2]
            merged_indexes = (breakpoint - 1, breakpoint)
            owner[breakpoint] = merged_cell

        surface_first_divergence = None
        for i in range(min(current_count, canonical_count)):
            if target_surfaces and rows[i]["arabic"] != target_surfaces[i]:
                surface_first_divergence = i + 1
                break
        if surface_first_divergence is None and current_count != canonical_count:
            surface_first_divergence = min(current_count, canonical_count) + 1

        operations = []
        for index in range(1, canonical_count + 1):
            slot_row = rows[index - 1] if index <= current_count else None
            source = owner.get(index)
            target_surface = target_surfaces[index - 1] if target_surfaces else None
            teacher_row = teacher_verse.get(index) or {}
            v18_row = final_v18.get(verse_key, {}).get(index) or {}

            candidates, seen = [], set()
            for label, donor in (
                [("same_surface_row", r) for r in rows if r["arabic"] == target_surface]
                + [("surface_slot_row", slot_row), ("analysis_owner_row", source)]
            ):
                if donor is None or id(donor) in seen:
                    continue
                seen.add(id(donor))
                candidates.append((f"{label}_{donor['id']}", donor["meaning_tr"]))
            meaning = adjudicate_meaning(
                target_surface or "", candidates,
                slot_row["meaning_tr"] if slot_row else None,
                slot_row is None or slot_row["arabic"] != target_surface,
                lexicon, lexicon_display)
            verdict = adjudication.get((verse_key, index))
            if verdict is not None:
                meaning = {
                    "value": verdict["proposed_meaning_tr"],
                    "decision": verdict["verdict"],
                    "from": "meaning-adjudication.json",
                    "corpus_support": meaning.get("corpus_support", 0),
                    "evidence": verdict["evidence"],
                    "rejected_candidates": meaning.get("rejected_candidates", []),
                }

            payload = {column: None for column in ANALYSIS_COLUMNS}
            if source is not None and source is merged_cell and index in merged_indexes:
                part = 0 if index == merged_indexes[0] else 1
                payload, evidence, split_ok = split_merged_payload(
                    source, part, teacher_row, role_lexicon)
                if not split_ok:
                    split_failures.append({"verse_key": verse_key, "target_word_index": index})
            elif source is not None and not payload_is_empty(source):
                payload = {column: source[column] for column in ANALYSIS_COLUMNS}
                evidence = f"carried_from_production_row_{source['id']}"
            else:
                # Nothing provable in production. Only root and lemma can be
                # filled, because the teacher does not speak the legacy
                # segmented morphology dialect. Everything else stays NULL by
                # policy rather than being guessed.
                if teacher_row.get("root"):
                    payload["root"] = teacher_row["root"]
                if teacher_row.get("lemma"):
                    payload["lemma"] = teacher_row["lemma"]
                has_fill = bool(payload["root"] or payload["lemma"])
                payload["confidence"] = "low" if has_fill else None
                payload["source"] = "qac_tanzil_teacher" if has_fill else None
                evidence = "teacher_backfill_root_lemma_only"

            if slot_row is None:
                operation = "INSERT_ROW"
            elif source is None:
                operation = "FILL_FROM_TEACHER"
            elif source is merged_cell and index in merged_indexes:
                operation = "SPLIT_ANALYSIS"
            elif source is not slot_row:
                operation = "MOVE_ANALYSIS"
            elif target_surface != slot_row["arabic"]:
                operation = "REWRITE_SURFACE"
            else:
                operation = "KEEP"

            record = {
                "verse_key": verse_key,
                "target_word_index": index,
                "operation": operation,
                "canonical_token": canonical_tokens[index - 1],
                "target_arabic": target_surface,
                "slot_words_id": slot_row["id"] if slot_row else None,
                "slot_current_arabic": slot_row["arabic"] if slot_row else None,
                "analysis_owner_words_id": source["id"] if source else None,
                "analysis_owner_word_index": source["word_index"] if source else None,
                "evidence": evidence,
                "teacher": {"root": teacher_row.get("root"), "lemma": teacher_row.get("lemma"),
                            "pos": teacher_row.get("pos")},
                "v1_8": {"root": v18_row.get("root"), "lemma": v18_row.get("lemma")},
                "target_payload": dict(payload, meaning_tr=meaning["value"]),
                "meaning_decision": meaning,
            }
            operations.append(record)

            if slot_row is not None:
                for column in ["arabic"] + PAYLOAD_COLUMNS:
                    before = slot_row[column]
                    after = target_surface if column == "arabic" else record["target_payload"][column]
                    if before != after:
                        field_changes.append({
                            "verse_key": verse_key, "words_id": slot_row["id"],
                            "word_index": index, "column": column,
                            "before": before, "after": after, "operation": operation,
                        })

        for extra in rows[canonical_count:]:
            operations.append({
                "verse_key": verse_key, "target_word_index": None,
                "operation": "DELETE_ROW", "canonical_token": None, "target_arabic": None,
                "slot_words_id": extra["id"], "slot_current_arabic": extra["arabic"],
                "analysis_owner_words_id": None, "analysis_owner_word_index": None,
                "evidence": "surplus_row_beyond_canonical_token_count",
                "teacher": {}, "v1_8": {}, "target_payload": None,
                "meaning_decision": {"value": extra["meaning_tr"], "decision": "DROPPED_WITH_ROW",
                                     "from": None, "corpus_support": 0},
            })

        if any(f["verse_key"] == verse_key for f in split_failures):
            unresolved.append("merged_cell_split_not_provable")

        meaning_review = [
            {"target_word_index": op["target_word_index"],
             "target_arabic": op["target_arabic"],
             "decision": op["meaning_decision"]["decision"],
             "value": op["meaning_decision"]["value"],
             "suggestion": op["meaning_decision"].get("suggestion"),
             "rejected_candidates": op["meaning_decision"].get("rejected_candidates")}
            for op in operations
            if op["meaning_decision"]["decision"] not in (
                "ATTESTED", "MOVE_EXISTING_MEANING",
                "REPLACE_WITH_VERIFIED_MEANING", "SET_NULL_FAIL_CLOSED")
        ]

        discarded = [
            {"words_id": op["slot_words_id"],
             "current_word_index": next(
                 (r["word_index"] for r in rows if r["id"] == op["slot_words_id"]), None),
             "current_arabic": op["slot_current_arabic"],
             "reason": op["evidence"],
             "discarded_payload": next(
                 ({c: r[c] for c in PAYLOAD_COLUMNS}
                  for r in rows if r["id"] == op["slot_words_id"]), None)}
            for op in operations if op["operation"] == "DELETE_ROW"
        ]
        owned_ids = {op["analysis_owner_words_id"] for op in operations}
        for record in rows:
            if record["id"] in owned_ids or payload_is_empty(record):
                continue
            discarded.append({
                "words_id": record["id"],
                "current_word_index": record["word_index"],
                "current_arabic": record["arabic"],
                "reason": "residual_or_duplicate_analysis_not_owned_by_any_canonical_token",
                "discarded_payload": {c: record[c] for c in PAYLOAD_COLUMNS},
            })

        summary = Counter(op["operation"] for op in operations)
        verse_reports.append({
            "verse_key": verse_key,
            "status": "UNRESOLVED" if unresolved else "RESOLVED",
            "unresolved_reasons": unresolved,
            "meaning_tr_review_required": len(meaning_review),
            "meaning_tr_review": meaning_review,
            "discarded_analyses": discarded,
            "current_row_count": current_count,
            "canonical_token_count": canonical_count,
            "row_delta": canonical_count - current_count,
            "surface_first_divergent_index": surface_first_divergence,
            "analysis_breakpoint": None if anchoring["is_identity"] else breakpoint,
            "cause": ("surface_over_or_under_segmentation" if anchoring["is_identity"]
                      else "merged_analysis_cell_shifts_tail_by_one"),
            "affected_token_count": sum(1 for op in operations if op["operation"] != "KEEP"),
            "operations": dict(summary),
            "anchoring": anchoring,
            "target_token_sequence": canonical_tokens,
            "target_surface_sequence": target_surfaces,
        })

        before_after.append({
            "verse_key": verse_key,
            "before": [{"id": r["id"], "word_index": r["word_index"], "arabic": r["arabic"],
                        **{c: r[c] for c in PAYLOAD_COLUMNS}} for r in rows],
            "after": [{"word_index": op["target_word_index"], "arabic": op["target_arabic"],
                       **op["target_payload"]}
                      for op in operations if op["operation"] != "DELETE_ROW"],
        })
        row_mapping.extend(operations)

        # ---- SQL ----------------------------------------------------------
        forward_sql.append(f"-- {verse_key}: {current_count} rows -> {canonical_count} tokens")
        for op in operations:
            if op["operation"] == "DELETE_ROW":
                original = next(r for r in rows if r["id"] == op["slot_words_id"])
                preimage.append(dict(original))
                forward_sql.append(
                    f"DELETE FROM words WHERE id = {original['id']}"
                    f" AND verse_key = {sql_literal(verse_key)}"
                    f" AND word_index = {original['word_index']}"
                    f" AND arabic = {sql_literal(original['arabic'])};")
                columns = ["id"] + ALL_COLUMNS
                reverse_sql.append(
                    "INSERT INTO words (" + ", ".join(columns) + ") VALUES ("
                    + ", ".join(sql_literal(original[c]) for c in columns) + ");")
            elif op["operation"] == "INSERT_ROW":
                next_id += 1
                values = {"id": next_id, "verse_key": verse_key,
                          "word_index": op["target_word_index"], "segment_index": 0,
                          "arabic": op["target_arabic"], **op["target_payload"]}
                columns = ["id"] + ALL_COLUMNS
                forward_sql.append(
                    "INSERT INTO words (" + ", ".join(columns) + ") VALUES ("
                    + ", ".join(sql_literal(values[c]) for c in columns) + ");")
                reverse_sql.append(f"DELETE FROM words WHERE id = {next_id};")
            else:
                original = next(r for r in rows if r["id"] == op["slot_words_id"])
                assignments, restores = [], []
                for column in ["arabic"] + PAYLOAD_COLUMNS:
                    after = op["target_arabic"] if column == "arabic" else op["target_payload"][column]
                    if original[column] != after:
                        assignments.append(f"{column} = {sql_literal(after)}")
                        restores.append(f"{column} = {sql_literal(original[column])}")
                if not assignments:
                    continue
                preimage.append(dict(original))
                forward_sql.append(
                    "UPDATE words SET " + ", ".join(assignments)
                    + f" WHERE id = {original['id']}"
                    + f" AND verse_key = {sql_literal(verse_key)}"
                    + f" AND word_index = {original['word_index']}"
                    + f" AND arabic = {sql_literal(original['arabic'])};")
                reverse_sql.append(
                    "UPDATE words SET " + ", ".join(restores)
                    + f" WHERE id = {original['id']} AND verse_key = {sql_literal(verse_key)};")
        forward_sql.append("")

    # ---- exact counts ------------------------------------------------------
    resolved = [v for v in verse_reports if v["status"] == "RESOLVED"]
    inserts = sum(v["operations"].get("INSERT_ROW", 0) for v in verse_reports)
    deletes = sum(v["operations"].get("DELETE_ROW", 0) for v in verse_reports)
    corpus_before = sum(len(v) for v in words.values())
    counts = {
        "target_verses": len(TARGET_VERSES),
        "resolved_verses": len(resolved),
        "unresolved_verses": len(TARGET_VERSES) - len(resolved),
        "affected_existing_rows": sum(v["current_row_count"] for v in verse_reports),
        "target_rows": sum(v["canonical_token_count"] for v in verse_reports),
        "rows_to_insert": inserts,
        "rows_to_delete": deletes,
        "cells_to_change": len(field_changes),
        "cells_by_column": dict(Counter(f["column"] for f in field_changes)),
        "rows_with_at_least_one_changed_cell":
            len({(f["verse_key"], f["word_index"]) for f in field_changes}),
        "corpus_rows_before": corpus_before,
        "corpus_rows_after": corpus_before + inserts - deletes,
        "frozen_token_map_analysis_words": sum(len(v) for v in canonical.values()),
        "untargeted_verses_checked": noop_checked,
        "untargeted_verses_failing_noop_gate": len(noop_failures),
        "untargeted_cells_touched": 0,
        "meaning_tr_cells_needing_human_review":
            sum(v["meaning_tr_review_required"] for v in verse_reports),
        "meaning_tr_verdicts": dict(Counter(
            op["meaning_decision"]["decision"] for v in verse_reports
            for op in [])) or dict(Counter(
                d["verdict"] for d in adjudication.values())),
        "merged_cell_split_failures": len(split_failures),
        "discarded_analyses": sum(len(v["discarded_analyses"]) for v in verse_reports),
    }

    # ---- post-migration integrity simulation -------------------------------
    simulated = {k: [r["arabic"] for r in v] for k, v in words.items()}
    for report in verse_reports:
        simulated[report["verse_key"]] = report["target_surface_sequence"]

    integrity = {
        "verse_count": len(simulated),
        "verses_matching_canonical_token_count": sum(
            1 for k, v in simulated.items() if k in canonical and len(v) == len(canonical[k])),
        "verses_with_count_mismatch": sorted(
            k for k, v in simulated.items() if k in canonical and len(v) != len(canonical[k])),
        "verses_not_in_frozen_token_map": sorted(set(simulated) - set(canonical)),
        "word_index_gaps_or_duplicates": 0,
        "surface_skeleton_equal_to_canonical": sum(
            1 for k, v in simulated.items()
            if k in canonical and skeleton("".join(v))
            == skeleton("".join(canonical[k][i] for i in sorted(canonical[k])))),
        "concatenation_preserved_in_target_verses": all(
            "".join(r["target_surface_sequence"])
            == "".join(w["arabic"] for w in words[r["verse_key"]]) for r in verse_reports),
        "ascii_in_root_or_lemma_after": sorted({
            f"{f['verse_key']}:{f['word_index']} {f['column']}={f['after']}"
            for f in field_changes
            if f["column"] in ("root", "lemma") and f["after"]
            and any(ord(c) < 128 and c.isalpha() for c in str(f["after"]))}),
        "api_order_key": "word_index (unchanged); words.id never renumbered",
    }
    for verse_key in simulated:
        if verse_key in targets:
            continue
        indexes = [r["word_index"] for r in words[verse_key]]
        if indexes != list(range(1, len(indexes) + 1)):
            integrity["word_index_gaps_or_duplicates"] += 1

    # ---- write artefacts ---------------------------------------------------
    OUT.joinpath("verse-plan.json").write_text(json.dumps(
        {"counts": counts, "verses": verse_reports, "noop_gate_failures": noop_failures},
        ensure_ascii=False, indent=2), encoding="utf-8")
    with OUT.joinpath("before-after.jsonl").open("w", encoding="utf-8") as handle:
        for row in before_after:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    with OUT.joinpath("row-mapping.jsonl").open("w", encoding="utf-8") as handle:
        for row in row_mapping:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    OUT.joinpath("field-change-manifest.json").write_text(
        json.dumps(field_changes, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT.joinpath("preimage.json").write_text(
        json.dumps(preimage, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT.joinpath("integrity-report.json").write_text(
        json.dumps(integrity, ensure_ascii=False, indent=2), encoding="utf-8")

    OUT.joinpath("forward.sql").write_text("\n".join([
        "-- token-realign-v1_9 forward migration DRAFT - NOT APPLIED",
        "-- Generated by scripts/morphology/plan-token-realign-v1_9.py",
        f"-- rows {counts['affected_existing_rows']} -> {counts['target_rows']}, "
        f"+{inserts} insert, -{deletes} delete, {len(field_changes)} cell changes",
        "-- Every UPDATE/DELETE is guarded on id + verse_key + word_index + the exact",
        "-- pre-image surface, so a re-run or a drifted row is a no-op instead of a",
        "-- silent overwrite. INSERTs use explicit ids so local sqlite and Turso stay",
        "-- id-identical; no existing id is ever renumbered.",
        "BEGIN IMMEDIATE;", ""] + forward_sql + [
        "", "-- verify before COMMIT:",
        f"--   SELECT COUNT(*) FROM words;  -- expect {counts['corpus_rows_after']}",
        "--   PRAGMA foreign_key_check;",
        "--   PRAGMA integrity_check;",
        "COMMIT;"]), encoding="utf-8")

    OUT.joinpath("reverse.sql").write_text("\n".join([
        "-- token-realign-v1_9 reverse migration DRAFT - NOT APPLIED",
        "-- Restores the exact pre-image captured in preimage.json.",
        "BEGIN IMMEDIATE;", ""] + list(reversed(reverse_sql)) + [
        "", f"-- SELECT COUNT(*) FROM words;  -- expect {corpus_before}",
        "COMMIT;"]), encoding="utf-8")

    # ---- console summary ---------------------------------------------------
    print(json.dumps(counts, ensure_ascii=False, indent=2))
    print()
    for verse in verse_reports:
        print(f"{verse['verse_key']:>8}  {verse['status']:<10} "
              f"{verse['current_row_count']}->{verse['canonical_token_count']} "
              f"surf_div={verse['surface_first_divergent_index']} "
              f"anal_bp={verse['analysis_breakpoint']} "
              f"affected={verse['affected_token_count']} {dict(verse['operations'])}")
        if verse["unresolved_reasons"]:
            print(f"           reasons: {verse['unresolved_reasons']}")
        for item in verse["discarded_analyses"]:
            print(f"           discard id={item['words_id']} wi={item['current_word_index']} "
                  f"{item['current_arabic']} :: {item['reason']}")
        if verse["meaning_tr_review_required"]:
            print("           meaning_tr review: "
                  + str([(m["target_word_index"], m["decision"])
                         for m in verse["meaning_tr_review"]]))
    if noop_failures:
        print(f"\nNOOP GATE FAILURES: {len(noop_failures)}")
        for failure in noop_failures[:10]:
            print("  ", failure["verse_key"], failure["reason"])
    print("\nintegrity:", json.dumps(
        {k: v for k, v in integrity.items() if k != "ascii_in_root_or_lemma_after"},
        ensure_ascii=False))
    print("ascii_root_lemma_after:", integrity["ascii_in_root_or_lemma_after"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
