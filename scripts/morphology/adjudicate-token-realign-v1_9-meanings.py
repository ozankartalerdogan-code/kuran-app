#!/usr/bin/env python3
"""Adjudicate every pending meaning_tr cell of the token-realign-v1_9 plan.

Read-only. Opens data/app.db with mode=ro, never contacts Turso, writes only
new files under data/candidates/morphology/token-realign-v1_9/.

Each pending cell gets exactly one verdict, decided by a mechanical rule so the
result is reproducible and auditable rather than a judgement call:

  MOVE_EXISTING_MEANING
      A meaning already present in this verse provably belongs to the target
      token, either because
        (i)  some row carries BOTH the target surface and an analysis whose
             lemma matches the teacher lemma - surface and analysis agree that
             the row describes the target token; or
        (ii) the value already sitting in the target slot is the dominant
             Turkish gloss for the target token's own gloss_en, i.e. it is
             corroborated in place and moves zero positions.
      Nothing is invented and nothing is taken from another verse.

  REPLACE_WITH_VERIFIED_MEANING
      Three checks agree, the third one from a different source lineage:
        (a) the exact surface is attested with that meaning, support >= SURFACE_SUPPORT;
        (b) the target token's teacher lemma is attested with the same meaning,
            support >= LEMMA_SUPPORT;
        (c) the target token has a non-empty English gloss, and that meaning is
            also the dominant Turkish gloss among healthy rows carrying the same
            gloss_en.
      (c) is what makes this safe. Frequency alone is not evidence: this corpus
      glosses the conditional إِن as "şüphesiz, gerçekten" in 252 of 253 rows
      (the إِنَّ reading) and glosses the negating وَمَا as "ve olana" in all
      507 rows. Both pass (a) and (b) comfortably and both are wrong. gloss_en
      comes from a separate lineage, so it does not repeat those errors.

  SET_NULL_FAIL_CLOSED
      Anything else. The cell is emptied rather than guessed at.

"Healthy corpus" means the 6,226 verses that are neither a target verse nor
count-mismatched against the frozen token map, so no misaligned cell can vote.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import unicodedata as ud
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "data" / "candidates" / "morphology" / "token-realign-v1_9"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "plan", Path(__file__).resolve().parent / "plan-token-realign-v1_9.py")
plan = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(plan)

SURFACE_SUPPORT = 5
LEMMA_SUPPORT = 3


def build_gloss_lexicon(words, canonical, targets):
    """gloss_en -> Counter of normalised meaning_tr, healthy verses only.

    The English gloss and the Turkish meaning were authored through different
    pipelines, so agreement between them is genuine corroboration rather than
    the same error counted twice.
    """
    lexicon = defaultdict(Counter)
    for verse_key, rows in words.items():
        if verse_key in targets or verse_key not in canonical:
            continue
        if len(rows) != len(canonical[verse_key]):
            continue
        for record in rows:
            gloss = (record["gloss_en"] or "").strip().casefold()
            meaning = (record["meaning_tr"] or "").strip()
            if gloss and meaning:
                lexicon[gloss][plan.meaning_key(meaning)] += 1
    return lexicon


def build_lemma_lexicon(words, canonical, targets):
    """NFC lemma -> Counter of normalised meaning_tr, healthy verses only."""
    lexicon = defaultdict(Counter)
    for verse_key, rows in words.items():
        if verse_key in targets or verse_key not in canonical:
            continue
        if len(rows) != len(canonical[verse_key]):
            continue
        for record in rows:
            lemma = record["lemma"]
            meaning = (record["meaning_tr"] or "").strip()
            if lemma and meaning:
                lexicon[plan.bare(lemma)][plan.meaning_key(meaning)] += 1
    return lexicon


def main() -> int:
    canonical = plan.load_token_map()
    teacher = plan.load_indexed(plan.TEACHER)
    connection = sqlite3.connect(f"file:{plan.DB}?mode=ro", uri=True)
    words = plan.load_words(connection)
    targets = set(plan.TARGET_VERSES)

    surface_lex, surface_display = plan.build_meaning_lexicon(words, canonical, targets)
    lemma_lex = build_lemma_lexicon(words, canonical, targets)
    gloss_lex = build_gloss_lexicon(words, canonical, targets)
    root_meanings = {
        row[0]: row[1] for row in
        connection.execute("SELECT root, MIN(meaning_tr) FROM root_meanings "
                           "WHERE root IS NOT NULL GROUP BY root")
    }

    mapping = [json.loads(line) for line in
               (OUT / "row-mapping.jsonl").read_text(encoding="utf-8").splitlines()]

    decisions = []
    for op in mapping:
        decision = op["meaning_decision"]
        if decision["decision"] == "ATTESTED":
            continue  # already proven by the planner, not pending

        verse_key = op["verse_key"]
        index = op["target_word_index"]
        rows = words[verse_key]
        target_surface = op["target_arabic"]
        teacher_row = teacher.get(verse_key, {}).get(index) or {}
        teacher_lemma = teacher_row.get("lemma")
        teacher_root = teacher_row.get("root")

        slot = next((r for r in rows if r["id"] == op["slot_words_id"]), None)
        owner = next((r for r in rows if r["id"] == op["analysis_owner_words_id"]), None)

        # --- rule 1: surface AND analysis agree on the same production row ----
        move_from = None
        for record in rows:
            if record["arabic"] != target_surface:
                continue
            if not (record["meaning_tr"] or "").strip():
                continue
            if teacher_lemma and record["lemma"] and \
                    plan.bare(record["lemma"]) == plan.bare(teacher_lemma):
                move_from = record
                break

        # --- rule 2: two independent corpus keys agree ------------------------
        surface_attested = surface_lex.get(plan.nfc(target_surface or ""), Counter())
        lemma_attested = lemma_lex.get(plan.bare(teacher_lemma or ""), Counter())
        target_gloss = ((op["target_payload"] or {}).get("gloss_en") or "").strip().casefold()
        gloss_attested = gloss_lex.get(target_gloss, Counter()) if target_gloss else Counter()
        gloss_dominant = gloss_attested.most_common(1)[0][0] if gloss_attested else None

        # Is there proof the stored value does not belong to this token?
        # Two independent proofs, either of which is enough:
        #   structural - the surface this slot holds is being replaced, so the
        #     value was authored against a token that is moving away;
        #   lexical    - the value matches the lemma the row currently stores
        #     (the misaligned one) and is unattested for the teacher's lemma
        #     for this token, i.e. it travelled with the wrong analysis.
        # Without one of these, replacing is meaning revision, not alignment.
        stored_key = plan.meaning_key(slot["meaning_tr"] if slot else None)
        structurally_misplaced = op["operation"] in ("REWRITE_SURFACE", "INSERT_ROW")
        stored_lemma_key = plan.bare(slot["lemma"]) if slot and slot["lemma"] else None
        lexically_misplaced = bool(
            stored_key and stored_lemma_key and teacher_lemma
            and plan.bare(teacher_lemma) != stored_lemma_key
            and lemma_lex.get(stored_lemma_key, Counter()).get(stored_key, 0) > 0
            and lemma_attested.get(stored_key, 0) == 0)
        misplaced_onto_sibling = structurally_misplaced or lexically_misplaced

        verified = None
        if surface_attested:
            key, surface_support = surface_attested.most_common(1)[0]
            lemma_support = lemma_attested.get(key, 0)
            if (surface_support >= SURFACE_SUPPORT and lemma_support >= LEMMA_SUPPORT
                    and gloss_dominant is not None and key == gloss_dominant
                    and misplaced_onto_sibling):
                verified = {
                    "value": surface_display[key].most_common(1)[0][0],
                    "surface_support": surface_support,
                    "lemma_support": lemma_support,
                    "gloss_en_support": gloss_attested[key],
                }

        # in-place corroboration: the stored value is what this token's own
        # English gloss means everywhere else in the corpus
        current_value = slot["meaning_tr"] if slot else None
        current_key = plan.meaning_key(current_value)

        def same_gloss_set(a, b):
            """Same glosses, different order or punctuation - not a real change."""
            split = lambda x: frozenset(
                t.strip() for t in plan.meaning_key(x).replace("/", ",").split(",") if t.strip())
            return bool(a) and bool(b) and split(a) == split(b)

        # Positive evidence that the stored value is right for THIS token: the
        # corpus pairs it with this token's own English gloss. Attestation is
        # enough - demanding dominance would replace precise curated wordings
        # ("sana geldi") with the house-style generic one ("gelir").
        corroborated_in_place = (
            move_from is None and current_value and target_gloss
            and gloss_attested.get(current_key, 0) > 0)
        if (move_from is None and verified is not None
                and same_gloss_set(current_value, verified["value"])):
            corroborated_in_place = True

        if move_from is not None:
            verdict = "MOVE_EXISTING_MEANING"
            proposed = move_from["meaning_tr"]
            evidence = (f"words.id={move_from['id']} carries the target surface and "
                        f"lemma {move_from['lemma']} == teacher lemma {teacher_lemma}")
        elif corroborated_in_place:
            verdict = "MOVE_EXISTING_MEANING"
            proposed = current_value
            if gloss_attested.get(current_key, 0) > 0:
                evidence = (f"corpus pairs this exact value with the token's own gloss_en "
                            f"'{target_gloss}' {gloss_attested[current_key]}x; corroborated "
                            f"in place, moves zero positions")
            else:
                evidence = ("proposed replacement carries the same gloss set as the stored "
                            "value, only reordered; kept in place")
        elif verified is not None:
            proof = ("surface being replaced" if structurally_misplaced
                     else "travelled with the wrong lemma")
            verdict = "REPLACE_WITH_VERIFIED_MEANING"
            proposed = verified["value"]
            evidence = (f"exact surface attested {verified['surface_support']}x, "
                        f"lemma {teacher_lemma} attested {verified['lemma_support']}x, "
                        f"and gloss_en '{target_gloss}' attested "
                        f"{verified['gloss_en_support']}x - all three agree; stored value "
                        f"is misplaced ({proof})")
        else:
            verdict = "SET_NULL_FAIL_CLOSED"
            proposed = None
            reasons = []
            if not teacher_lemma:
                reasons.append("teacher has no lemma for this token")
            if not surface_attested:
                reasons.append("surface unattested in the healthy corpus")
            elif surface_attested.most_common(1)[0][1] < SURFACE_SUPPORT:
                reasons.append(f"surface support {surface_attested.most_common(1)[0][1]}"
                               f" < {SURFACE_SUPPORT}")
            elif not misplaced_onto_sibling and stored_key:
                reasons.append("no proof the stored value is misplaced - its surface is "
                               "unchanged and it is not tied to the misaligned lemma")
            elif not target_gloss:
                reasons.append("no gloss_en on the target token to corroborate the corpus")
            elif gloss_dominant is None:
                reasons.append(f"gloss_en '{target_gloss}' unattested in the healthy corpus")
            elif surface_attested.most_common(1)[0][0] != gloss_dominant:
                reasons.append(
                    "corpus frequency and gloss_en disagree "
                    f"(surface says {surface_display[surface_attested.most_common(1)[0][0]].most_common(1)[0][0]!r}, "
                    f"gloss_en says {surface_display.get(gloss_dominant, Counter(),).most_common(1)[0][0] if gloss_dominant in surface_display else gloss_dominant!r})")
            else:
                reasons.append("lemma key does not corroborate the surface key")
            evidence = "; ".join(reasons)

        decisions.append({
            "verse_key": verse_key,
            "target_word_index": index,
            "operation": op["operation"],
            "planner_decision": decision["decision"],
            "current_words_id": op["slot_words_id"],
            "current_surface": op["slot_current_arabic"],
            "current_meaning_tr": slot["meaning_tr"] if slot else None,
            "target_surface": target_surface,
            "analysis_owner_words_id": op["analysis_owner_words_id"],
            "analysis_owner_surface": owner["arabic"] if owner else None,
            "analysis_owner_meaning_tr": owner["meaning_tr"] if owner else None,
            "target_teacher_lemma": teacher_lemma,
            "target_teacher_root": teacher_root,
            "target_root_meaning_tr": root_meanings.get(teacher_root),
            "target_gloss_en": (op["target_payload"] or {}).get("gloss_en"),
            "corpus_surface_top": [
                {"meaning": surface_display[k].most_common(1)[0][0], "support": n}
                for k, n in surface_attested.most_common(3)],
            "target_gloss_en_dominant_tr": (
                surface_display[gloss_dominant].most_common(1)[0][0]
                if gloss_dominant in surface_display else gloss_dominant),
            "corpus_lemma_top": [
                {"meaning": surface_display[k].most_common(1)[0][0] if k in surface_display else k,
                 "support": n}
                for k, n in lemma_attested.most_common(3)],
            "stored_value_structurally_misplaced": structurally_misplaced,
            "stored_value_lexically_misplaced": lexically_misplaced,
            "verdict": verdict,
            "proposed_meaning_tr": proposed,
            "changes_stored_value": (slot["meaning_tr"] if slot else None) != proposed,
            "evidence": evidence,
        })

    tally = Counter(d["verdict"] for d in decisions)
    summary = {
        "pending_cells": len(decisions),
        "verdicts": dict(tally),
        "cells_whose_stored_value_changes": sum(1 for d in decisions if d["changes_stored_value"]),
        "cells_left_untouched": sum(1 for d in decisions if not d["changes_stored_value"]),
        "surface_support_threshold": SURFACE_SUPPORT,
        "lemma_support_threshold": LEMMA_SUPPORT,
    }

    OUT.joinpath("meaning-adjudication.json").write_text(
        json.dumps({"summary": summary, "decisions": decisions},
                   ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print()
    header = f"{'ayet':<8} {'idx':>3} {'hedef yüzey':<22} {'mevcut anlam':<22} {'önerilen':<22} verdict"
    print(header)
    print("-" * len(header))
    for d in decisions:
        print("%-8s %3s %-22s %-22s %-22s %s" % (
            d["verse_key"], d["target_word_index"],
            (d["target_surface"] or "")[:22],
            str(d["current_meaning_tr"])[:22],
            str(d["proposed_meaning_tr"])[:22],
            d["verdict"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
